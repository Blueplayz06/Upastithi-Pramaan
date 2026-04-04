import React, { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './index.css';

import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import StudentDashboard from './components/StudentDashboard';
import FacultyDashboard from './components/FacultyDashboard';
import AdminPanel from './components/AdminPanel';
import About from './components/About';

gsap.registerPlugin(ScrollTrigger);

/* ── Custom cursor ── */
function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const mouse = useRef({ x: 0, y: 0 });
  const ring = useRef({ x: 0, y: 0 });
  const raf = useRef(null);

  useEffect(() => {
    if (window.matchMedia('(hover: none)').matches) return;
    const dot = dotRef.current;
    const rng = ringRef.current;

    const onMove = (e) => {
      mouse.current = { x: e.clientX, y: e.clientY };
      gsap.to(dot, { x: e.clientX, y: e.clientY, duration: 0.08, ease: 'power2.out' });
    };
    const lerp = (a, b, t) => a + (b - a) * t;
    const tick = () => {
      ring.current.x = lerp(ring.current.x, mouse.current.x, 0.12);
      ring.current.y = lerp(ring.current.y, mouse.current.y, 0.12);
      gsap.set(rng, { x: ring.current.x, y: ring.current.y });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    const addHover = () => document.body.classList.add('g-cursor-hover');
    const rmHover = () => document.body.classList.remove('g-cursor-hover');
    const bindAll = () => {
      document.querySelectorAll('a, button, [data-hover]').forEach(el => {
        el.addEventListener('mouseenter', addHover);
        el.addEventListener('mouseleave', rmHover);
      });
    };
    bindAll();
    document.addEventListener('mousemove', onMove);
    const mo = new MutationObserver(bindAll);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf.current);
      mo.disconnect();
    };
  }, []);

  return (
    <>
      <div className="g-cursor-dot" ref={dotRef} />
      <div className="g-cursor-ring" ref={ringRef} />
    </>
  );
}

/* ── Page transition ── */
function PageWrapper({ children }) {
  const location = useLocation();
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' }
    );
  }, [location.pathname]);
  return <div ref={ref}>{children}</div>;
}

/* ── Shell ── */
function AppShell() {
  const location = useLocation();
  const isDashboard = location.pathname.includes('dashboard') || location.pathname.includes('admin');
  return (
    <>
      <div className="g-noise" aria-hidden="true" />
      <div className="g-scanlines" aria-hidden="true" />
      <div className="g-grid" aria-hidden="true" />
      <CustomCursor />
      {!isDashboard && <Navbar />}
      <PageWrapper>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/student-dashboard" element={<StudentDashboard />} />
          <Route path="/faculty-dashboard" element={<FacultyDashboard />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </PageWrapper>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router><AppShell /></Router>
    </AuthProvider>
  );
}