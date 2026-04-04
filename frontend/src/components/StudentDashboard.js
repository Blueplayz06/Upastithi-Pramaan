import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import {
  Scan, CheckCircle2, AlertTriangle, Calendar, Download,
  User, LogOut, ChevronRight, BarChart2, Activity,
  HelpCircle, Smartphone, MessageSquare, Info, Bell, Menu, X, Loader
} from 'lucide-react';
import { studentApi, clearAuth, downloadBlob } from '../api';
import { useAuth } from '../context/AuthContext';
import './StudentDashboard.css';

/* ---- helpers ---- */
function CircularPct({ pct, size = 56, stroke = 4, color }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.4s var(--ease-out)' }} />
    </svg>
  );
}

function NotifIcon({ type }) {
  if (type === 'warning') return <AlertTriangle size={13} color="var(--amber)" />;
  if (type === 'success') return <CheckCircle2 size={13} color="var(--green)" />;
  return <Info size={13} color="var(--cyan)" />;
}

const NAV = [
  { id: 'overview', icon: <Activity size={17} />, label: 'Overview' },
  { id: 'calendar', icon: <Calendar size={17} />, label: 'Calendar' },
  { id: 'subjects', icon: <BarChart2 size={17} />, label: 'Subjects' },
  { id: 'alerts', icon: <Bell size={17} />, label: 'Alerts', badge: true },
  { id: 'profile', icon: <User size={17} />, label: 'Profile' },
  { id: 'support', icon: <HelpCircle size={17} />, label: 'Support' },
];

const SUBJECT_COLORS = ['var(--cyan)', 'var(--green)', 'var(--amber)', 'var(--cyan)', 'var(--green)'];

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [tab, setTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainRef = useRef(null);

  /* ── Data state ── */
  const [profile, setProfile] = useState(null);
  const [device, setDevice] = useState(null);
  const [attendance, setAttendance] = useState({ overall_percentage: 0, subjects: [] });
  const [calendar, setCalendar] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [loadingTab, setLoadingTab] = useState(false);

  /* Dispute form state */
  const [disputeForm, setDisputeForm] = useState({ subject_id: '', date: '', message: '' });
  const [disputeMsg, setDisputeMsg] = useState('');

  /* Active Session & Camera State */
  const [activeSession, setActiveSession] = useState(null);
  const [markingAttendance, setMarkingAttendance] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);

  /* 2FA step: null = not yet, 'input' = awaiting code entry */
  const [twofaStep, setTwofaStep] = useState(null); // null | 'input'
  const [twofaInput, setTwofaInput] = useState('');
  const [capturedImage, setCapturedImage] = useState(null); // base64 string

  /* Calendar nav */
  const now = new Date();
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [calYear, setCalYear] = useState(now.getFullYear());

  /* ── Initial load ── */
  useEffect(() => {
    gsap.fromTo(mainRef.current, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' });
    Promise.all([
      studentApi.getProfile(),
      studentApi.getAttendance(),
      studentApi.getDevice(),
      studentApi.getNotifications(),
      studentApi.getActiveSession()
    ]).then(([prof, att, dev, notifsList, activeSess]) => {
      setProfile(prof);
      setAttendance(att);
      setDevice(dev);
      setNotifs(notifsList);
      setActiveSession(activeSess);
    }).catch(err => {
      if (err.message?.includes('401')) handleLogout();
    });
    // eslint-disable-next-line
  }, []);

  /* ── Tab animations ── */
  useEffect(() => {
    gsap.fromTo('.sd__tab-content', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.38, ease: 'power2.out' });
  }, [tab]);

  /* ── Active Session Polling ── */
  useEffect(() => {
    const interval = setInterval(() => {
      studentApi.getActiveSession()
        .then(setActiveSession)
        .catch(() => { }); // silent fail on poll
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  /* ── Calendar fetch when tab opens or month changes ── */
  useEffect(() => {
    if (tab !== 'calendar') return;
    setLoadingTab(true);
    studentApi.getCalendar(calMonth, calYear)
      .then(setCalendar)
      .catch(console.error)
      .finally(() => setLoadingTab(false));
  }, [tab, calMonth, calYear]);

  /* ── Disputes fetch ── */
  useEffect(() => {
    if (tab !== 'support') return;
    studentApi.getDisputes().then(setDisputes).catch(console.error);
  }, [tab]);

  const handleLogout = useCallback(() => { logout(); clearAuth(); navigate('/'); }, [logout, navigate]);

  /* ── Camera & Attendance Logic ── */
  const startCamera = async () => {
    if (!device || device.status !== 'approved') {
      alert("Your device is not approved for attendance. Please check your profile.");
      return;
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setStream(mediaStream);
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
      }, 100);
    } catch (err) {
      if (window.confirm("Camera access denied or unavailable.\n\nContinue to 2FA code entry using a dummy image for testing?")) {
        setCapturedImage('data:image/jpeg;base64,dummy');
        setShowCamera(true);
        setTwofaStep('input');
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
    setTwofaStep(null);
    setTwofaInput('');
    setCapturedImage(null);
  };

  const captureAndMark = async () => {
    if (!activeSession || !videoRef.current || !canvasRef.current) return;

    // Draw to canvas
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Extract base64 and advance to 2FA step
    const base64Image = canvas.toDataURL('image/jpeg');
    setCapturedImage(base64Image);
    // Stop live video stream but keep modal open for code entry
    if (stream) stream.getTracks().forEach(t => t.stop());
    setStream(null);
    setTwofaStep('input');
  };

  const submitWithCode = async () => {
    if (!twofaInput.trim()) { alert('Please enter the 2FA code.'); return; }
    if (!activeSession || !capturedImage) return;
    setMarkingAttendance(true);
    try {
      await studentApi.markAttendance({
        session_id: activeSession.session_id,
        mac_address: device.mac,
        image_base64: capturedImage,
        twofa_code: twofaInput.trim(),
      });
      alert('Attendance marked successfully!');
      setActiveSession(null);
      stopCamera();
      // Refresh attendance stats
      studentApi.getAttendance().then(setAttendance);
    } catch (err) {
      alert(err.message || 'Failed to mark attendance.');
      // Let them retry the code
      setMarkingAttendance(false);
    } finally {
      setMarkingAttendance(false);
    }
  };

  /* ── Submit dispute ── */
  const submitDispute = async (e) => {
    e.preventDefault();
    if (!disputeForm.subject_id || !disputeForm.date || !disputeForm.message) {
      setDisputeMsg('Please fill all fields.');
      return;
    }
    try {
      await studentApi.submitDispute(disputeForm);
      setDisputeMsg('✓ Dispute submitted successfully.');
      setDisputeForm({ subject_id: '', date: '', message: '' });
      studentApi.getDisputes().then(setDisputes);
    } catch (err) {
      setDisputeMsg('Failed to submit: ' + err.message);
    }
  };

  /* ── Export CSV ── */
  const exportCSV = async () => {
    try {
      const blob = await studentApi.exportCSV();
      downloadBlob(blob, 'my_attendance.csv');
    } catch (err) { alert('Export failed: ' + err.message); }
  };

  const subjects = attendance.subjects || [];
  const overallPct = Math.round(attendance.overall_percentage || 0);
  const unreadCount = notifs.filter(n => !n.read).length;
  const initials = profile ? profile.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : '??';

  return (
    <div className="sd__shell">
      {sidebarOpen && <div className="sd__sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sd__sidebar${sidebarOpen ? ' sd__sidebar-open' : ''}`}>
        <button className="sd__sidebar-close" onClick={() => setSidebarOpen(false)} title="Close"><X size={15} /></button>
        <div className="sd__sidebar-logo">
          <div className="sd__sidebar-logo-icon"><Scan size={14} color="var(--green)" /></div>
          <div className="sd__sidebar-logo-text">
            <div className="sd__sidebar-logo-name">UPASTITHI</div>
            <div className="sd__sidebar-logo-sub">STUDENT PORTAL</div>
          </div>
        </div>

        <div className="sd__sidebar-profile">
          <div className="sd__sidebar-avatar">{initials}</div>
          <div className="sd__sidebar-profile-info">
            <div className="sd__sidebar-profile-name">{profile?.name || 'Loading…'}</div>
            <div className="sd__sidebar-profile-id">Roll {profile?.roll || '—'} · Div {profile?.division || '—'}</div>
          </div>
          <div className="sd__sidebar-device-pill">
            <Smartphone size={10} /> {device?.status === 'approved' ? 'Device Verified' : 'Device Pending'}
          </div>
        </div>

        <nav className="sd__sidebar-nav">
          {NAV.map(item => (
            <button key={item.id}
              className={`sd__sidebar-nav-btn${tab === item.id ? ' sd__active' : ''}`}
              onClick={() => { setTab(item.id); setSidebarOpen(false); }}>
              <span className="sd__sidebar-nav-icon">{item.icon}</span>
              <span className="sd__sidebar-nav-label">{item.label}</span>
              {item.badge && unreadCount > 0 && <span className="sd__sidebar-nav-badge">{unreadCount}</span>}
              {tab === item.id && !item.badge && <ChevronRight size={12} className="sd__sidebar-nav-chevron" />}
            </button>
          ))}
        </nav>

        <div className="sd__sidebar-footer">
          <button className="sd__sidebar-logout" onClick={handleLogout}>
            <LogOut size={14} /><span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main ref={mainRef} className="sd__main">
        {/* Topbar */}
        <div className="sd__topbar">
          <div className="sd__topbar-left">
            <button className="sd__topbar-hamburger" onClick={() => setSidebarOpen(o => !o)} title="Toggle sidebar">
              <Menu size={19} />
            </button>
            <div>
              <div className="sd__topbar-title">{NAV.find(n => n.id === tab)?.label}</div>
              <div className="sd__topbar-date">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
          </div>
          <div className="sd__topbar-right">
            <div className="sd__live-pill"><div className="sd__live-dot" /><span>LIVE</span></div>
          </div>
        </div>

        <div className="sd__content">
          {/* Active Session Banner */}
          {activeSession && (
            <div className="sd__card" style={{ marginBottom: 20, background: 'linear-gradient(135deg, rgba(8, 221, 169, 0.1), rgba(8, 221, 169, 0.02))', border: '1px solid var(--green)' }}>
              <div style={{ padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 15 }}>
                <div>
                  <div style={{ color: 'var(--green)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span className="g-pulse-dot" style={{ background: 'var(--green)' }} /> LECTURE IN PROGRESS
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>{activeSession.subject_name} ({activeSession.subject_code})</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: 4 }}>Prof. {activeSession.faculty_name}</div>
                </div>
                <button className="sd__submit-btn" style={{ background: 'var(--green)', color: '#000', border: 'none', fontWeight: 600, padding: '10px 20px' }} onClick={startCamera}>
                  Mark Attendance (Face + 2FA)
                </button>
              </div>
            </div>
          )}

          {/* Camera Capture Modal */}
          {showCamera && (
            <div className="sd__modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="sd__card" style={{ padding: 24, textAlign: 'center', position: 'relative', minWidth: 320, maxWidth: 380 }}>
                <button style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={stopCamera}>
                  <X size={20} />
                </button>

                {twofaStep !== 'input' ? (
                  /* ── STEP 1: Face scan ── */
                  <>
                    <div style={{ marginBottom: 15, fontSize: '1.05rem', fontWeight: 'bold' }}>Face Scan Verification</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: 12 }}>Position your face in the frame, then capture.</div>
                    <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: 8, transform: 'scaleX(-1)' }} />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    <div style={{ marginTop: 16 }}>
                      <button className="sd__submit-btn" style={{ width: '100%' }} onClick={captureAndMark}>
                        Capture &amp; Continue
                      </button>
                    </div>
                  </>
                ) : (
                  /* ── STEP 2: 2FA code entry ── */
                  <>
                    <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'rgba(0,255,157,0.12)', border: '2px solid var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                      <CheckCircle2 size={26} color="var(--green)" />
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 'bold', marginBottom: 4 }}>Face Captured!</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: 20 }}>Enter the 6-digit code shown on your faculty's screen.</div>
                    <input
                      className="sd__input"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="_ _ _ _ _ _"
                      value={twofaInput}
                      onChange={e => setTwofaInput(e.target.value.replace(/\D/g, ''))}
                      style={{ textAlign: 'center', fontSize: '1.8rem', letterSpacing: '0.4em', fontFamily: 'var(--font-mono)', width: '100%', marginBottom: 18 }}
                      autoFocus
                    />
                    <button
                      className="sd__submit-btn"
                      style={{ width: '100%', background: 'var(--green)', color: '#000' }}
                      onClick={submitWithCode}
                      disabled={markingAttendance || twofaInput.length !== 6}>
                      {markingAttendance ? 'Verifying…' : 'Confirm Attendance'}
                    </button>
                    <button
                      style={{ marginTop: 10, background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '0.65rem', cursor: 'pointer' }}
                      onClick={() => { setTwofaStep(null); setTwofaInput(''); startCamera(); }}>
                      ↩ Retake face scan
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Stat tiles */}
          <div className="sd__stats-grid">
            {[
              { label: 'Overall Attendance', val: `${overallPct}%`, color: overallPct >= 75 ? 'var(--green)' : 'var(--red)', icon: <Activity size={17} /> },
              { label: 'Lectures Attended', val: `${subjects.reduce((a, s) => a + s.attended, 0)}`, color: 'var(--cyan)', icon: <CheckCircle2 size={17} /> },
              { label: 'Subjects At Risk', val: `${subjects.filter(s => s.percentage < 75).length}`, color: 'var(--red)', icon: <AlertTriangle size={17} /> },
              { label: 'Unread Alerts', val: `${unreadCount}`, color: 'var(--amber)', icon: <Bell size={17} /> },
            ].map((s, i) => (
              <div key={i} className="sd__stat-tile sd__card">
                <div className="sd__stat-icon" style={{ color: s.color }}>{s.icon}</div>
                <div className="sd__stat-value" style={{ color: s.color }}>{s.val}</div>
                <div className="sd__stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <div className="sd__tab-content">
              <div className="sd__device-banner">
                <div className="sd__device-banner-text">
                  <CheckCircle2 size={15} color={device?.status === 'approved' ? 'var(--green)' : 'var(--amber)'} />
                  {device?.mac
                    ? `Device Recognized — MAC: ${device.mac} · ${device.status === 'approved' ? 'Attendance eligible' : 'Pending approval'}`
                    : 'No device registered — contact admin'}
                </div>
                <span className={`sd__badge ${device?.status === 'approved' ? 'sd__badge-green' : 'sd__badge-amber'}`}>
                  <span className="g-pulse-dot" />{device?.status || 'unknown'}
                </span>
              </div>

              <div className="sd__overview-grid">
                <div>
                  <div className="sd__section-label" style={{ marginBottom: 14 }}>Subject Attendance</div>
                  <div className="sd__subjects-list">
                    {subjects.length === 0 && <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>No attendance data yet.</div>}
                    {subjects.map((sub, i) => {
                      const pct = Math.round(sub.percentage), safe = pct >= 75;
                      return (
                        <div key={i} className="sd__card sd__subject-card">
                          <div className="sd__subject-top">
                            <div>
                              <div className="sd__subject-code" style={{ color: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }}>{sub.subject_code}</div>
                              <div className="sd__subject-name">{sub.subject_name}</div>
                              <div className="sd__subject-faculty">{sub.faculty}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <CircularPct pct={pct} size={52} stroke={4} color={safe ? 'var(--green)' : 'var(--red)'} />
                              <div>
                                <div className="sd__subject-pct" style={{ color: safe ? 'var(--green)' : 'var(--red)' }}>{pct}%</div>
                                <div className="sd__subject-count">{sub.attended}/{sub.total}</div>
                              </div>
                            </div>
                          </div>
                          <div className="sd__progress-track">
                            <div className="sd__progress-fill" style={{ width: `${pct}%`, background: safe ? 'var(--green)' : 'var(--red)' }} />
                            <div className="sd__progress-mark" />
                          </div>
                          {!safe && <div className="sd__subject-warn">⚠ Need {Math.ceil((0.75 * sub.total - sub.attended) / (1 - 0.75))} more lectures to reach 75%</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="sd__right-panel">
                  <div className="sd__section-label" style={{ marginBottom: 10 }}>Recent Alerts</div>
                  <div className="sd__notif-list">
                    {notifs.slice(0, 3).map((n, i) => (
                      <div key={i} className="sd__card sd__notif-card">
                        <div className="sd__notif-inner">
                          <NotifIcon type={n.type} />
                          <div>
                            <div className="sd__notif-text">{n.message}</div>
                            <div className="sd__notif-time">{new Date(n.created_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {notifs.length === 0 && <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>No alerts.</div>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── CALENDAR ── */}
          {tab === 'calendar' && (
            <div className="sd__tab-content">
              <div className="sd__card sd__calendar-card">
                <div className="sd__calendar-head">
                  <div>
                    <div className="sd__section-label" style={{ marginBottom: 4 }}>Attendance Calendar</div>
                    <div className="sd__calendar-month" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <button onClick={() => { let m = calMonth - 1, y = calYear; if (m < 1) { m = 12; y--; } setCalMonth(m); setCalYear(y); }} style={{ background: 'none', border: 'none', color: 'var(--cyan)', cursor: 'pointer', fontSize: '1rem' }}>◀</button>
                      {new Date(calYear, calMonth - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
                      <button onClick={() => { let m = calMonth + 1, y = calYear; if (m > 12) { m = 1; y++; } setCalMonth(m); setCalYear(y); }} style={{ background: 'none', border: 'none', color: 'var(--cyan)', cursor: 'pointer', fontSize: '1rem' }}>▶</button>
                    </div>
                  </div>
                  <div className="sd__calendar-legend">
                    {[{ c: 'var(--green)', l: 'Present' }, { c: 'var(--red)', l: 'Absent' }, { c: 'rgba(255,255,255,.06)', l: 'No Class' }].map((l, i) => (
                      <div key={i} className="sd__legend-item">
                        <div className="sd__legend-dot" style={{ background: l.c }} /><span className="sd__legend-label">{l.l}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {loadingTab ? <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-dim)' }}><Loader size={20} /></div> : (
                  <>
                    <div className="sd__weekday-row">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                        <div key={d} className="sd__weekday-label">{d}</div>
                      ))}
                    </div>
                    <div className="sd__cal-grid">
                      {calendar.map((day, i) => (
                        <div key={i} className={`sd__cal-day sd__cal-day-${day.status}`}>{day.day}</div>
                      ))}
                    </div>
                    <div className="sd__cal-footer">
                      {[
                        { val: calendar.filter(d => d.status === 'present').length, label: 'Present', color: 'var(--green)' },
                        { val: calendar.filter(d => d.status === 'absent').length, label: 'Absent', color: 'var(--red)' },
                        { val: calendar.filter(d => d.status === 'no-class').length, label: 'No Class', color: 'var(--text-dim)' },
                      ].map((s, i) => (
                        <div key={i}>
                          <div className="sd__cal-footer-val" style={{ color: s.color }}>{s.val}</div>
                          <div className="sd__cal-footer-label">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── SUBJECTS ── */}
          {tab === 'subjects' && (
            <div className="sd__tab-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
                <div className="sd__section-label" style={{ marginBottom: 0 }}>All Subjects</div>
                <button className="sd__submit-btn" style={{ padding: '8px 18px', fontSize: '0.62rem' }} onClick={exportCSV}>
                  <Download size={12} />Export Report
                </button>
              </div>
              <div className="sd__subjects-detail-grid">
                {subjects.map((sub, i) => {
                  const pct = Math.round(sub.percentage), safe = pct >= 75;
                  const needed = safe ? 0 : Math.ceil((0.75 * sub.total - sub.attended) / (1 - 0.75));
                  return (
                    <div key={i} className="sd__card sd__subject-detail-card">
                      <div className="sd__subject-detail-top">
                        <div>
                          <div className="sd__subject-code" style={{ color: SUBJECT_COLORS[i % SUBJECT_COLORS.length], marginBottom: 4 }}>{sub.subject_code}</div>
                          <div className="sd__subject-name">{sub.subject_name}</div>
                          <div className="sd__subject-faculty" style={{ marginTop: 4 }}>{sub.faculty}</div>
                        </div>
                        <CircularPct pct={pct} size={62} stroke={5} color={safe ? 'var(--green)' : 'var(--red)'} />
                      </div>
                      <div className="sd__subject-mini-grid">
                        {[{ l: 'Total', v: sub.total }, { l: 'Attended', v: sub.attended }, { l: 'Missed', v: sub.total - sub.attended }].map((m, j) => (
                          <div key={j} className="sd__subject-mini-cell">
                            <div className="sd__subject-mini-val">{m.v}</div>
                            <div className="sd__subject-mini-label">{m.l}</div>
                          </div>
                        ))}
                      </div>
                      <span className={`sd__badge ${safe ? 'sd__badge-green' : 'sd__badge-red'}`}>{pct}% — {safe ? 'Safe' : 'At Risk'}</span>
                      {needed > 0 && <div className="sd__subject-detail-warn">⚠ Attend {needed} more consecutive lectures to reach 75%</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── ALERTS ── */}
          {tab === 'alerts' && (
            <div className="sd__tab-content">
              <div className="sd__section-label" style={{ marginBottom: 18 }}>System Notifications</div>
              <div className="sd__alerts-list">
                {notifs.length === 0 && <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>No notifications yet.</div>}
                {notifs.map((n, i) => (
                  <div key={i} className="sd__card sd__alert-card" style={{ borderLeft: `3px solid ${n.type === 'warning' ? 'var(--amber)' : n.type === 'success' ? 'var(--green)' : 'var(--cyan)'}` }}>
                    <div className="sd__alert-inner">
                      <div className="sd__alert-body">
                        <div style={{ marginTop: 2, flexShrink: 0 }}><NotifIcon type={n.type} /></div>
                        <div className="sd__alert-text">{n.message}</div>
                      </div>
                      <div className="sd__alert-time">{new Date(n.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PROFILE ── */}
          {tab === 'profile' && (
            <div className="sd__tab-content">
              <div className="sd__profile-wrap">
                <div className="sd__card sd__profile-card">
                  <div className="sd__section-label">Personal Information</div>
                  <div className="sd__profile-top">
                    <div className="sd__profile-avatar">{initials}</div>
                    <div>
                      <div className="sd__profile-name">{profile?.name}</div>
                      <div className="sd__profile-meta">Roll {profile?.roll} · Division {profile?.division} · {profile?.department}</div>
                      <span className="sd__badge sd__badge-green" style={{ marginTop: 8, display: 'inline-flex' }}>Active Student</span>
                    </div>
                  </div>
                  {[
                    { l: 'Institution', v: profile?.institution || 'Fr. CRCE' },
                    { l: 'Department', v: profile?.department || 'Computer Engineering' },
                    { l: 'Division', v: profile?.division || '—' },
                    { l: 'Semester', v: profile?.semester ? `${profile.semester}th Semester` : '—' },
                    { l: 'Email', v: profile?.email || '—' },
                  ].map((r, i) => (
                    <div key={i} className="sd__info-row">
                      <span className="sd__info-label">{r.l}</span>
                      <span className="sd__info-val">{r.v}</span>
                    </div>
                  ))}
                </div>

                <div className="sd__card sd__profile-card">
                  <div className="sd__section-label">Registered Device</div>
                  {device?.mac ? (
                    <>
                      {[
                        { l: 'Device Name', v: device.device_name || 'Unknown Device', mono: false },
                        { l: 'MAC Address', v: device.mac, mono: true },
                        { l: 'Registered', v: device.registered_at ? new Date(device.registered_at).toLocaleDateString() : '—', mono: false },
                        { l: 'Status', v: <span className={`sd__badge ${device.status === 'approved' ? 'sd__badge-green' : 'sd__badge-amber'}`}><span className="g-pulse-dot" />{device.status}</span>, mono: false },
                      ].map((r, i) => (
                        <div key={i} className="sd__info-row">
                          <span className="sd__info-label">{r.l}</span>
                          <span className={r.mono ? 'sd__info-mono' : 'sd__info-val'}>{r.v}</span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>No device registered yet.</div>
                  )}
                  <button className="sd__submit-btn" style={{ marginTop: 18 }}>
                    <Smartphone size={12} />Request Device Change
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── SUPPORT ── */}
          {tab === 'support' && (
            <div className="sd__tab-content">
              <div className="sd__support-wrap">
                <div className="sd__card sd__support-card">
                  <div className="sd__support-title">Why wasn't my attendance marked?</div>
                  {[
                    'Is your phone connected to the classroom Wi-Fi Hotspot?',
                    'Is your MAC address registered? (Check Profile → Device)',
                    'Was your face clearly visible to the webcam?',
                    'Was the session active at that time?',
                  ].map((q, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                      <div className="sd__checklist-num">{i + 1}</div>
                      <span className="sd__checklist-text">{q}</span>
                    </div>
                  ))}
                </div>

                <div className="sd__card sd__support-card">
                  <div className="sd__support-title">Raise a Dispute</div>
                  <form className="sd__dispute-form" onSubmit={submitDispute}>
                    <div>
                      <label className="sd__field-label">Subject ID</label>
                      <input className="sd__input" placeholder="e.g. CS-101 subject UUID"
                        value={disputeForm.subject_id}
                        onChange={e => setDisputeForm(f => ({ ...f, subject_id: e.target.value }))} />
                    </div>
                    <div>
                      <label className="sd__field-label">Date</label>
                      <input type="date" className="sd__input"
                        value={disputeForm.date}
                        onChange={e => setDisputeForm(f => ({ ...f, date: e.target.value }))} />
                    </div>
                    <div>
                      <label className="sd__field-label">Describe the issue</label>
                      <textarea className="sd__textarea" rows={4} placeholder="Describe what happened…"
                        value={disputeForm.message}
                        onChange={e => setDisputeForm(f => ({ ...f, message: e.target.value }))} />
                    </div>
                    {disputeMsg && <div style={{ color: disputeMsg.startsWith('✓') ? 'var(--green)' : 'var(--red)', fontSize: '0.7rem' }}>{disputeMsg}</div>}
                    <button type="submit" className="sd__submit-btn">
                      <MessageSquare size={13} />Submit Dispute
                    </button>
                  </form>

                  {disputes.length > 0 && (
                    <div style={{ marginTop: 18 }}>
                      <div className="sd__section-label" style={{ marginBottom: 10 }}>Your Disputes</div>
                      {disputes.map((d, i) => (
                        <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: '0.72rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-primary)' }}>{d.subjects?.code} · {d.date}</span>
                            <span className={`sd__badge ${d.status === 'resolved' ? 'sd__badge-green' : d.status === 'rejected' ? 'sd__badge-red' : 'sd__badge-amber'}`}>{d.status}</span>
                          </div>
                          <div style={{ color: 'var(--text-dim)', marginTop: 4 }}>{d.message}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}