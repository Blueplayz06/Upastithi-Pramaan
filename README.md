# Upastithi-Pramaan — Backend API

FastAPI + Supabase backend for the Upastithi-Pramaan smart attendance system.

## Quick Start

### 1. Set Up Supabase
1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → **New Query**, paste the contents of [`supabase_schema.sql`](./supabase_schema.sql) and click **Run**
3. Go to **Project Settings → API** and copy your **URL**, **anon key**, and **service_role key**

### 2. Configure Environment
```powershell
cd backend
copy .env.example .env
# Now open .env in a text editor and fill in your Supabase credentials
```

### 3. Install Dependencies
```powershell
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Run the Server
```powershell
uvicorn main:app --reload
```

The API is now live at **http://127.0.0.1:8000**  
Interactive docs: **http://127.0.0.1:8000/docs**

---

## Default Credentials (seed data)
| Role | ID | Password |
|------|----|----------|
| Admin | `ADM-001` | `admin@123` |
| Faculty | (add via admin panel) | `frcrce@123` |
| Student | (enroll via admin panel) | `frcrce@123` |

> ⚠️ Always change default passwords in production!

---

## API Overview

| Router prefix | Description |
|---|---|
| `POST /auth/login` | Login → returns JWT |
| `GET /students/me` | Student profile, attendance, calendar, device, disputes |
| `GET /faculty/me` | Faculty profile, session management, analytics, reports |
| `GET /admin/overview` | Admin CRUD for students, faculty, devices, logs, disputes |
| `GET /disputes/` | Submit / resolve / reject disputes |
| `GET /notifications/` | Notifications for any logged-in user |

Full endpoint list available in Swagger UI at `/docs`.

---

## Project Structure
```
backend/
├── main.py               # FastAPI app + CORS + router registration
├── database.py           # Supabase client singleton
├── dependencies.py       # JWT auth dependency + role guard
├── requirements.txt
├── .env.example
├── supabase_schema.sql   # Run this in Supabase SQL Editor
├── models/
│   ├── auth.py           # LoginRequest, TokenResponse
│   ├── student.py        # Student schemas
│   ├── faculty.py        # Faculty schemas
│   └── admin.py          # Admin schemas
├── routers/
│   ├── auth.py           # POST /auth/login
│   ├── students.py       # /students/me/*
│   ├── faculty.py        # /faculty/*
│   ├── admin.py          # /admin/*
│   ├── disputes.py       # /disputes/*
│   └── notifications.py  # /notifications/*
└── utils/
    ├── auth.py           # JWT create/verify + password hashing
    └── reports.py        # CSV export helper
```

## Connecting the Frontend
In the React frontend, set the base URL to `http://localhost:8000` (or use a `.env` variable like `REACT_APP_API_URL`).  
After `/auth/login`, store the `access_token` in `localStorage` and include it as:
```
Authorization: Bearer <token>
```
in all subsequent API requests.
