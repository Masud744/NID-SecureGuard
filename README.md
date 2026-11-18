# NID SecureGuard

NID SecureGuard is a dual-biometric identity verification system that pairs National ID (NID) lookup with face recognition and fingerprint matching. An ESP32-S3 board streams video from an OV2640 camera and talks to an R307S optical fingerprint sensor, while a FastAPI backend runs OpenCV LBPH face recognition, coordinates both checks, and stores user profiles, face samples, and access logs in Supabase.

## System Architecture

```text
+-----------------------------------+         Wi-Fi (HTTP)         +----------------------------------+
|     ESP32-S3-WROOM-1 (N16R8)      | <--------------------------> |         FastAPI Backend          |
|                                   |                              |                                  |
|  Core 0: Wi-Fi, Camera, HTTP API  |   GET  /stream, /capture     |  - OpenCV LBPH Face Recognition  |
|  Core 1: Fingerprint, LEDs, WDT   |   POST /fingerprint/enroll   |  - ESP32 Fingerprint HTTP Client |
|                                   |   POST /fingerprint/verify   |  - Dual-Biometric Decision Logic |
|  [OV2640 Camera]  [R307S Sensor]  |   GET  /status               |  - REST API (/api/v1/*)          |
+-----------------------------------+                              +----------------+-----------------+
                                                                                    |
                                                                                    | HTTPS (service_role)
                                                                                    v
                                                                   +----------------------------------+
                                                                   |            Supabase              |
                                                                   |                                  |
                                                                   |  - PostgreSQL (users, profiles,  |
                                                                   |    fingerprints, security_logs)  |
                                                                   |  - Storage (face-samples bucket) |
                                                                   +----------------------------------+
```

Access is granted only when the user's NID exists, their face matches the enrolled LBPH label within the configured confidence threshold, and the scanned fingerprint matches their stored template ID. Every attempt (granted or denied) is written to `security_logs`.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Hardware / Edge | ESP32-S3-WROOM-1 (N16R8), OV2640 camera, R307S fingerprint sensor |
| Firmware | Arduino C++, FreeRTOS (dual-core tasks), `Adafruit_Fingerprint` |
| Backend | Python 3.10+, FastAPI, Uvicorn, Pydantic v2, HTTPX |
| Computer Vision | OpenCV (`opencv-contrib-python` Haar Cascade + LBPH recognizer), NumPy |
| Database & Storage | Supabase (PostgreSQL with RLS + private Storage bucket) |

## Project Structure

```text
.
├── .env.example
├── .gitignore
├── README.md
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── requirements.txt
│   ├── core/
│   │   ├── supabase_client.py
│   │   └── exceptions.py
│   ├── models/
│   │   └── schemas.py
│   ├── services/
│   │   ├── face_service.py
│   │   ├── fingerprint_service.py
│   │   ├── auth_service.py
│   │   └── user_service.py
│   ├── routes/
│   │   ├── health.py
│   │   ├── users.py
│   │   ├── face.py
│   │   ├── fingerprint.py
│   │   ├── auth.py
│   │   └── logs.py
│   └── data/
│       └── .gitkeep
├── database/
│   ├── schema.sql
│   └── storage.sql
├── docs/
│   └── .gitkeep
└── firmware/
    └── esp32_secureguard/
        ├── esp32_secureguard.ino
        └── README.md
```

## Prerequisites

- **Python 3.10+** (with `pip` and `venv`)
- **Arduino IDE 2.x**
- **ESP32-S3 board package** (`esp32` by Espressif Systems installed via Board Manager)
- **Supabase account** with a project created

## Quick Start

### 1. Database Setup

Open your Supabase project's **SQL Editor** and run the two SQL scripts in order:

1. [`database/schema.sql`](database/schema.sql) — creates `users`, `face_profiles`, `fingerprint_records`, `security_logs`, indexes, and RLS policies.
2. [`database/storage.sql`](database/storage.sql) — creates the private `face-samples` bucket (JPEG/PNG only, 5 MB limit).

Grab your project URL, `service_role` key, and `anon` key from **Project Settings -> API**.

### 2. Backend Setup

Copy the example environment file and fill in your Supabase credentials and ESP32 IP:

```bash
cp .env.example .env
```

Create a virtual environment, install dependencies, and start the server:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive API docs will be available at `http://localhost:8000/docs`.

### 3. Firmware Setup

1. Open `firmware/esp32_secureguard/esp32_secureguard.ino` in Arduino IDE 2.x.
2. Install the **Adafruit Fingerprint Sensor Library** from Library Manager.
3. Select **ESP32S3 Dev Module** with **OPI PSRAM** enabled and **16MB** flash (for N16R8 boards).
4. Set your Wi-Fi SSID, password, and backend URL at the top of the sketch.
5. Flash the board and open Serial Monitor (`115200` baud) to note the ESP32's IP address, then put it in your `.env` file.

See [`firmware/esp32_secureguard/README.md`](firmware/esp32_secureguard/README.md) for full pin mappings and board settings.

## API Endpoints

### Backend (FastAPI)

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/health` | Check backend health and ESP32 camera/fingerprint status |
| `POST` | `/api/v1/users` | Register a new user with NID and profile details |
| `GET` | `/api/v1/users` | List registered users |
| `GET` | `/api/v1/users/{user_id}` | Fetch a single user and enrollment status |
| `POST` | `/api/v1/enroll/face/{user_id}` | Capture face samples from ESP32, upload to storage, and train LBPH model |
| `POST` | `/api/v1/enroll/fingerprint/{user_id}` | Trigger R307S enrollment on ESP32 and record the template ID |
| `POST` | `/api/v1/verify` | Run dual-biometric verification (face + fingerprint) for an NID |
| `GET` | `/api/v1/logs` | Retrieve recent verification logs |

Example verification request:

```bash
curl -X POST http://localhost:8000/api/v1/verify \
  -H "Content-Type: application/json" \
  -d '{"nid_number": "1990123456789"}'
```

### Device (ESP32-S3)

| Method | Port | Endpoint | Description |
| --- | --- | --- | --- |
| `GET` | `81` | `/stream` | Live MJPEG stream from the OV2640 camera |
| `GET` | `80`, `81` | `/capture` | Capture a single JPEG frame |
| `POST` | `80` | `/fingerprint/enroll` | Enroll a fingerprint into a given `template_id` slot |
| `POST` | `80` | `/fingerprint/verify` | Scan a finger and return the matched `template_id` and confidence |
| `GET` | `80` | `/status` | Report Wi-Fi, camera, fingerprint readiness, free heap, and free PSRAM |

## Environment Variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `SUPABASE_URL` | Yes | — | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | — | Supabase `service_role` key (used by backend; bypasses RLS) |
| `SUPABASE_ANON_KEY` | No | — | Supabase `anon` key (for client-side / admin dashboard use) |
| `ESP32_CAMERA_URL` | No | `http://192.168.1.100:81/stream` | ESP32 MJPEG camera stream URL |
| `ESP32_BASE_URL` | No | `http://192.168.1.100` | Base URL for ESP32 HTTP control endpoints |
| `FACE_CONFIDENCE_THRESHOLD` | No | `80` | Max LBPH distance accepted as a face match (lower is stricter) |
| `FACE_SAMPLES_COUNT` | No | `20` | Number of face frames captured per user during enrollment |

## License

MIT
