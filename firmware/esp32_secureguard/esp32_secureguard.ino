#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <esp_camera.h>
#include <Adafruit_Fingerprint.h>
#include <mbedtls/md.h>
#include <time.h>
#include <sys/time.h>

#if __has_include("credentials.h")
#include "credentials.h"
#else
const char* WIFI_SSID           = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD       = "YOUR_WIFI_PASSWORD";
const char* BACKEND_URL         = "https://nid-secureguard-api.onrender.com";
const char* ESP32_DEVICE_SECRET = "8d4b7bd8c1ea93b8928c4c9e9786848dadb18aa54ba74eae346af847ea62ad4c";
#endif

#define CAM_XCLK   15
#define CAM_SIOD   4
#define CAM_SIOC   5
#define CAM_Y9     16
#define CAM_Y8     17
#define CAM_Y7     18
#define CAM_Y6     12
#define CAM_Y5     10
#define CAM_Y4     8
#define CAM_Y3     9
#define CAM_Y2     11
#define CAM_VSYNC  6
#define CAM_HREF   7
#define CAM_PCLK   13
#define CAM_PWDN   -1
#define CAM_RESET  -1

#define FP_RX      1
#define FP_TX      2
#define FP_BAUD    57600

#define LED_GREEN  41
#define LED_RED    21
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
  cfg.xclk_freq_hz = 10000000;
  cfg.pixel_format = PIXFORMAT_JPEG;
  cfg.frame_size   = FRAMESIZE_VGA;
  cfg.jpeg_quality = 16;
  cfg.fb_location  = CAMERA_FB_IN_PSRAM;
  cfg.fb_count     = 1;
  cfg.grab_mode    = CAMERA_GRAB_WHEN_EMPTY;

  if (!psramFound()) {
    cfg.fb_location  = CAMERA_FB_IN_DRAM;
    cfg.fb_count     = 1;
    cfg.jpeg_quality = 16;
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

  // Turn optical blue LED ON for scan 1
  finger.LEDcontrol(true);
  finger.LEDcontrol(FINGERPRINT_LED_ON, 0, FINGERPRINT_LED_BLUE);
  digitalWrite(LED_GREEN, HIGH);

  bool firstOk = waitForFinger(10000) && (finger.image2Tz(1) == FINGERPRINT_OK);

  // Turn optical LED OFF / prompt lift
  finger.LEDcontrol(false);
  finger.LEDcontrol(FINGERPRINT_LED_OFF, 0, FINGERPRINT_LED_BLUE);
  digitalWrite(LED_GREEN, LOW);

  if (!firstOk) {
    Serial.println("First scan failed or timed out");
    xSemaphoreGive(serialMutex);
    return false;
  }

  beep(1);

  // Wait for finger lift so the second scan isn't a duplicate of the first
  unsigned long liftStart = millis();
  while (finger.getImage() != FINGERPRINT_NOFINGER && (millis() - liftStart) < 5000) {
    vTaskDelay(pdMS_TO_TICKS(100));
  }
  vTaskDelay(pdMS_TO_TICKS(500));

  Serial.println("Place the same finger again");
  // Turn optical blue LED ON for scan 2
  finger.LEDcontrol(true);
  finger.LEDcontrol(FINGERPRINT_LED_ON, 0, FINGERPRINT_LED_BLUE);
  digitalWrite(LED_GREEN, HIGH);

  bool secondOk = waitForFinger(10000) && (finger.image2Tz(2) == FINGERPRINT_OK);

  finger.LEDcontrol(false);
  finger.LEDcontrol(FINGERPRINT_LED_OFF, 0, FINGERPRINT_LED_BLUE);
  digitalWrite(LED_GREEN, LOW);

  if (!secondOk) {
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

  // Turn on optical sensor blue LED and status green LED so user clearly sees sensor is active!
  finger.LEDcontrol(true);
  finger.LEDcontrol(FINGERPRINT_LED_ON, 0, FINGERPRINT_LED_BLUE);
  digitalWrite(LED_GREEN, HIGH);

  bool detected = waitForFinger(10000);

  // Turn off LEDs immediately after scan
  finger.LEDcontrol(false);
  finger.LEDcontrol(FINGERPRINT_LED_OFF, 0, FINGERPRINT_LED_BLUE);
  digitalWrite(LED_GREEN, LOW);

  if (!detected) {
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
  WiFi.setSleep(false);

  for (;;) {
    if (WiFi.status() != WL_CONNECTED) {
      wifiConnected = false;
      xEventGroupClearBits(systemEvents, EVT_WIFI_CONNECTED);

      Serial.printf("Connecting to WiFi: %s...\n", WIFI_SSID);
      WiFi.disconnect();
      vTaskDelay(pdMS_TO_TICKS(200));
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

      for (int i = 0; i < 30 && WiFi.status() != WL_CONNECTED; i++) {
        vTaskDelay(pdMS_TO_TICKS(500));
      }

      if (WiFi.status() == WL_CONNECTED) {
        wifiConnected = true;
        xEventGroupSetBits(systemEvents, EVT_WIFI_CONNECTED);
        Serial.printf("WiFi connected! IP: %s, RSSI: %d dBm\n",
                      WiFi.localIP().toString().c_str(), WiFi.RSSI());
        configTime(0, 0, "pool.ntp.org", "time.google.com");
      } else {
        Serial.println("WiFi connection failed. Scanning 2.4GHz networks in range...");
        int n = WiFi.scanNetworks();
        if (n == 0) {
          Serial.println("  No 2.4GHz WiFi networks found nearby.");
        } else {
          Serial.printf("  Found %d networks:\n", n);
          for (int i = 0; i < n; ++i) {
            Serial.printf("    [%d] SSID: '%s' | RSSI: %d dBm | Ch: %d | Enc: %d\n",
                          i + 1, WiFi.SSID(i).c_str(), WiFi.RSSI(i), WiFi.channel(i), WiFi.encryptionType(i));
          }
        }
        Serial.println("Note: ESP32 only supports 2.4GHz. If using mobile hotspot, ensure AP Band is set to 2.4GHz.");
        Serial.println("Retrying in 5s...\n");
      }
    }
    vTaskDelay(pdMS_TO_TICKS(5000));
  }
}

void cameraStreamTask(void *param) {
  // Wait for Wi-Fi and power rails to stabilize before initializing camera
  xEventGroupWaitBits(systemEvents, EVT_WIFI_CONNECTED, pdFALSE, pdTRUE, portMAX_DELAY);
  vTaskDelay(pdMS_TO_TICKS(500));

  bool ok = false;
  for (int attempt = 1; attempt <= 3; attempt++) {
    if (initCamera()) {
      ok = true;
      break;
    }
    Serial.printf("Camera init attempt %d failed, retrying in 1s...\n", attempt);
    vTaskDelay(pdMS_TO_TICKS(1000));
  }

  if (!ok) {
    Serial.println("Camera unavailable, stream server not started");
    vTaskSuspend(NULL);
  }

  cameraReady = true;
  xEventGroupSetBits(systemEvents, EVT_CAMERA_READY);
  Serial.println("OV2640 camera ready, starting stream server");

  const char* headers[] = { "Accept" };
  streamServer.collectHeaders(headers, 1);
  streamServer.on("/stream",  HTTP_GET, handleStreamRequest);
  streamServer.on("/capture", HTTP_GET, handleStreamCapture);
  streamServer.begin();
  Serial.printf("Camera stream server listening on port %d\n", STREAM_PORT);

  for (;;) {
    streamServer.handleClient();
    vTaskDelay(pdMS_TO_TICKS(25));
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
    vTaskDelay(pdMS_TO_TICKS(25));
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

static String jsonStringField(const String &body, const char *key) {
  String needle = String("\"") + key + "\":\"";
  int start = body.indexOf(needle);
  if (start < 0) return "";
  start += needle.length();
  int end = body.indexOf('"', start);
  return (end > start) ? body.substring(start, end) : "";
}

static int jsonIntField(const String &body, const char *key, int fallback) {
  String needle = String("\"") + key + "\":";
  int start = body.indexOf(needle);
  if (start < 0) return fallback;
  start += needle.length();
  while (start < static_cast<int>(body.length()) && body[start] == ' ') {
    start++;
  }
  int end = start;
  while (end < static_cast<int>(body.length()) &&
         (isDigit(body[end]) || body[end] == '-')) {
    end++;
  }
  return (end > start) ? body.substring(start, end).toInt() : fallback;
}

static String computeHmacSha256(const uint8_t *payload, size_t payloadLen, uint32_t timestamp) {
  char tsStr[16];
  snprintf(tsStr, sizeof(tsStr), "%lu", static_cast<unsigned long>(timestamp));
  size_t tsLen = strlen(tsStr);

  uint8_t rawSecret[32];
  size_t secretLen = strlen(ESP32_DEVICE_SECRET);
  const uint8_t *keyPtr = reinterpret_cast<const uint8_t *>(ESP32_DEVICE_SECRET);
  if (secretLen == 64) {
    for (size_t i = 0; i < 32; i++) {
      char byteChars[3] = { ESP32_DEVICE_SECRET[i * 2], ESP32_DEVICE_SECRET[i * 2 + 1], '\0' };
      rawSecret[i] = static_cast<uint8_t>(strtoul(byteChars, nullptr, 16));
    }
    keyPtr = rawSecret;
    secretLen = 32;
  }

  mbedtls_md_context_t ctx;
  mbedtls_md_init(&ctx);
  mbedtls_md_setup(&ctx, mbedtls_md_info_from_type(MBEDTLS_MD_SHA256), 1);
  mbedtls_md_hmac_starts(&ctx, keyPtr, secretLen);
  if (payload && payloadLen > 0) {
    mbedtls_md_hmac_update(&ctx, (const unsigned char *)payload, payloadLen);
  }
  mbedtls_md_hmac_update(&ctx, (const unsigned char *)tsStr, tsLen);

  unsigned char hmacOutput[32];
  mbedtls_md_hmac_finish(&ctx, hmacOutput);
  mbedtls_md_free(&ctx);

  char hexBuf[65];
  for (int i = 0; i < 32; i++) {
    sprintf(hexBuf + (i * 2), "%02x", hmacOutput[i]);
  }
  hexBuf[64] = '\0';
  return String(hexBuf);
}

static bool beginBackendRequest(HTTPClient &http, WiFiClientSecure &tls,
                                WiFiClient &plain, const String &url,
                                uint16_t timeoutMs) {
  http.setTimeout(timeoutMs);
  if (url.startsWith("https://")) {
    tls.setInsecure();
    return http.begin(tls, url);
  }
  return http.begin(plain, url);
}

static uint32_t getDeviceEpoch() {
  time_t now = time(nullptr);
  if (now > 1700000000) {
    return static_cast<uint32_t>(now);
  }
  return 0;
}

static void syncDeviceTime(const String &baseUrl) {
  time_t now = time(nullptr);
  if (now > 1700000000) {
    return;
  }

  Serial.println("Syncing device clock via NTP...");
  configTime(0, 0, "pool.ntp.org", "time.google.com");
  for (int i = 0; i < 30; i++) {
    vTaskDelay(pdMS_TO_TICKS(200));
    now = time(nullptr);
    if (now > 1700000000) {
      Serial.printf("Clock synced via NTP: %lu\n", static_cast<unsigned long>(now));
      return;
    }
  }

  Serial.println("NTP pending, querying backend /api/v1/device/time...");
  WiFiClientSecure tls;
  WiFiClient plain;
  HTTPClient http;
  String url = baseUrl + "/api/v1/device/time";
  if (beginBackendRequest(http, tls, plain, url, 8000)) {
    int code = http.GET();
    if (code == 200) {
      String resp = http.getString();
      int start = resp.indexOf("\"epoch\":");
      if (start >= 0) {
        start += 8;
        while (start < static_cast<int>(resp.length()) && (resp[start] == ' ' || resp[start] == ':')) start++;
        uint32_t epoch = strtoul(resp.c_str() + start, nullptr, 10);
        if (epoch > 1700000000) {
          struct timeval tv = { .tv_sec = static_cast<time_t>(epoch), .tv_usec = 0 };
          settimeofday(&tv, NULL);
          Serial.printf("Clock synced via backend HTTP: %lu\n", static_cast<unsigned long>(epoch));
        }
      }
    }
    http.end();
  }
}

static void postBridgeResult(const String &baseUrl, const String &cmdId,
                             bool success, uint16_t templateId,
                             uint16_t confidence, const char *message) {
  WiFiClientSecure tls;
  WiFiClient plain;
  HTTPClient http;
  String url = baseUrl + "/api/v1/device/result";

  if (!beginBackendRequest(http, tls, plain, url, 10000)) {
    return;
  }
  http.addHeader("Content-Type", "application/json");

  char body[256];
  snprintf(body, sizeof(body),
           "{\"cmd_id\":\"%s\",\"success\":%s,\"template_id\":%u,"
           "\"confidence\":%u,\"message\":\"%s\"}",
           cmdId.c_str(),
           success ? "true" : "false",
           templateId,
           confidence,
           message);

  uint32_t now = getDeviceEpoch();
  if (now > 0) {
    String sig = computeHmacSha256(reinterpret_cast<const uint8_t *>(body), strlen(body), now);
    http.addHeader("X-Device-Timestamp", String(now));
    http.addHeader("X-Device-Signature", sig);
  }

  http.POST(reinterpret_cast<uint8_t *>(body), strlen(body));
  http.end();
}

static void handleBridgeCapture(const String &baseUrl, const String &cmdId, int count) {
  if (!cameraReady) {
    postBridgeResult(baseUrl, cmdId, false, 0, 0, "camera not ready");
    return;
  }

  if (count < 1) count = 1;
  if (count > 20) count = 20;

  // Discard one buffered frame so captures reflect the current view
  camera_fb_t *stale = esp_camera_fb_get();
  if (stale) {
    esp_camera_fb_return(stale);
  }

  int sent = 0;
  for (int i = 0; i < count; i++) {
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
      vTaskDelay(pdMS_TO_TICKS(100));
      continue;
    }

    WiFiClientSecure tls;
    WiFiClient plain;
    HTTPClient http;
    String url = baseUrl + "/api/v1/device/frame?cmd_id=" + cmdId;
    if (beginBackendRequest(http, tls, plain, url, 15000)) {
      http.addHeader("Content-Type", "image/jpeg");
      uint32_t now = getDeviceEpoch();
      if (now > 0) {
        String sig = computeHmacSha256(fb->buf, fb->len, now);
        http.addHeader("X-Device-Timestamp", String(now));
        http.addHeader("X-Device-Signature", sig);
      }
      int code = http.POST(fb->buf, fb->len);
      if (code >= 200 && code < 300) {
        sent++;
      }
      http.end();
    }
    esp_camera_fb_return(fb);
    if (i + 1 < count) {
      vTaskDelay(pdMS_TO_TICKS(150));
    }
  }

  if (sent == 0) {
    postBridgeResult(baseUrl, cmdId, false, 0, 0, "frame upload failed");
  }
}

static void handleBridgeFingerprint(const String &baseUrl, const String &cmdId,
                                    CommandType type, uint16_t templateId) {
  if (!fpSensorReady) {
    postBridgeResult(baseUrl, cmdId, false, 0, 0, "fingerprint sensor not ready");
    return;
  }

  FpResult stale;
  while (xQueueReceive(resultQueue, &stale, 0) == pdTRUE) {}

  FpCommand cmd = {type, templateId};
  if (xQueueSend(commandQueue, &cmd, pdMS_TO_TICKS(1000)) != pdTRUE) {
    postBridgeResult(baseUrl, cmdId, false, 0, 0, "command queue full");
    return;
  }

  uint32_t waitMs = (type == CMD_ENROLL) ? 30000 : 15000;
  FpResult res;
  if (xQueueReceive(resultQueue, &res, pdMS_TO_TICKS(waitMs)) != pdTRUE) {
    postBridgeResult(baseUrl, cmdId, false, 0, 0, "fingerprint timeout");
    return;
  }

  postBridgeResult(baseUrl, cmdId, res.success, res.templateId, res.confidence, res.message);
}

void backendBridgeTask(void *param) {
  String baseUrl(BACKEND_URL);
  while (baseUrl.endsWith("/")) {
    baseUrl.remove(baseUrl.length() - 1);
  }

  if (baseUrl.length() == 0 || baseUrl.indexOf("YOUR_BACKEND_IP") >= 0) {
    Serial.println("Backend bridge disabled (BACKEND_URL not configured)");
    vTaskDelete(NULL);
    return;
  }

  Serial.printf("Backend bridge targeting %s\n", baseUrl.c_str());

  for (;;) {
    xEventGroupWaitBits(systemEvents, EVT_WIFI_CONNECTED, pdFALSE, pdTRUE, portMAX_DELAY);

    if (getDeviceEpoch() == 0) {
      syncDeviceTime(baseUrl);
    }

    WiFiClientSecure tls;
    WiFiClient plain;
    HTTPClient http;
    String pollUrl = baseUrl + "/api/v1/device/poll";

    if (!beginBackendRequest(http, tls, plain, pollUrl, 25000)) {
      vTaskDelay(pdMS_TO_TICKS(3000));
      continue;
    }

    http.addHeader("Content-Type", "application/json");
    char hb[220];
    snprintf(hb, sizeof(hb),
             "{\"camera\":%s,\"fingerprint\":%s,\"free_heap\":%lu,"
             "\"free_psram\":%lu,\"ip\":\"%s\"}",
             cameraReady ? "true" : "false",
             fpSensorReady ? "true" : "false",
             static_cast<unsigned long>(esp_get_free_heap_size()),
             static_cast<unsigned long>(ESP.getFreePsram()),
             WiFi.localIP().toString().c_str());

    uint32_t now = getDeviceEpoch();
    if (now > 0) {
      String sig = computeHmacSha256(reinterpret_cast<const uint8_t *>(hb), strlen(hb), now);
      http.addHeader("X-Device-Timestamp", String(now));
      http.addHeader("X-Device-Signature", sig);
    }

    int code = http.POST(reinterpret_cast<uint8_t *>(hb), strlen(hb));
    String resp = http.getString();
    http.end();

    if (code != 200) {
      Serial.printf("Bridge poll failed (HTTP %d): %s\n", code, resp.c_str());
      vTaskDelay(pdMS_TO_TICKS(3000));
      continue;
    }

    String cmdId = jsonStringField(resp, "cmd_id");
    String cmdType = jsonStringField(resp, "type");
    if (cmdId.length() == 0 || cmdType.length() == 0) {
      continue;
    }

    if (cmdType == "capture") {
      int count = jsonIntField(resp, "count", 1);
      handleBridgeCapture(baseUrl, cmdId, count);
    } else if (cmdType == "enroll") {
      int tid = jsonIntField(resp, "template_id", 1);
      handleBridgeFingerprint(baseUrl, cmdId, CMD_ENROLL, static_cast<uint16_t>(tid));
    } else if (cmdType == "verify") {
      handleBridgeFingerprint(baseUrl, cmdId, CMD_VERIFY, 0);
    }
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

  // Core 0: networking, camera, and outbound tunnel bridge
  xTaskCreatePinnedToCore(wifiManagerTask,   "wifiManager",   4096,  NULL, 3, NULL, 0);
  xTaskCreatePinnedToCore(cameraStreamTask,  "cameraStream",  8192,  NULL, 4, NULL, 0);
  xTaskCreatePinnedToCore(httpServerTask,    "httpServer",    8192,  NULL, 3, NULL, 0);
  xTaskCreatePinnedToCore(backendBridgeTask, "backendBridge", 10240, NULL, 3, NULL, 0);

  // Core 1: fingerprint, status LEDs, watchdog
  xTaskCreatePinnedToCore(fingerprintTask,  "fingerprint",  4096, NULL, 4, NULL, 1);
  xTaskCreatePinnedToCore(statusLedTask,    "statusLed",    2048, NULL, 1, NULL, 1);
  xTaskCreatePinnedToCore(watchdogTask,     "watchdog",     2048, NULL, 5, NULL, 1);
}

void loop() {
  vTaskDelay(portMAX_DELAY);
}
