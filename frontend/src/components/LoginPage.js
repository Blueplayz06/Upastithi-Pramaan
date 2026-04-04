import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { Scan, Shield, Eye, EyeOff, LogIn, Users, ArrowLeft, AlertTriangle, CheckCircle2, Cpu, Wifi, Lock } from 'lucide-react';
import { authApi, saveAuth } from '../api';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

export default function LoginPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();
  const [role, setRole] = useState(params.get('role'));
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ id: '', password: '', division: 'B' });
  const [error, setError] = useState('');
  const wrapRef = useRef(null);
  const cardRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    const urlRole = params.get('role');
    setRole(urlRole);
    setError('');
    setForm({ id: '', password: '', division: 'B' });
  }, [params]);

  useEffect(() => {
    gsap.fromTo(wrapRef.current, { opacity: 0 }, { opacity: 1, duration: 0.35 });
    gsap.fromTo(cardRef.current,
      { opacity: 0, y: 36, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.65, delay: 0.15, ease: 'power3.out' }
    );
  }, []);

  useEffect(() => {
    if (role && formRef.current) {
      gsap.fromTo(formRef.current,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }
      );
    }
  }, [role]);

  const selectRole = (r) => { setRole(r); setError(''); setForm({ id: '', password: '', division: 'B' }); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.id || !form.password) {
      setError('All fields are required.');
      gsap.fromTo(cardRef.current, { x: -8 }, { x: 0, duration: 0.4, ease: 'elastic.out(1,0.3)' });
      return;
    }
    setLoading(true);
    try {
      const data = await authApi.login(role, form.id, form.password, form.division);
      saveAuth(data.access_token, data.role, data.profile);
      refreshAuth();
      const dest = role === 'faculty' ? '/faculty-dashboard'
        : role === 'admin' ? '/admin'
          : '/student-dashboard';
      navigate(dest);
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
      gsap.fromTo(cardRef.current, { x: -8 }, { x: 0, duration: 0.4, ease: 'elastic.out(1,0.3)' });
    } finally {
      setLoading(false);
    }
  };

  const badgeClass = role === 'faculty' ? 'login__badge-cyan' : role === 'student' ? 'login__badge-green' : 'login__badge-amber';
  const submitClass = role === 'faculty' ? 'login__submit login__submit-faculty' : role === 'student' ? 'login__submit login__submit-student' : 'login__submit login__submit-admin';

  return (
    <div className="login__page" ref={wrapRef}>
      <div className="login__bg-orb" aria-hidden="true" />

      <div className="login__wrap">
        <Link to="/" className="login__back"><ArrowLeft size={13} />Back to System</Link>

        {/* Logo */}
        <div className="login__logo-block">
          <div className="login__logo-icon"><Scan size={22} color="var(--cyan)" /></div>
          <div className="login__logo-name">UPASTITHI-PRAMAAN</div>
          <div className="login__logo-sub">SECURE ACCESS PORTAL // v2.4.1</div>
        </div>

        {/* Card */}
        <div className="login__card" ref={cardRef}>
          <div className="g-scan-line" aria-hidden="true" />

          {/* ── Role selection ── */}
          {!role && (
            <div>
              <div className="login__role-title">Select Access Level</div>
              <div className="login__role-sub">Authentication required for system access</div>
              <div className="login__role-list">
                {[
                  { r: 'faculty', label: 'Faculty Access', desc: 'Start sessions · Manage attendance · View reports', icon: <Shield size={20} />, color: 'var(--cyan)' },
                  { r: 'student', label: 'Student Portal', desc: 'View attendance · Check status · Download reports', icon: <Users size={20} />, color: 'var(--green)' },
                ].map(({ r, label, desc, icon, color }) => (
                  <button key={r} className="login__role-btn" onClick={() => selectRole(r)}>
                    <div className="login__role-icon" style={{ background: `${color}14`, border: `1px solid ${color}44`, color }}>
                      {icon}
                    </div>
                    <div>
                      <div className="login__role-label">{label}</div>
                      <div className="login__role-desc">{desc}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="login__admin-link-wrap">
                <button className="login__role-btn" onClick={() => selectRole('admin')} style={{ marginTop: 4 }}>
                  <div className="login__role-icon" style={{ background: 'rgba(255,51,102,.1)', border: '1px solid rgba(255,51,102,.35)', color: 'var(--red)' }}>
                    <Shield size={20} />
                  </div>
                  <div>
                    <div className="login__role-label">Admin Access</div>
                    <div className="login__role-desc">System config · Enrollment · Dispute resolution</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ── Login form ── */}
          {role && (
            <div ref={formRef}>
              <div className="login__form-header">
                <span className={`login__badge ${badgeClass}`}>
                  <span className="g-pulse-dot" />
                  {role === 'faculty' ? 'Faculty' : role === 'student' ? 'Student' : 'Admin'} Access
                </span>
                <button className="login__change-role" onClick={() => selectRole(null)}>← Change Role</button>
              </div>

              <div className="login__form-title">
                {role === 'faculty' ? 'Faculty Login' : role === 'student' ? 'Student Login' : 'Admin Login'}
              </div>
              <div className="login__form-sub">
                {role === 'faculty' ? 'Enter your Employee ID and credentials'
                  : role === 'student' ? 'Enter your Roll Number and credentials'
                    : 'Restricted — authorized personnel only'}
              </div>

              {role === 'student' && (
                <div className="login__device-warn">
                  <AlertTriangle size={13} color="var(--amber)" style={{ marginTop: 1, flexShrink: 0 }} />
                  <div className="login__device-warn-text">
                    Attendance can only be marked from your <strong>registered device</strong>. Ensure you are on your linked phone or laptop.
                  </div>
                </div>
              )}

              <form className="login__form" onSubmit={handleSubmit}>
                <div>
                  <label className="login__field-label">
                    {role === 'faculty' ? 'Employee ID' : role === 'student' ? 'Roll Number' : 'Admin ID'}
                  </label>
                  <input
                    className="login__input"
                    type="text"
                    placeholder={role === 'faculty' ? 'e.g. EMP-2024-042' : role === 'student' ? 'e.g. 10275' : 'e.g. ADM-001'}
                    value={form.id}
                    onChange={e => setForm(f => ({ ...f, id: e.target.value }))}
                    autoFocus
                  />
                </div>

                {role === 'student' && (
                  <div>
                    <label className="login__field-label">Division</label>
                    <select className="login__input" value={form.division} onChange={e => setForm(f => ({ ...f, division: e.target.value }))} style={{ appearance: 'none' }}>
                      {['A', 'B', 'C', 'D'].map(d => <option key={d} value={d} style={{ background: 'var(--deep)' }}>Division {d}</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <label className="login__field-label">Password</label>
                  <div className="login__input-wrap">
                    <input
                      className="login__input"
                      type={showPass ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      style={{ paddingRight: 46 }}
                    />
                    <button type="button" className="login__pass-toggle" onClick={() => setShowPass(s => !s)}>
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="login__error"><AlertTriangle size={12} />{error}</div>
                )}

                <div className="login__forgot-wrap">
                  <button type="button" className="login__forgot">Forgot credentials?</button>
                </div>

                <button type="submit" className={submitClass} disabled={loading}>
                  {loading ? <><div className="login__spinner" />Authenticating...</> : <><LogIn size={14} />{role === 'faculty' ? 'Access Faculty Dashboard' : role === 'student' ? 'Access Student Portal' : 'Admin Login'}</>}
                </button>
              </form>

              <div className="login__security-note">
                <Lock size={11} style={{ marginTop: 1, flexShrink: 0 }} />
                Sessions expire after 4 hours of inactivity. All login events are logged and audited.
              </div>
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="login__status-bar">
          {[{ icon: <Cpu size={11} />, label: 'Engine Online' }, { icon: <Wifi size={11} />, label: 'Network Active' }, { icon: <CheckCircle2 size={11} />, label: 'DB Connected' }].map((s, i) => (
            <div key={i} className="login__status-item">{s.icon}{s.label}</div>
          ))}
        </div>
      </div>
    </div>
  );
}