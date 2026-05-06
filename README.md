<div align="center">
  
# <img src="https://img.icons8.com/fluency/48/security-checked.png" width="36" /> Upastithi-Pramaan
### **The Elite Multi-Factor Smart Attendance Architecture**

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Web_App-React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![React Native](https://img.shields.io/badge/Mobile_App-React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Docker](https://img.shields.io/badge/Container-Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

An award-winning, state-of-the-art attendance system ensuring zero-proxy through a **Four-Layered Cryptographic & Biometric Verification Engine**. Designed with an immersive, cyberpunk-inspired UI, delivering 100% feature parity across both Web Dashboard and Mobile Applications.

</div>

---

## <img src="https://img.icons8.com/fluency/48/lightning-bolt.png" width="28" /> The Ultimate 4-Layer Verification Protocol

Proxy attendance is mathematically and physically impossible. The system verifies identity through an impenetrable **Layer-4 Architecture**:

| Layer | Technology | Security Function |
| :---: | :--- | :--- |
| <img src="https://img.icons8.com/fluency/48/1-circle.png" width="24" /> | **Liveness + Facial Recognition** | Verifies 3D liveness (Smile/Blink/Turn) and maps 128-D facial embeddings using `face_recognition` (HOG+CNN) against the Supabase secured storage. |
| <img src="https://img.icons8.com/fluency/48/2-circle.png" width="24" /> | **BLE Environmental Proximity** | Validates spatial proximity by matching emitted BLE (Bluetooth Low Energy) beacon signatures between the Faculty and Student devices. |
| <img src="https://img.icons8.com/fluency/48/3-circle.png" width="24" /> | **Rotating 2FA Cryptography** | Requires a live 6-digit Time-Based One-Time Password (TOTP) generated server-side via APScheduler, rotating every 5 minutes. |
| <img src="https://img.icons8.com/fluency/48/4-circle.png" width="24" /> | **MAC Address Whitelisting** | Confirms request origin via registered Device MAC address ensuring attendance is marked from an approved, untampered device. |

---

## <img src="https://img.icons8.com/fluency/48/rocket.png" width="28" /> Architectural Overview

The system features a decoupled, microservices-oriented architecture using standard containerization via Docker.

<details>
<summary><b>View Sequence Flow (Mermaid diagram)</b></summary>
<br/>

```mermaid
sequenceDiagram
    participant FacultyApp as Faculty App
    participant Beacon as BLE Beacon
    participant StudentApp as Student App
    participant Backend as Python Backend
    participant DB as Supabase DB

    Note over FacultyApp, DB: 1. Session Initialization
    FacultyApp->>Backend: Create Active Session
    Backend->>DB: Store Session details
    Backend-->>FacultyApp: Returns 6-digit rotating 2FA Code
    FacultyApp->>Beacon: Start Broadcasting BLE Signature

    Note over StudentApp, DB: 2. Layered Verification Process
    StudentApp->>StudentApp: Step 1: Liveness Check & Face Capture
    
    StudentApp->>Beacon: Step 2: Scan for BLE Beacon Match
    Beacon-->>StudentApp: Match Confirmed (Proximity Verified)
    
    StudentApp->>StudentApp: Step 3: User inputs Faculty's 2FA Code
    StudentApp->>Backend: /verify-2fa (Validates code locally)
    Backend-->>StudentApp: 2FA Verified

    Note over StudentApp, Backend: 3. Final Submission
    StudentApp->>Backend: Final API call: Submit all params (MAC, Base64 Face, etc.)
    Backend->>Backend: Verify Image against Database embeddings
    Backend->>DB: Mark Attendance Record as Present
    Backend-->>StudentApp: Success: Attendance Recorded!
```
</details>

---

## <img src="https://img.icons8.com/fluency/48/imac.png" width="28" /> Elite Web & Mobile Dashboards (100% Parity)

The client interfaces deliver a premium, fluid aesthetic utilizing **GSAP** micro-interactions on the Web and **Reanimated** on Mobile.

### <img src="https://img.icons8.com/fluency/48/group.png" width="24" /> 1. Student Portal
* **Automated Attendance:** One-tap initialization kicking off the 4-layer validation.
* **Attendance Ledger:** Subject-wise breakdown, historical progress bars, and calendar heatmap.
* **System Operations:** View Notifications, File Disputes, and trigger Device Change Requests.

### <img src="https://img.icons8.com/fluency/48/graduation-cap.png" width="24" /> 2. Faculty Command Center
* **Live Session Broadcasting:** Project real-time rotating 2FA codes directly to a projector/screen.
* **Instant Roster Control:** Monitor incoming attendance matches live. Faculty override capabilities provided.
* **Deep Analytics:** 30-day class trends, dynamic defaulter lists (sub-75%), and CSV Exports (Date-ranged).

### <img src="https://img.icons8.com/fluency/48/settings.png" width="24" /> 3. Admin Control Panel
* **Central System Health:** Monitor total enrollments, live sessions, and active API hits.
* **User & AI Management:** Perform single/bulk CSV uploads for Students & Faculty. View & trigger Face Model retrains.
* **Dispute & Device Resolutions:** One-click approvals for flagged devices and pending attendance disputes.
* **Audit Trail:** Exhaustive timeline audit logs for all systemic actions.

---

## <img src="https://img.icons8.com/fluency/48/wrench.png" width="28" /> Technology Stack & Libraries

### <img src="https://img.icons8.com/color/48/python--v1.png" width="24" /> Backend Infrastructure
- **FastAPI / Uvicorn:** High-performance async Python framework.
- **Supabase (PostgreSQL / Storage):** Scalable Database and Face Image storage.
- **Python-Jose & Bcrypt:** Secure JWT role-based Auth & password hashing.
- **APScheduler:** Background daemon for synchronized TOTP code rotations.
- **Dlib & Face Recognition (Numpy):** High-accuracy ML modeling.

### <img src="https://img.icons8.com/fluency/48/domain.png" width="24" /> Web Client (React.js)
- **React Router DOM:** Dynamic SPA routing.
- **GSAP & ScrollTrigger:** Award-winning micro-animations, magnetic buttons, and fluid page transitions.
- **Lucide React / React Icons:** Crisp, world-class SVGs for elite visual typography.

### <img src="https://img.icons8.com/fluency/48/smartphone.png" width="24" /> Mobile Client (React Native / Expo)
- **Expo Camera:** Custom face frame alignment and liveness capture interface.
- **React Native BLE Plx:** Low-level environmental Bluetooth peripheral scanning.
- **Expo Secure Store:** Hardware-encrypted JWT keychain storage.
- **Expo Haptics:** Physical feedback mapping.

---

## <img src="https://img.icons8.com/fluency/48/flash-on.png" width="28" /> Quick Start & Deployment Guide

### Environment Preparation

You need a `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`. 
Load `backend/supabase_schema.sql` into your Supabase SQL Editor.

### Method 1: Docker (Recommended)
Boot up the entire network (Backend + Frontend) instantly.
```bash
docker-compose up --build
```
> Web UI available at: `http://localhost:80`
> Backend API available at: `http://localhost:8000/docs`

### Method 2: Local Native Execution

**Terminal 1: Python Backend**
```bash
cd backend
python -m venv venv
source venv/Scripts/activate  # Or 'venv/bin/activate' on Linux/Mac
pip install -r requirements.txt
cp .env.example .env          # Setup Supabase Keys
uvicorn main:app --reload --port 8000
```

**Terminal 2: React Web Frontend**
```bash
cd frontend
npm install
npm start
```

**Terminal 3: React Native Expo Mobile App**
```bash
cd upastithi-pramaan-app
npm install
cp .env.example .env          # Set EXPO_PUBLIC_API_URL to your Local IP
npx expo start
```
*Ensure Mobile and Backend Dev Machine are connected to the same Wi-Fi network to enable local API bridging.*

---

## <img src="https://img.icons8.com/fluency/48/key.png" width="28" /> Default Provisioned Roles

| Role Level | Identity Code | Default Password | Access Tier |
| :--- | :--- | :--- | :--- |
| **System Admin** | `ADM-001` | `********` | Master configuration, Dispute management, Analytics |
| **Faculty Member** | *(Add via Admin)* | `********` | Session management, Defaulter tracking, Analytics |
| **Student** | *(Enroll via Admin)* | `********` | Attendance verification, Self-tracking, Device Requests |

*(Note: Passwords are hashed in Supabase via 72-byte bcrypt salts. Please cycle defaults upon production launch.)*

---

<div align="center">
  <i>Developed for Fr. Conceicao Rodrigues College of Engineering, Mumbai<br/>
  TE Computer Engineering, Division B Mini Project 2025-26</i><br/>
  <b>Team: Devansh Nayak (10268), Blaise Rodrigues (10275), Daksh Thakkar (10283), Aryan Verma (10287)</b>
</div>
