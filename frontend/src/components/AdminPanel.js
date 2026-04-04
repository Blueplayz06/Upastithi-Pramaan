import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import {
  Scan, Users, Shield, Database, BarChart2,
  CheckCircle2, AlertTriangle, Activity, LogOut, UserPlus,
  Trash2, Search, Download, RefreshCw, Upload,
  ChevronRight, Bell, Smartphone, FileText, Menu, X, Loader
} from 'lucide-react';
import { adminApi, clearAuth, downloadBlob } from '../api';
import { useAuth } from '../context/AuthContext';
import './AdminPanel.css';

const ADMIN_NAV = [
  { id: 'overview', icon: <Activity size={17} />, label: 'Overview' },
  { id: 'students', icon: <Users size={17} />, label: 'Students' },
  { id: 'faculty', icon: <Shield size={17} />, label: 'Faculty' },
  { id: 'devices', icon: <Smartphone size={17} />, label: 'Devices' },
  { id: 'logs', icon: <FileText size={17} />, label: 'Audit Logs' },
  { id: 'disputes', icon: <Bell size={17} />, label: 'Disputes' },
  { id: 'analytics', icon: <BarChart2 size={17} />, label: 'Analytics' },
  { id: 'facemodel', icon: <Database size={17} />, label: 'Face Model' },
];

function StatCard({ icon, label, val, sub, color, trend }) {
  return (
    <div className="ap__stat-tile ap__card">
      <div className="ap__stat-icon" style={{ color }}>{icon}</div>
      <div className="ap__stat-value" style={{ color }}>{val}</div>
      <div className="ap__stat-label">{label}</div>
      {sub && <div className="ap__stat-sub">{sub}</div>}
      {trend && <div className="ap__stat-trend" style={{ color: 'var(--green)' }}>{trend}</div>}
    </div>
  );
}

function Badge({ status }) {
  const cls = status === 'approved' ? 'ap__badge-green'
    : status === 'pending' ? 'ap__badge-amber'
      : status === 'flagged' ? 'ap__badge-red'
        : status === 'resolved' ? 'ap__badge-green'
          : status === 'rejected' ? 'ap__badge-red'
            : 'ap__badge-amber';
  return <span className={`ap__badge ${cls}`}>{status}</span>;
}

// Maps raw DB action strings → human-readable labels
const ACTION_LABELS = {
  LOGIN: 'Logged In',
  LOGOUT: 'Logged Out',
  ENROLL_STUDENT: 'Student Enrolled',
  DELETE_STUDENT: 'Student Removed',
  UPDATE_STUDENT: 'Student Updated',
  ADD_FACULTY: 'Faculty Added',
  DELETE_FACULTY: 'Faculty Removed',
  UPDATE_FACULTY: 'Faculty Updated',
  SESSION_START: 'Session Started',
  SESSION_END: 'Session Ended',
  ATTENDANCE_OVERRIDE: 'Attendance Overridden',
  DISPUTE_SUBMIT: 'Dispute Submitted',
  DISPUTE_RESOLVE: 'Dispute Resolved',
  DISPUTE_REJECT: 'Dispute Rejected',
  DEVICE_CHANGE_REQUEST: 'Device Change Requested',
  DEVICE_APPROVED: 'Device Approved',
  DEVICE_FLAGGED: 'Device Flagged',
  FACE_MODEL_RETRAIN: 'Face Model Retrained',
};
function formatAction(raw) {
  if (!raw) return '—';
  return ACTION_LABELS[raw] || raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [tab, setTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const mainRef = useRef(null);

  /* ── Data state ── */
  const [overview, setOverview] = useState(null);
  const [students, setStudents] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [devices, setDevices] = useState([]);
  const [logs, setLogs] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [faceModel, setFaceModel] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  /* ── Enroll form ── */
  const [enrollForm, setEnrollForm] = useState({ roll: '', name: '', division: 'B', email: '', semester: '5', mac: '', department: 'Computer Engineering', password: 'frcrce@123' });
  const [enrollMsg, setEnrollMsg] = useState('');
  const [addFacForm, setAddFacForm] = useState({ emp_id: '', name: '', department: 'Computer Engineering', subjects: '', email: '', password: 'frcrce@123' });
  const [addFacMsg, setAddFacMsg] = useState('');

  const handleLogout = useCallback(() => { logout(); clearAuth(); navigate('/'); }, [logout, navigate]);

  /* ── Entry animation ── */
  useEffect(() => {
    gsap.fromTo(mainRef.current, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' });
    loadOverview();
    // eslint-disable-next-line
  }, []);

  /* ── Tab animation ── */
  useEffect(() => {
    gsap.fromTo('.ap__tab-content', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.38, ease: 'power2.out' });
  }, [tab]);

  /* ── Fetch data when tab changes ── */
  useEffect(() => {
    const loaders = {
      overview: loadOverview,
      students: () => loadData(adminApi.getStudents, setStudents),
      faculty: () => loadData(adminApi.getFaculty, setFaculty),
      devices: () => loadData(adminApi.getDevices, setDevices),
      logs: () => loadData(adminApi.getLogs, setLogs),
      disputes: () => loadData(adminApi.getDisputes, setDisputes),
      analytics: () => loadData(adminApi.getAnalytics, setAnalytics),
      facemodel: () => loadData(adminApi.getFaceModel, setFaceModel),
    };
    loaders[tab]?.();
    // eslint-disable-next-line
  }, [tab]);

  const loadOverview = () => loadData(adminApi.getOverview, d => {
    setOverview(d);
    setPendingCount(d?.pending_actions || 0);
  });
  const loadData = async (fn, setter) => {
    setLoading(true);
    try { setter(await fn()); }
    catch (err) { if (err.message?.includes('401')) handleLogout(); }
    finally { setLoading(false); }
  };

  const enrollStudent = async (e) => {
    e.preventDefault();
    setEnrollMsg('');
    try {
      await adminApi.enrollStudent(enrollForm);
      setEnrollMsg('✓ Student enrolled successfully.');
      setEnrollForm({ roll: '', name: '', division: 'B', email: '', semester: '5', mac: '', department: 'Computer Engineering', password: 'frcrce@123' });
      loadData(adminApi.getStudents, setStudents);
    } catch (err) { setEnrollMsg('Error: ' + err.message); }
  };

  const addFaculty = async (e) => {
    e.preventDefault();
    setAddFacMsg('');
    try {
      await adminApi.addFaculty(addFacForm);
      setAddFacMsg('✓ Faculty added successfully.');
      setAddFacForm({ emp_id: '', name: '', department: 'Computer Engineering', subjects: '', email: '', password: 'frcrce@123' });
      loadData(adminApi.getFaculty, setFaculty);
    } catch (err) { setAddFacMsg('Error: ' + err.message); }
  };

  const handleStudentCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      setLoading(true);
      const res = await adminApi.massEnrollStudents(fd);
      alert(res.message + (res.errors.length ? "\nErrors:\n" + res.errors.join("\n") : ""));
      loadData(adminApi.getStudents, setStudents);
    } catch (err) { alert("Error: " + err.message); }
    finally { setLoading(false); e.target.value = null; }
  };

  const handleFacultyCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      setLoading(true);
      const res = await adminApi.massAddFaculty(fd);
      alert(res.message + (res.errors.length ? "\nErrors:\n" + res.errors.join("\n") : ""));
      loadData(adminApi.getFaculty, setFaculty);
    } catch (err) { alert("Error: " + err.message); }
    finally { setLoading(false); e.target.value = null; }
  };

  const fStudents = students.filter(s =>
    s.name?.toLowerCase().includes(query.toLowerCase()) || s.roll?.includes(query));
  const fDevices = devices.filter(d =>
    d.mac?.toLowerCase().includes(query.toLowerCase()) || d.students?.name?.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="ap__shell">
      {sidebarOpen && <div className="ap__sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`ap__sidebar${sidebarOpen ? ' ap__sidebar-open' : ''}`}>
        <button className="ap__sidebar-close" onClick={() => setSidebarOpen(false)} title="Close"><X size={15} /></button>
        <div className="ap__sidebar-logo">
          <div className="ap__sidebar-logo-icon"><Scan size={14} color="var(--red)" /></div>
          <div className="ap__sidebar-logo-text">
            <div className="ap__sidebar-logo-name">UPASTITHI</div>
            <div className="ap__sidebar-logo-sub">ADMIN CONSOLE</div>
          </div>
        </div>
        <div className="ap__sidebar-profile">
          <div className="ap__sidebar-avatar">AD</div>
          <div className="ap__sidebar-profile-info">
            <div className="ap__sidebar-profile-name">System Admin</div>
            <div className="ap__sidebar-profile-id">ADM-001 · Administrator</div>
          </div>
        </div>
        <nav className="ap__sidebar-nav">
          {ADMIN_NAV.map(item => (
            <button key={item.id}
              className={`ap__sidebar-nav-btn${tab === item.id ? ' ap__active' : ''}`}
              onClick={() => { setTab(item.id); setSidebarOpen(false); setQuery(''); }}>
              <span className="ap__sidebar-nav-icon">{item.icon}</span>
              <span className="ap__sidebar-nav-label">{item.label}</span>
              {item.id === 'disputes' && pendingCount > 0 && <span className="ap__sidebar-nav-badge">{pendingCount}</span>}
              {tab === item.id && <ChevronRight size={12} className="ap__sidebar-nav-chevron" />}
            </button>
          ))}
        </nav>
        <div className="ap__sidebar-footer">
          <button className="ap__sidebar-logout" onClick={handleLogout}>
            <LogOut size={14} /><span>Logout</span>
          </button>
        </div>
      </aside>

      <main ref={mainRef} className="ap__main">
        {/* Topbar */}
        <div className="ap__topbar">
          <div className="ap__topbar-left">
            <button className="ap__topbar-hamburger" onClick={() => setSidebarOpen(o => !o)} title="Toggle sidebar">
              <Menu size={19} />
            </button>
            <div>
              <div className="ap__topbar-title">{ADMIN_NAV.find(n => n.id === tab)?.label}</div>
              <div className="ap__topbar-date">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
          </div>
          <div className="ap__topbar-right">
            <span className="ap__badge ap__badge-red"><span className="g-pulse-dot" />ADMIN PANEL</span>
          </div>
        </div>

        <div className="ap__content">
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-dim)', fontSize: '0.72rem', marginBottom: 16 }}>
              <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} />Loading…
            </div>
          )}

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && overview && (
            <div className="ap__tab-content">
              <div className="ap__stats-grid">
                {[
                  { icon: <Users size={17} />, label: 'Total Students', val: overview.total_students, color: 'var(--cyan)', sub: 'Enrolled' },
                  { icon: <Shield size={17} />, label: 'Total Faculty', val: overview.total_faculty, color: 'var(--green)', sub: 'Active' },
                  { icon: <Activity size={17} />, label: 'Sessions Today', val: overview.sessions_today, color: 'var(--amber)', sub: 'Running/Done' },
                  { icon: <AlertTriangle size={17} />, label: 'Pending Actions', val: overview.pending_actions, color: 'var(--red)', sub: 'Devices + Disputes' },
                ].map((s, i) => (
                  <StatCard key={i} {...s} />
                ))}
              </div>
              <div className="ap__overview-grid">
                <div className="ap__card">
                  <div className="ap__section-label">System Health</div>
                  {overview.system_health && Object.entries(overview.system_health).map(([key, val], i) => (
                    <div key={i} className="ap__health-row">
                      <span className="ap__health-label">{key.replace(/_/g, ' ')}</span>
                      <span className="ap__badge ap__badge-green">{val}</span>
                    </div>
                  ))}
                </div>
                <div className="ap__card">
                  <div className="ap__section-label">Recent Activity</div>
                  {(overview.recent_logs || []).slice(0, 6).map((log, i) => (
                    <div key={i} className="ap__log-row">
                      <span className="ap__log-action">{formatAction(log.action)}</span>
                      <span className="ap__log-time">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STUDENTS ── */}
          {tab === 'students' && (
            <div className="ap__tab-content">
              <div className="ap__section-head">
                <div className="ap__section-label">Student Registry</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
                    <input className="ap__search" style={{ paddingLeft: 30 }} placeholder="Search name/roll…" value={query} onChange={e => setQuery(e.target.value)} />
                  </div>
                  <input type="file" id="stuCsv" accept=".csv" style={{ display: 'none' }} onChange={handleStudentCSV} />
                  <button className="ap__btn ap__btn-outline" onClick={() => document.getElementById('stuCsv').click()}><Upload size={13} />Mass CSV</button>
                  <button className="ap__btn ap__btn-primary" onClick={() => document.querySelector('.ap__enroll-form')?.scrollIntoView({ behavior: 'smooth' })}><UserPlus size={13} />Enroll</button>
                </div>
              </div>
              <div className="ap__card">
                <table className="ap__table">
                  <thead>
                    <tr>{['Roll', 'Name', 'Division', 'Sem', 'Attendance', 'Action'].map(h => <th key={h}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {fStudents.map((s, i) => (
                      <tr key={i}>
                        <td className="ap__mono">{s.roll}</td>
                        <td className="ap__name">{s.name}</td>
                        <td>{s.division}</td>
                        <td>{s.semester}</td>
                        <td>
                          <span style={{ color: (s.attendance_pct || 0) >= 75 ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>
                            {s.attendance_pct || 0}%
                          </span>
                        </td>
                        <td>
                          <button className="ap__icon-btn ap__icon-btn-red" title="Delete"
                            onClick={() => { if (window.confirm(`Delete ${s.name}?`)) adminApi.deleteStudent(s.id).then(() => loadData(adminApi.getStudents, setStudents)); }}>
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {fStudents.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 16 }}>No students found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Enroll form inline below table */}
              <div className="ap__card" style={{ marginTop: 18 }}>
                <div className="ap__section-label" style={{ marginBottom: 14 }}>Enroll New Student</div>
                <form className="ap__enroll-form" onSubmit={enrollStudent}>
                  <div className="ap__form-grid">
                    {[
                      { label: 'Roll No', key: 'roll', ph: 'e.g. 10275' },
                      { label: 'Full Name', key: 'name', ph: 'e.g. Priya Sharma' },
                      { label: 'Email', key: 'email', ph: 'student@gmail.com' },
                      { label: 'MAC Address', key: 'mac', ph: 'AA:BB:CC:DD:EE:FF' },
                      { label: 'Semester', key: 'semester', ph: '5' },
                      { label: 'Department', key: 'department', ph: 'Computer Engineering' },
                      { label: 'Password', key: 'password', ph: 'frcrce@123' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="ap__field-label">{f.label}</label>
                        <input className="ap__input" placeholder={f.ph} value={enrollForm[f.key]}
                          onChange={e => setEnrollForm(fm => ({ ...fm, [f.key]: e.target.value }))} />
                      </div>
                    ))}
                    <div>
                      <label className="ap__field-label">Division</label>
                      <select className="ap__input" value={enrollForm.division} onChange={e => setEnrollForm(fm => ({ ...fm, division: e.target.value }))}>
                        {['A', 'B', 'C', 'D'].map(d => <option key={d} value={d} style={{ background: 'var(--deep)' }}>Division {d}</option>)}
                      </select>
                    </div>
                  </div>
                  {enrollMsg && <div style={{ color: enrollMsg.startsWith('✓') ? 'var(--green)' : 'var(--red)', fontSize: '0.7rem', marginTop: 8 }}>{enrollMsg}</div>}
                  <button type="submit" className="ap__btn ap__btn-primary" style={{ marginTop: 14 }}>
                    <UserPlus size={13} />Enroll Student
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ── FACULTY ── */}
          {tab === 'faculty' && (
            <div className="ap__tab-content">
              <div className="ap__section-head">
                <div className="ap__section-label">Faculty Management</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="file" id="facCsv" accept=".csv" style={{ display: 'none' }} onChange={handleFacultyCSV} />
                  <button className="ap__btn ap__btn-outline" onClick={() => document.getElementById('facCsv').click()}><Upload size={13} />Mass CSV</button>
                  <button className="ap__btn ap__btn-primary" onClick={() => document.querySelectorAll('.ap__enroll-form')[1]?.scrollIntoView({ behavior: 'smooth' })}><UserPlus size={13} />Add</button>
                </div>
              </div>
              <div className="ap__card">
                <table className="ap__table">
                  <thead>
                    <tr>{['Emp ID', 'Name', 'Department', 'Sessions', 'Action'].map(h => <th key={h}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {faculty.map((f, i) => (
                      <tr key={i}>
                        <td className="ap__mono">{f.emp_id}</td>
                        <td className="ap__name">{f.name}</td>
                        <td>{f.department}</td>
                        <td>{f.sessions}</td>
                        <td>
                          <button className="ap__icon-btn ap__icon-btn-red" title="Remove"
                            onClick={() => { if (window.confirm(`Remove ${f.name}?`)) adminApi.deleteFaculty(f.id).then(() => loadData(adminApi.getFaculty, setFaculty)); }}>
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {faculty.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 16 }}>No faculty found.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="ap__card" style={{ marginTop: 18 }}>
                <div className="ap__section-label" style={{ marginBottom: 14 }}>Add Faculty Member</div>
                <form className="ap__enroll-form" onSubmit={addFaculty}>
                  <div className="ap__form-grid">
                    {[
                      { label: 'Employee ID', key: 'emp_id', ph: 'EMP-2024-042' },
                      { label: 'Full Name', key: 'name', ph: 'Prof. Rajan Mehta' },
                      { label: 'Email', key: 'email', ph: 'faculty@frcrce.ac.in' },
                      { label: 'Department', key: 'department', ph: 'Computer Engineering' },
                      { label: 'Subjects (comma separated)', key: 'subjects', ph: 'CS-101, CS-203' },
                      { label: 'Password', key: 'password', ph: 'Default password' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="ap__field-label">{f.label}</label>
                        <input className="ap__input" placeholder={f.ph} value={addFacForm[f.key]}
                          onChange={e => setAddFacForm(fm => ({ ...fm, [f.key]: e.target.value }))} />
                      </div>
                    ))}
                  </div>
                  {addFacMsg && <div style={{ color: addFacMsg.startsWith('✓') ? 'var(--green)' : 'var(--red)', fontSize: '0.7rem', marginTop: 8 }}>{addFacMsg}</div>}
                  <button type="submit" className="ap__btn ap__btn-primary" style={{ marginTop: 14 }}>
                    <UserPlus size={13} />Add Faculty
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ── DEVICES ── */}
          {tab === 'devices' && (
            <div className="ap__tab-content">
              <div className="ap__section-head">
                <div className="ap__section-label">Device Registry</div>
                <div style={{ position: 'relative' }}>
                  <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
                  <input className="ap__search" style={{ paddingLeft: 30 }} placeholder="Search MAC…" value={query} onChange={e => setQuery(e.target.value)} />
                </div>
              </div>
              <div className="ap__card">
                <table className="ap__table">
                  <thead>
                    <tr>{['MAC', 'Device', 'Student', 'Registered', 'Status', 'Actions'].map(h => <th key={h}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {fDevices.map((d, i) => (
                      <tr key={i}>
                        <td className="ap__mono">{d.mac}</td>
                        <td>{d.device_name || '—'}</td>
                        <td>{d.students?.name || '—'}<br /><span style={{ color: 'var(--text-dim)', fontSize: '0.6rem' }}>{d.students?.roll}</span></td>
                        <td className="ap__mono" style={{ fontSize: '0.62rem' }}>{d.registered_at ? new Date(d.registered_at).toLocaleDateString() : '—'}</td>
                        <td><Badge status={d.status} /></td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="ap__icon-btn ap__icon-btn-green" title="Approve" onClick={() => adminApi.approveDevice(d.mac).then(() => loadData(adminApi.getDevices, setDevices))}>
                              <CheckCircle2 size={12} />
                            </button>
                            <button className="ap__icon-btn ap__icon-btn-red" title="Flag" onClick={() => adminApi.flagDevice(d.mac).then(() => loadData(adminApi.getDevices, setDevices))}>
                              <AlertTriangle size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {fDevices.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 16 }}>No devices found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── LOGS ── */}
          {tab === 'logs' && (
            <div className="ap__tab-content">
              <div className="ap__section-head">
                <div className="ap__section-label">Audit Logs</div>
                <button className="ap__btn ap__btn-outline"
                  onClick={() => adminApi.exportLogs().then(b => downloadBlob(b, 'audit_log.csv'))}>
                  <Download size={12} />Export CSV
                </button>
              </div>
              <div className="ap__card">
                <table className="ap__table">
                  <thead>
                    <tr>{['Timestamp', 'Action', 'Details'].map(h => <th key={h}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {logs.map((l, i) => (
                      <tr key={i}>
                        <td className="ap__mono" style={{ fontSize: '0.6rem', whiteSpace: 'nowrap' }}>{new Date(l.created_at).toLocaleString()}</td>
                        <td><span className="ap__badge ap__badge-cyan">{formatAction(l.action)}</span></td>
                        <td style={{ color: 'var(--text-dim)', fontSize: '0.65rem' }}>{l.details}</td>
                      </tr>
                    ))}
                    {logs.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 16 }}>No logs.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── DISPUTES ── */}
          {tab === 'disputes' && (
            <div className="ap__tab-content">
              <div className="ap__section-label" style={{ marginBottom: 16 }}>Pending Disputes</div>
              <div className="ap__disputes-list">
                {disputes.map((d, i) => (
                  <div key={i} className="ap__card ap__dispute-card">
                    <div className="ap__dispute-top">
                      <div>
                        <div className="ap__dispute-name">{d.students?.name} <span style={{ color: 'var(--text-dim)' }}>({d.students?.roll})</span></div>
                        <div className="ap__dispute-meta">{d.subjects?.code} — {d.date}</div>
                        <div className="ap__dispute-msg">{d.message}</div>
                      </div>
                      <Badge status={d.status} />
                    </div>
                    {d.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button className="ap__btn ap__btn-primary"
                          onClick={() => adminApi.resolveDispute(d.id).then(() => loadData(adminApi.getDisputes, setDisputes))}>
                          <CheckCircle2 size={12} />Resolve
                        </button>
                        <button className="ap__btn ap__btn-outline"
                          onClick={() => adminApi.rejectDispute(d.id).then(() => loadData(adminApi.getDisputes, setDisputes))}>
                          <AlertTriangle size={12} />Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {disputes.length === 0 && <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>No disputes.</div>}
              </div>
            </div>
          )}

          {/* ── ANALYTICS ── */}
          {tab === 'analytics' && analytics && (
            <div className="ap__tab-content">
              <div className="ap__analytics-grid">
                <div className="ap__card">
                  <div className="ap__section-label">30-Day Institutional Trend</div>
                  <div className="ap__bar-chart-wrap">
                    {(analytics.trend_30_days || []).map((v, i) => (
                      <div key={i} className="ap__bar-chart-bar" style={{
                        height: `${v}%`,
                        background: v >= 80 ? 'linear-gradient(180deg,var(--green),rgba(0,255,157,.3))' :
                          v >= 70 ? 'linear-gradient(180deg,var(--cyan),rgba(0,200,255,.3))' :
                            'linear-gradient(180deg,var(--amber),rgba(255,184,0,.3))',
                      }} title={`${v}%`} />
                    ))}
                    {(analytics.trend_30_days || []).length === 0 && <div style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>No trend data yet.</div>}
                  </div>
                </div>
                <div className="ap__card">
                  <div className="ap__section-label">Subject Averages</div>
                  {(analytics.subject_averages || []).map((s, i) => (
                    <div key={i} className="ap__progress-row">
                      <div className="ap__progress-header">
                        <span className="ap__progress-label">{s.code}</span>
                        <span className="ap__progress-val" style={{ color: s.avg >= 75 ? 'var(--green)' : 'var(--red)' }}>{s.avg}%</span>
                      </div>
                      <div className="ap__progress-track">
                        <div className="ap__progress-fill" style={{ width: `${s.avg}%`, background: s.avg >= 75 ? 'var(--green)' : 'var(--red)' }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="ap__card">
                  <div className="ap__section-label">Top Attendees</div>
                  {(analytics.top_attendees || []).slice(0, 10).map((s, i) => (
                    <div key={i} className="ap__top-row">
                      <span className="ap__top-rank">#{i + 1}</span>
                      <span className="ap__top-name">{s.name}</span>
                      <span className="ap__badge ap__badge-green">{s.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── FACE MODEL ── */}
          {tab === 'facemodel' && faceModel && (
            <div className="ap__tab-content">
              <div className="ap__card" style={{ maxWidth: 540, marginBottom: 18 }}>
                <div className="ap__section-label">Face Recognition Engine</div>
                {[
                  { label: 'Detection Engine', val: faceModel.detection_engine },
                  { label: 'Students Enrolled', val: faceModel.students_enrolled },
                  { label: 'Last Trained', val: faceModel.last_trained },
                  { label: 'Training Accuracy', val: faceModel.training_accuracy },
                  { label: 'Avg Confidence', val: faceModel.avg_confidence },
                ].map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>{r.label}</span>
                    <span style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{r.val}</span>
                  </div>
                ))}
                <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                  <button className="ap__btn ap__btn-primary"
                    onClick={() => adminApi.retrain().then(() => alert('Retrain job queued'))}>
                    <RefreshCw size={12} />Retrain Model
                  </button>
                </div>
              </div>
              <div className="ap__card" style={{ maxWidth: 540 }}>
                <div className="ap__section-label">Confidence Thresholds</div>
                {faceModel.confidence_thresholds && Object.entries(faceModel.confidence_thresholds).map(([k, v], i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>{k.replace(/_/g, ' ')}</span>
                    <span style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{v}{typeof v === 'number' && k !== 'multi_face_limit' ? '%' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}