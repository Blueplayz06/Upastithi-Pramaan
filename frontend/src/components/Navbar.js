import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { Scan, Shield, Cpu, Users, LogIn, Menu, X, Info } from 'lucide-react';
import './Navbar.css';

const NAV_LINKS = [
  { label: 'System',     hash: 'features', icon: <Cpu    size={12} /> },
  { label: 'Protocol',   hash: 'workflow',  icon: <Shield size={12} /> },
  { label: 'Technology', hash: 'tech',      icon: <Scan   size={12} /> },
  { label: 'Team',       hash: 'team',      icon: <Users  size={12} /> },
  { label: 'About',      href: '/about',    icon: <Info   size={12} /> },
];

export default function Navbar() {
  const navRef    = useRef(null);
  const drawerRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [open,     setOpen]     = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  /* entrance */
  useEffect(() => {
    gsap.fromTo(navRef.current,
      { y: -80, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.7, delay: 0.3, ease: 'power3.out' }
    );
  }, []);

  /* scroll */
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  /* drawer animation */
  useEffect(() => {
    if (!drawerRef.current) return;
    if (open) {
      gsap.fromTo(drawerRef.current,
        { opacity: 0, y: -10, scaleY: 0.95 },
        { opacity: 1, y: 0,   scaleY: 1, duration: 0.3, ease: 'power2.out' }
      );
    } else {
      gsap.to(drawerRef.current, { opacity: 0, y: -8, duration: 0.18, ease: 'power2.in' });
    }
  }, [open]);

  /* close drawer on route change */
  useEffect(() => setOpen(false), [location.pathname]);

  /* close on outside click */
  useEffect(() => {
    if (!open) return;
    const fn = (e) => {
      if (navRef.current?.contains(e.target)) return;
      if (drawerRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  /* smart scroll handler:
     - if already on '/' → scrollIntoView immediately
     - if on another page → navigate to '/' with hash, LandingPage picks it up */
  const handleHashClick = (hash, closeDrawer) => {
    if (closeDrawer) setOpen(false);
    if (location.pathname === '/') {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate(`/#${hash}`);
    }
  };

  return (
    <>
      <nav ref={navRef} className={`nav__root${scrolled ? ' nav__scrolled' : ''}`}>
        {scrolled && <div className="g-scan-line" aria-hidden="true" style={{ top: '100%', height: '1px', opacity: 0.4 }} />}

        <div className="nav__inner">
          <Link to="/" className="nav__logo">
            <div className="nav__logo-icon"><Scan size={17} color="var(--cyan)" /></div>
            <div>
              <div className="nav__logo-name">UPASTITHI</div>
              <div className="nav__logo-sub">PRAMAAN // v2.4</div>
            </div>
          </Link>

          <div className="nav__links">
            {NAV_LINKS.map((l, i) =>
              l.hash
                ? <button key={i} className="nav__link nav__link-btn" onClick={() => handleHashClick(l.hash, false)}>{l.icon}{l.label}</button>
                : <Link    key={i} className="nav__link" to={l.href}>{l.icon}{l.label}</Link>
            )}
          </div>

          <div className="nav__ctas">
            <Link to="/login?role=student" className="nav__btn-outline"><Users size={11} />Student</Link>
            <Link to="/login?role=faculty" className="nav__btn-solid"><LogIn  size={11} />Faculty Login</Link>
            <Link to="/login?role=admin"   className="nav__btn-admin"><Shield size={11} />Admin</Link>
          </div>

          <button className="nav__hamburger" onClick={() => setOpen(o => !o)} aria-label="Toggle menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {open && (
        <div ref={drawerRef} className="nav__drawer">
          {NAV_LINKS.map((l, i) =>
            l.hash
              ? <button key={i} className="nav__drawer-link nav__link-btn" onClick={() => handleHashClick(l.hash, true)}>{l.icon}{l.label}</button>
              : <Link    key={i} className="nav__drawer-link" to={l.href} onClick={() => setOpen(false)}>{l.icon}{l.label}</Link>
          )}
          <div className="nav__drawer-ctas">
            <Link to="/login?role=student" className="nav__btn-outline" onClick={() => setOpen(false)}><Users size={12} />Student</Link>
            <Link to="/login?role=faculty" className="nav__btn-solid"   onClick={() => setOpen(false)}><LogIn  size={12} />Faculty</Link>
            <Link to="/login?role=admin"   className="nav__btn-admin"   onClick={() => setOpen(false)}><Shield size={12} />Admin</Link>
          </div>
        </div>
      )}
    </>
  );
}