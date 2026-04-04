import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import {
  Scan, Play, Square, Users, CheckCircle2, AlertTriangle,
  Download, BarChart2, Settings, LogOut, Camera,
  Eye, ChevronRight, Bell, Search, Activity,
  Filter, FileText, Shield, TrendingUp, Menu, X, RefreshCw
} from 'lucide-react';
import { facultyApi, clearAuth, downloadBlob } from '../api';
import { useAuth } from '../context/AuthContext';
import './FacultyDashboard.css';

function StatusBadge({ face, mac }) {
  if (face && mac) return <span className="fd__badge fd__badge-green"><CheckCircle2 size={9} />Present</span>;
  if (face && !mac) return <span className="fd__badge fd__badge-amber"><AlertTriangle size={9} />No Device</span>;
  if (!face && mac) return <span className="fd__badge fd__badge-amber"><Eye size={9} />No Face</span>;
  return <span className="fd__badge fd__badge-red"><AlertTriangle size={9} />Absent</span>;
}

function Sparkline({ data, color }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - ((v - min) / (max - min + 1)) * 80}`).join(' ');
  return (
    <svg viewBox="0 0 100 100" style={{ width: 72, height: 28 }} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const NAV = [
  { id: 'live', icon: <Activity size={17} />, label: 'Live Session' },
  { id: 'attendance', icon: <Users size={17} />, label: 'Attendance' },
  { id: 'analytics', icon: <BarChart2 size={17} />, label: 'Analytics' },
  { id: 'reports', icon: <FileText size={17} />, label: 'Reports' },
  { id: 'settings', icon: <Settings size={17} />, label: 'Settings' },
];

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [tab, setTab] = useState('live');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState('');
  const mainRef = useRef(null);
  const timerRef = useRef(null);

  /* ── API state ── */
  const [profile, setProfile] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [timer, setTimer] = useState(0);
  const [students, setStudents] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('');

  /* ── 2FA state ── */
  const [twofaCode, setTwofaCode] = useState('');
  const [twofaExpiry, setTwofaExpiry] = useState(null); // Date object
  const [twofaCountdown, setTwofaCountdown] = useState(0);
  const twofaTimerRef = useRef(null);

  /* ── Custom report date range ── */
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const initials = profile ? profile.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : '??';

  /* ── Load profile + subjects + active session on mount ── */
  useEffect(() => {
    gsap.fromTo(mainRef.current, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' });
    Promise.all([
      facultyApi.getProfile(),
      facultyApi.getSubjects(),
      facultyApi.getActiveSession(),
    ]).then(([prof, subj, sess]) => {
      setProfile(prof);
      setSubjects(subj || []);
      if (subj?.length) setSelectedSubject(subj[0].id);
      if (sess) { setActiveSession(sess); applyTwofa(sess); }
    }).catch(err => {
      if (err.message?.includes('401')) handleLogout();
    });
    // eslint-disable-next-line
  }, []);

  /* ── Tab animation ── */
  useEffect(() => {
    gsap.fromTo('.fd__tab-content', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.38, ease: 'power2.out' });
  }, [tab]);

  /* ── Timer when session is active ── */
  useEffect(() => {
    if (activeSession) {
      const start = new Date(activeSession.started_at).getTime();
      timerRef.current = setInterval(() => {
        setTimer(Math.floor((Date.now() - start) / 1000));
      }, 1000);
      // Load students for active session
      facultyApi.getSessionStudents(activeSession.id)
        .then(setStudents).catch(console.error);
      // Apply 2FA code from active session
      applyTwofa(activeSession);
    } else {
      clearInterval(timerRef.current);
      setTimer(0);
      setTwofaCode('');
      setTwofaExpiry(null);
    }
    return () => clearInterval(timerRef.current);
  }, [activeSession]); // eslint-disable-line

  /* ── 2FA countdown tick ── */
  useEffect(() => {
    clearInterval(twofaTimerRef.current);
    if (!twofaExpiry) return;
    const tick = () => {
      const secs = Math.max(0, Math.round((twofaExpiry - Date.now()) / 1000));
      setTwofaCountdown(secs);
      if (secs === 0) {
        // Auto-fetch new code when expired
        if (activeSession) {
          facultyApi.getActiveSession().then(sess => {
            if (sess) { setActiveSession(sess); applyTwofa(sess); }
          }).catch(() => {});
        }
      }
    };
    tick();
    twofaTimerRef.current = setInterval(tick, 1000);
    return () => clearInterval(twofaTimerRef.current);
  }, [twofaExpiry]); // eslint-disable-line

  /* ── Poll active session every 30s to pick up rotated codes ── */
  useEffect(() => {
    if (!activeSession) return;
    const poll = setInterval(() => {
      facultyApi.getActiveSession().then(sess => {
        if (sess) applyTwofa(sess);
      }).catch(() => {});
    }, 30000);
    return () => clearInterval(poll);
  }, [activeSession]); // eslint-disable-line

  /* ── Analytics when tab opens ── */
  useEffect(() => {
    if (tab === 'analytics') {
      facultyApi.getAnalytics().then(setAnalytics).catch(console.error);
    }
  }, [tab]);

  /* ── Attendance tab: refresh students ── */
  useEffect(() => {
    if (tab === 'attendance' && activeSession) {
      facultyApi.getSessionStudents(activeSession.id).then(setStudents).catch(console.error);
    }
  }, [tab, activeSession]);

  /* ── 2FA helper ── */
  const applyTwofa = (sess) => {
    if (!sess) return;
    if (sess.twofa_code) setTwofaCode(sess.twofa_code);
    if (sess.twofa_code_expires_at) {
      setTwofaExpiry(new Date(sess.twofa_code_expires_at).getTime());
    }
  };

  const refreshCode = async () => {
    if (!activeSession) return;
    try {
      const res = await facultyApi.refreshCode(activeSession.id);
      setTwofaCode(res.twofa_code);
      setTwofaExpiry(new Date(res.twofa_code_expires_at).getTime());
    } catch (err) { alert('Refresh failed: ' + err.message); }
  };

  const handleLogout = useCallback(() => { logout(); clearAuth(); navigate('/'); }, [logout, navigate]);
  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const startSession = async () => {
    if (!selectedSubject) return;
    try {
      const sess = await facultyApi.startSession(selectedSubject);
      setActiveSession(sess);
    } catch (err) { alert(err.message); }
  };

  const endSession = async () => {
    if (!activeSession) return;
    try {
      await facultyApi.endSession(activeSession.id);
      setActiveSession(null);
      setStudents([]);
    } catch (err) { alert(err.message); }
  };

  const override = async (studentId, currentlyPresent) => {
    if (!activeSession) return;
    try {
      await facultyApi.overrideAttendance(activeSession.id, studentId, !currentlyPresent);
      // Refresh student list
      facultyApi.getSessionStudents(activeSession.id).then(setStudents);
    } catch (err) { alert(err.message); }
  };

  const exportReport = async (type, fromDate, toDate) => {
    try {
      const blob = await facultyApi.exportReport(type, fromDate, toDate);
      const suffix = (fromDate || toDate) ? `_${fromDate || 'start'}_to_${toDate || 'today'}` : '';
      downloadBlob(blob, `${type}${suffix}_report.csv`);
    } catch (err) { alert('Export failed: ' + err.message); }
  };

  const filtered = students.filter(s =>
    s.name?.toLowerCase().includes(query.toLowerCase()) || s.roll?.includes(query)
  );

  const present = students.filter(s => s.face_verified && s.mac_verified).length;
  const absent = students.filter(s => !s.face_verified && !s.mac_verified).length;
  const pending = students.length - present - absent;

  const STATS = [
    { label: 'Present', val: present, sub: `/${students.length}`, color: 'var(--green)', icon: <CheckCircle2 size={17} />, data: [32, 38, 35, 40, 42, 38, present] },
    { label: 'Pending', val: pending, sub: '', color: 'var(--amber)', icon: <AlertTriangle size={17} />, data: [4, 3, 5, 2, 3, 4, pending] },
    { label: 'Absent', val: absent, sub: `/${students.length}`, color: 'var(--red)', icon: <Eye size={17} />, data: [12, 10, 14, 8, 10, 11, absent] },
    { label: 'Enrolled', val: students.length, sub: 'total', color: 'var(--cyan)', icon: <Users size={17} />, data: [60, 60, 62, 62, 62, 62, students.length] },
  ];

  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="fd__shell">
      {sidebarOpen && <div className="fd__sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fd__sidebar${sidebarOpen ? ' fd__sidebar-open' : ''}`}>
        <button className="fd__sidebar-close" onClick={() => setSidebarOpen(false)} title="Close"><X size={15} /></button>
        <div className="fd__sidebar-logo">
          <div className="fd__sidebar-logo-icon"><Scan size={14} color="var(--cyan)" /></div>
          <div className="fd__sidebar-logo-text">
            <div className="fd__sidebar-logo-name">UPASTITHI</div>
            <div className="fd__sidebar-logo-sub">FACULTY PANEL</div>
          </div>
        </div>
        <div className="fd__sidebar-profile">
          <div className="fd__sidebar-avatar">{initials}</div>
          <div className="fd__sidebar-profile-info">
            <div className="fd__sidebar-profile-name">{profile?.name || 'Loading…'}</div>
            <div className="fd__sidebar-profile-id">{profile?.emp_id || '—'} · {profile?.department || '—'}</div>
          </div>
        </div>
        <nav className="fd__sidebar-nav">
          {NAV.map(item => (
            <button key={item.id}
              className={`fd__sidebar-nav-btn${tab === item.id ? ' fd__active' : ''}`}
              onClick={() => { setTab(item.id); setSidebarOpen(false); }}>
              <span className="fd__sidebar-nav-icon">{item.icon}</span>
              <span className="fd__sidebar-nav-label">{item.label}</span>
              {tab === item.id && <ChevronRight size={12} className="fd__sidebar-nav-chevron" />}
            </button>
          ))}
        </nav>
        <div className="fd__sidebar-footer">
          <button className="fd__sidebar-logout" onClick={handleLogout}>
            <LogOut size={14} /><span>Logout</span>
          </button>
        </div>
      </aside>

      <main ref={mainRef} className="fd__main">
        <div className="fd__topbar">
          <div className="fd__topbar-left">
            <button className="fd__topbar-hamburger" onClick={() => setSidebarOpen(o => !o)} title="Toggle sidebar">
              <Menu size={19} />
            </button>
            <div>
              <div className="fd__topbar-title">{NAV.find(n => n.id === tab)?.label}</div>
              <div className="fd__topbar-date">{dateStr}</div>
            </div>
          </div>
          <div className="fd__topbar-right">
            {activeSession && <span className="fd__badge fd__badge-red"><span className="g-pulse-dot" />LIVE — {fmt(timer)}</span>}
            <button className="fd__notif-btn"><Bell size={15} /></button>
          </div>
        </div>

        <div className="fd__content">
          <div className="fd__stats-grid">
            {STATS.map((s, i) => (
              <div key={i} className="fd__stat-tile fd__card">
                <div className="fd__stat-tile-top">
                  <span style={{ color: s.color }}>{s.icon}</span>
                  <Sparkline data={s.data} color={s.color} />
                </div>
                <div className="fd__stat-value" style={{ color: s.color }}>
                  {s.val}<span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 400 }}>{s.sub}</span>
                </div>
                <div className="fd__stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── LIVE SESSION ── */}
          {tab === 'live' && (
            <div className="fd__tab-content">
              <div className="fd__live-grid">
                <div className="fd__card">
                  <div className="fd__card-body">
                    <div className="fd__section-label">Session Controller</div>
                    <div style={{ marginBottom: 16 }}>
                      <label className="fd__field-label">Subject</label>
                      <select className="fd__select" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} disabled={!!activeSession}>
                        {subjects.map(s => (
                          <option key={s.id} value={s.id} style={{ background: 'var(--deep)' }}>{s.code} — {s.name}</option>
                        ))}
                        {subjects.length === 0 && <option>No subjects assigned</option>}
                      </select>
                    </div>
                    <button
                      className={`fd__btn fd__btn-full ${activeSession ? 'fd__btn-red' : 'fd__btn-primary'}`}
                      onClick={activeSession ? endSession : startSession}
                      disabled={subjects.length === 0}>
                      {activeSession ? <><Square size={14} />End Session</> : <><Play size={14} />Start Session</>}
                    </button>

                    {/* ── 2FA Code Display ── */}
                    {activeSession && twofaCode && (
                      <div style={{ marginTop: 20, padding: '14px 16px', background: 'rgba(0,255,157,0.06)', border: '1px solid rgba(0,255,157,0.25)', borderRadius: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <div className="fd__section-label" style={{ marginBottom: 0 }}>2FA Attendance Code</div>
                          <button
                            onClick={refreshCode}
                            title="Force rotate code"
                            style={{ background: 'none', border: 'none', color: 'var(--cyan)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.6rem' }}>
                            <RefreshCw size={11} /> Refresh
                          </button>
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2.4rem', fontWeight: 700, letterSpacing: '0.35em', color: 'var(--green)', textAlign: 'center', padding: '8px 0', textShadow: '0 0 20px rgba(0,255,157,0.4)' }}>
                          {twofaCode}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
                          <div style={{ flex: 1, height: 3, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: twofaCountdown > 60 ? 'var(--green)' : twofaCountdown > 20 ? 'var(--amber)' : 'var(--red)', width: `${(twofaCountdown / 300) * 100}%`, transition: 'width 1s linear, background 0.5s' }} />
                          </div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: twofaCountdown > 60 ? 'var(--green)' : twofaCountdown > 20 ? 'var(--amber)' : 'var(--red)', minWidth: 38, textAlign: 'right' }}>
                            {String(Math.floor(twofaCountdown / 60)).padStart(2,'0')}:{String(twofaCountdown % 60).padStart(2,'0')}
                          </div>
                        </div>
                        <div style={{ fontSize: '0.58rem', color: 'var(--text-dim)', textAlign: 'center', marginTop: 6 }}>Share this code with students · rotates every 5 min</div>
                      </div>
                    )}

                    <div className="fd__status-grid" style={{ marginTop: 16 }}>
                      {[
                        { label: 'Webcam', val: activeSession ? 'Active' : 'Standby', color: activeSession ? 'var(--green)' : 'var(--text-dim)' },
                        { label: 'Hotspot', val: activeSession ? 'Broadcasting' : 'Off', color: activeSession ? 'var(--cyan)' : 'var(--text-dim)' },
                        { label: '2FA Gate', val: activeSession ? 'Open' : 'Closed', color: activeSession ? 'var(--green)' : 'var(--text-dim)' },
                        { label: 'Duration', val: activeSession ? fmt(timer) : '—', color: 'var(--amber)' },
                      ].map((item, i) => (
                        <div key={i} className="fd__status-item">
                          <div className="fd__status-label">{item.label}</div>
                          <div className="fd__status-val" style={{ color: item.color }}>{item.val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="fd__card">
                  <div className="fd__card-body">
                    <div className="fd__section-label">Camera Preview</div>
                    <div className="fd__camera-preview">
                      {activeSession ? (
                        <>
                          <div className="g-scan-line" />
                          <div className="fd__camera-corner fd__camera-corner-tl" />
                          <div className="fd__camera-corner fd__camera-corner-tr" />
                          <div className="fd__camera-live-text">LIVE FEED</div>
                          <div className="fd__camera-res">1280×720 · 30fps · HOG</div>
                        </>
                      ) : (
                        <div className="fd__camera-offline">
                          <Camera size={28} color="var(--text-dim)" />
                          <div className="fd__camera-offline-text">Session not active</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── ATTENDANCE ── */}
          {tab === 'attendance' && (
            <div className="fd__tab-content">
              <div className="fd__filter-row">
                <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                  <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
                  <input className="fd__search-input" style={{ paddingLeft: 34, width: '100%' }} placeholder="Search by name or roll…" value={query} onChange={e => setQuery(e.target.value)} />
                </div>
                <div className="fd__filter-row-right">
                  <button className="fd__btn fd__btn-outline"><Filter size={13} />Filter</button>
                  <button className="fd__btn fd__btn-primary" onClick={() => exportReport('daily')}><Download size={13} />Export CSV</button>
                </div>
              </div>
              {!activeSession && <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginBottom: 12 }}>No active session. Start a session to see live attendance.</div>}
              <div className="fd__card">
                <div className="fd__table-wrap">
                  <table className="fd__table">
                    <thead>
                      <tr>{['Roll No', 'Name', 'Face', 'MAC', 'Conf.', 'Status', 'Time', 'Override'].map(h => (
                        <th key={h}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {filtered.map((s) => (
                        <tr key={s.roll}>
                          <td className="fd__table-roll">{s.roll}</td>
                          <td className="fd__table-name">{s.name}</td>
                          <td>{s.face_verified ? <CheckCircle2 size={15} color="var(--green)" /> : <AlertTriangle size={15} color="var(--red)" />}</td>
                          <td>{s.mac_verified ? <CheckCircle2 size={15} color="var(--green)" /> : <AlertTriangle size={15} color="var(--red)" />}</td>
                          <td className="fd__table-mono">{s.confidence ? `${s.confidence}%` : '—'}</td>
                          <td><StatusBadge face={s.face_verified} mac={s.mac_verified} /></td>
                          <td className="fd__table-mono">{s.marked_at ? new Date(s.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                          <td>
                            <button
                              className={`fd__override-btn${s.face_verified && s.mac_verified ? ' fd__override-btn--revert' : ''}`}
                              onClick={() => override(s.student_id || s.roll, s.face_verified && s.mac_verified)}>
                              {s.face_verified && s.mac_verified ? 'Revert' : 'Override'}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filtered.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 16 }}>No students found.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── ANALYTICS ── */}
          {tab === 'analytics' && (
            <div className="fd__tab-content">
              <div className="fd__card" style={{ marginBottom: 18 }}>
                <div className="fd__card-body">
                  <div className="fd__section-label">30-Day Attendance Trend</div>
                  <div className="fd__bar-chart-wrap">
                    {(analytics?.trend_30_days || []).map((v, i) => (
                      <div key={i} className="fd__bar-chart-bar" style={{
                        height: `${v}%`,
                        background: v >= 80 ? 'linear-gradient(180deg,var(--green),rgba(0,255,157,.3))'
                          : v >= 70 ? 'linear-gradient(180deg,var(--cyan),rgba(0,200,255,.3))'
                            : 'linear-gradient(180deg,var(--amber),rgba(255,184,0,.3))',
                      }} title={`${v}%`} />
                    ))}
                    {(!analytics?.trend_30_days || analytics.trend_30_days.length === 0) && (
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.72rem', padding: '12px 0' }}>No trend data yet.</div>
                    )}
                  </div>
                  <div className="fd__chart-footer">
                    <span className="fd__chart-footer-label">30 sessions ago</span>
                    <span className="fd__chart-footer-label">Today</span>
                  </div>
                </div>
              </div>
              <div className="fd__analytics-grid">
                <div className="fd__card">
                  <div className="fd__card-body">
                    <div className="fd__section-label">Defaulters (&lt;75%)</div>
                    {(analytics?.defaulters || []).map((d, i) => (
                      <div key={i} className="fd__defaulter-item">
                        <div>
                          <div className="fd__defaulter-name">{d.name}</div>
                          <div className="fd__defaulter-roll">Roll {d.roll}</div>
                        </div>
                        <span className="fd__badge fd__badge-red">{d.pct}%</span>
                      </div>
                    ))}
                    {(!analytics?.defaulters || analytics.defaulters.length === 0) && (
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>No defaulters!</div>
                    )}
                  </div>
                </div>
                <div className="fd__card">
                  <div className="fd__card-body">
                    <div className="fd__section-label">Today's Summary</div>
                    {analytics?.today_summary && Object.entries({
                      Present: { val: analytics.today_summary.present, color: 'var(--green)' },
                      Absent: { val: analytics.today_summary.absent, color: 'var(--red)' },
                      Pending: { val: analytics.today_summary.pending, color: 'var(--amber)' },
                    }).map(([label, item], i) => (
                      <div key={i} className="fd__progress-row">
                        <div className="fd__progress-header">
                          <span className="fd__progress-label">{label}</span>
                          <span className="fd__progress-val" style={{ color: item.color }}>{item.val}/{analytics.today_summary.total}</span>
                        </div>
                        <div className="fd__progress-track">
                          <div className="fd__progress-fill" style={{ width: `${analytics.today_summary.total ? (item.val / analytics.today_summary.total) * 100 : 0}%`, background: item.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── REPORTS ── */}
          {tab === 'reports' && (
            <div className="fd__tab-content">
              <div className="fd__reports-grid">
                {[
                  { title: 'Daily Report', desc: "Full attendance for today's sessions", icon: <FileText size={19} />, color: 'var(--cyan)', type: 'daily' },
                  { title: 'Weekly Summary', desc: 'Aggregated data for the past 7 days', icon: <BarChart2 size={19} />, color: 'var(--green)', type: 'weekly' },
                  { title: 'Defaulter List', desc: 'All students below 75% threshold', icon: <AlertTriangle size={19} />, color: 'var(--red)', type: 'defaulter' },
                  { title: 'Subject Report', desc: 'Per-subject attendance breakdown', icon: <TrendingUp size={19} />, color: 'var(--amber)', type: 'subject' },
                  { title: 'Semester Report', desc: 'Complete semester attendance log', icon: <Activity size={19} />, color: 'var(--cyan)', type: 'semester' },
                  { title: 'Audit Log', desc: 'System events and override history', icon: <Shield size={19} />, color: 'var(--green)', type: 'audit' },
                ].map((r, i) => (
                  <div key={i} className="fd__card fd__report-card">
                    <div className="fd__report-icon" style={{ color: r.color }}>{r.icon}</div>
                    <div className="fd__report-title">{r.title}</div>
                    <div className="fd__report-desc">{r.desc}</div>
                    <button className="fd__btn fd__btn-outline fd__btn-full" onClick={() => exportReport(r.type)}>
                      <Download size={11} />Export
                    </button>
                  </div>
                ))}

                {/* ── Custom Date-Range Report Card ── */}
                <div className="fd__card fd__report-card" style={{ border: '1px solid rgba(0,200,255,0.3)', gridColumn: 'span 2' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div className="fd__report-icon" style={{ color: 'var(--cyan)', marginBottom: 0 }}><Download size={19} /></div>
                    <div>
                      <div className="fd__report-title" style={{ marginBottom: 0 }}>Custom Date Range</div>
                      <div className="fd__report-desc">Export attendance for any date range you choose</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <label className="fd__field-label">From</label>
                      <input
                        type="date"
                        className="fd__select"
                        value={customFrom}
                        onChange={e => setCustomFrom(e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <label className="fd__field-label">To</label>
                      <input
                        type="date"
                        className="fd__select"
                        value={customTo}
                        onChange={e => setCustomTo(e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                  <button
                    className="fd__btn fd__btn-primary fd__btn-full"
                    onClick={() => {
                      if (!customFrom && !customTo) { alert('Please select at least one date.'); return; }
                      exportReport('custom', customFrom || undefined, customTo || undefined);
                    }}>
                    <Download size={11} />Export Custom Report
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── SETTINGS ── */}
          {tab === 'settings' && (
            <div className="fd__tab-content">
              <div className="fd__card" style={{ maxWidth: 560 }}>
                <div className="fd__card-body">
                  <div className="fd__section-label">System Configuration</div>
                  {[
                    { label: 'Face Confidence Threshold', val: '70%', desc: 'Minimum match score to mark present' },
                    { label: 'Session Timeout', val: '90 min', desc: 'Auto-end session after inactivity' },
                    { label: 'Defaulter Threshold', val: '75%', desc: 'Attendance % below which student is flagged' },
                  ].map((s, i) => (
                    <div key={i} style={{ marginBottom: 22, paddingBottom: 22, borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, flexWrap: 'wrap', gap: 8 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>{s.label}</span>
                        <span className="fd__badge fd__badge-cyan">{s.val}</span>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-dim)', letterSpacing: '0.05em' }}>{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}