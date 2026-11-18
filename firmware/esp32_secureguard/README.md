# ESP32-S3 SecureGuard Firmware

Dual-core FreeRTOS firmware for the ESP32-S3-WROOM-1 N16R8 board running an OV2640 camera and an R307S optical fingerprint sensor.

## Pin Connections

### OV2640 Camera

| Signal | GPIO | Signal | GPIO |
|--------|------|--------|------|
| XCLK   | 10   | Y5     | 16   |
| SIOD   | 40   | Y4     | 18   |
| SIOC   | 39   | Y3     | 17   |
| Y9     | 48   | Y2     | 15   |
| Y8     | 11   | VSYNC  | 38   |
| Y7     | 12   | HREF   | 47   |
| Y6     | 14   | PCLK   | 13   |

`PWDN` and `RESET` are not connected (`-1`).

### Peripherals

| Component        | Pin / Bus                          |
|------------------|------------------------------------|
| R307S Sensor     | UART1 — RX=GPIO44, TX=GPIO43, 57600 baud |
| Green Status LED | GPIO1                              |
| Red Status LED   | GPIO2                              |
| Buzzer           | GPIO42                             |

## Libraries

Install via Arduino IDE:

- **esp32** board package by Espressif (v2.0.14+ — includes `WiFi.h`, `WebServer.h`, and `esp_camera.h`)
- **Adafruit Fingerprint Sensor Library** (v2.1+)

## Board Settings (Arduino IDE)

- **Board:** ESP32S3 Dev Module
- **Flash Size:** 16MB (128Mb)
- **PSRAM:** OPI PSRAM
- **Partition Scheme:** Huge APP (3MB No OTA / 1MB SPIFFS)
- **Upload Speed:** 921600

## Configuration

Set your network credentials and backend address at the top of `esp32_secureguard.ino`:

```cpp
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* BACKEND_URL   = "http://YOUR_BACKEND_IP:8000";
```

Open Serial Monitor at `115200` baud after flashing to get the device IP address.

## Endpoints

The camera stream runs on port `81` so MJPEG streaming never blocks API requests on port `80`.

| Port | Method | Path                  | Description                        |
|------|--------|-----------------------|------------------------------------|
| 81   | GET    | `/stream`             | MJPEG camera stream (or single JPEG with `Accept: image/jpeg`) |
| 81   | GET    | `/capture`            | Single JPEG frame                  |
| 80   | GET    | `/capture`            | Single JPEG frame                  |
| 80   | POST   | `/fingerprint/enroll` | Enroll slot (`template_id` JSON or query param, 30s timeout) |
| 80   | POST   | `/fingerprint/verify` | Scan and match fingerprint (15s timeout) |
| 80   | GET    | `/status`             | JSON status (`wifi`, `camera`, `fingerprint`, `free_heap`, `free_psram`) |

## Task Layout

- **Core 0:** `wifiManagerTask` (prio 3), `cameraStreamTask` (prio 4), `httpServerTask` (prio 3)
- **Core 1:** `fingerprintTask` (prio 4), `statusLedTask` (prio 1), `watchdogTask` (prio 5)
