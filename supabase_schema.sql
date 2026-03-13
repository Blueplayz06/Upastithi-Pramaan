-- ============================================================
-- Upastithi-Pramaan — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── 1. USERS (auth table — shared by all roles) ──────────────────────────────
create table if not exists users (
  id            uuid primary key default uuid_generate_v4(),
  role          text not null check (role in ('student', 'faculty', 'admin')),
  password_hash text not null,
  admin_id      text unique,          -- only for admin users e.g. "ADM-001"
  name          text,                 -- only for admin users
  created_at    timestamptz default now()
);

-- ── 2. STUDENTS ───────────────────────────────────────────────────────────────
create table if not exists students (
  id           uuid primary key references users(id) on delete cascade,
  roll         text unique not null,
  name         text not null,
  division     text not null,
  semester     text default '5',
  email        text,
  department   text default 'Computer Engineering',
  institution  text default 'Fr. Conceicao Rodrigues College of Engineering',
  created_at   timestamptz default now()
);

-- ── 3. FACULTY ────────────────────────────────────────────────────────────────
create table if not exists faculty (
  id           uuid primary key references users(id) on delete cascade,
  emp_id       text unique not null,
  name         text not null,
  department   text default 'Computer Engineering',
  subjects     text[] default '{}',
  email        text,
  created_at   timestamptz default now()
);

-- ── 4. SUBJECTS ───────────────────────────────────────────────────────────────
create table if not exists subjects (
  id           uuid primary key default uuid_generate_v4(),
  code         text unique not null,   -- e.g. "CS-101"
  name         text not null,          -- e.g. "Data Structures"
  faculty_id   uuid references faculty(id) on delete set null,
  semester     text default '5',
  created_at   timestamptz default now()
);

-- ── 5. SESSIONS ───────────────────────────────────────────────────────────────
create table if not exists sessions (
  id           uuid primary key default uuid_generate_v4(),
  subject_id   uuid not null references subjects(id) on delete cascade,
  faculty_id   uuid not null references faculty(id) on delete cascade,
  started_at   timestamptz default now(),
  ended_at     timestamptz,
  active       boolean default true,
  created_at   timestamptz default now()
);

-- ── 6. ATTENDANCE RECORDS ─────────────────────────────────────────────────────
create table if not exists attendance_records (
  id             uuid primary key default uuid_generate_v4(),
  session_id     uuid not null references sessions(id) on delete cascade,
  student_id     uuid not null references students(id) on delete cascade,
  face_verified  boolean default false,
  mac_verified   boolean default false,
  confidence     numeric(5,2),          -- face recognition confidence %
  marked_at      timestamptz,
  created_at     timestamptz default now(),
  unique (session_id, student_id)       -- one record per student per session
);

-- ── 7. DEVICES (MAC address registry) ────────────────────────────────────────
create table if not exists devices (
  id            uuid primary key default uuid_generate_v4(),
  mac           text not null,
  device_name   text,
  student_id    uuid references students(id) on delete cascade,
  status        text default 'pending' check (status in ('approved', 'pending', 'flagged')),
  registered_at timestamptz default now()
);

-- ── 8. DISPUTES ───────────────────────────────────────────────────────────────
create table if not exists disputes (
  id          uuid primary key default uuid_generate_v4(),
  student_id  uuid not null references students(id) on delete cascade,
  subject_id  uuid not null references subjects(id) on delete cascade,
  date        date not null,
  message     text not null,
  status      text default 'pending' check (status in ('pending', 'resolved', 'rejected')),
  created_at  timestamptz default now()
);

-- ── 9. NOTIFICATIONS ──────────────────────────────────────────────────────────
create table if not exists notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references users(id) on delete cascade,
  type       text default 'info' check (type in ('info', 'success', 'warning', 'error')),
  message    text not null,
  read       boolean default false,
  created_at timestamptz default now()
);

-- ── 10. AUDIT LOGS ────────────────────────────────────────────────────────────
create table if not exists audit_logs (
  id         uuid primary key default uuid_generate_v4(),
  actor_id   uuid,          -- nullable: SYSTEM actions have no actor
  action     text not null, -- e.g. "LOGIN", "SESSION_START", "DEVICE_APPROVE"
  details    text,
  created_at timestamptz default now()
);

-- ── INDEXES ───────────────────────────────────────────────────────────────────
create index if not exists idx_attendance_session    on attendance_records(session_id);
create index if not exists idx_attendance_student    on attendance_records(student_id);
create index if not exists idx_sessions_faculty      on sessions(faculty_id);
create index if not exists idx_sessions_active       on sessions(active) where active = true;
create index if not exists idx_devices_student       on devices(student_id);
create index if not exists idx_devices_status        on devices(status);
create index if not exists idx_disputes_student      on disputes(student_id);
create index if not exists idx_disputes_status       on disputes(status);
create index if not exists idx_notifications_user    on notifications(user_id);
create index if not exists idx_audit_logs_actor      on audit_logs(actor_id);
create index if not exists idx_audit_logs_created    on audit_logs(created_at);

-- ── SEED DATA ────────────────────────────────────────────────────────────────
-- Insert a default admin user.
-- Password is bcrypt hash of "admin@123" — change in production!
insert into users (id, role, password_hash, admin_id, name)
values (
  '00000000-0000-0000-0000-000000000001',
  'admin',
  '$2a$12$vD.XhNmS.BjOee.zGmrKWuDadiPdC6ISf6tmoTKd7Cx0rsGbQy1Zu',
  'Daksh',
  'System Admin'
) on conflict (id) do nothing;

-- Insert sample subjects
insert into subjects (code, name, semester) values
  ('CS-101', 'Data Structures',    '5'),
  ('CS-203', 'Database Management','5'),
  ('CS-305', 'Operating Systems',  '5'),
  ('CS-401', 'Computer Networks',  '5')
on conflict (code) do nothing;
