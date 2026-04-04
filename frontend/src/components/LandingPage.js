import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Scan, Shield, Cpu, AlertTriangle, CheckCircle2, ArrowRight,
  Eye, Wifi, Zap, BarChart3, Users, Download, Clock,
  Camera, Network, Database, Code2, Layers, Target, Globe,
  ChevronDown, Play
} from 'lucide-react';
import './LandingPage.css';

gsap.registerPlugin(ScrollTrigger);

/* ── Particle Canvas ── */
function ParticleCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    const mouse = { x: -9999, y: -9999 };
    let particles = [];

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);
    window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.3,
        opacity: Math.random() * 0.5 + 0.1,
        color: Math.random() > 0.6 ? '0,200,255' : Math.random() > 0.5 ? '0,255,157' : '255,51,102',
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        const dx = p.x - mouse.x; const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const f = (120 - dist) / 120;
          p.vx += dx / dist * f * 0.07; p.vy += dy / dist * f * 0.07;
          p.vx *= 0.95; p.vy *= 0.95;
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${p.opacity})`; ctx.fill();
        particles.slice(i + 1, i + 8).forEach(p2 => {
          const d = Math.hypot(p2.x - p.x, p2.y - p.y);
          if (d < 100) {
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(0,200,255,${0.05 * (1 - d / 100)})`; ctx.lineWidth = 0.5; ctx.stroke();
          }
        });
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); ro.disconnect(); };
  }, []);
  return <canvas ref={canvasRef} className="lp__hero-canvas" />;
}

/* ── Animated Counter ── */
function Counter({ target, suffix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const triggered = useRef(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !triggered.current) {
        triggered.current = true;
        let start = 0;
        const step = target / 120;
        const timer = setInterval(() => {
          start += step;
          if (start >= target) { setCount(target); clearInterval(timer); }
          else setCount(Math.floor(start));
        }, 1000 / 60);
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);
  return <span ref={ref}>{count}{suffix}</span>;
}

/* ── Terminal Typer ── */
function TerminalTyper({ lines }) {
  const [displayed, setDisplayed] = useState([]);
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  useEffect(() => {
    if (lineIdx >= lines.length) return;
    const line = lines[lineIdx];
    if (charIdx < line.length) {
      const t = setTimeout(() => {
        setDisplayed(prev => { const n = [...prev]; n[lineIdx] = (n[lineIdx] || '') + line[charIdx]; return n; });
        setCharIdx(c => c + 1);
      }, 28);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => { setLineIdx(l => l + 1); setCharIdx(0); }, 380);
      return () => clearTimeout(t);
    }
  }, [lineIdx, charIdx, lines]);

  return (
    <div className="lp__terminal">
      <div className="lp__terminal-bar">
        {['var(--red)', 'var(--amber)', 'var(--green)'].map((c, i) => (
          <div key={i} className="lp__terminal-dot" style={{ background: c }} />
        ))}
        <span className="lp__terminal-meta">system@upastithi ~ attendance-engine</span>
      </div>
      {displayed.map((line, i) => (
        <div key={i} style={{ color: i === 0 ? 'var(--text-muted)' : i % 2 === 0 ? 'var(--green)' : 'var(--cyan)' }}>
          <span className="lp__terminal-prompt">$</span>{line}
        </div>
      ))}
      {lineIdx < lines.length && (
        <div>
          <span className="lp__terminal-prompt">$</span>
          {displayed[lineIdx] || ''}
          <span className="lp__terminal-cursor" />
        </div>
      )}
    </div>
  );
}

/* ── Main ── */
export default function LandingPage() {
  const heroRef = useRef(null);
  const location = useLocation();

  /* scroll to hash section when navigated from another page (e.g. /about → /#team) */
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      // slight delay to let page render + GSAP settle
      const t = setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 120);
      return () => clearTimeout(t);
    }
  }, [location.hash]);

  /* GSAP scroll reveals */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray('[data-lp-reveal]').forEach(el => {
        gsap.fromTo(el,
          { opacity: 0, y: 48 },
          {
            opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' }
          }
        );
      });
      gsap.utils.toArray('[data-lp-stagger]').forEach(group => {
        const cards = group.querySelectorAll('[data-lp-card]');
        gsap.fromTo(cards,
          { opacity: 0, y: 36, scale: 0.97 },
          {
            opacity: 1, y: 0, scale: 1, duration: 0.55, stagger: 0.09, ease: 'power2.out',
            scrollTrigger: { trigger: group, start: 'top 84%' }
          }
        );
      });
    });
    return () => ctx.revert();
  }, []);

  /* Hero entrance */
  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.65 });
    tl.fromTo('.lp__hero-title-1', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' })
      .fromTo('.lp__hero-title-1', { opacity: 0, x: -50 }, { opacity: 1, x: 0, duration: 0.7, ease: 'power3.out' }, '-=0.2')
      .fromTo('.lp__hero-title-2', { opacity: 0, x: 50 }, { opacity: 1, x: 0, duration: 0.7, ease: 'power3.out' }, '-=0.55')
      .fromTo('.lp__hero-title-3', { opacity: 0, x: -50 }, { opacity: 1, x: 0, duration: 0.7, ease: 'power3.out' }, '-=0.55')
      .fromTo('.lp__hero-subtitle', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '-=0.4')
      .fromTo('.lp__hero-cta-item', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.1, ease: 'power2.out' }, '-=0.3')
      .fromTo('.lp__hero-terminal', { opacity: 0, x: 50 }, { opacity: 1, x: 0, duration: 0.7, ease: 'power3.out' }, '-=0.55')
      .fromTo('.lp__hero-tag', { opacity: 0 }, { opacity: 1, duration: 0.4, stagger: 0.06 }, '-=0.4');
  }, []);

  const PROBLEMS = [
    { icon: <Clock size={22} />, title: 'Wasted Time', desc: 'Manual roll call consumes 10–15 minutes per lecture — hours of lost instruction compounded across a semester.', color: 'var(--amber)' },
    { icon: <AlertTriangle size={22} />, title: 'Proxy Fraud', desc: 'A student hands their phone to a friend. Attendance marked. No verification. Zero accountability whatsoever.', color: 'var(--red)' },
    { icon: <Eye size={22} />, title: 'Photo Spoofing', desc: 'Facial recognition alone is trivially defeated by holding a photograph up to the camera. One layer is insufficient.', color: 'var(--red)' },
    { icon: <Wifi size={22} />, title: 'Network Loopholes', desc: 'Device-only systems fail when a student leaves their phone inside the room while they skip the lecture entirely.', color: 'var(--amber)' },
  ];

  const WORKFLOW = [
    { num: '01', icon: <Camera size={26} />, badge: 'Layer One', title: 'Face Detection', desc: 'HD webcam captures live room feed. OpenCV + HOG/CNN locates and identifies each face against the enrolled database in real time.', color: 'var(--cyan)' },
    { num: '02', icon: <Wifi size={26} />, badge: 'Layer Two', title: 'Device Verification', desc: 'Faculty laptop creates a Wi-Fi Hotspot. ARP scan enumerates all connected MAC addresses and cross-checks the device registry.', color: 'var(--green)' },
    { num: '03', icon: <Shield size={26} />, badge: 'Final Gate', title: '2FA Validation', desc: 'Both checks evaluated atomically. Face Match AND MAC Present must both be TRUE. One failure means no attendance — ever.', color: 'var(--amber)' },
  ];

  const FEATURES = [
    { icon: <Camera size={19} />, title: 'Real-Time Face Recognition', desc: 'Live video stream processed frame-by-frame. Students are identified without stopping, queuing, or touching anything.', accent: 'var(--cyan)' },
    { icon: <Wifi size={19} />, title: 'MAC Address Binding', desc: 'Each student account is permanently locked to their registered mobile device hardware ID. No sharing possible.', accent: 'var(--green)' },
    { icon: <Shield size={19} />, title: 'Anti-Spoofing by Design', desc: 'A photo has no MAC address. A phone has no face. Both checks must pass simultaneously — by physical law.', accent: 'var(--cyan)' },
    { icon: <Zap size={19} />, title: 'Instant Faculty Dashboard', desc: 'Live attendance feed updates every few seconds. Faculty sees exactly who is present in real time during the session.', accent: 'var(--green)' },
    { icon: <BarChart3 size={19} />, title: 'Automated Defaulter Detection', desc: 'Students falling below 75% are automatically flagged and highlighted for immediate faculty intervention.', accent: 'var(--amber)' },
    { icon: <Download size={19} />, title: 'Export-Ready Reports', desc: 'One-click export of attendance sheets as CSV, Excel, or PDF — per subject, per date range, or full semester.', accent: 'var(--cyan)' },
  ];

  const TECH = [
    { name: 'Python 3.x', role: 'Core Engine', icon: <Code2 size={17} />, color: 'var(--cyan)' },
    { name: 'OpenCV', role: 'Video Processing', icon: <Camera size={17} />, color: 'var(--green)' },
    { name: 'face_recognition', role: 'Face Matching', icon: <Scan size={17} />, color: 'var(--cyan)' },
    { name: 'Scapy / ARP', role: 'Network Scanning', icon: <Network size={17} />, color: 'var(--amber)' },
    { name: 'SQLite / MySQL', role: 'Data Storage', icon: <Database size={17} />, color: 'var(--green)' },
    { name: 'HOG + CNN', role: 'Face Detection', icon: <Layers size={17} />, color: 'var(--red)' },
    { name: 'Pandas', role: 'Report Generation', icon: <BarChart3 size={17} />, color: 'var(--cyan)' },
    { name: 'React.js', role: 'Web Dashboard', icon: <Globe size={17} />, color: 'var(--green)' },
  ];

  const TERMINAL_LINES = [
    'init attendance-engine --subject CS101 --div B',
    'webcam activated :: resolution 1920x1080 @ 30fps',
    'hotspot scan :: 47 devices detected on subnet',
    'face detected :: querying enrollment db [62 records]',
    'MATCH :: Blaise Rodrigues | Roll 10275 | conf 97.3%',
    'MAC verified :: A4:CF:99:12:BB:3E ✓',
    '2FA PASSED :: present logged [10:33:07 AM]',
    'face detected :: querying...',
    'MATCH :: Devansh Nayak | Roll 10268 | conf 94.1%',
    'MAC verified ✓ :: PRESENT [10:33:22 AM]',
  ];

  const TEAM = [
    { roll: '10275', name: 'Blaise Rodrigues', role: 'Cybersecurity Analyst', init: 'BR' },
    { roll: '10268', name: 'Devansh Nayak', role: 'Cloud Engineer', init: 'DN' },
    { roll: '10283', name: 'Daksh Thakkar', role: 'Full-Stack Developer', init: 'DT' },
    { roll: '10287', name: 'Aryan Verma', role: 'ML Engineer', init: 'AV' },
  ];

  return (
    <main className="lp__page">

      {/* ══ HERO ══ */}
      <section className="lp__hero" ref={heroRef}>
        <ParticleCanvas />
        <div className="lp__hero-orb lp__hero-orb-cyan" style={{ width: 600, height: 600, top: -100, left: -200 }} />
        <div className="lp__hero-orb lp__hero-orb-green" style={{ width: 400, height: 400, bottom: 0, right: -100 }} />

        <div className="lp__hero-inner">
          <div className="lp__container">
            <div className="lp__hero-grid">

              {/* Left */}
              <div>
                <h1>
                  <span className="lp__hero-title-line lp__hero-title-1">ATTENDANCE</span>
                  <span className="lp__hero-title-line lp__hero-title-2 g-gradient-text">THAT CANNOT</span>
                  <span className="lp__hero-title-line lp__hero-title-3">BE FAKED.</span>
                </h1>

                <p className="lp__hero-subtitle">
                  <strong style={{ color: 'var(--cyan)', fontFamily: 'var(--font-display)', fontSize: '0.84rem', letterSpacing: '0.05em' }}>Upastithi-Pramaan</strong> — a dual-layer authentication system cross-referencing <em style={{ color: 'var(--green)' }}>AI Facial Recognition</em> with <em style={{ color: 'var(--cyan)' }}>Wi-Fi Device Verification</em> to make proxy attendance physically impossible.
                </p>

                <div className="lp__hero-ctas">
                  <Link to="/login?role=faculty" className="lp__btn lp__btn-primary lp__hero-cta-item" style={{ fontSize: '0.7rem' }}>
                    <Play size={13} /> Launch Faculty Portal
                  </Link>
                  <Link to="/login?role=student" className="lp__btn lp__btn-outline lp__hero-cta-item" style={{ fontSize: '0.7rem' }}>
                    <Users size={13} /> Student Access
                  </Link>
                </div>

                <div className="lp__hero-tags">
                  {['Computer Vision', 'Network Security', 'Machine Learning', '2FA Protocol'].map((t, i) => (
                    <span key={i} className="lp__hero-tag">{t}</span>
                  ))}
                </div>
              </div>

              {/* Right */}
              <div className="lp__hero-terminal">
                <TerminalTyper lines={TERMINAL_LINES} />
                <div className="lp__logic-box">
                  <div className="lp__logic-comment">{"// VALIDATION LOGIC"}</div>
                  <div><span style={{ color: 'var(--amber)' }}>IF</span> <span style={{ color: 'var(--cyan)' }}>(faceRecognized)</span></div>
                  <div style={{ paddingLeft: 16 }}><span style={{ color: 'var(--amber)' }}>AND</span> <span style={{ color: 'var(--cyan)' }}>(macAddressDetected)</span></div>
                  <div><span style={{ color: 'var(--amber)' }}>THEN</span> → <span style={{ color: 'var(--green)' }}>MARK PRESENT ✅</span></div>
                  <div><span style={{ color: 'var(--amber)' }}>ELSE</span> → <span style={{ color: 'var(--red)' }}>FLAG ABSENT ❌</span></div>
                </div>
              </div>
            </div>

            <div className="lp__hero-scroll">
              <a href="#problem" className="lp__hero-scroll-link">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.1em', color: 'var(--text-dim)' }}>Scroll to explore</span>
                <ChevronDown size={16} className="lp__hero-scroll-icon" color="var(--text-dim)" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ══ STATS BAR ══ */}
      <div className="lp__stats-bar" data-lp-reveal>
        <div className="lp__stats-grid lp__container">
          {[{ val: 15, suf: 'min', label: 'Recovered per lecture' }, { val: 2, suf: '', label: 'Verification layers' }, { val: 0, suf: '', label: 'Hardware sensors needed' }, { val: 100, suf: '%', label: 'Contactless process' }].map((s, i) => (
            <div key={i} className="lp__stat-cell">
              <div className="lp__stat-number"><Counter target={s.val} suffix={s.suf} /></div>
              <div className="lp__stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ PROBLEM ══ */}
      <section id="problem" className="lp__problem-section">
        <div className="lp__container">
          <div className="lp__section-head" data-lp-reveal>
            <div className="lp__section-label">{"01 // Problem Space"}</div>
            <h2 className="lp__section-title">The Flaws in Traditional Attendance</h2>
          </div>
          <div className="lp__problem-grid" data-lp-stagger>
            {PROBLEMS.map((p, i) => (
              <div key={i} className="lp__card lp__card-bracket lp__problem-card" data-lp-card>
                <div className="lp__problem-icon" style={{ color: p.color }}>{p.icon}</div>
                <h3 className="lp__problem-title">{p.title}</h3>
                <p className="lp__problem-desc">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ WORKFLOW ══ */}
      <section id="workflow" className="lp__workflow-section">
        <div className="lp__container">
          <div className="lp__section-head" data-lp-reveal>
            <div className="lp__section-label">{"02 // Protocol"}</div>
            <h2 className="lp__section-title">Two Checks. Zero Loopholes.</h2>
            <p className="lp__section-sub">Every attendance mark requires both conditions simultaneously true. One failure — no attendance. Always.</p>
          </div>
          <div className="lp__workflow-grid" data-lp-stagger>
            {WORKFLOW.map((w, i) => (
              <div key={i} className="lp__workflow-step" data-lp-card>
                <div className="lp__workflow-step-num">{w.num}</div>
                <div className="lp__workflow-step-icon" style={{ color: w.color }}>{w.icon}</div>
                <span className="lp__badge lp__badge-cyan" style={{ marginBottom: 10, display: 'inline-flex', borderColor: w.color, color: w.color }}>{w.badge}</span>
                <h3 className="lp__workflow-step-title">{w.title}</h3>
                <p className="lp__workflow-step-desc">{w.desc}</p>
              </div>
            ))}
          </div>
          <div className="lp__workflow-footer">
            <CheckCircle2 size={13} color="var(--cyan)" /><span>Face Match</span>
            <span>+</span>
            <CheckCircle2 size={13} color="var(--green)" /><span>MAC Present</span>
            <ArrowRight size={13} /><span style={{ color: 'var(--green)' }}>Attendance Logged</span>
          </div>
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section id="features" className="lp__features-section">
        <div className="lp__container">
          <div className="lp__section-head" data-lp-reveal>
            <div className="lp__section-label">{"03 // Capabilities"}</div>
            <h2 className="lp__section-title">Why Upastithi-Pramaan is Different</h2>
          </div>
          <div className="lp__features-grid" data-lp-stagger>
            {FEATURES.map((f, i) => (
              <div key={i} className="lp__card lp__feature-card" data-lp-card>
                <div className="lp__feature-icon-box" style={{
                  background: `${f.accent}18`, border: `1px solid ${f.accent}55`, color: f.accent
                }}>{f.icon}</div>
                <h3 className="lp__feature-title">{f.title}</h3>
                <p className="lp__feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TECH STACK ══ */}
      <section id="tech" className="lp__tech-section">
        <div className="lp__container">
          <div className="lp__section-head" data-lp-reveal>
            <div className="lp__section-label">{"04 // Stack"}</div>
            <h2 className="lp__section-title">Built on Industry-Standard Technology</h2>
          </div>
          <div className="lp__tech-grid" data-lp-stagger>
            {TECH.map((t, i) => (
              <div key={i} className="lp__tech-card" data-lp-card style={{ borderColor: 'var(--border)' }}>
                <div style={{ color: t.color }}>{t.icon}</div>
                <div>
                  <div className="lp__tech-name">{t.name}</div>
                  <div className="lp__tech-role">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ SDG ══ */}
      <section className="lp__sdg-section">
        <div className="lp__container">
          <div className="lp__section-head" data-lp-reveal>
            <div className="lp__section-label">{"05 // Impact"}</div>
            <h2 className="lp__section-title">Building for a Better World</h2>
          </div>
          <div className="lp__sdg-grid" data-lp-stagger>
            {[
              { sdg: 'SDG 4', full: 'Quality Education', icon: <Target size={22} />, color: 'var(--green)', desc: 'By eliminating manual roll calls, we return 10–15 minutes of teaching time per lecture to faculty. Compounded across a full semester, this recovers hours of additional instruction time — directly improving educational outcomes.' },
              { sdg: 'SDG 9', full: 'Industry, Innovation & Infrastructure', icon: <Cpu size={22} />, color: 'var(--cyan)', desc: 'Deploying AI and IoT-class network security within institutional infrastructure demonstrates how modern technology can solve everyday institutional problems at zero additional hardware cost.' },
            ].map((s, i) => (
              <div key={i} className="lp__card lp__card-bracket lp__sdg-card" data-lp-card style={{ borderColor: `${s.color}33` }}>
                <div className="lp__sdg-inner">
                  <div className="lp__sdg-icon-box" style={{ background: `${s.color}14`, border: `1px solid ${s.color}44`, color: s.color }}>{s.icon}</div>
                  <div>
                    <div className="lp__sdg-code" style={{ color: s.color }}>{s.sdg}</div>
                    <div className="lp__sdg-title">{s.full}</div>
                    <p className="lp__sdg-desc">{s.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TEAM ══ */}
      <section id="team" className="lp__team-section">
        <div className="lp__container">
          <div className="lp__section-head" data-lp-reveal>
            <div className="lp__section-label">{"06 // Team"}</div>
            <h2 className="lp__section-title">The Engineers Behind the System</h2>
            <p className="lp__section-sub" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>Fr. CRCE · Dept. Computer Engineering · Division B</p>
          </div>
          <div className="lp__team-grid" data-lp-stagger>
            {TEAM.map((m, i) => (
              <div key={i} className="lp__card lp__team-card" data-lp-card>
                <div className="lp__team-avatar">{m.init}</div>
                {m.leader && <div className="lp__team-leader-badge"><span className="lp__badge lp__badge-cyan">Group Leader</span></div>}
                <div className="lp__team-name">{m.name}</div>
                <div className="lp__team-roll">ROLL {m.roll} · DIV B</div>
                <div className="lp__team-role">{m.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section className="lp__cta-section" data-lp-reveal>
        <div className="lp__cta-orb" />
        <div className="lp__container">
          <div className="lp__cta-inner">
            <div className="lp__section-label" style={{ justifyContent: 'center', marginBottom: 20 }}>System Ready</div>
            <h2 className="lp__section-title lp__cta-title">
              Ready to <span className="g-gradient-text">Eliminate Proxy Attendance?</span>
            </h2>
            <p className="lp__cta-sub">Access your dashboard to run sessions with dual-layer verification.</p>
            <div className="lp__cta-btns">
              <Link to="/login?role=faculty" className="lp__btn lp__btn-primary" style={{ fontSize: '0.7rem' }}><Play size={13} />Faculty Portal</Link>
              <Link to="/login?role=student" className="lp__btn lp__btn-outline" style={{ fontSize: '0.7rem' }}><Users size={13} />Student Access</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="lp__footer">
        <div className="lp__container">
          <div className="lp__footer-inner">
            <div>
              <div className="lp__footer-brand">UPASTITHI-PRAMAAN</div>
              <div className="lp__footer-sub">Fr. CRCE · Computer Engineering · Group 10268-10275-10283-10287</div>
            </div>
            <div className="lp__footer-copy">© 2026 Upastithi-Pramaan · SDG 4 · SDG 9</div>
          </div>
        </div>
      </footer>

    </main>
  );
}