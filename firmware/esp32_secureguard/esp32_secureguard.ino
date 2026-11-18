#include <WiFi.h>
#include <WebServer.h>
#include <esp_camera.h>
#include <Adafruit_Fingerprint.h>

const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* BACKEND_URL   = "http://YOUR_BACKEND_IP:8000";

#define CAM_XCLK   10
#define CAM_SIOD   40
#define CAM_SIOC   39
#define CAM_Y9     48
#define CAM_Y8     11
#define CAM_Y7     12
#define CAM_Y6     14
#define CAM_Y5     16
#define CAM_Y4     18
#define CAM_Y3     17
#define CAM_Y2     15
#define CAM_VSYNC  38
#define CAM_HREF   47
#define CAM_PCLK   13
#define CAM_PWDN   -1
#define CAM_RESET  -1

#define FP_RX      44
#define FP_TX      43
#define FP_BAUD    57600

#define LED_GREEN  1
#define LED_RED    2
#define BUZZER_PIN 42

#define EVT_WIFI_CONNECTED  (1 << 0)
#define EVT_CAMERA_READY    (1 << 1)
#define EVT_FP_SENSOR_READY (1 << 2)
#define EVT_FP_ENROLL_CMD   (1 << 3)
#define EVT_FP_VERIFY_CMD   (1 << 4)

#define STREAM_PORT 81
#define API_PORT    80

typedef enum {
  CMD_ENROLL,
  CMD_VERIFY
} CommandType;

typedef struct {
  CommandType type;
  uint16_t templateId;
} FpCommand;

typedef struct {
  bool success;
  uint16_t templateId;
  uint16_t confidence;
  char message[64];
} FpResult;

EventGroupHandle_t systemEvents;
QueueHandle_t commandQueue;
QueueHandle_t resultQueue;
SemaphoreHandle_t serialMutex;

WebServer apiServer(API_PORT);
WebServer streamServer(STREAM_PORT);

HardwareSerial fpSerial(1);
Adafruit_Fingerprint finger(&fpSerial);

volatile bool wifiConnected = false;
volatile bool cameraReady   = false;
volatile bool fpSensorReady = false;

static void beep(uint8_t count, uint16_t durationMs = 80) {
  for (uint8_t i = 0; i < count; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    vTaskDelay(pdMS_TO_TICKS(durationMs));
    digitalWrite(BUZZER_PIN, LOW);
    if (i + 1 < count) {
      vTaskDelay(pdMS_TO_TICKS(80));
    }
  }
}

static bool initCamera() {
  camera_config_t cfg = {};
  cfg.ledc_channel = LEDC_CHANNEL_0;
  cfg.ledc_timer   = LEDC_TIMER_0;
  cfg.pin_d0       = CAM_Y2;
  cfg.pin_d1       = CAM_Y3;
  cfg.pin_d2       = CAM_Y4;
  cfg.pin_d3       = CAM_Y5;
  cfg.pin_d4       = CAM_Y6;
  cfg.pin_d5       = CAM_Y7;
  cfg.pin_d6       = CAM_Y8;
  cfg.pin_d7       = CAM_Y9;
  cfg.pin_xclk     = CAM_XCLK;
  cfg.pin_pclk     = CAM_PCLK;
  cfg.pin_vsync    = CAM_VSYNC;
  cfg.pin_href     = CAM_HREF;
  cfg.pin_sccb_sda = CAM_SIOD;
  cfg.pin_sccb_scl = CAM_SIOC;
  cfg.pin_pwdn     = CAM_PWDN;
  cfg.pin_reset    = CAM_RESET;
  cfg.xclk_freq_hz = 20000000;
  cfg.pixel_format = PIXFORMAT_JPEG;
  cfg.frame_size   = FRAMESIZE_VGA;
  cfg.jpeg_quality = 10;
  cfg.fb_location  = CAMERA_FB_IN_PSRAM;
  cfg.fb_count     = 2;
  cfg.grab_mode    = CAMERA_GRAB_LATEST;

  if (!psramFound()) {
    cfg.fb_location  = CAMERA_FB_IN_DRAM;
    cfg.fb_count     = 1;
    cfg.jpeg_quality = 14;
  }

  esp_err_t err = esp_camera_init(&cfg);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed: 0x%x\n", err);
    return false;
  }
  return true;
}

static bool waitForFinger(uint32_t timeoutMs) {
  unsigned long start = millis();
  while (finger.getImage() != FINGERPRINT_OK) {
    if (millis() - start >= timeoutMs) {
      return false;
    }
    vTaskDelay(pdMS_TO_TICKS(100));
  }
  return true;
}

bool enrollFingerprint(uint16_t templatePosition) {
  if (!fpSensorReady) {
    return false;
  }

  xSemaphoreTake(serialMutex, portMAX_DELAY);
  Serial.printf("Enrolling template %u, waiting for first scan\n", templatePosition);

  if (!waitForFinger(10000) || finger.image2Tz(1) != FINGERPRINT_OK) {
    Serial.println("First scan failed or timed out");
    xSemaphoreGive(serialMutex);
    return false;
  }

  // Wait for finger lift so the second scan isn't a duplicate of the first
  unsigned long liftStart = millis();
  while (finger.getImage() != FINGERPRINT_NOFINGER && (millis() - liftStart) < 5000) {
    vTaskDelay(pdMS_TO_TICKS(100));
  }
  vTaskDelay(pdMS_TO_TICKS(500));

  Serial.println("Place the same finger again");
  if (!waitForFinger(10000) || finger.image2Tz(2) != FINGERPRINT_OK) {
    Serial.println("Second scan failed or timed out");
    xSemaphoreGive(serialMutex);
    return false;
  }

  if (finger.createModel() != FINGERPRINT_OK) {
    Serial.println("Prints did not match");
    xSemaphoreGive(serialMutex);
    return false;
  }

  if (finger.storeModel(templatePosition) != FINGERPRINT_OK) {
    Serial.printf("Failed to store template at slot %u\n", templatePosition);
    xSemaphoreGive(serialMutex);
    return false;
  }

  Serial.printf("Stored template at slot %u\n", templatePosition);
  xSemaphoreGive(serialMutex);
  return true;
}

FpResult verifyFingerprint() {
  FpResult res = {};
  if (!fpSensorReady) {
    snprintf(res.message, sizeof(res.message), "sensor not ready");
    return res;
  }

  xSemaphoreTake(serialMutex, portMAX_DELAY);

  if (!waitForFinger(10000)) {
    snprintf(res.message, sizeof(res.message), "no finger detected");
    xSemaphoreGive(serialMutex);
    return res;
  }

  if (finger.image2Tz() != FINGERPRINT_OK) {
    snprintf(res.message, sizeof(res.message), "image conversion failed");
    xSemaphoreGive(serialMutex);
    return res;
  }

  if (finger.fingerSearch() != FINGERPRINT_OK) {
    snprintf(res.message, sizeof(res.message), "no matching template");
    xSemaphoreGive(serialMutex);
    return res;
  }

  res.success    = true;
  res.templateId = finger.fingerID;
  res.confidence = finger.confidence;
  snprintf(res.message, sizeof(res.message), "matched slot %u", res.templateId);

  xSemaphoreGive(serialMutex);
  return res;
}

static void sendCaptureFrame(WebServer &srv) {
  if (!cameraReady) {
    srv.send(503, "text/plain", "camera not ready");
    return;
  }

  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    srv.send(500, "text/plain", "capture failed");
    return;
  }

  srv.sendHeader("Content-Disposition", "inline; filename=capture.jpg");
  srv.send_P(200, "image/jpeg", reinterpret_cast<const char*>(fb->buf), fb->len);
  esp_camera_fb_return(fb);
}

static void handleStreamRequest() {
  if (!cameraReady) {
    streamServer.send(503, "text/plain", "camera not ready");
    return;
  }

  // Optional single-frame shortcut when caller asks directly for image/jpeg
  if (streamServer.header("Accept") == "image/jpeg") {
    sendCaptureFrame(streamServer);
    return;
  }

  WiFiClient client = streamServer.client();
  const char* boundary = "secureguard_frame";

  client.println("HTTP/1.1 200 OK");
  client.printf("Content-Type: multipart/x-mixed-replace; boundary=%s\r\n", boundary);
  client.println("Access-Control-Allow-Origin: *");
  client.println();

  while (client.connected()) {
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
      vTaskDelay(pdMS_TO_TICKS(50));
      continue;
    }

    client.printf("--%s\r\n", boundary);
    client.println("Content-Type: image/jpeg");
    client.printf("Content-Length: %zu\r\n\r\n", fb->len);
    client.write(fb->buf, fb->len);
    client.println();
    esp_camera_fb_return(fb);

    vTaskDelay(pdMS_TO_TICKS(33));
  }
}

static void handleStreamCapture() {
  sendCaptureFrame(streamServer);
}

static void handleApiCapture() {
  sendCaptureFrame(apiServer);
}

// Accepts template_id from either query/form params or a JSON body
static bool parseTemplateId(uint16_t &outId) {
  if (apiServer.hasArg("template_id")) {
    long val = apiServer.arg("template_id").toInt();
    if (val > 0 && val <= 1000) {
      outId = static_cast<uint16_t>(val);
      return true;
    }
    return false;
  }

  String body = apiServer.arg("plain");
  int keyIdx = body.indexOf("template_id");
  if (keyIdx < 0) {
    return false;
  }
  int colonIdx = body.indexOf(':', keyIdx);
  if (colonIdx < 0) {
    return false;
  }

  long val = body.substring(colonIdx + 1).toInt();
  if (val > 0 && val <= 1000) {
    outId = static_cast<uint16_t>(val);
    return true;
  }
  return false;
}

static void handleFingerprintEnroll() {
  uint16_t templateId = 0;
  if (!parseTemplateId(templateId)) {
    apiServer.send(400, "application/json", "{\"status\":\"error\",\"error\":\"missing or invalid template_id\"}");
    return;
  }

  xQueueReset(resultQueue);

  FpCommand cmd = { CMD_ENROLL, templateId };
  if (xQueueSend(commandQueue, &cmd, 0) != pdTRUE) {
    apiServer.send(503, "application/json", "{\"status\":\"error\",\"error\":\"command queue full\"}");
    return;
  }

  FpResult result = {};
  if (xQueueReceive(resultQueue, &result, pdMS_TO_TICKS(30000)) == pdTRUE) {
    char buf[192];
    if (result.success) {
      snprintf(buf, sizeof(buf),
               "{\"status\":\"ok\",\"success\":true,\"template_id\":%u,\"message\":\"%s\"}",
               result.templateId, result.message);
    } else {
      snprintf(buf, sizeof(buf),
               "{\"status\":\"error\",\"success\":false,\"template_id\":%u,\"error\":\"%s\"}",
               result.templateId, result.message);
    }
    apiServer.send(200, "application/json", buf);
  } else {
    apiServer.send(504, "application/json", "{\"status\":\"error\",\"error\":\"enroll timeout\"}");
  }
}

static void handleFingerprintVerify() {
  xQueueReset(resultQueue);

  FpCommand cmd = { CMD_VERIFY, 0 };
  if (xQueueSend(commandQueue, &cmd, 0) != pdTRUE) {
    apiServer.send(503, "application/json", "{\"status\":\"error\",\"error\":\"command queue full\"}");
    return;
  }

  FpResult result = {};
  if (xQueueReceive(resultQueue, &result, pdMS_TO_TICKS(15000)) == pdTRUE) {
    char buf[224];
    snprintf(buf, sizeof(buf),
             "{\"status\":\"%s\",\"success\":%s,\"template_id\":%u,\"confidence\":%u,\"accuracy\":%u,\"message\":\"%s\"}",
             result.success ? "match" : "no_match",
             result.success ? "true" : "false",
             result.templateId,
             result.confidence,
             result.confidence,
             result.message);
    apiServer.send(200, "application/json", buf);
  } else {
    apiServer.send(504, "application/json", "{\"status\":\"timeout\",\"success\":false,\"error\":\"verify timeout\"}");
  }
}

static void handleStatus() {
  char buf[192];
  snprintf(buf, sizeof(buf),
           "{\"wifi\":%s,\"camera\":%s,\"fingerprint\":%s,\"free_heap\":%lu,\"free_psram\":%lu}",
           wifiConnected ? "true" : "false",
           cameraReady ? "true" : "false",
           fpSensorReady ? "true" : "false",
           static_cast<unsigned long>(esp_get_free_heap_size()),
           static_cast<unsigned long>(ESP.getFreePsram()));
  apiServer.send(200, "application/json", buf);
}

void wifiManagerTask(void *param) {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);

  for (;;) {
    if (WiFi.status() != WL_CONNECTED) {
      wifiConnected = false;
      xEventGroupClearBits(systemEvents, EVT_WIFI_CONNECTED);

      Serial.printf("Connecting to %s...\n", WIFI_SSID);
      WiFi.disconnect();
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

      for (int i = 0; i < 20 && WiFi.status() != WL_CONNECTED; i++) {
        vTaskDelay(pdMS_TO_TICKS(500));
      }

      if (WiFi.status() == WL_CONNECTED) {
        wifiConnected = true;
        xEventGroupSetBits(systemEvents, EVT_WIFI_CONNECTED);
        Serial.printf("WiFi connected, IP: %s\n", WiFi.localIP().toString().c_str());
      } else {
        Serial.println("WiFi connection failed, retrying in 5s");
      }
    }
    vTaskDelay(pdMS_TO_TICKS(5000));
  }
}

void cameraStreamTask(void *param) {
  xEventGroupWaitBits(systemEvents, EVT_WIFI_CONNECTED, pdFALSE, pdTRUE, portMAX_DELAY);

  if (!initCamera()) {
    Serial.println("Camera unavailable, stream server not started");
    vTaskSuspend(NULL);
  }

  cameraReady = true;
  xEventGroupSetBits(systemEvents, EVT_CAMERA_READY);

  const char* headers[] = { "Accept" };
  streamServer.collectHeaders(headers, 1);
  streamServer.on("/stream",  HTTP_GET, handleStreamRequest);
  streamServer.on("/capture", HTTP_GET, handleStreamCapture);
  streamServer.begin();
  Serial.printf("Camera stream server listening on port %d\n", STREAM_PORT);

  for (;;) {
    streamServer.handleClient();
    vTaskDelay(pdMS_TO_TICKS(2));
  }
}

void httpServerTask(void *param) {
  xEventGroupWaitBits(systemEvents, EVT_WIFI_CONNECTED, pdFALSE, pdTRUE, portMAX_DELAY);

  apiServer.on("/capture",            HTTP_GET,  handleApiCapture);
  apiServer.on("/fingerprint/enroll", HTTP_POST, handleFingerprintEnroll);
  apiServer.on("/fingerprint/verify", HTTP_POST, handleFingerprintVerify);
  apiServer.on("/status",             HTTP_GET,  handleStatus);
  apiServer.begin();
  Serial.printf("HTTP API server listening on port %d\n", API_PORT);

  for (;;) {
    apiServer.handleClient();
    vTaskDelay(pdMS_TO_TICKS(2));
  }
}

void fingerprintTask(void *param) {
  // Call fpSerial.begin after finger.begin so custom RX/TX pins aren't reset to UART1 defaults
  finger.begin(FP_BAUD);
  fpSerial.begin(FP_BAUD, SERIAL_8N1, FP_RX, FP_TX);

  if (finger.verifyPassword()) {
    finger.getTemplateCount();
    fpSensorReady = true;
    xEventGroupSetBits(systemEvents, EVT_FP_SENSOR_READY);
    Serial.printf("R307S sensor ready (%u templates stored)\n", finger.templateCount);
  } else {
    Serial.println("R307S sensor not responding");
  }

  FpCommand cmd;
  for (;;) {
    if (xQueueReceive(commandQueue, &cmd, pdMS_TO_TICKS(500)) != pdTRUE) {
      continue;
    }

    FpResult result = {};
    if (cmd.type == CMD_ENROLL) {
      xEventGroupSetBits(systemEvents, EVT_FP_ENROLL_CMD);
      result.templateId = cmd.templateId;
      if (enrollFingerprint(cmd.templateId)) {
        result.success = true;
        snprintf(result.message, sizeof(result.message), "enrolled at slot %u", cmd.templateId);
        beep(1);
      } else {
        snprintf(result.message, sizeof(result.message), "enrollment failed");
        beep(2);
      }
      xEventGroupClearBits(systemEvents, EVT_FP_ENROLL_CMD);
    } else if (cmd.type == CMD_VERIFY) {
      xEventGroupSetBits(systemEvents, EVT_FP_VERIFY_CMD);
      result = verifyFingerprint();
      beep(result.success ? 1 : 2);
      xEventGroupClearBits(systemEvents, EVT_FP_VERIFY_CMD);
    }

    xQueueSend(resultQueue, &result, pdMS_TO_TICKS(1000));
  }
}

void statusLedTask(void *param) {
  bool greenOn = false;
  bool redOn = false;

  for (;;) {
    EventBits_t bits = xEventGroupGetBits(systemEvents);

    if (!(bits & EVT_WIFI_CONNECTED)) {
      greenOn = false;
      redOn = !redOn;
      digitalWrite(LED_GREEN, LOW);
      digitalWrite(LED_RED, redOn ? HIGH : LOW);
      vTaskDelay(pdMS_TO_TICKS(500));
      continue;
    }

    if (bits & (EVT_FP_ENROLL_CMD | EVT_FP_VERIFY_CMD)) {
      redOn = false;
      greenOn = !greenOn;
      digitalWrite(LED_RED, LOW);
      digitalWrite(LED_GREEN, greenOn ? HIGH : LOW);
      vTaskDelay(pdMS_TO_TICKS(150));
      continue;
    }

    greenOn = true;
    digitalWrite(LED_GREEN, HIGH);
    bool peripheralsOk = (bits & EVT_CAMERA_READY) && (bits & EVT_FP_SENSOR_READY);
    redOn = peripheralsOk ? false : !redOn;
    digitalWrite(LED_RED, redOn ? HIGH : LOW);
    vTaskDelay(pdMS_TO_TICKS(500));
  }
}

void watchdogTask(void *param) {
  // Let Wi-Fi, camera, and sensor finish boot initialization
  vTaskDelay(pdMS_TO_TICKS(30000));

  uint8_t wifiDownCycles = 0;

  for (;;) {
    uint32_t freeHeap = esp_get_free_heap_size();
    if (freeHeap < 20000) {
      Serial.printf("Critical low heap (%lu bytes), restarting\n",
                    static_cast<unsigned long>(freeHeap));
      esp_restart();
    }

    if (WiFi.status() != WL_CONNECTED) {
      wifiDownCycles++;
      if (wifiDownCycles >= 30) {
        Serial.println("WiFi unreachable for 5 minutes, restarting");
        esp_restart();
      }
    } else {
      wifiDownCycles = 0;
    }

    vTaskDelay(pdMS_TO_TICKS(10000));
  }
}

void setup() {
  Serial.begin(115200);
  Serial.println("NID SecureGuard booting...");

  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_RED, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_RED, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  systemEvents = xEventGroupCreate();
  commandQueue = xQueueCreate(10, sizeof(FpCommand));
  resultQueue  = xQueueCreate(10, sizeof(FpResult));
  serialMutex  = xSemaphoreCreateMutex();

  // Core 0: networking and camera
  xTaskCreatePinnedToCore(wifiManagerTask,  "wifiManager",  4096, NULL, 3, NULL, 0);
  xTaskCreatePinnedToCore(cameraStreamTask, "cameraStream", 8192, NULL, 4, NULL, 0);
  xTaskCreatePinnedToCore(httpServerTask,   "httpServer",   8192, NULL, 3, NULL, 0);

  // Core 1: fingerprint, status LEDs, watchdog
  xTaskCreatePinnedToCore(fingerprintTask,  "fingerprint",  4096, NULL, 4, NULL, 1);
  xTaskCreatePinnedToCore(statusLedTask,    "statusLed",    2048, NULL, 1, NULL, 1);
  xTaskCreatePinnedToCore(watchdogTask,     "watchdog",     2048, NULL, 5, NULL, 1);
}

void loop() {
  vTaskDelay(portMAX_DELAY);
}
