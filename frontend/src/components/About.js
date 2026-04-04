import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Scan, Shield, Target, Cpu, Camera, Database,
  Network, Layers, Code2, Globe, BarChart3, Users,
  BookOpen, Lightbulb, Play
} from 'lucide-react';
import './About.css';

gsap.registerPlugin(ScrollTrigger);

const TEAM = [
  { roll: '10275', name: 'Blaise Rodrigues', role: 'Cybersecurity Analyst', init: 'BR' },
  { roll: '10268', name: 'Devansh Nayak', role: 'Cloud Engineer', init: 'DN' },
  { roll: '10283', name: 'Daksh Thakkar', role: 'Full-Stack Developer', init: 'DT' },
  { roll: '10287', name: 'Aryan Verma', role: 'ML Engineer', init: 'AV' },
];

const TECH_DEEP = [
  {
    name: 'Python 3.x', role: 'Core Engine', color: 'var(--cyan)',
    icon: <Code2 size={20} />,
    desc: 'The backbone of the entire system. Python orchestrates all modules — face recognition pipeline, ARP network scanning, SQLite database operations, and session management. Chosen for its rich ecosystem of ML and networking libraries.',
    tags: ['v3.10+', 'subprocess', 'threading', 'logging'],
  },
  {
    name: 'OpenCV', role: 'Video Processing', color: 'var(--green)',
    icon: <Camera size={20} />,
    desc: 'Handles real-time webcam capture, frame preprocessing, and feeds frames into the recognition pipeline. Performs colour-space conversion, histogram equalisation, and frame-rate control to ensure consistent recognition conditions.',
    tags: ['cv2', 'VideoCapture', 'HOG', 'BGR→RGB'],
  },
  {
    name: 'face_recognition', role: 'Face Matching', color: 'var(--cyan)',
    icon: <Scan size={20} />,
    desc: 'Built on top of dlib\'s 68-point facial landmark detector and ResNet-based face encoder. Computes 128-dimension face encodings and compares against enrolled encodings using Euclidean distance with a configurable tolerance.',
    tags: ['dlib', 'ResNet', '128-dim', 'Euclidean'],
  },
  {
    name: 'Scapy / ARP', role: 'Network Scanning', color: 'var(--amber)',
    icon: <Network size={20} />,
    desc: 'Sends ARP broadcast packets across the local subnet created by the faculty hotspot. Collects all responding MAC addresses in real time. The resulting list is matched against the student device registry for the second verification layer.',
    tags: ['ARP', 'Layer 2', 'Scapy', 'subprocess'],
  },
  {
    name: 'SQLite / MySQL', role: 'Data Storage', color: 'var(--green)',
    icon: <Database size={20} />,
    desc: 'SQLite is used in development and single-machine deployments for its zero-configuration simplicity. MySQL is available for multi-faculty or institution-wide deployments. Both store students, sessions, attendance records, MAC registry, and audit logs.',
    tags: ['sqlite3', 'MySQL', 'transactions', 'audit'],
  },
  {
    name: 'HOG + CNN', role: 'Face Detection', color: 'var(--red)',
    icon: <Layers size={20} />,
    desc: 'Two detection models are supported. HOG (Histogram of Oriented Gradients) is CPU-efficient and fast for standard conditions. CNN (Convolutional Neural Network) is more accurate at varied angles, distances, and lighting — recommended for production.',
    tags: ['HOG', 'CNN', 'dlib', 'GPU optional'],
  },
  {
    name: 'Pandas', role: 'Report Generation', color: 'var(--cyan)',
    icon: <BarChart3 size={20} />,
    desc: 'Transforms raw attendance records from the database into structured DataFrames. Powers the CSV and Excel export features, computes per-student and per-subject attendance percentages, and identifies defaulters below the 75% threshold automatically.',
    tags: ['DataFrame', 'groupby', 'to_csv', 'to_excel'],
  },
  {
    name: 'React.js', role: 'Web Dashboard', color: 'var(--green)',
    icon: <Globe size={20} />,
    desc: 'The faculty, student, and admin-facing web dashboards are built in React with real-time data fetching. Provides live attendance feed, session management controls, analytics charts, report exports, and student/device management interfaces.',
    tags: ['React', 'hooks', 'react-router', 'GSAP'],
  },
];

const METHODOLOGY = [
  { title: 'Session Initiation', desc: 'Faculty starts a session from the dashboard, selects the subject, and activates the laptop Wi-Fi hotspot. The system logs the session start time and begins monitoring.' },
  { title: 'Network Scan', desc: 'Scapy performs an ARP broadcast scan of the hotspot subnet every few seconds, collecting all MAC addresses of connected devices. Results are continuously updated in memory.' },
  { title: 'Face Detection', desc: 'OpenCV captures live frames from the connected webcam. Each frame is processed to locate all faces using the selected model (HOG or CNN). Detected regions are passed to the encoder.' },
  { title: 'Face Recognition', desc: 'For each detected face, a 128-dimension encoding is computed and compared against all enrolled student encodings. Matches within the configured tolerance threshold are identified.' },
  { title: '2FA Cross-Validation', desc: 'The system checks whether the recognized student\'s registered MAC address is present in the current ARP scan results. Both face AND MAC must be confirmed simultaneously.' },
  { title: 'Attendance Logging', desc: 'On a successful dual-layer match, the attendance record is written to the database with a timestamp, confidence score, and session ID. Manual overrides by faculty are also logged with reason.' },
  { title: 'Session End & Reporting', desc: 'Faculty ends the session. The system calculates final attendance percentages, flags defaulters below 75%, and makes the session report available for download in CSV, Excel, or PDF format.' },
];

export default function About() {
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray('[data-ab-reveal]').forEach(el => {
        gsap.fromTo(el,
          { opacity: 0, y: 44 },
          {
            opacity: 1, y: 0, duration: 0.75, ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' }
          }
        );
      });
      gsap.utils.toArray('[data-ab-stagger]').forEach(group => {
        const items = group.querySelectorAll('[data-ab-item]');
        gsap.fromTo(items,
          { opacity: 0, y: 32, scale: 0.97 },
          {
            opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.09, ease: 'power2.out',
            scrollTrigger: { trigger: group, start: 'top 84%' }
          }
        );
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <main className="ab__page">

      {/* ══ HERO ══ */}
      <section className="ab__hero">
        <div className="ab__hero-orb" style={{ width: 600, height: 600, top: -100, left: -150, background: 'radial-gradient(circle,rgba(0,200,255,.16) 0%,transparent 70%)' }} />
        <div className="ab__hero-orb" style={{ width: 400, height: 400, bottom: 0, right: -80, background: 'radial-gradient(circle,rgba(0,255,157,.1) 0%,transparent 70%)' }} />

        <div className="ab__hero-inner">
          <div className="ab__container">
            <div className="ab__hero-grid">
              {/* Left */}
              <div>
                <div className="ab__hero-badge">
                  <span className="ab__badge ab__badge-cyan"><span className="g-pulse-dot" />Academic Project — 2024–25</span>
                </div>
                <h1 className="ab__hero-title">
                  <span style={{ display: 'block' }}>UPASTITHI</span>
                  <span className="g-gradient-text" style={{ display: 'block' }}>PRAMAAN</span>
                </h1>
                <p className="ab__hero-sub">
                  A smart, automated attendance system that cross-references real-time facial recognition with Wi-Fi-based device authentication — making proxy attendance physically and technically impossible.
                </p>
                <div className="ab__hero-tags">
                  {['SDG 4', 'SDG 9', 'Computer Vision', 'Network Security', '2FA', 'Python'].map((t, i) => (
                    <span key={i} className="ab__hero-tag">{t}</span>
                  ))}
                </div>
              </div>

              {/* Right — stat boxes */}
              <div className="ab__hero-stats">
                {[
                  { val: '2', label: 'Verification Layers' },
                  { val: '0', label: 'Extra Hardware Needed' },
                  { val: '97.3%', label: 'Peak Face Confidence' },
                  { val: '15min', label: 'Time Saved Per Lecture' },
                ].map((s, i) => (
                  <div key={i} className="ab__hero-stat-box">
                    <div className="ab__hero-stat-val">{s.val}</div>
                    <div className="ab__hero-stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ ABSTRACT ══ */}
      <section className="ab__section ab__section--alt">
        <div className="ab__container">
          <div className="ab__section-head" data-ab-reveal>
            <div className="ab__section-label"><span>01</span>Project Overview</div>
            <h2 className="ab__section-title">Problem, Approach & Objectives</h2>
          </div>
          <div className="ab__abstract-grid" data-ab-stagger>
            {[
              {
                icon: <BookOpen size={22} />, color: 'var(--cyan)', title: 'Abstract',
                text: 'Traditional attendance methods — manual roll calls and basic QR or biometric systems — are vulnerable to proxy fraud, consume valuable lecture time, and generate errors in record-keeping. Upastithi-Pramaan addresses all three by automating attendance through simultaneous facial recognition and Wi-Fi device verification, requiring both to be satisfied before any attendance record is accepted.',
              },
              {
                icon: <Target size={22} />, color: 'var(--green)', title: 'Problem Statement',
                text: 'In a classroom of 60 students, manual roll call consumes an average of 10–15 minutes per lecture. A student can ask a friend to answer for them, or hold up a photograph to fool single-layer facial recognition. Network-only systems fail when a phone is left in the room. No existing single-layer approach can simultaneously address time waste, proxy fraud, and spoofing.',
              },
              {
                icon: <Lightbulb size={22} />, color: 'var(--amber)', title: 'Aims & Objectives',
                text: 'To build a dual-layer attendance system that: (1) identifies students from live video using state-of-the-art face recognition, (2) verifies physical device presence via Wi-Fi MAC address matching, (3) cross-validates both layers simultaneously, (4) provides real-time dashboards for faculty, and (5) automates report generation and defaulter detection — all without additional hardware.',
              },
              {
                icon: <Shield size={22} />, color: 'var(--red)', title: 'Why Two Layers?',
                text: 'Facial recognition alone can be spoofed with a photograph. Device detection alone fails if a student sends their phone with someone else. The conjunction of both — face AND device present simultaneously — makes each spoofing vector infeasible by physical law: faking both at once from outside the classroom is not possible.',
              },
            ].map((item, i) => (
              <div key={i} className="ab__card ab__card-bracket ab__abstract-card" data-ab-item>
                <div className="ab__abstract-icon" style={{ color: item.color }}>{item.icon}</div>
                <h3 className="ab__abstract-title">{item.title}</h3>
                <p className="ab__abstract-text">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ METHODOLOGY ══ */}
      <section className="ab__section">
        <div className="ab__container">
          <div className="ab__section-head" data-ab-reveal>
            <div className="ab__section-label"><span>02</span>Methodology</div>
            <h2 className="ab__section-title">Step-by-Step System Flow</h2>
            <p className="ab__section-sub">Every attendance session follows this exact sequence — automated, logged, and tamper-evident at every step.</p>
          </div>
          <div className="ab__method-steps" data-ab-stagger>
            {METHODOLOGY.map((step, i) => (
              <div key={i} className="ab__method-step" data-ab-item>
                <div className="ab__method-step-num">0{i + 1}</div>
                <div className="ab__method-step-body">
                  <div className="ab__method-step-title">{step.title}</div>
                  <div className="ab__method-step-desc">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TECH DEEP DIVE ══ */}
      <section className="ab__section ab__section--alt">
        <div className="ab__container">
          <div className="ab__section-head ab__section-head--center" data-ab-reveal>
            <div className="ab__section-label"><span>03</span>Technology</div>
            <h2 className="ab__section-title">Stack Deep Dive</h2>
            <p className="ab__section-sub">Every library and framework chosen for a specific, justified reason — not convenience.</p>
          </div>
          <div className="ab__tech-grid" data-ab-stagger>
            {TECH_DEEP.map((t, i) => (
              <div key={i} className="ab__card ab__tech-card" data-ab-item>
                <div className="ab__tech-card-top">
                  <div className="ab__tech-icon-box" style={{ background: `${t.color}18`, border: `1px solid ${t.color}44`, color: t.color }}>
                    {t.icon}
                  </div>
                  <div>
                    <div className="ab__tech-name">{t.name}</div>
                    <div className="ab__tech-role-label">{t.role}</div>
                  </div>
                </div>
                <p className="ab__tech-desc">{t.desc}</p>
                <div className="ab__tech-tag-row">
                  {t.tags.map((tag, j) => <span key={j} className="ab__tech-tag">{tag}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ SDG ══ */}
      <section className="ab__section">
        <div className="ab__container">
          <div className="ab__section-head" data-ab-reveal>
            <div className="ab__section-label"><span>04</span>Impact</div>
            <h2 className="ab__section-title">Sustainable Development Goals</h2>
            <p className="ab__section-sub">Upastithi-Pramaan directly contributes to two UN Sustainable Development Goals through its core design and deployment.</p>
          </div>
          <div className="ab__sdg-grid" data-ab-stagger>
            {[
              {
                sdg: 'SDG 4', full: 'Quality Education', color: 'var(--green)',
                icon: <Target size={22} />,
                desc: 'By eliminating manual roll calls, the system returns 10–15 minutes of instructional time per lecture to faculty. Across a 60-lecture semester, this recovers 10–15 hours of teaching — equivalent to several additional full lectures of content delivery.',
                points: [
                  'Reduces administrative overhead on faculty',
                  'More accurate attendance records improve academic accountability',
                  'Defaulter detection enables early intervention before students breach thresholds',
                  'Contactless and zero-hardware design is accessible to any classroom with a laptop and webcam',
                ],
              },
              {
                sdg: 'SDG 9', full: 'Industry, Innovation & Infrastructure', color: 'var(--cyan)',
                icon: <Cpu size={22} />,
                desc: 'Deploying production-grade AI (HOG/CNN face recognition) and IoT-class network security (ARP-based MAC verification) within institutional infrastructure demonstrates that modern technology can solve real institutional problems at near-zero cost.',
                points: [
                  'Leverages existing hardware — no additional sensors or scanners needed',
                  'Open-source libraries make the system reproducible and adaptable',
                  'Demonstrates AI + networking integration for real-world institutional use',
                  'Scalable from a single classroom to entire departments or institutions',
                ],
              },
            ].map((s, i) => (
              <div key={i} className="ab__card ab__card-bracket ab__sdg-card" data-ab-item style={{ borderColor: `${s.color}33` }}>
                <div className="ab__sdg-top">
                  <div className="ab__sdg-icon" style={{ background: `${s.color}14`, border: `1px solid ${s.color}44`, color: s.color }}>{s.icon}</div>
                  <div>
                    <div className="ab__sdg-code" style={{ color: s.color }}>{s.sdg}</div>
                    <div className="ab__sdg-title">{s.full}</div>
                  </div>
                </div>
                <p className="ab__sdg-desc">{s.desc}</p>
                <div className="ab__sdg-points">
                  {s.points.map((p, j) => (
                    <div key={j} className="ab__sdg-point">
                      <div className="ab__sdg-dot" style={{ background: s.color }} />
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TEAM ══ */}
      <section className="ab__section ab__section--alt">
        <div className="ab__container">
          <div className="ab__section-head ab__section-head--center" data-ab-reveal>
            <div className="ab__section-label"><span>05</span>Team</div>
            <h2 className="ab__section-title">The Engineers</h2>
          </div>
          <div className="ab__team-grid" data-ab-stagger>
            {TEAM.map((m, i) => (
              <div key={i} className="ab__card ab__team-card" data-ab-item>
                <div className="ab__team-avatar">{m.init}</div>
                <div className="ab__team-name">{m.name}</div>
                <div className="ab__team-roll">ROLL {m.roll} · DIV B</div>
                <div className="ab__team-role">{m.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section className="ab__section ab__section--dark" data-ab-reveal>
        <div className="ab__container" style={{ textAlign: 'center' }}>
          <div className="ab__section-label" style={{ justifyContent: 'center', marginBottom: 18 }}>System Ready</div>
          <h2 className="ab__section-title" style={{ marginBottom: 18 }}>
            Ready to <span className="g-gradient-text">try the system?</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: 440, margin: '0 auto 36px' }}>
            Log in to the faculty or student portal to explore the live dashboard.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/login?role=faculty" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 28px', background: 'var(--cyan)', color: 'var(--void)',
              fontFamily: 'var(--font-display)', fontSize: '0.7rem', fontWeight: 600,
              letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none',
              clip_path: 'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)',
              clipPath: 'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)',
              boxShadow: '0 0 20px var(--cyan-glow)', transition: 'all .3s var(--ease-out)',
            }}>
              <Play size={13} />Faculty Portal
            </Link>
            <Link to="/login?role=student" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 28px', background: 'transparent', color: 'var(--cyan)',
              fontFamily: 'var(--font-display)', fontSize: '0.7rem', fontWeight: 600,
              letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none',
              border: '1px solid var(--border-hot)',
              clipPath: 'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)',
              boxShadow: 'inset 0 0 20px var(--cyan-glow)', transition: 'all .3s var(--ease-out)',
            }}>
              <Users size={13} />Student Access
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}