# NID SecureGuard: Dual-Biometric Identity Verification & Multi-Modal Access Control Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E.svg?logo=supabase&logoColor=white)](https://supabase.com)
[![ESP32-S3](https://img.shields.io/badge/ESP32--S3-FreeRTOS-E7352C.svg?logo=espressif&logoColor=white)](https://www.espressif.com)
[![OpenCV](https://img.shields.io/badge/OpenCV-LBPH_CV-5C3EE8.svg?logo=opencv&logoColor=white)](https://opencv.org)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg?logo=python&logoColor=white)](https://www.python.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **An end-to-end Cyber-Physical National Identity Verification and Access Control Platform coupling high-speed edge hardware (ESP32-S3, OV2640 camera DMA, Grow R307S optical fingerprint sensor) with an OpenCV LBPH facial recognition engine, Supabase PostgreSQL audit ledger, sovereign root operator governance, and standalone hardware booth kiosk isolation.**

> [!NOTE]
> **Complete Visual Demonstration Gallery:** For the complete 13-asset visual showcase—including full-resolution hardware station kiosk screens, dual-biometric enrollment studio, forensic security audit inspector, live ESP32-S3 FreeRTOS telemetry diagnostics, and physical silicon breadboard photographs—see the [Complete Visual Demonstration Gallery (Section 10)](#10-complete-visual-demonstration-gallery-all-13-assets).

---

## Table of Contents

1. [Key Features](#1-key-features)
2. [Master System Architecture](#2-master-system-architecture)
3. [How the System Works (Operational Pipeline)](#3-how-the-system-works-operational-pipeline)
   - [National Identity Query & Standby Clearance](#31-national-identity-query--standby-clearance)
   - [Optical Fingerprint Matching Pipeline](#32-optical-fingerprint-matching-pipeline)
   - [Facial Detection & LBPH Recognition Pipeline](#33-facial-detection--lbph-recognition-pipeline)
   - [Dual-Biometric Clearance Decision Formulation](#34-dual-biometric-clearance-decision-formulation)
   - [Sovereign Master Admin & Operator Authorization Matrix](#35-sovereign-master-admin--operator-authorization-matrix)
4. [Computer Vision & Biometric Algorithms](#4-computer-vision--biometric-algorithms)
5. [Embedded Hardware Layer (ESP32-S3 Cyber-Physical Edge)](#5-embedded-hardware-layer-esp32-s3-cyber-physical-edge)
6. [Hardware Station Kiosk Mode & Booth Isolation](#6-hardware-station-kiosk-mode--booth-isolation)
7. [Installation & Local Setup Guide](#7-installation--local-setup-guide)
8. [Automated Verification & Operational Telemetry](#8-automated-verification--operational-telemetry)
9. [Project & Repository Structure](#9-project--repository-structure)
10. [Complete Visual Demonstration Gallery (All 13 Assets)](#10-complete-visual-demonstration-gallery-all-13-assets)
11. [Author & Contact Information](#11-author--contact-information)
12. [License](#license)

---

## 1. Key Features

- **Dual-Modal Biometric Fusion:** Implements true two-factor physical biometric verification—requiring simultaneous convergence of an optical fingerprint hash (Grow R307S) and an OpenCV Local Binary Patterns Histograms (LBPH) facial recognition confidence threshold ($\le 85.0\text{ Euclidean}$).
- **FreeRTOS Dual-Core Asymmetric Task Separation:** ESP32-S3 firmware delegates high-speed DVP DMA camera streaming and HTTP API synchronization to **Core 0** while dedicating **Core 1** to non-blocking UART fingerprint sensor handshakes, GPIO indicator drivers, and a hardware Watchdog Timer (WDT).
- **Standalone Hardware Station Kiosk Mode:** Operates as a public-facing citizen verification booth out of the box. Automatically locks down the user interface to **Identity Verification** and **Biometric Enrollment**, preventing unauthorized access to administrative directories or telemetry consoles.
- **Sovereign Master Root Access Governance:** Centralized database-backed authorization matrix under Master Root Administrator (`masud.nil74@gmail.com`). Newly registered operators must verify their official Gmail address and await explicit cryptographic root clearance before console access is unlocked.
- **On-Demand Biometric Enrollment Studio:** Step-by-step multi-modal citizen onboarding featuring 5-frame facial training sample extraction, automatic LBPH model retraining, and R307S optical flash template allocation.
- **Immutable Cryptographic Audit Trail:** Every verification attempt—whether granted, denied, or flagged for biometric mismatch—is recorded in Supabase PostgreSQL with ISO-8601 timestamps, citizen NID references, Euclidean distance metrics, fingerprint match scores, and IP origin.
- **Real-Time Security Alarms & Incident Management:** Dynamic forensic incident scanner monitoring failed attempts, threshold violations, and hardware sensor telemetry with CSV audit exports and 1-click investigator dossier inspection.
- **Cloudflare Ingress Bridge:** Secure encrypted reverse-proxy tunneling routing edge ESP32 hardware telemetry over cellular hotspots without opening vulnerable inbound firewall ports.

---

## 2. Master System Architecture

```
+---------------------------------------------------------------------------------------------------+
|                                     MASTER SYSTEM TOPOLOGY                                        |
|                                                                                                   |
|  [ Physical Citizen at Booth ]                                                                    |
|             |                                                                                     |
|             v                                                                                     |
|  +---------------------------------------------------------------------------------------------+  |
|  |                              ESP32-S3 Cyber-Physical Edge Layer                             |  |
|  |  • Core 0: Wi-Fi Station, DVP DMA Camera Streamer (OV2640, SVGA/VGA @ 15-20 FPS)            |  |
|  |  • Core 1: UART1 Sensor Handshake (Grow R307S @ 57600 baud), GPIO 38/39 Indicator Drivers    |  |
|  |  • Task Watchdog Timer (WDT 5000ms), 8 MB Octal PSRAM, 16 MB Quad Flash                     |  |
|  +---------------------------------------------------------------------------------------------+  |
|             |                                           |                                         |
|    DVP JPEG HTTP Stream                       UART Template Verification                          |
|             |                                           |                                         |
|             v                                           v                                         |
|  +---------------------------------------------------------------------------------------------+  |
|  |                             FastAPI Central Processing Gateway                              |  |
|  |  • OpenCV LBPH Face Recognizer Engine (CascadeClassifier + cv2.face.LBPHFaceRecognizer)    |  |
|  |  • R307S Fingerprint Bridge & Template Score Assessor                                       |  |
|  |  • Dual-Biometric Fusion Evaluator (Threshold tau <= 85.0)                                  |  |
|  |  • Operator Governance API (/api/v1/operators/pending, /approve, /reject)                   |  |
|  +---------------------------------------------------------------------------------------------+  |
|             |                                           |                                         |
|             v                                           v                                         |
|  +-------------------------------------+     +-------------------------------------------------+  |
|  |         Supabase Cloud DB           |     |         React 19 + TypeScript Console           |  |
|  |  • PostgreSQL Relational Tables:   |     |  • Hardware Station Kiosk (Default Landing)     |  |
|  |    users, face_profiles,            |     |  • System Dashboard & Live Camera HUD View      |  |
|  |    fingerprint_records, logs        |     |  • Citizen Directory & Profile Dossier Inspector|  |
|  |  • Storage Bucket: face-samples    |     |  • Forensic Audit Ledger & CSV Export           |  |
|  |  • Auth User Metadata (RBAC)        |     |  • Sovereign Operator Authorization Queue       |  |
|  +-------------------------------------+     +-------------------------------------------------+  |
+---------------------------------------------------------------------------------------------------+
```

```mermaid
graph TD
    Citizen([Citizen at Station Booth]) -->|Enters National ID| Kiosk[Identity Verification Kiosk]
    Citizen -->|Stands in Field of View| Camera[OV2640 Camera Sensor]
    Citizen -->|Places Finger on Glass Prism| Fingerprint[Grow R307S Optical Sensor]
    
    Camera -->|DVP DMA Video Stream| ESP32[ESP32-S3 Dual-Core FreeRTOS]
    Fingerprint -->|UART1 57600 Baud Protocol| ESP32
    
    ESP32 -->|Wi-Fi HTTP Tunnel| Gateway[FastAPI Security Gateway]
    
    Gateway -->|Haar Cascade & LBPH Match| FaceEngine[OpenCV Face Recognition Engine]
    Gateway -->|Template ID & Match Score| FPEngine[Fingerprint Verification Engine]
    
    FaceEngine --> Decision{Dual-Biometric Fusion Evaluator}
    FPEngine --> Decision
    
    Decision -->|Both Biometrics Pass| Granted[ACCESS GRANTED - GPIO 38 Green LED]
    Decision -->|Mismatch or Timeout| Denied[ACCESS DENIED - GPIO 39 Red LED]
    
    Decision -->|Cryptographic Log Payload| Supabase[(Supabase Cloud Database)]
    Supabase <-->|Real-Time WebSockets| Dashboard[React 19 Security Dashboard]
    
    MasterAdmin([Shahriar Alom Masud - Root]) -->|Approves / Rejects Personnel| AuthQueue[Operator Authorization Queue]
    AuthQueue -->|Updates Metadata| Supabase
```

---

## 3. How the System Works (Operational Pipeline)

```
Citizen NID Lookup ──► Optical Fingerprint ──► Live Face Capture ──► Dual Fusion Engine ──► Clearance Decision
```

### 3.1 National Identity Query & Standby Clearance
When a citizen steps up to the verification station, they provide their registered National Identification Number (NID). The kiosk initiates an asynchronous lookup against the encrypted citizen database:
$$\text{CitizenProfile} = \text{Lookup}(\text{NID}) \quad \text{where } \text{NID} \in \text{DB}_{\text{citizens}}$$

If the citizen record is present, the terminal unlocks the optical fingerprint reader and live camera viewport. If unregistered, the system presents an immediate **On-Site Citizen Enrollment** prompt to capture biographical data and live biometrics.

### 3.2 Optical Fingerprint Matching Pipeline
The citizen places their finger onto the Grow R307S optical prism (500 DPI resolution, 256-byte template buffer). The sensor digitizes the ridge minutiae, computes the optical hash, and executes an on-chip search against the stored template ID:
$$\text{Match}_{\text{fp}} = \begin{cases} 
\text{True}, & \text{if } \text{Confidence}_{\text{score}} \ge 100 \text{ and } \text{ID}_{\text{sensor}} = \text{ID}_{\text{citizen}} \\
\text{False}, & \text{otherwise}
\end{cases}$$

### 3.3 Facial Detection & LBPH Recognition Pipeline
Concurrently, the ESP32-S3 camera streams live video frames ($640 \times 480\text{ VGA}$ or $800 \times 600\text{ SVGA}$) via direct memory access (DMA). The OpenCV backend:
1. Converts the frame to grayscale and equalizes image histogram variance:
   $$I_{\text{eq}} = \text{EqualizeHist}(\text{Grayscale}(I))$$
2. Detects the primary facial bounding box using a tuned Haar Cascade detector:
   $$\text{ROI}_{\text{face}} = \text{HaarCascade}(I_{\text{eq}})$$
3. Computes the Local Binary Patterns Histograms (LBPH) Euclidean distance against the trained model:
   $$D_{\text{euclid}} = \sqrt{\sum_{i=1}^{B} (H_{\text{live}}(i) - H_{\text{model}}(i))^2}$$

### 3.4 Dual-Biometric Clearance Decision Formulation
Access is granted if and only if **both** physical biometric modalities satisfy strict clearance criteria:

$$\text{Decision} = \begin{cases} 
\mathbf{GRANTED}, & \text{if } \text{Match}_{\text{fp}} = \text{True} \;\land\; D_{\text{euclid}} \le \tau_{\text{face}} \\
\mathbf{DENIED},  & \text{otherwise}
\end{cases}$$

Where the calibrated default threshold is $\tau_{\text{face}} = 85.0\text{ Euclidean}$ (tunable via System Settings between $65.0$ and $125.0$). 

Upon a `GRANTED` decision:
- ESP32 Core 1 pulses **GPIO 38** (Green LED Active) for $3000\text{ ms}$.
- Display renders authenticated citizen biographical credentials and issuance seals.
- Full forensic record is appended to the `security_logs` ledger.

Upon a `DENIED` decision:
- ESP32 Core 1 pulses **GPIO 39** (Red LED Active) with an alarm buzzer chime.
- Real-time incident alert is dispatched to the **Alerts & Incidents** command desk.

### 3.5 Sovereign Master Admin & Operator Authorization Matrix
The platform implements an institutional security governance hierarchy:
- **Master Root Sovereign (`masud.nil74@gmail.com`):** Holds permanent root administrative sovereignty. Holds exclusive authority to authorize, promote, or purge operator applicants.
- **Operator Registration Gate:** Newly onboarded field officers must register with their official email, verify their inbox confirmation token, and await manual approval from the Master Administrator.
- **Zero-Bypass Architecture:** Even when an operator confirms their email, the frontend and backend security gates strictly block console access (`isApproved == false`), isolating them on an **Account Pending Authorization** lock screen until root clearance is recorded in the database.

---

## 4. Computer Vision & Biometric Algorithms

### Local Binary Patterns Histograms (LBPH) Mathematical Formulation
The LBPH face recognizer operates by thresholding the $3 \times 3$ neighborhood around each pixel with the center pixel value, treating the result as an 8-bit binary number:

$$\text{LBP}(x_c, y_c) = \sum_{p=0}^{P-1} s(i_p - i_c) \cdot 2^p, \quad \text{where } s(x) = \begin{cases} 1, & x \ge 0 \\ 0, & x < 0 \end{cases}$$

Here, $i_c$ represents the intensity of the central pixel, $i_p$ denotes the intensities of the $P=8$ surrounding equidistant neighbors, and $R=1$ is the spatial radius. The resulting spatial texture map is divided into $8 \times 8$ local grid cells, from which histograms $H_j$ are extracted and concatenated into a global feature vector.

### Optical Fingerprint Minutiae Matching
The Grow R307S optical sensor features an onboard 32-bit DSP running proprietary feature extraction algorithms. It converts optical light reflected off finger epidermal friction ridges into a standardized 512-byte character buffer (`CharBuffer1` and `CharBuffer2`), subsequently synthesised into a flash template file. Verification matches the query buffer against stored templates using Euclidean distance between ridge bifurcations and ridge endings.

---

## 5. Embedded Hardware Layer (ESP32-S3 Cyber-Physical Edge)

### Hardware Pin Mapping & GPIO Matrix
| Component / Peripheral | Hardware Interface | ESP32-S3 Physical Pin | Operational Characteristics |
| :--- | :--- | :--- | :--- |
| **OmniVision OV2640** | DVP 8-bit Parallel DMA | GPIO 11–18 (D0–D7), GPIO 10 (PCLK), GPIO 9 (VSYNC), GPIO 8 (HREF) | 15–20 FPS Video Streaming, SVGA/VGA Mode |
| **OV2640 SCCB Control** | I2C Protocol | GPIO 4 (SDA), GPIO 5 (SCL) | Camera Configuration & Exposure Registers |
| **Grow R307S Sensor** | Hardware UART1 | GPIO 1 (ESP32 TX -> R307 RX), GPIO 2 (ESP32 RX -> R307 TX) | 57600 Baud, 3.3V Logic Level Interfacing |
| **Clearance Indicator** | External Digital Out | GPIO 38 | Active-HIGH Drive for Green LED / Relay Access Lock |
| **Rejection Indicator**| External Digital Out | GPIO 39 | Active-HIGH Drive for Red LED / Security Audible Buzzer |
| **Power Management**   | LDO Voltage Regulator | 5V / 3.3V Rail | Dedicated 2A External Power Supply |

### FreeRTOS Dual-Core Task Allocation
- **Core 0 (Network & Ingress Task):**
  - Manages Wi-Fi 802.11 b/g/n station connection and reconnection routines.
  - Serves direct HTTP JPEG multipart stream at `http://<device_ip>:81/stream`.
  - Transmits periodic JSON health telemetry heartbeats (heap space, uptime, Wi-Fi RSSI) every $5000\text{ ms}$.
- **Core 1 (Sensory & Real-Time Actuation Task):**
  - Executes non-blocking UART frame listener polling for R307S finger detection interrupt.
  - Controls GPIO 38/39 indicator drive with hardware millisecond timers.
  - Services FreeRTOS Task Watchdog Timer (`esp_task_wdt_reset()`) to guarantee autonomous recovery from bus hangs.

---

## 6. Hardware Station Kiosk Mode & Booth Isolation

To guarantee physical station security when deployed in public civic centers or immigration border points, the frontend implements an autonomous **Hardware Station Kiosk Mode**:

- **Default Landing Point:** The application initializes directly into the **Identity Verification Booth** (`VerificationKiosk.tsx`). Citizen service operates continuously without requiring administrative logins.
- **Strict Sidebar Isolation:** When running in booth mode, administrative directories (System Dashboard, Citizen Directory, Security Audit Logs, Alerts, Telemetry, System Settings, Operator Approvals) are stripped from the DOM and blocked by route guards.
- **Accessible Kiosk Routes:** Only two operational routes are permitted during booth mode:
  1. `Identity Verification` — Citizen NID lookup, camera HUD, and optical fingerprint verification.
  2. `Biometric Enrollment` — Live on-site citizen capture when an unregistered citizen appears at the booth.
- **Admin Console Gateway:** An **[Admin Portal Sign In]** action positioned in the top header and sidebar footer provides an authenticated gateway for authorized personnel to enter credentials and transition into the administrative console.

---

## 7. Installation & Local Setup Guide

### Prerequisites
- **Python 3.11+**
- **Node.js 18+ & npm**
- **Arduino IDE 2.x** with ESP32 board support package (Espressif Systems)
- **Supabase Cloud Account** or self-hosted Supabase instance

### Step 1: Clone Repository
```bash
git clone https://github.com/Masud744/NID-SecureGuard.git
cd NID-SecureGuard
```

### Step 2: Backend Setup
```bash
# Create and activate Python virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r backend/requirements.txt
```

Create `.env` in the root directory:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
SUPABASE_ANON_KEY=your-supabase-anon-key
ESP32_CAMERA_URL=http://192.168.1.100:81/stream
ESP32_BASE_URL=http://192.168.1.100
FACE_CONFIDENCE_THRESHOLD=85.0
FACE_SAMPLES_COUNT=20
```

### Step 3: Database Migration
Open your Supabase project's **SQL Editor** and execute the schema initialization:
```sql
-- Located in database/schema.sql
-- Creates citizens (users), face_profiles, fingerprint_records, security_logs
```
Ensure a private storage bucket named `face-samples` is provisioned.

### Step 4: Frontend Setup
```bash
cd dashboard
npm install
```

### Step 5: Run Platform Locally
- **Start Backend API:**
  ```bash
  source .venv/bin/activate
  cd backend
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload
  ```
- **Start Frontend Dashboard:**
  ```bash
  cd dashboard
  npm run dev
  ```
- **Access Kiosk:** Navigate your browser to `http://localhost:3000`. The platform loads directly into the **Hardware Station Kiosk** interface.

---

## 8. Automated Verification & Operational Telemetry

The platform is backed by automated endpoint verification and health probes:

```bash
# Verify Backend Health Check
curl -s http://127.0.0.1:8000/health
# Response: {"status":"healthy","device_online":true,"camera":true,"fingerprint_sensor":true}

# Query Pending Operator Queue
curl -s http://127.0.0.1:8000/api/v1/operators/pending

# Query Approved Personnel
curl -s http://127.0.0.1:8000/api/v1/operators/approved
```

**Verification Results:**
- **Zero Unicode Emojis:** Strictly verified across all TypeScript, Python, and CSS files via automated unicode range validation.
- **Clean TypeScript Build:** Vite production compilation (`tsc && vite build`) executes in under $2.40\text{ s}$ with zero type errors.

---

## 9. Project & Repository Structure

```
NID-SecureGuard/
├── backend/                        # FastAPI Central Security Gateway
│   ├── main.py                     # Application entry point, CORS & router registration
│   ├── config.py                   # Pydantic environment configuration
│   ├── requirements.txt            # Python dependencies (OpenCV, FastAPI, Supabase, Uvicorn)
│   ├── core/                       # Core utilities
│   │   ├── supabase_client.py      # Supabase client singleton (Service Role)
│   │   └── exceptions.py           # Custom exception definitions & error envelopes
│   ├── models/schemas.py           # Pydantic data contract models
│   ├── routes/                     # REST API endpoints
│   │   ├── auth.py                 # Identity verification pipeline (/api/v1/verify)
│   │   ├── users.py                # Citizen registration & profile endpoints
│   │   ├── face.py                 # OpenCV LBPH face training & enrollment
│   │   ├── fingerprint.py          # R307S optical fingerprint enrollment bridge
│   │   ├── operators.py            # Master Admin operator authorization endpoints
│   │   ├── device.py               # Hardware telemetry & live camera capture
│   │   ├── logs.py                 # Immutable security audit trail
│   │   └── health.py               # ESP32 and gateway health probes
│   └── services/                   # Business logic layers
│       ├── auth_service.py         # Dual-biometric clearance evaluator
│       ├── face_service.py         # OpenCV Haar Cascade & LBPH recognizer
│       ├── fingerprint_service.py  # R307S UART protocol handler
│       ├── user_service.py         # Citizen database CRUD operations
│       └── device_bridge.py        # ESP32 camera & sensor socket manager
├── dashboard/                      # React 19 + TypeScript + Vite Frontend
│   ├── src/
│   │   ├── App.tsx                 # Root application controller & security guards
│   │   ├── main.tsx                # React DOM entry point
│   │   ├── components/             # User Interface Views
│   │   │   ├── VerificationKiosk.tsx    # Hardware Station Kiosk (Default Landing)
│   │   │   ├── DashboardView.tsx        # System Dashboard & Telemetry HUD
│   │   │   ├── RegistrationStudio.tsx   # Biometric Enrollment Studio (Step 1-3)
│   │   │   ├── CitizenDirectory.tsx     # Citizen Ledger & Profile Dossiers
│   │   │   ├── AuditLogs.tsx            # Security Audit Logs & CSV Export
│   │   │   ├── AlertsView.tsx           # Alerts & Incident Resolution Desk
│   │   │   ├── DeviceView.tsx           # Hardware & Telemetry Diagnostics
│   │   │   ├── SettingsView.tsx         # System Parameters & Biometric Thresholds
│   │   │   ├── OperatorApprovalsView.tsx # Master Admin Access Control Console
│   │   │   ├── PendingApprovalView.tsx  # Unapproved Operator Lock Screen
│   │   │   ├── AuthView.tsx             # Operator Sign In & Provisioning Portal
│   │   │   ├── Header.tsx               # Top Telemetry Bar & Profile Controls
│   │   │   └── Sidebar.tsx              # Adaptive RBAC Navigation Drawer
│   │   ├── lib/
│   │   │   ├── api.ts              # REST API client wrappers & data contracts
│   │   │   ├── auth.ts             # Supabase Auth helper & Master Admin rules
│   │   │   └── supabase.ts         # Supabase client initialization
│   │   └── types/index.ts          # Global TypeScript interfaces
│   ├── package.json                # Frontend dependencies
│   └── vite.config.ts              # Vite proxy configuration
├── database/                       # Database Architecture & DDL
│   ├── schema.sql                  # PostgreSQL tables, relations & indexes
│   └── storage.sql                 # Supabase Storage bucket security rules
├── firmware/                       # Embedded Firmware Source
│   └── esp32_secureguard/
│       ├── esp32_secureguard.ino   # FreeRTOS dual-core tasks & camera DMA
│       └── README.md               # Hardware wiring & flashing guide
├── Images/                         # 13 Complete Visual Showcase Assets
├── .env.example                    # Environment variable template
├── .gitignore                      # Git artifact exclusions
└── README.md                       # Master Technical Documentation
```

---

## 10. Complete Visual Demonstration Gallery (All 13 Assets)

### 10.1 Hardware Station Kiosk & Citizen Verification
| Identity Verification Kiosk (Default Landing) | Biometric Enrollment Studio |
| :---: | :---: |
| ![Identity Verification Kiosk](Images/kiosk_verification.png) | ![Biometric Enrollment Studio](Images/kiosk_enrollment.png) |
| *Standalone station booth with live camera HUD, R307S optical fingerprint prompt, and encrypted citizen profile card* | *3-step multi-modal citizen onboarding: biographical data, 5-frame LBPH facial capture, and optical fingerprint registration* |

### 10.2 Central Command & Operator Governance
| System Command Dashboard | Sovereign Operator Authorization Console |
| :---: | :---: |
| ![System Dashboard](Images/dashboard_overview.png) | ![Operator Approvals Console](Images/database_console.png) |
| *Real-time biometric analytics, verification traffic charts, live ESP32 camera viewport, and FreeRTOS telemetry metrics* | *Master Root Administrator (`masud.nil74@gmail.com`) queue for approving, reviewing, or purging pending operator accounts* |

### 10.3 Citizen Directory & Security Audit Intelligence
| Verified Citizen Directory | Immutable Security Audit Ledger |
| :---: | :---: |
| ![Citizen Directory](Images/citizen_directory.png) | ![Security Audit Logs](Images/audit_logs.png) |
| *National citizen identity registry with biographical profile cards, enrolled biometric badges, and verification history* | *Cryptographic audit trail with 1-click forensic inspector, NID copy utilities, decision filters, and CSV export* |

### 10.4 Security Alarms, Incidents & System Parameters
| Real-Time Alerts & Incidents Center | System Parameters & Biometric Thresholds |
| :---: | :---: |
| ![Alerts & Incidents](Images/alerts_incidents.png) | ![System Settings](Images/system_settings.png) |
| *Live alarm monitor tracking unauthorized access attempts, optical sensor timeouts, and persistent incident resolution* | *Biometric confidence thresholds ($\tau$), hardware timeouts, GPIO LED toggles, and Cloudflare tunnel parameters* |

### 10.5 Hardware Diagnostics & FreeRTOS Telemetry
| Hardware & Telemetry Diagnostic Console |
| :---: |
| ![Hardware Telemetry](Images/hardware_telemetry.png) |
| *ESP32-S3 FreeRTOS dual-core task monitor, R307S UART ping meter, live camera latency meter, and GPIO bus matrix* |

### 10.6 Access Control Portals & Official Email Handshake
| Operator Sign-In Gateway | Operator Provisioning Portal | Official Email Verification Gate |
| :---: | :---: | :---: |
| ![Operator Sign In](Images/auth_login.png) | ![Operator Registration](Images/auth_register.png) | ![Email Verification](Images/email_verification.png) |
| *Encrypted login portal with anti-autofill protection* | *Officer provisioning with badge ID & station assignment* | *Gmail confirmation handshake gate preventing unauthorized bypass* |

### 10.7 Physical Silicon Prototype & Cyber-Physical Testbed
| ESP32-S3 Cyber-Physical Testbed Bench Photograph |
| :---: |
| ![Physical Hardware Prototype](Images/hardware_prototype.jpeg) |
| *Physical testbed setup featuring ESP32-S3-WROOM-1 (N16R8), OmniVision OV2640 camera module, Grow R307S optical fingerprint sensor, and hardware breadboard bus* |

---

## 11. Author & Contact Information

**Shahriar Alom Masud**  
B.Sc. Engg. in IoT & Robotics Engineering  
University of Frontier Technology, Bangladesh  
- **Email:** [shahriar0002@std.uftb.ac.bd](mailto:shahriar0002@std.uftb.ac.bd) / [masud.nil74@gmail.com](mailto:masud.nil74@gmail.com)  
- **LinkedIn:** [https://www.linkedin.com/in/shahriar-alom-masud](https://www.linkedin.com/in/shahriar-alom-masud)  
- **GitHub:** [https://github.com/Masud744](https://github.com/Masud744)

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
