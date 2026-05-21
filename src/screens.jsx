import React from 'react';
// screens.jsx — TrAIner v2 screens (brand palette: navy/cyan/teal/coral)

// ─────────── ICON ATOM ───────────
const Icon = ({ name, size = 22, color = 'currentColor', stroke = 2 }) => {
  const paths = {
    menu:  <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    search:<><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    more:  <><circle cx="12" cy="5" r="1.4" fill={color}/><circle cx="12" cy="12" r="1.4" fill={color}/><circle cx="12" cy="19" r="1.4" fill={color}/></>,
    user:  <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    lock:  <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    mail:  <><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,6 12,13 2,6"/></>,
    phone: <><rect x="6" y="2" width="12" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></>,
    cal:   <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    pin:   <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,
    trophy:<><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 4h3v2a3 3 0 0 1-3 3M7 4H4v2a3 3 0 0 0 3 3"/></>,
    rocket:<><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></>,
    flame: <><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></>,
    settings:<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    check: <><polyline points="20 6 9 17 4 12"/></>,
    chev:  <><polyline points="9 18 15 12 9 6"/></>,
    chevL: <><polyline points="15 18 9 12 15 6"/></>,
    play:  <><polygon points="5 3 19 12 5 21 5 3" fill={color}/></>,
    target:<><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
    bolt:  <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill={color}/></>,
    bell:  <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    sparkle:<><path d="M12 2l1.8 5.8L19.5 9l-5.7 1.2L12 16l-1.8-5.8L4.5 9l5.7-1.2z"/></>,
    logout:<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    plus:  <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    male:  <><circle cx="10" cy="14" r="5"/><line x1="14" y1="10" x2="20" y2="4"/><polyline points="15 4 20 4 20 9"/></>,
    activity:<><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>,
    history:<><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></>,
    chart: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
    map:   <><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></>,
    edit:  <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    heart: <><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></>,
    moon:  <><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></>,
    clock: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    pulse: <><polyline points="22 12 17 12 14 21 10 3 7 12 2 12"/></>,
    dumbbell: <><path d="M2 9v6M22 9v6M5 6v12M19 6v12M8 9h8M8 15h8"/></>,
    grad:  <><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></>,
    chat:  <><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></>,
    flask: <><path d="M10 2v6.7L3 18a2 2 0 0 0 1.8 3h14.4A2 2 0 0 0 21 18l-7-9.3V2"/><line x1="9" y1="2" x2="15" y2="2"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
};

// Themed surface helpers
const surfRaised = (dark) => dark ? '#142233' : '#FFFFFF';
const surfSunken = (dark) => dark ? '#0E1A2B' : '#F4F6FA';
const borderSubtle = (dark) => dark ? '#1F2E45' : '#E7ECF3';
const textPri = (dark) => dark ? '#FFFFFF' : '#102236';
const textSec = (dark) => dark ? 'rgba(255,255,255,.65)' : '#5a6878';
const textMute = (dark) => dark ? 'rgba(255,255,255,.45)' : '#8a96a4';

const PhotoSlot = ({ label, w, h, dark = true, radius = 10, style = {} }) => (
  <div style={{
    width: w, height: h, borderRadius: radius,
    background: dark
      ? 'repeating-linear-gradient(135deg,#1c2e44 0 8px,#16263a 8px 16px)'
      : 'repeating-linear-gradient(135deg,#e6e9ef 0 8px,#dade5 8px 16px)',
    color: dark ? 'rgba(255,255,255,.55)' : 'rgba(20,40,80,.4)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start',
    padding: 10, fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
    fontSize: 10, letterSpacing: '.04em', textTransform: 'uppercase',
    overflow: 'hidden', position: 'relative', flexShrink: 0,
    ...style,
  }}>{label}</div>
);

const MapPlaceholder = ({ h = 160, withRoute = false, withPin = false, primary = '#2DD4E0', dark }) => (
  <div style={{
    width: '100%', height: h, borderRadius: 14, overflow: 'hidden',
    position: 'relative',
    background: dark ? '#0a131f' : '#f1f3f7',
    backgroundImage:
      `linear-gradient(180deg,${dark ? 'rgba(255,255,255,.02)' : 'rgba(0,0,0,.04)'},transparent),` +
      `repeating-linear-gradient(90deg,transparent 0 38px,${dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)'} 38px 39px),` +
      `repeating-linear-gradient(0deg,transparent 0 46px,${dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)'} 46px 47px),` +
      `repeating-linear-gradient(28deg,transparent 0 90px,${dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)'} 90px 92px),` +
      `repeating-linear-gradient(-58deg,transparent 0 120px,${dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)'} 120px 122px)`,
  }}>
    <div style={{ position: 'absolute', top: 10, left: 14, fontSize: 9, color: dark ? 'rgba(255,255,255,.35)' : '#9aa0a6', letterSpacing: '.05em' }}>PROSPECT</div>
    <div style={{ position: 'absolute', top: 28, right: 18, fontSize: 9, color: dark ? 'rgba(255,255,255,.35)' : '#9aa0a6', letterSpacing: '.05em' }}>BROOKLYN</div>
    <div style={{ position: 'absolute', bottom: 14, left: 14, fontSize: 9, color: dark ? 'rgba(255,255,255,.35)' : '#9aa0a6', letterSpacing: '.05em' }}>CLINTON HILL</div>
    {withRoute && (
      <svg viewBox="0 0 320 160" preserveAspectRatio="none" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <path d="M30 35 L70 50 L95 95 L140 110 L200 90 L240 130" stroke={primary} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="30" cy="35" r="6" fill={primary}/>
        <circle cx="30" cy="35" r="9" fill={primary} opacity=".25"/>
        <circle cx="240" cy="130" r="5" fill={dark ? '#0E1A2B' : '#fff'} stroke={primary} strokeWidth="3"/>
      </svg>
    )}
    {withPin && (
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        width: 26, height: 26, borderRadius: '50% 50% 50% 0', background: primary,
        transform: 'translate(-50%,-100%) rotate(-45deg)',
        boxShadow: `0 6px 16px ${primary}55`,
      }}>
        <div style={{ position: 'absolute', top: 6, left: 6, width: 14, height: 14, borderRadius: '50%', background: '#0E1A2B' }}/>
      </div>
    )}
  </div>
);

// Brand-aligned hero illustration: abstract grid of circles + barbell
const HeroIllustration = ({ variant = 'lift', primary = '#2DD4E0', accent = '#EF5B3C', dark = true }) => {
  if (variant === 'run') {
    return (
      <svg viewBox="0 0 320 200" width="100%" height="200">
        <defs>
          <radialGradient id="hg1" cx="0.5" cy="0.4" r="0.6">
            <stop offset="0" stopColor={primary} stopOpacity="0.35"/>
            <stop offset="1" stopColor={primary} stopOpacity="0"/>
          </radialGradient>
        </defs>
        <circle cx="160" cy="105" r="92" fill="url(#hg1)"/>
        <circle cx="160" cy="105" r="60" fill="none" stroke={primary} strokeWidth="1.2" opacity=".4"/>
        <circle cx="160" cy="105" r="40" fill="none" stroke={primary} strokeWidth="1.2" opacity=".55"/>
        {/* pulse line */}
        <path d="M40 130 Q70 110 90 130 T140 130 L155 100 L170 160 L185 130 L220 130 Q250 110 280 130"
          stroke={primary} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        {/* heart node */}
        <circle cx="170" cy="160" r="5" fill={accent}/>
        <circle cx="170" cy="160" r="10" fill={accent} opacity=".3"/>
        {/* tags */}
        <g fontFamily="ui-monospace,SFMono-Regular,monospace" fontSize="9" fill={primary}>
          <text x="36" y="60">98 BPM</text>
          <text x="244" y="60" textAnchor="end">5.2 km/h</text>
          <text x="36" y="190">ZONE 3</text>
          <text x="244" y="190" textAnchor="end">AI · LIVE</text>
        </g>
      </svg>
    );
  }
  // 'lift'
  return (
    <svg viewBox="0 0 320 200" width="100%" height="200">
      <defs>
        <radialGradient id="hg2" cx="0.5" cy="0.5" r="0.55">
          <stop offset="0" stopColor={primary} stopOpacity="0.4"/>
          <stop offset="1" stopColor={primary} stopOpacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="160" cy="100" r="84" fill="url(#hg2)"/>
      <circle cx="160" cy="100" r="68" fill="none" stroke={accent} strokeWidth="2.5"/>
      {/* dumbbell glyph */}
      <g fill={primary}>
        <rect x="90" y="92" width="9" height="16" rx="2"/>
        <rect x="100" y="86" width="6" height="28" rx="2"/>
        <rect x="106" y="96" width="108" height="8" rx="3"/>
        <rect x="214" y="86" width="6" height="28" rx="2"/>
        <rect x="221" y="92" width="9" height="16" rx="2"/>
      </g>
      {/* sparkles */}
      <g fill={accent}>
        <circle cx="60" cy="40" r="2.5"/>
        <circle cx="260" cy="40" r="2.5"/>
        <circle cx="240" cy="170" r="2.5"/>
      </g>
    </svg>
  );
};

// ─────────── APP CHROME ───────────
const TopBar = ({ onMenu, dark, accent, badge }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 18px 6px', flexShrink: 0,
  }}>
    <button onClick={onMenu} style={iconBtn(dark)} aria-label="Menu">
      <Icon name="menu" size={22} color={textPri(dark)} stroke={2}/>
    </button>
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {badge}
      <button style={iconBtn(dark)} aria-label="Search">
        <Icon name="search" size={20} color={textPri(dark)}/>
      </button>
      <button style={{ ...iconBtn(dark), position: 'relative' }} aria-label="Notifications">
        <Icon name="bell" size={19} color={textPri(dark)}/>
        <div style={{
          position: 'absolute', top: 8, right: 8,
          width: 7, height: 7, borderRadius: '50%', background: accent,
          border: `1.5px solid ${dark ? '#0E1A2B' : '#fff'}`,
        }}/>
      </button>
    </div>
  </div>
);
const iconBtn = (dark) => ({
  width: 38, height: 38, borderRadius: 12, border: 'none',
  background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', padding: 0, color: textPri(dark),
});

const ScreenTitle = ({ children, sub, dark }) => (
  <div style={{ padding: '4px 22px 18px' }}>
    <h1 style={{
      margin: 0, fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
      fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em',
      color: textPri(dark),
    }}>{children}</h1>
    {sub && <div style={{ marginTop: 4, fontSize: 13, color: textSec(dark) }}>{sub}</div>}
  </div>
);

// Branded inline TrAIner logotype (small)
const Logotype = ({ primary, size = 24, white = false }) => (
  <span style={{
    fontFamily: '"Plus Jakarta Sans",sans-serif', fontWeight: 700,
    fontSize: size, letterSpacing: '-0.02em',
    color: white ? '#fff' : 'inherit',
  }}>
    Tr<span style={{ color: primary }}>AI</span>ner
  </span>
);

// ─────────── 1. WELCOME ───────────
function WelcomeScreen({ nav, t, dark }) {
  return (
    <div style={{ padding: '40px 28px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginTop: 30, display: 'flex', justifyContent: 'center', position: 'relative' }}>
        {/* Brand glow */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: `radial-gradient(closest-side, ${t.primary}33, transparent 70%)`,
          filter: 'blur(8px)',
        }}/>
        <img
          src="assets/trainer-logo-clean.png"
          alt="TrAIner"
          width={200}
          height={200}
          style={{
            width: 200, height: 200, objectFit: 'contain',
            filter: `drop-shadow(0 12px 30px ${t.primary}55)`,
            position: 'relative', zIndex: 1,
          }}
        />
      </div>
      <div style={{ marginTop: 22, textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 100,
          background: `${t.accent}1f`, color: t.accent,
          fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
        }}>
          <Icon name="sparkle" size={11} color={t.accent} stroke={2.4}/>
          Train smarter, not harder
        </div>
        <h1 style={{
          margin: '16px 0 4px', fontFamily: '"Plus Jakarta Sans",system-ui,sans-serif',
          fontSize: 34, fontWeight: 700, letterSpacing: '-0.025em', color: textPri(dark), lineHeight: 1,
        }}>
          Tr<span style={{ color: t.primary }}>AI</span>ner
        </h1>
        <div style={{ marginTop: 6, fontSize: 13.5, color: textSec(dark), letterSpacing: '.02em' }}>
          The PT &amp; ME Experience
        </div>
        <p style={{ margin: '18px auto 0', maxWidth: 280, color: textSec(dark), fontSize: 13.5, lineHeight: 1.55 }}>
          AI-powered workouts built from real trainers — adapted daily to your energy, time and body.
        </p>
      </div>
      <div style={{ flex: 1 }}/>
      <button onClick={() => nav('login')} style={primaryBtn(t.primary, dark)}>Log In</button>
      <button onClick={() => nav('register')} style={outlineBtn(t.primary, dark)}>Register</button>
    </div>
  );
}

const primaryBtn = (primary, dark) => ({
  width: '100%', padding: '17px 20px', border: 'none', borderRadius: 999,
  background: primary, color: '#0E1A2B', fontSize: 15, fontWeight: 700,
  fontFamily: 'inherit', cursor: 'pointer', marginBottom: 12,
  boxShadow: `0 8px 22px ${primary}55`,
});
const outlineBtn = (primary, dark) => ({
  width: '100%', padding: '16px 20px', borderRadius: 999,
  background: 'transparent', color: primary, fontSize: 15, fontWeight: 600,
  fontFamily: 'inherit', cursor: 'pointer', border: `1.5px solid ${primary}`,
});
const ghostBtn = (dark) => ({
  background: 'transparent', border: 'none', color: textSec(dark),
  fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', padding: 12,
});

// ─────────── 2. LOGIN ───────────
function OAuthButton({ provider, onClick, dark, primary }) {
  // Harmonized with the app's dark navy / cyan system.
  // Keeps the multi-color Google G mark (recognizable) but uses surface
  // styling so buttons read as part of the TrAIner UI.
  const providers = {
    google: {
      label: 'Continue with Google',
      logo: (
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.08-1.79 2.72v2.26h2.9c1.7-1.56 2.69-3.87 2.69-6.62z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33C2.44 15.98 5.48 18 9 18z" fill="#34A853"/>
          <path d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.16.29-1.7V4.97H.96A8.99 8.99 0 0 0 0 9c0 1.45.35 2.82.96 4.03l2.99-2.33z" fill="#FBBC05"/>
          <path d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
      ),
    },
    apple: {
      label: 'Continue with Apple',
      logo: (
        <svg width="16" height="18" viewBox="0 0 16 18" fill="#000">
          <path d="M13.32 9.55c-.02-2.16 1.76-3.2 1.84-3.25-1.01-1.47-2.58-1.67-3.13-1.69-1.33-.14-2.6.78-3.27.78-.69 0-1.72-.76-2.83-.74-1.45.02-2.8.85-3.55 2.15-1.52 2.63-.39 6.53 1.09 8.67.73 1.05 1.59 2.22 2.7 2.18 1.09-.04 1.5-.7 2.81-.7 1.31 0 1.68.7 2.82.68 1.16-.02 1.9-1.06 2.61-2.12.82-1.22 1.16-2.4 1.18-2.46-.03-.01-2.26-.87-2.28-3.44zM11.16 3.18c.6-.73 1-1.74.89-2.74-.86.04-1.9.57-2.52 1.3-.56.64-1.05 1.67-.92 2.66.96.07 1.94-.49 2.55-1.22z"/>
        </svg>
      ),
    },
  };
  const p = providers[provider];
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        width: '100%', padding: '14px 18px', borderRadius: 999,
        background: hover
          ? (dark ? '#1a2c43' : '#EDF1F7')
          : (dark ? '#142233' : '#F4F6FA'),
        color: textPri(dark),
        border: `1px solid ${hover ? primary : borderSubtle(dark)}`,
        fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
        transition: 'background .15s, border-color .15s',
      }}
    >
      <span style={{
        width: 24, height: 24, borderRadius: 6,
        background: dark ? 'rgba(255,255,255,.96)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {p.logo}
      </span>
      <span>{p.label}</span>
    </button>
  );
}

function OAuthSection({ onProvider, dark, primary, dividerLabel = 'or continue with email' }) {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <OAuthButton provider="google" onClick={() => onProvider('google')} dark={dark} primary={primary}/>
        <OAuthButton provider="apple"  onClick={() => onProvider('apple')}  dark={dark} primary={primary}/>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0' }}>
        <div style={{ flex: 1, height: 1, background: borderSubtle(dark) }}/>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: textMute(dark) }}>{dividerLabel}</div>
        <div style={{ flex: 1, height: 1, background: borderSubtle(dark) }}/>
      </div>
    </>
  );
}

function LoginScreen({ nav, t, dark, signIn }) {
  const [email, setEmail] = React.useState('');
  const [p, setP] = React.useState('');
  const [err, setErr] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const submit = async () => {
    if (!email || !p) { setErr('Please fill in both fields.'); return; }
    setLoading(true); setErr('');
    const { error } = await signIn(email, p);
    if (error) { setErr(error.message); setLoading(false); return; }
  };
  const oauth = () => setErr('OAuth coming soon.');
  return (
    <div style={{ padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <button onClick={() => nav('welcome')} style={{ ...iconBtn(dark), marginLeft: -8 }}>
        <Icon name="chevL" size={22} color={textPri(dark)}/>
      </button>
      <div style={{ marginTop: 4, display: 'flex', justifyContent: 'center', position: 'relative', padding: '6px 0 4px' }}>
        <img
          src="assets/trainer-logo-clean.png"
          alt="TrAIner"
          width={120}
          height={120}
          style={{
            width: 120, height: 120, objectFit: 'contain',
            filter: `drop-shadow(0 10px 24px ${t.primary}55)`,
          }}
        />
      </div>
      <div style={{ marginTop: 8 }}>
        <h1 style={{
          margin: 0, fontFamily: '"Plus Jakarta Sans",sans-serif',
          fontSize: 26, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em',
        }}>Welcome back</h1>
        <div style={{ color: textSec(dark), fontSize: 13, marginTop: 4 }}>Log in to continue your training.</div>
      </div>
      <div style={{ marginTop: 18 }}>
        <OAuthSection onProvider={oauth} dark={dark} primary={t.primary}/>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <PillInput icon="mail" placeholder="Email" type="email" value={email} onChange={setEmail} primary={t.primary} dark={dark}/>
        <PillInput icon="lock" placeholder="Password" value={p} type="password" onChange={setP} primary={t.primary} dark={dark}/>
      </div>
      {err && <div style={{ color: t.accent, fontSize: 12, marginTop: 10 }}>{err}</div>}
      <div style={{ flex: 1, minHeight: 12 }}/>
      <button onClick={submit} disabled={loading} style={{ ...primaryBtn(t.primary, dark), opacity: loading ? 0.7 : 1 }}>
        {loading ? 'Logging in…' : 'Log In'}
      </button>
      <button onClick={() => alert('A reset link would be sent to your email.')} style={{ ...ghostBtn(dark), alignSelf: 'center' }}>Forgot Password?</button>
    </div>
  );
}

function PillInput({ icon, placeholder, value, onChange, type = 'text', primary, dark }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 18px', borderRadius: 999,
      background: dark ? '#142233' : '#F4F6FA',
      border: `1.5px solid ${focus ? primary : 'transparent'}`,
      transition: 'border-color .15s',
    }}>
      <Icon name={icon} size={18} color={textMute(dark)} stroke={2}/>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          flex: 1, border: 'none', outline: 'none', background: 'transparent',
          fontSize: 14, color: textPri(dark), fontFamily: 'inherit', minWidth: 0,
        }}
      />
    </label>
  );
}

// ─────────── 3. REGISTER ───────────
function RegisterScreen({ nav, t, dark, signUp }) {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [pw, setPw] = React.useState('');
  const [pw2, setPw2] = React.useState('');
  const [err, setErr] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const submit = async () => {
    if (!name || !email || !pw) { setErr('All fields are required.'); return; }
    if (pw !== pw2) { setErr('Passwords do not match.'); return; }
    setLoading(true); setErr('');
    const { data, error } = await signUp(email, pw, name);
    if (error) { setErr(error.message); setLoading(false); return; }
    if (!data.session) {
      setErr('Account created! Check your email to confirm your address before logging in.');
      setLoading(false);
      return;
    }
    nav('onboarding');
  };
  const oauth = () => setErr('OAuth coming soon.');
  return (
    <div style={{ padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <button onClick={() => nav('welcome')} style={{ ...iconBtn(dark), marginLeft: -8 }}>
        <Icon name="chevL" size={22} color={textPri(dark)}/>
      </button>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 4px' }}>
        <img
          src="assets/trainer-logo-clean.png"
          alt="TrAIner"
          width={110}
          height={110}
          style={{
            width: 110, height: 110, objectFit: 'contain',
            filter: `drop-shadow(0 10px 24px ${t.primary}55)`,
          }}
        />
      </div>
      <h1 style={{
        margin: '4px 0 4px', fontFamily: '"Plus Jakarta Sans",sans-serif',
        fontSize: 24, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em',
      }}>Create account</h1>
      <div style={{ color: textSec(dark), fontSize: 13 }}>Get a coach in your pocket — backed by real trainers.</div>
      <div style={{ marginTop: 16 }}>
        <OAuthSection onProvider={oauth} dark={dark} primary={t.primary} dividerLabel="or sign up with email"/>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <PillInput icon="user"  placeholder="Full Name"       value={name}  onChange={setName}  primary={t.primary} dark={dark}/>
        <PillInput icon="mail"  placeholder="Email"  type="email"    value={email} onChange={setEmail} primary={t.primary} dark={dark}/>
        <PillInput icon="lock"  placeholder="Password"        value={pw}    onChange={setPw}    primary={t.primary} dark={dark} type="password"/>
        <PillInput icon="lock"  placeholder="Confirm Password" value={pw2}  onChange={setPw2}   primary={t.primary} dark={dark} type="password"/>
      </div>
      {err && <div style={{ color: t.accent, fontSize: 12, marginTop: 10 }}>{err}</div>}
      <div style={{ flex: 1, minHeight: 12 }}/>
      <button onClick={submit} disabled={loading} style={{ ...primaryBtn(t.primary, dark), opacity: loading ? 0.7 : 1 }}>
        {loading ? 'Creating account…' : 'Register'}
      </button>
      <button onClick={() => nav('login')} style={{ ...ghostBtn(dark), alignSelf: 'center' }}>Already have an account?</button>
    </div>
  );
}

// ─────────── 4. ONBOARDING (4-step quiz) ───────────
function OnboardingScreen({ nav, t, dark, setCheckin, cycleConfig, setCycleConfig }) {
  const [step, setStep] = React.useState(0);
  const [goal, setGoal] = React.useState('Endurance');
  const [level, setLevel] = React.useState('Intermediate');
  const [minutes, setMinutes] = React.useState(30);
  const [restrictions, setRestrictions] = React.useState([]);
  const [cycle, setCycle] = React.useState(false);
  // Local cycle length editor — committed on "Build my plan"
  const [length, setLength] = React.useState(cycleConfig ? cycleConfig.length : 28);

  const steps = ['Goal', 'Level', 'Time', 'Body'];
  const goals = [
    { v: 'Endurance', ic: 'pulse' },
    { v: 'Strength',  ic: 'dumbbell' },
    { v: 'Weight loss', ic: 'flame' },
    { v: 'Mobility',  ic: 'heart' },
  ];
  const levels = ['Beginner', 'Intermediate', 'Advanced'];
  const issues = ['Lower back', 'Knees', 'Shoulder', 'Wrist', 'Ankle'];

  const toggleIssue = (i) => setRestrictions(r => r.includes(i) ? r.filter(x => x !== i) : [...r, i]);

  const finish = () => {
    setCheckin({ energy: 7, soreness: restrictions, minutes, goal });
    if (cycle && setCycleConfig) {
      setCycleConfig({ ...(cycleConfig || {}), length });
    }
    nav('profile');
  };

  return (
    <div style={{ padding: '20px 24px 28px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => step === 0 ? nav('welcome') : setStep(step - 1)} style={iconBtn(dark)}>
          <Icon name="chevL" size={22} color={textPri(dark)}/>
        </button>
        <div style={{ display: 'flex', gap: 6 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 22 : 8, height: 6, borderRadius: 4,
              background: i <= step ? t.primary : (dark ? '#1F2E45' : '#E0E5ED'),
              transition: 'width .25s',
            }}/>
          ))}
        </div>
        <div style={{ width: 38 }}/>
      </div>

      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: t.primary }}>
          Step {step + 1} / {steps.length}
        </div>
        <h1 style={{
          margin: '6px 0 6px', fontFamily: '"Plus Jakarta Sans",sans-serif',
          fontSize: 26, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em', lineHeight: 1.15,
        }}>
          {step === 0 && 'What\'s your main goal?'}
          {step === 1 && 'What\'s your fitness level?'}
          {step === 2 && 'How much time per session?'}
          {step === 3 && 'Anything we should know about?'}
        </h1>
        <div style={{ color: textSec(dark), fontSize: 13, marginBottom: 18 }}>
          {step === 0 && 'Your trainer + AI will build a plan around this.'}
          {step === 1 && 'We\'ll calibrate intensity to where you are now.'}
          {step === 2 && 'Today and most days — we\'ll adapt when life happens.'}
          {step === 3 && 'Injuries, restrictions or cycle tracking. Stays private.'}
        </div>
      </div>

      {/* Step content */}
      {step === 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {goals.map(g => {
            const on = goal === g.v;
            return (
              <button key={g.v} onClick={() => setGoal(g.v)} style={{
                textAlign: 'left', padding: 16, borderRadius: 16,
                background: on ? `${t.primary}1a` : surfRaised(dark),
                border: `1.5px solid ${on ? t.primary : borderSubtle(dark)}`,
                fontFamily: 'inherit', cursor: 'pointer',
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 12, marginBottom: 12,
                  background: on ? t.primary : `${t.primary}22`,
                  color: on ? '#0E1A2B' : t.primary,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={g.ic} size={20} color={on ? '#0E1A2B' : t.primary} stroke={2.2}/>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: textPri(dark) }}>{g.v}</div>
              </button>
            );
          })}
        </div>
      )}

      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {levels.map(l => {
            const on = level === l;
            return (
              <button key={l} onClick={() => setLevel(l)} style={{
                textAlign: 'left', padding: '16px 18px', borderRadius: 14,
                background: on ? `${t.primary}1a` : surfRaised(dark),
                border: `1.5px solid ${on ? t.primary : borderSubtle(dark)}`,
                fontFamily: 'inherit', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: textPri(dark) }}>{l}</div>
                  <div style={{ fontSize: 12, color: textSec(dark), marginTop: 2 }}>
                    {l === 'Beginner' && 'New to training or returning after a break.'}
                    {l === 'Intermediate' && 'Train 1–3× per week consistently.'}
                    {l === 'Advanced' && 'Train 4+× per week, structured programs.'}
                  </div>
                </div>
                {on && <Icon name="check" size={18} color={t.primary} stroke={2.6}/>}
              </button>
            );
          })}
        </div>
      )}

      {step === 2 && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{
              fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 56, fontWeight: 700, color: t.primary,
              letterSpacing: '-0.03em', lineHeight: 1,
            }}>{minutes}<span style={{ fontSize: 18, color: textSec(dark), marginLeft: 4 }}>min</span></div>
          </div>
          <input type="range" min="15" max="90" step="5" value={minutes}
            onChange={e => setMinutes(+e.target.value)}
            style={{ width: '100%', accentColor: t.primary }}/>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: textMute(dark), marginTop: 4 }}>
            <span>15 min</span><span>90 min</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            {[20, 30, 45, 60].map(m => (
              <button key={m} onClick={() => setMinutes(m)} style={{
                padding: '8px 14px', borderRadius: 999,
                background: minutes === m ? t.primary : surfRaised(dark),
                color: minutes === m ? '#0E1A2B' : textPri(dark),
                border: `1px solid ${minutes === m ? t.primary : borderSubtle(dark)}`,
                fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>{m} min</button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div style={{ fontSize: 12, color: textSec(dark), marginBottom: 10, letterSpacing: '.04em', textTransform: 'uppercase', fontWeight: 600 }}>
            Areas to be careful with
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
            {issues.map(i => {
              const on = restrictions.includes(i);
              return (
                <button key={i} onClick={() => toggleIssue(i)} style={{
                  padding: '9px 14px', borderRadius: 999,
                  background: on ? `${t.accent}22` : surfRaised(dark),
                  color: on ? t.accent : textPri(dark),
                  border: `1.5px solid ${on ? t.accent : borderSubtle(dark)}`,
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>{on && <Icon name="check" size={13} color={t.accent} stroke={3}/>}{i}</button>
              );
            })}
          </div>
          <div style={{
            padding: 14, borderRadius: 14,
            background: surfRaised(dark),
            border: `1.5px solid ${cycle ? t.primary : borderSubtle(dark)}`,
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
              onClick={() => setCycle(!cycle)}>
              <div style={{
                width: 38, height: 38, borderRadius: 12, background: `${t.primary}22`, color: t.primary,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><Icon name="moon" size={20} color={t.primary} stroke={2.2}/></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: textPri(dark) }}>Track menstrual cycle</div>
                <div style={{ fontSize: 11.5, color: textSec(dark), marginTop: 2 }}>Adapt intensity to your phase. Optional.</div>
              </div>
              <div style={{
                width: 42, height: 24, borderRadius: 999, padding: 2,
                background: cycle ? t.primary : (dark ? '#1F2E45' : '#D0D6DE'),
                transition: 'background .2s',
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', background: '#fff',
                  marginLeft: cycle ? 18 : 0, transition: 'margin-left .2s',
                }}/>
              </div>
            </label>
            {cycle && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px dashed ${borderSubtle(dark)}` }}>
                <div style={{
                  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8,
                }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
                    color: textMute(dark),
                  }}>Your cycle length</div>
                  <div style={{
                    fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 22, fontWeight: 700,
                    color: t.primary, lineHeight: 1, letterSpacing: '-0.02em',
                  }}>{length}<span style={{ fontSize: 12, color: textMute(dark), marginLeft: 4, fontWeight: 600 }}>days</span></div>
                </div>
                <input type="range" min="21" max="35" value={length}
                  onChange={e => setLength(+e.target.value)}
                  style={{ width: '100%', accentColor: t.primary }}/>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: textMute(dark), marginTop: 2 }}>
                  <span>21</span><span>28 typical</span><span>35</span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  {[21, 26, 28, 30, 35].map(L => (
                    <button key={L} onClick={() => setLength(L)} style={{
                      flex: 1, padding: '7px 0', borderRadius: 999,
                      background: length === L ? t.primary : 'transparent',
                      color: length === L ? '#0E1A2B' : textPri(dark),
                      border: `1px solid ${length === L ? t.primary : borderSubtle(dark)}`,
                      fontFamily: 'inherit', fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                    }}>{L}d</button>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: textMute(dark), marginTop: 10, lineHeight: 1.45 }}>
                  Not sure? Average is 28. You can fine-tune this anytime in Settings.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ flex: 1 }}/>
      <button onClick={() => step === 3 ? finish() : setStep(step + 1)} style={primaryBtn(t.primary, dark)}>
        {step === 3 ? 'Build my plan' : 'Continue'}
      </button>
    </div>
  );
}

// ─────────── 5. PROFILE ───────────
function ProfileScreen({ nav, t, user, dark, prefs }) {
  return (
    <>
      <TopBar onMenu={() => nav('menu')} dark={dark} accent={t.accent}/>
      <ScreenTitle dark={dark}>User Profile</ScreenTitle>
      <div style={{ padding: '0 22px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <PhotoSlot label="photo" w={88} h={88} radius={16} dark={dark}/>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 19, fontWeight: 600, color: textPri(dark), fontFamily: '"Plus Jakarta Sans",sans-serif' }}>{user.name}</div>
          <div style={{
            display: 'inline-block', marginTop: 4, padding: '3px 10px', borderRadius: 999,
            background: `${t.primary}22`, color: t.primary, fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em',
          }}>{(user.role || 'Client').toUpperCase()}</div>
          <div style={{ fontSize: 12.5, color: textMute(dark), marginTop: 4 }}>{user.email}</div>
        </div>
      </div>
      <div style={{ padding: '0 22px 14px' }}>
        <p style={{
          margin: 0, fontSize: 13.5, lineHeight: 1.55, color: textSec(dark),
        }}>
          Physical fitness is a state of health and well-being and, more specifically, the ability
          to perform aspects of sports, occupations and daily activities.
        </p>
      </div>

      {/* Daily check-in CTA — featured callout */}
      <div style={{ padding: '6px 22px 16px' }}>
        <button onClick={() => nav('checkin')} style={{
          width: '100%', textAlign: 'left', padding: '16px',
          background: `linear-gradient(135deg, ${t.primaryDeep} 0%, ${t.primary} 100%)`,
          border: 'none', borderRadius: 18, cursor: 'pointer', fontFamily: 'inherit',
          color: '#0E1A2B', display: 'flex', alignItems: 'center', gap: 14,
          boxShadow: `0 12px 28px ${t.primary}33`,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'rgba(14,26,43,.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="sparkle" size={22} color="#0E1A2B" stroke={2.4}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: '"Plus Jakarta Sans",sans-serif' }}>Daily check-in</div>
            <div style={{ fontSize: 11.5, fontWeight: 500, opacity: .8 }}>Tell us how you feel today — AI adapts your plan</div>
          </div>
          <Icon name="chev" size={20} color="#0E1A2B" stroke={2.4}/>
        </button>
      </div>

      <div style={{
        padding: '0 18px 16px',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
      }}>
        <StatCard icon="target" label="Targets" sub="67% Achieved" t={t} dark={dark} onClick={() => nav('goal')}/>
        <StatCard icon="rocket" label="Activity" sub="8,000 steps" t={t} dark={dark} onClick={() => nav('history')}/>
        <StatCard icon="flame" label="Workout" sub="78% Complete" t={t} dark={dark} onClick={() => nav('workout')}/>
        {prefs && prefs.cycle
          ? <StatCard icon="moon" label="Cycle" sub="Day 12 · Follicular" t={t} dark={dark} accent onClick={() => nav('cycle')}/>
          : <StatCard icon="settings" label="Settings" sub="100% Complete" t={t} dark={dark} onClick={() => nav('settings')}/>}
      </div>

      <div style={{ padding: '0 22px 28px' }}>
        <button onClick={() => nav('editProfile')} style={{
          ...outlineBtn(t.primary, dark), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Icon name="edit" size={16} color={t.primary}/> Edit profile
        </button>
      </div>
    </>
  );
}

function StatCard({ icon, label, sub, t, dark, onClick, accent = false }) {
  const c = accent ? t.accent : t.primary;
  return (
    <button onClick={onClick} style={{
      textAlign: 'left', padding: '18px 16px',
      background: surfRaised(dark),
      border: `1px solid ${borderSubtle(dark)}`,
      borderRadius: 16, fontFamily: 'inherit', cursor: 'pointer',
      boxShadow: dark ? 'none' : '0 1px 0 rgba(20,40,80,.02), 0 8px 18px rgba(20,40,80,.04)',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 12,
        background: `${c}1f`, color: c,
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
      }}>
        <Icon name={icon} size={20} color={c} stroke={2}/>
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: textPri(dark), fontFamily: '"Plus Jakarta Sans",sans-serif' }}>{label}</div>
      <div style={{ fontSize: 12, color: textMute(dark), marginTop: 2 }}>{sub}</div>
    </button>
  );
}

// ─────────── 6. EDIT PROFILE ───────────
function EditProfileScreen({ nav, t, user, setUser, dark }) {
  const [draft, setDraft] = React.useState({
    name: user.name || 'Mr. Danny Garg',
    email: user.email || 'dannygarg@gmail.com',
    phone: '+1 234 567 890',
    dob: '29/05/1984',
    loc: 'New York, USA',
    gender: 'Male',
  });
  const [saved, setSaved] = React.useState(false);
  const save = () => {
    setUser({ ...user, name: draft.name, email: draft.email });
    setSaved(true);
    setTimeout(() => { setSaved(false); nav('profile'); }, 700);
  };
  const fields = [
    ['name', 'user'], ['email', 'mail'], ['phone', 'phone'],
    ['dob', 'cal'], ['loc', 'pin'], ['gender', 'male'],
  ];
  return (
    <>
      <TopBar onMenu={() => nav('menu')} dark={dark} accent={t.accent}/>
      <ScreenTitle dark={dark}>Edit Profile</ScreenTitle>
      <div style={{ padding: '0 22px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {fields.map(([k, ic]) => (
          <PillInput key={k} icon={ic} placeholder={k}
            value={draft[k]} onChange={v => setDraft({ ...draft, [k]: v })}
            primary={t.primary} dark={dark}/>
        ))}
      </div>
      <div style={{ padding: '8px 22px 28px' }}>
        <button onClick={save} style={primaryBtn(t.primary, dark)}>
          {saved ? '✓ Saved' : 'Save changes'}
        </button>
      </div>
    </>
  );
}

// ─────────── 7. DAILY CHECK-IN ───────────
function CheckInScreen({ nav, t, dark, checkin, setCheckin }) {
  const issues = ['Lower back', 'Knees', 'Shoulder', 'Wrist', 'Ankle', 'Neck', 'Hip', 'None'];
  const goals = ['Endurance', 'Strength', 'Mobility', 'Recovery'];

  const update = (k, v) => setCheckin({ ...checkin, [k]: v });
  const toggleSore = (i) => {
    const cur = checkin.soreness.includes(i)
      ? checkin.soreness.filter(x => x !== i)
      : [...checkin.soreness.filter(x => x !== 'None'), i];
    update('soreness', i === 'None' ? ['None'] : cur);
  };

  // Energy → workout recommendation
  const intensity = checkin.energy >= 8 ? 'High intensity' : checkin.energy >= 5 ? 'Moderate' : 'Recovery';
  const intensityColor = checkin.energy >= 8 ? t.primary : checkin.energy >= 5 ? t.primarySoft : t.accent;

  return (
    <>
      <TopBar onMenu={() => nav('menu')} dark={dark} accent={t.accent}/>
      <ScreenTitle dark={dark} sub="Tell us how today feels — your plan adapts in seconds.">Daily check-in</ScreenTitle>

      {/* Energy slider */}
      <div style={{ padding: '0 22px 8px' }}>
        <SectionLabel dark={dark}>Energy level</SectionLabel>
        <div style={{
          padding: '20px 18px', borderRadius: 18,
          background: surfRaised(dark),
          border: `1px solid ${borderSubtle(dark)}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{
              fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 42, fontWeight: 700,
              color: t.primary, letterSpacing: '-0.03em', lineHeight: 1,
            }}>{checkin.energy}<span style={{ fontSize: 16, color: textMute(dark), marginLeft: 4 }}>/ 10</span></div>
            <div style={{
              padding: '5px 11px', borderRadius: 999,
              background: `${intensityColor}26`, color: intensityColor,
              fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase',
            }}>{intensity}</div>
          </div>
          <input type="range" min="1" max="10" value={checkin.energy}
            onChange={e => update('energy', +e.target.value)}
            style={{ width: '100%', accentColor: t.primary }}/>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: textMute(dark), marginTop: 2 }}>
            <span>😴 Exhausted</span><span>⚡ Peak</span>
          </div>
        </div>
      </div>

      {/* Time */}
      <div style={{ padding: '14px 22px 0' }}>
        <SectionLabel dark={dark}>Time available</SectionLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          {[20, 30, 45, 60].map(m => (
            <button key={m} onClick={() => update('minutes', m)} style={{
              flex: 1, padding: '12px 0', borderRadius: 14,
              background: checkin.minutes === m ? t.primary : surfRaised(dark),
              color: checkin.minutes === m ? '#0E1A2B' : textPri(dark),
              border: `1px solid ${checkin.minutes === m ? t.primary : borderSubtle(dark)}`,
              fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>{m} min</button>
          ))}
        </div>
      </div>

      {/* Soreness */}
      <div style={{ padding: '14px 22px 0' }}>
        <SectionLabel dark={dark}>Soreness / discomfort</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {issues.map(i => {
            const on = checkin.soreness.includes(i);
            const isNone = i === 'None';
            const c = isNone ? t.primary : t.accent;
            return (
              <button key={i} onClick={() => toggleSore(i)} style={{
                padding: '8px 13px', borderRadius: 999,
                background: on ? `${c}22` : surfRaised(dark),
                color: on ? c : textPri(dark),
                border: `1.5px solid ${on ? c : borderSubtle(dark)}`,
                fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              }}>{i}</button>
            );
          })}
        </div>
      </div>

      {/* Focus today */}
      <div style={{ padding: '14px 22px 0' }}>
        <SectionLabel dark={dark}>Focus today</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {goals.map(g => {
            const on = checkin.goal === g;
            return (
              <button key={g} onClick={() => update('goal', g)} style={{
                padding: '12px', borderRadius: 14,
                background: on ? `${t.primary}1a` : surfRaised(dark),
                color: textPri(dark),
                border: `1.5px solid ${on ? t.primary : borderSubtle(dark)}`,
                fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                textAlign: 'left',
              }}>{g}</button>
            );
          })}
        </div>
      </div>

      {/* AI summary */}
      <div style={{ padding: '18px 22px 8px' }}>
        <div style={{
          padding: '16px', borderRadius: 16,
          background: dark ? 'rgba(45,212,224,.08)' : `${t.primary}10`,
          border: `1px solid ${t.primary}55`,
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: `${t.primary}33`, color: t.primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}><Icon name="sparkle" size={18} color={t.primary} stroke={2.3}/></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: t.primary, letterSpacing: '.06em', textTransform: 'uppercase' }}>AI suggestion</div>
            <div style={{ fontSize: 13.5, color: textPri(dark), marginTop: 4, lineHeight: 1.5 }}>
              <b>{checkin.goal} · {checkin.minutes} min · {intensity.toLowerCase()}.</b><br/>
              {checkin.soreness.length && checkin.soreness[0] !== 'None'
                ? <>We&rsquo;ll avoid loading <b style={{ color: t.accent }}>{checkin.soreness.join(', ').toLowerCase()}</b>. </>
                : <>Cleared for full range. </>}
              Norman swapped your squats for hip-airplane drills.
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '8px 22px 28px' }}>
        <button onClick={() => nav('workout')} style={{ ...primaryBtn(t.primary, dark), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Icon name="play" size={14} color="#0E1A2B"/> Generate today&rsquo;s workout
        </button>
      </div>
    </>
  );
}

function SectionLabel({ children, dark }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
      color: textMute(dark), marginBottom: 8,
    }}>{children}</div>
  );
}

// ─────────── 8. START WORKOUT ───────────
function StartWorkoutScreen({ nav, t, dark, checkin }) {
  const [mode, setMode] = React.useState('Running');
  const modes = ['Treadmill', 'Running', 'Walking'];
  return (
    <>
      <TopBar onMenu={() => nav('menu')} dark={dark} accent={t.accent}/>
      <ScreenTitle dark={dark}>Start Workout</ScreenTitle>
      <div style={{ padding: '0 22px 16px' }}>
        <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden' }}>
          <PhotoSlot label="trainer · gym lift" w="100%" h={170} radius={18} dark/>
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            padding: 18, color: '#fff',
            background: 'linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.6))',
          }}>
            <div style={{
              display: 'inline-block', padding: '3px 8px', borderRadius: 6,
              background: t.accent, color: '#fff', fontSize: 9.5, fontWeight: 700, letterSpacing: '.05em',
              marginBottom: 6,
            }}>YOUR TRAINER</div>
            <div style={{ fontSize: 19, fontWeight: 600, fontFamily: '"Plus Jakarta Sans",sans-serif' }}>Norman Lloyd</div>
            <div style={{ fontSize: 12, opacity: .82, marginTop: 2 }}>Gym Trainer · adds his methodology to your plan</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '4px 22px 14px', display: 'flex', gap: 4, justifyContent: 'space-between', borderBottom: `1px solid ${borderSubtle(dark)}` }}>
        {modes.map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            flex: 1, padding: '12px 4px', background: 'transparent', border: 'none',
            fontFamily: 'inherit', fontSize: 13.5, cursor: 'pointer',
            color: mode === m ? t.primary : textSec(dark),
            fontWeight: mode === m ? 600 : 500,
            borderBottom: `2px solid ${mode === m ? t.primary : 'transparent'}`,
            marginBottom: -1,
          }}>{m}</button>
        ))}
      </div>

      <div style={{ padding: '14px 22px 0' }}>
        <MapPlaceholder h={150} withPin primary={t.primary} dark={dark}/>
      </div>

      {/* Live AI plan (synthesizes daily check-in) */}
      <div style={{ padding: '14px 22px 0' }}>
        <SectionLabel dark={dark}>Today&rsquo;s AI plan</SectionLabel>
        <div style={{
          padding: 14, borderRadius: 14,
          background: dark ? 'rgba(45,212,224,.08)' : `${t.primary}10`,
          border: `1px solid ${t.primary}55`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Icon name="sparkle" size={16} color={t.primary} stroke={2.3}/>
            <div style={{ fontSize: 13, fontWeight: 700, color: textPri(dark) }}>{checkin.goal} session · {checkin.minutes} min</div>
          </div>
          <PlanRow label="Warm-up"   detail="Dynamic mobility · 6 min" t={t} dark={dark}/>
          <PlanRow label="Main set"  detail={`${mode} · 4 × 800 m · pace 5:30/km`} t={t} dark={dark}/>
          <PlanRow label="Cool down" detail="Walk + stretch · 8 min" t={t} dark={dark}/>
          {checkin.soreness.length > 0 && checkin.soreness[0] !== 'None' && (
            <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 10, background: `${t.accent}1a`, color: t.accent, fontSize: 11.5, fontWeight: 600 }}>
              Adjusted for: {checkin.soreness.join(', ').toLowerCase()}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '14px 22px 28px' }}>
        <button onClick={() => nav('goal')} style={{ ...primaryBtn(t.primary, dark), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Icon name="play" size={14} color="#0E1A2B"/> Start Workout
        </button>
      </div>
    </>
  );
}
function PlanRow({ label, detail, t, dark }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0',
      borderBottom: `1px dashed ${borderSubtle(dark)}`,
    }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: t.primary }}/>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: textPri(dark), minWidth: 80 }}>{label}</div>
      <div style={{ fontSize: 12.5, color: textSec(dark), flex: 1 }}>{detail}</div>
    </div>
  );
}

// ─────────── 9. GOAL ACHIEVED ───────────
function GoalAchievedScreen({ nav, t, dark }) {
  return (
    <>
      <TopBar onMenu={() => nav('menu')} dark={dark} accent={t.accent}/>
      <ScreenTitle dark={dark}>Goal Achieved</ScreenTitle>
      <div style={{ padding: '0 22px 6px', textAlign: 'center' }}>
        <div style={{
          fontFamily: '"Plus Jakarta Sans",sans-serif',
          fontSize: 40, fontWeight: 700, color: t.primary, letterSpacing: '-0.02em',
        }}>58.23 <span style={{ fontSize: 22, fontWeight: 600 }}>km</span></div>
        <div style={{ color: textSec(dark), fontSize: 12.5, marginTop: 2 }}>Weekly Workout</div>
      </div>
      <div style={{
        padding: '18px 22px 8px',
        display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, justifyItems: 'center',
      }}>
        <RingStat label="Walking" pct={32} t={t} dark={dark}/>
        <RingStat label="Cycling" pct={75} t={t} dark={dark} big/>
        <RingStat label="Treadmill" pct={23} t={t} dark={dark}/>
      </div>
      <div style={{ padding: '14px 22px 8px' }}>
        <SectionDate label="23rd Dec, Friday" dark={dark}/>
        <ActivityRow title="Gym workout" sub="Exercise" right="2 hours" t={t} dark={dark}/>
        <ActivityRow title="Morning Workout" sub="Outdoor" right="1 hour" t={t} dark={dark}/>
        <SectionDate label="24th Dec, Saturday" dark={dark}/>
        <ActivityRow title="Gym Workout" sub="Exercise" right="1 hour" t={t} dark={dark}/>
      </div>
      <div style={{ padding: '8px 22px 16px' }}>
        <MapPlaceholder h={160} withRoute primary={t.primary} dark={dark}/>
      </div>
      <div style={{ padding: '0 22px 12px' }}>
        <div style={{
          padding: '14px 16px', borderRadius: 14,
          background: dark ? 'rgba(45,212,224,.08)' : `${t.primary}10`,
          border: `1px solid ${t.primary}55`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Icon name="sparkle" size={16} color={t.primary} stroke={2.3}/>
            <div style={{ fontSize: 13, fontWeight: 700, color: textPri(dark) }}>AI workout analysis</div>
          </div>
          <div style={{ fontSize: 12.5, color: textSec(dark), lineHeight: 1.55 }}>
            Your workout lasted <b style={{ color: textPri(dark) }}>1 h 5 min</b> and burned <b style={{ color: textPri(dark) }}>234 kcal</b>.
            Heart rate stayed in <b style={{ color: t.primary }}>zone 3</b> for 72% — solid endurance work.
            Norman recommends a recovery walk tomorrow.
          </div>
        </div>
      </div>
      <div style={{ padding: '0 22px 28px' }}>
        <button onClick={() => nav('stats')} style={outlineBtn(t.primary, dark)}>View statistics</button>
      </div>
    </>
  );
}
function RingStat({ label, pct, t, dark, big }) {
  const r = big ? 38 : 32;
  const stroke = big ? 7 : 6;
  const c = 2 * Math.PI * r;
  const size = (r + stroke) * 2 + 4;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${t.primary}22`} strokeWidth={stroke}/>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={t.primary} strokeWidth={stroke}
            strokeDasharray={`${(pct/100)*c} ${c}`} strokeLinecap="round"/>
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: textPri(dark), fontWeight: 600, fontFamily: '"Plus Jakarta Sans",sans-serif',
          fontSize: big ? 18 : 15,
        }}>{pct}<span style={{ fontSize: 9, marginLeft: 1, color: textMute(dark) }}>%</span></div>
      </div>
      <div style={{ fontSize: 12, color: textSec(dark) }}>{label}</div>
    </div>
  );
}
function SectionDate({ label, dark }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 2px 6px' }}>
      <div style={{ flex: 1, height: 1, background: borderSubtle(dark) }}/>
      <div style={{ fontSize: 11, color: textMute(dark) }}>{label}</div>
      <div style={{ flex: 1, height: 1, background: borderSubtle(dark) }}/>
    </div>
  );
}
function ActivityRow({ title, sub, right, t, dark }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 14px', background: surfRaised(dark),
      border: `1px solid ${borderSubtle(dark)}`,
      borderRadius: 12, marginBottom: 8,
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: textPri(dark) }}>{title}</div>
        <div style={{ fontSize: 11.5, color: textMute(dark) }}>{sub}</div>
      </div>
      <div style={{ fontSize: 13, color: textSec(dark), fontVariantNumeric: 'tabular-nums' }}>{right}</div>
    </div>
  );
}

// ─────────── 10. STATS ───────────
function StatsScreen({ nav, t, dark }) {
  const [day, setDay] = React.useState('Mon');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const seriesByDay = {
    Sun: [1.2, 0.8, 1.5, 0.6, 1.1, 0.9, 1.4],
    Mon: [0.9, 2.4, 0.5, 1.5, 1.2, 1.8, 1.2],
    Tue: [1.5, 1.1, 0.7, 2.0, 0.9, 1.6, 1.3],
    Wed: [0.6, 1.2, 2.1, 0.8, 1.4, 1.0, 1.7],
    Thu: [1.0, 0.9, 1.6, 1.2, 0.5, 2.3, 0.8],
    Fri: [1.4, 1.8, 0.9, 1.1, 2.0, 0.7, 1.5],
    Sat: [2.0, 0.5, 1.3, 1.7, 0.8, 1.4, 1.9],
  };
  const series = seriesByDay[day];
  return (
    <>
      <TopBar onMenu={() => nav('menu')} dark={dark} accent={t.accent}/>
      <ScreenTitle dark={dark}>Workout Statistics</ScreenTitle>
      <div style={{ padding: '0 22px 14px' }}>
        <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden' }}>
          <PhotoSlot label="trainer · stretch" w="100%" h={170} radius={18} dark/>
          <div style={{
            position: 'absolute', inset: 0, padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
            color: '#fff', background: 'linear-gradient(180deg,rgba(0,0,0,0) 30%,rgba(0,0,0,.6))',
          }}>
            <div style={{ fontSize: 19, fontWeight: 600, fontFamily: '"Plus Jakarta Sans",sans-serif' }}>Norman Lloyd</div>
            <div style={{ fontSize: 12, opacity: .82 }}>Gym Trainer</div>
            <div style={{ display: 'flex', gap: 22, marginTop: 10 }}>
              <Metric val="01:09" lbl="Time"/>
              <Metric val="12.34" lbl="Speed"/>
              <Metric val="234" lbl="Calories"/>
            </div>
          </div>
        </div>
      </div>
      <div style={{
        padding: '4px 22px 14px', display: 'flex', gap: 2, justifyContent: 'space-between',
        borderBottom: `1px solid ${borderSubtle(dark)}`,
      }}>
        {days.map(d => (
          <button key={d} onClick={() => setDay(d)} style={{
            flex: 1, padding: '12px 0', background: 'transparent', border: 'none',
            fontFamily: 'inherit', fontSize: 12.5, cursor: 'pointer',
            color: day === d ? t.primary : textMute(dark),
            fontWeight: day === d ? 600 : 500,
            borderBottom: `2px solid ${day === d ? t.primary : 'transparent'}`,
            marginBottom: -1,
          }}>{d}</button>
        ))}
      </div>
      <div style={{ padding: '20px 14px 8px' }}>
        <PerfChart data={series} primary={t.primary} dark={dark}/>
      </div>
      <div style={{ padding: '0 22px 28px' }}>
        <div style={{
          padding: '14px 16px', borderRadius: 14,
          background: dark ? 'rgba(45,212,224,.08)' : `${t.primary}10`,
          border: `1px solid ${t.primary}55`,
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <Icon name="sparkle" size={16} color={t.primary} stroke={2.3}/>
          <div style={{ fontSize: 12.5, color: textSec(dark), lineHeight: 1.55 }}>
            Distance trend up <b style={{ color: t.primary }}>+18%</b> this week. Strongest day: <b style={{ color: textPri(dark) }}>{day}</b>.
            Norman&rsquo;s feedback: recovery day suggested before Sat session.
          </div>
        </div>
      </div>
    </>
  );
}
function Metric({ val, lbl }) {
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: '"Plus Jakarta Sans",sans-serif' }}>{val}</div>
      <div style={{ fontSize: 10.5, opacity: .8 }}>{lbl}</div>
    </div>
  );
}
function PerfChart({ data, primary, dark }) {
  const W = 340, H = 180, P = 24;
  const maxV = Math.max(...data, 2.5);
  const x = i => P + i * ((W - P*2) / (data.length - 1));
  const y = v => H - P - (v / maxV) * (H - P*2);
  const path = data.map((v, i) => {
    if (i === 0) return `M${x(i)},${y(v)}`;
    const x0 = x(i-1), y0 = y(data[i-1]);
    const x1 = x(i), y1 = y(v);
    const cx = (x0 + x1) / 2;
    return `C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }).join(' ');
  const ghost = data.map(v => v * 0.7);
  const ghostPath = ghost.map((v, i) => {
    if (i === 0) return `M${x(i)},${y(v)}`;
    const x0 = x(i-1), y0 = y(ghost[i-1]);
    const x1 = x(i), y1 = y(v);
    const cx = (x0 + x1) / 2;
    return `C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }).join(' ');
  const grid = dark ? '#1F2E45' : '#E7ECF3';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
      {[0, 1, 2, 3].map(i => (
        <line key={i} x1={P} x2={W-P} y1={P + i*((H-P*2)/3)} y2={P + i*((H-P*2)/3)} stroke={grid} strokeWidth="1"/>
      ))}
      <path d={ghostPath} fill="none" stroke={dark ? '#2a3a52' : '#D7DEE7'} strokeWidth="2.5"/>
      {ghost.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r="3.5" fill={dark ? '#2a3a52' : '#D7DEE7'}/>
      ))}
      <path d={path} fill="none" stroke={primary} strokeWidth="3"/>
      {data.map((v, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(v)} r="4.5" fill={primary}/>
          <text x={x(i)} y={y(v) - 10} textAnchor="middle" fontSize="10" fill={primary} fontWeight="600" fontFamily="ui-monospace,monospace">{v.toFixed(1)}km</text>
        </g>
      ))}
    </svg>
  );
}

// ─────────── 11. HISTORY ───────────
function HistoryScreen({ nav, t, dark }) {
  const [day, setDay] = React.useState('Mon');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const items = [
    { kind: 'Outdoor Cycling', km: '11.45 Km', t: '6:00 am to 7:00 am' },
    { kind: 'Walking',         km: '05.42 Km', t: '6:00 am to 7:00 am' },
    { kind: 'Treadmill',       km: '06.15 Km', t: '6:00 am to 7:00 am' },
    { kind: 'Outdoor Running', km: '06.35 Km', t: '6:00 am to 7:00 am' },
    { kind: 'Outdoor Cycling', km: '09.15 Km', t: '6:00 am to 7:00 am' },
    { kind: 'Treadmill',       km: '08.45 Km', t: '6:00 am to 7:00 am' },
  ];
  return (
    <>
      <TopBar onMenu={() => nav('menu')} dark={dark} accent={t.accent}/>
      <ScreenTitle dark={dark}>Workout History</ScreenTitle>
      <div style={{
        padding: '0 22px 0', display: 'flex', gap: 2, justifyContent: 'space-between',
        borderBottom: `1px solid ${borderSubtle(dark)}`,
      }}>
        {days.map(d => (
          <button key={d} onClick={() => setDay(d)} style={{
            flex: 1, padding: '14px 0', background: 'transparent', border: 'none',
            fontFamily: 'inherit', fontSize: 12.5, cursor: 'pointer',
            color: day === d ? t.primary : textMute(dark),
            fontWeight: day === d ? 600 : 500,
            borderBottom: `2px solid ${day === d ? t.primary : 'transparent'}`,
            marginBottom: -1,
          }}>{d}</button>
        ))}
      </div>
      <div style={{ padding: '8px 14px 28px' }}>
        {items.map((it, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 12px',
            borderBottom: i < items.length - 1 ? `1px solid ${borderSubtle(dark)}` : 'none',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              border: `1.5px solid ${t.primary}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: t.primary, background: `${t.primary}1f`,
            }}>
              <Icon name="check" size={16} color={t.primary} stroke={2.6}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: textPri(dark) }}>{it.kind} {it.km}</div>
              <div style={{ fontSize: 11.5, color: textMute(dark), marginTop: 2 }}>From {it.t}</div>
            </div>
            <button onClick={() => nav('goal')} style={{
              padding: '7px 14px', borderRadius: 999, border: 'none',
              background: t.primary, color: '#0E1A2B', fontSize: 12, fontWeight: 700,
              fontFamily: 'inherit', cursor: 'pointer',
            }}>View</button>
          </div>
        ))}
      </div>
    </>
  );
}

// ─────────── 12. CYCLE TRACKING ───────────
// Phases scale to the user's cycle length (set in onboarding).
// Proportions follow the 28-day baseline: menstrual 5/28, follicular 8/28,
// ovulation 3/28, luteal 12/28. All 4 phases always present.
function computeCyclePhases(cycleLen, palette) {
  const mEnd = Math.max(2, Math.round(cycleLen * 5 / 28));
  const fEnd = Math.max(mEnd + 1, Math.round(cycleLen * 13 / 28));
  const oEnd = Math.max(fEnd + 1, Math.round(cycleLen * 16 / 28));
  return [
    { name: 'Menstrual',  range: [1,        mEnd],     color: palette.accent      },
    { name: 'Follicular', range: [mEnd + 1, fEnd],     color: palette.primary     },
    { name: 'Ovulation',  range: [fEnd + 1, oEnd],     color: palette.primarySoft },
    { name: 'Luteal',     range: [oEnd + 1, cycleLen], color: '#A78BFA'           },
  ];
}

function CycleScreen({ nav, t, dark, cycleConfig, setCycleConfig }) {
  const cfg = cycleConfig || { length: 28 };
  const cycleLen = cfg.length || 28;

  // Day is user-controlled. Default sensibly: derive from offset if given, else mid-follicular.
  const initialDay = Math.min(cycleLen, Math.max(1, (cfg.lastStartOffset || 11) + 1));
  const [day, setDay] = React.useState(initialDay);
  const [editing, setEditing] = React.useState(false);
  const [draftDay, setDraftDay] = React.useState(initialDay);
  const [draftLen, setDraftLen] = React.useState(cycleLen);

  // Keep day in range if cycle length changes from outside
  React.useEffect(() => {
    if (day > cycleLen) setDay(cycleLen);
  }, [cycleLen]);

  const phaseColors = {
    Menstrual: t.accent, Follicular: t.primary, Ovulation: t.primarySoft, Luteal: '#A78BFA',
  };
  const phases = computeCyclePhases(cycleLen, t);
  const draftPhases = computeCyclePhases(draftLen, t);
  const phaseOf = (d, ps) => ps.find(p => d >= p.range[0] && d <= p.range[1]) || ps[0];
  const currentPhase = phaseOf(day, phases);
  const phase = currentPhase.name;
  const c = currentPhase.color;
  const R = 110, stroke = 14;
  const C = 2 * Math.PI * R;
  const seg = (start, end) => {
    const len = ((end - start + 1) / cycleLen) * C;
    const offset = ((start - 1) / cycleLen) * C;
    return { dasharray: `${len} ${C - len}`, dashoffset: -offset };
  };
  const dotAngle = ((day - 1) / cycleLen) * 360 - 90;
  const dotRad = dotAngle * Math.PI / 180;
  const dotX = 130 + R * Math.cos(dotRad);
  const dotY = 130 + R * Math.sin(dotRad);

  // Drag-to-set on the ring
  const svgRef = React.useRef(null);
  const dragRef = React.useRef(false);
  const angleToDay = (clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return day;
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    // angle from top (12 o'clock), clockwise
    let theta = Math.atan2(dx, -dy);
    if (theta < 0) theta += Math.PI * 2;
    const frac = theta / (Math.PI * 2);
    return Math.min(cycleLen, Math.max(1, Math.round(frac * cycleLen) + 1));
  };
  const handlePointer = (e) => {
    e.preventDefault();
    const x = e.clientX, y = e.clientY;
    setDay(angleToDay(x, y));
  };
  const onDown = (e) => { dragRef.current = true; handlePointer(e); };
  const onMove = (e) => { if (dragRef.current) handlePointer(e); };
  const onUp = () => { dragRef.current = false; };

  const lastPeriodDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - (day - 1));
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  })();

  return (
    <>
      <TopBar onMenu={() => nav('menu')} dark={dark} accent={t.accent}/>
      <ScreenTitle dark={dark} sub="Tap or drag the dial — your plan adapts to your current phase.">Cycle</ScreenTitle>

      <div style={{ padding: '0 22px 8px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: 260, height: 260 }}>
          <svg
            ref={svgRef}
            width="260" height="260" viewBox="0 0 260 260"
            style={{ touchAction: 'none', cursor: 'pointer' }}
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); onDown(e); }}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            <circle cx="130" cy="130" r={R} fill="none" stroke={dark ? '#162437' : '#F0F3F8'} strokeWidth={stroke}/>
            {phases.map(p => {
              const s = seg(p.range[0], p.range[1]);
              return (
                <circle key={p.name} cx="130" cy="130" r={R} fill="none"
                  stroke={p.color} strokeWidth={stroke}
                  strokeDasharray={s.dasharray} strokeDashoffset={s.dashoffset}
                  transform="rotate(-90 130 130)"/>
              );
            })}
            {/* invisible larger hit ring */}
            <circle cx="130" cy="130" r={R} fill="none" stroke="transparent" strokeWidth={36}/>
            <circle cx={dotX} cy={dotY} r="11" fill={dark ? '#0E1A2B' : '#fff'} stroke={c} strokeWidth="3"/>
            <circle cx={dotX} cy={dotY} r="4" fill={c}/>
          </svg>

          {/* Tappable center to open the day editor */}
          <button
            onClick={() => { setDraftDay(day); setDraftLen(cycleLen); setEditing(true); }}
            aria-label="Edit current cycle day"
            style={{
              position: 'absolute', left: '50%', top: '50%',
              transform: 'translate(-50%,-50%)',
              width: 150, height: 150, borderRadius: '50%',
              border: 'none', background: 'transparent',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', textAlign: 'center',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: textMute(dark), letterSpacing: '.1em', textTransform: 'uppercase' }}>Day</div>
            <div style={{ fontSize: 56, fontWeight: 700, color: textPri(dark), fontFamily: '"Plus Jakarta Sans",sans-serif', lineHeight: 1, letterSpacing: '-0.03em' }}>{day}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: c, marginTop: 6 }}>{phase}</div>
            <div style={{
              marginTop: 6, fontSize: 9.5, fontWeight: 700, letterSpacing: '.08em',
              color: textMute(dark), textTransform: 'uppercase',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              <Icon name="edit" size={10} color={textMute(dark)} stroke={2.2}/> tap to set
            </div>
          </button>
        </div>
      </div>

      <div style={{ padding: '0 22px 4px', textAlign: 'center', fontSize: 11.5, color: textSec(dark) }}>
        Last period started <b style={{ color: textPri(dark) }}>{lastPeriodDate}</b> &middot; cycle <b style={{ color: textPri(dark) }}>{cycleLen} days</b>
      </div>

      <div style={{ padding: '12px 22px 8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {phases.map(p => (
          <div key={p.name} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px', borderRadius: 10,
            background: surfRaised(dark),
            border: `1px solid ${p.name === phase ? p.color : borderSubtle(dark)}`,
          }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: p.color }}/>
            <div style={{ fontSize: 12, fontWeight: 600, color: textPri(dark) }}>{p.name}</div>
            <div style={{ fontSize: 11, color: textMute(dark), marginLeft: 'auto' }}>{p.range[0]}–{p.range[1]}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '14px 22px 0' }}>
        <SectionLabel dark={dark}>Today&rsquo;s recommendation</SectionLabel>
        <div style={{
          padding: '14px 16px', borderRadius: 14,
          background: dark ? 'rgba(45,212,224,.08)' : `${t.primary}10`,
          border: `1px solid ${t.primary}55`,
        }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Icon name="sparkle" size={16} color={t.primary} stroke={2.3}/>
            <div style={{ fontSize: 12.5, color: textSec(dark), lineHeight: 1.55 }}>
              You&rsquo;re in <b style={{ color: c }}>{phase.toLowerCase()} phase</b>.{' '}
              {phase === 'Menstrual' && <>Energy may be low — we&rsquo;ll keep volume light with mobility &amp; easy zone-2.</>}
              {phase === 'Follicular' && <>Estrogen is rising — your <b style={{ color: textPri(dark) }}>peak window</b> for strength gains and high-intensity work.</>}
              {phase === 'Ovulation' && <>Peak performance window — push power and heavy lifts.</>}
              {phase === 'Luteal' && <>Recovery phase — moderate volume, more rest between sets.</>}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 22px 28px', display: 'flex', gap: 10 }}>
        <button onClick={() => setDay(1)} style={{
          flex: 1, padding: '12px', borderRadius: 999, border: `1.5px solid ${t.accent}`,
          background: 'transparent', color: t.accent, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>Period started today</button>
        <button onClick={() => { setDraftDay(day); setDraftLen(cycleLen); setEditing(true); }} style={{
          flex: 1, padding: '12px', borderRadius: 999, border: 'none',
          background: t.primary, color: '#0E1A2B', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>Set current day</button>
      </div>

      {/* Day editor sheet */}
      {editing && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 30,
          background: 'rgba(5,8,15,.6)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          animation: 'fadeIn .2s ease',
        }} onClick={() => setEditing(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', background: surfRaised(dark),
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: '18px 22px 24px',
            boxShadow: '0 -20px 60px rgba(0,0,0,.4)',
          }}>
            <div style={{
              width: 40, height: 4, borderRadius: 2,
              background: dark ? '#2a3a52' : '#D7DEE7',
              margin: '0 auto 14px',
            }}/>
            <div style={{ fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 18, fontWeight: 700, color: textPri(dark), marginBottom: 2 }}>
              Set current cycle day
            </div>
            <div style={{ fontSize: 12, color: textSec(dark), marginBottom: 14 }}>
              Where are you in your cycle right now?
            </div>

            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div style={{
                fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 64, fontWeight: 700,
                color: t.primary, letterSpacing: '-0.03em', lineHeight: 1,
              }}>{draftDay}<span style={{ fontSize: 18, color: textMute(dark), marginLeft: 6 }}>/ {draftLen}</span></div>
              <div style={{ fontSize: 12, fontWeight: 600, color: phaseOf(draftDay, draftPhases).color, marginTop: 4 }}>
                {phaseOf(draftDay, draftPhases).name} phase
              </div>
            </div>

            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 6 }}>
              Day in cycle
            </div>
            <input
              type="range" min="1" max={draftLen} value={Math.min(draftDay, draftLen)}
              onChange={e => setDraftDay(+e.target.value)}
              style={{ width: '100%', accentColor: t.primary }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: textMute(dark), marginTop: 4 }}>
              <span>Day 1</span><span>Day {draftLen}</span>
            </div>

            <div style={{
              marginTop: 14, paddingTop: 14, borderTop: `1px dashed ${borderSubtle(dark)}`,
            }}>
              <div style={{
                display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6,
              }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: textMute(dark) }}>
                  Cycle length
                </div>
                <div style={{
                  fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 18, fontWeight: 700,
                  color: t.primary, lineHeight: 1,
                }}>{draftLen}<span style={{ fontSize: 11, color: textMute(dark), marginLeft: 4, fontWeight: 600 }}>days</span></div>
              </div>
              <input
                type="range" min="21" max="35" value={draftLen}
                onChange={e => {
                  const v = +e.target.value;
                  setDraftLen(v);
                  if (draftDay > v) setDraftDay(v);
                }}
                style={{ width: '100%', accentColor: t.primary }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: textMute(dark), marginTop: 2 }}>
                <span>21d</span><span>28d</span><span>35d</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={() => setEditing(false)} style={{
                flex: 1, padding: '13px', borderRadius: 999,
                border: `1.5px solid ${borderSubtle(dark)}`,
                background: 'transparent', color: textPri(dark),
                fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={() => {
                setDay(Math.min(draftDay, draftLen));
                if (setCycleConfig && draftLen !== cycleLen) {
                  setCycleConfig({ ...(cycleConfig || {}), length: draftLen });
                }
                setEditing(false);
              }} style={{
                flex: 1, padding: '13px', borderRadius: 999, border: 'none',
                background: t.primary, color: '#0E1A2B',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─────────── 13. TRAINER STUDIO (B2B) ───────────
function TrainerStudioScreen({ nav, t, dark }) {
  const clients = [
    { name: 'Frances Scott',  goal: 'Endurance',    streak: 12, status: 'on-track', last: 'today' },
    { name: 'Lukas Becker',   goal: 'Strength',     streak: 5,  status: 'behind',   last: '3d ago' },
    { name: 'Marie Dubois',   goal: 'Mobility',     streak: 28, status: 'on-track', last: 'today' },
    { name: 'Leon Brandt',    goal: 'Weight loss',  streak: 2,  status: 'new',      last: 'today' },
  ];
  const statusColor = (s) => s === 'on-track' ? t.primary : s === 'behind' ? t.accent : t.primarySoft;
  return (
    <>
      <TopBar onMenu={() => nav('menu')} dark={dark} accent={t.accent} badge={
        <div style={{
          padding: '3px 9px', borderRadius: 6, marginRight: 8,
          background: t.accent, color: '#fff', fontSize: 9.5, fontWeight: 700, letterSpacing: '.05em',
        }}>B2B</div>
      }/>
      <ScreenTitle dark={dark} sub="Feed the AI with your methodology — your clients get it daily.">Trainer Studio</ScreenTitle>

      {/* KPI strip */}
      <div style={{ padding: '0 22px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <Kpi val="24"  lbl="Clients"     t={t} dark={dark}/>
        <Kpi val="187" lbl="This week"   t={t} dark={dark}/>
        <Kpi val="92%" lbl="Adherence"   t={t} dark={dark} accent/>
      </div>

      {/* Methodology feeder */}
      <div style={{ padding: '0 22px 14px' }}>
        <SectionLabel dark={dark}>Feed the AI</SectionLabel>
        <div style={{
          padding: 16, borderRadius: 16,
          background: `linear-gradient(135deg, ${t.primaryDeep} 0%, ${t.primary}cc 100%)`,
          color: '#0E1A2B',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Icon name="flask" size={18} color="#0E1A2B" stroke={2.4}/>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Your methodology · v3.2</div>
          </div>
          <div style={{ fontSize: 12, opacity: .85, lineHeight: 1.5, marginBottom: 12 }}>
            42 workouts · 18 progressions · 7 client archetypes.<br/>
            Last trained: 2 days ago. AI uses this to generate plans only for <b>your</b> clients.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{
              padding: '9px 14px', borderRadius: 999, border: 'none',
              background: '#0E1A2B', color: t.primary, fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
            }}>+ Add workout</button>
            <button style={{
              padding: '9px 14px', borderRadius: 999, border: '1.5px solid rgba(14,26,43,.4)',
              background: 'transparent', color: '#0E1A2B', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
            }}>Retrain AI</button>
          </div>
        </div>
      </div>

      {/* Client list */}
      <div style={{ padding: '0 22px 14px' }}>
        <SectionLabel dark={dark}>Your clients</SectionLabel>
        {clients.map((c, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', marginBottom: 8,
            background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}`,
            borderRadius: 14,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: `${statusColor(c.status)}26`, color: statusColor(c.status),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, fontFamily: '"Plus Jakarta Sans",sans-serif',
            }}>{c.name.split(' ').map(n => n[0]).join('')}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: textPri(dark) }}>{c.name}</div>
              <div style={{ fontSize: 11.5, color: textMute(dark) }}>{c.goal} · {c.last}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: statusColor(c.status), fontFamily: '"Plus Jakarta Sans",sans-serif' }}>{c.streak}d</div>
              <div style={{ fontSize: 10, color: textMute(dark), letterSpacing: '.05em', textTransform: 'uppercase' }}>{c.status}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '0 22px 28px' }}>
        <button onClick={() => alert('Invite link copied: trainer.app/coach/frances')} style={{ ...outlineBtn(t.primary, dark), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Icon name="plus" size={16} color={t.primary} stroke={2.4}/> Invite client
        </button>
      </div>
    </>
  );
}
function Kpi({ val, lbl, t, dark, accent }) {
  const c = accent ? t.accent : t.primary;
  return (
    <div style={{
      padding: '14px 12px', borderRadius: 14,
      background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}`,
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: c, fontFamily: '"Plus Jakarta Sans",sans-serif', lineHeight: 1 }}>{val}</div>
      <div style={{ fontSize: 10.5, color: textMute(dark), letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 600, marginTop: 6 }}>{lbl}</div>
    </div>
  );
}

// ─────────── 14. SETTINGS ───────────
function SettingsScreen({ nav, t, prefs, setPrefs, dark }) {
  const groups = [
    { title: 'AI personalization', items: [
      ['aiPersonalization', 'AI workouts',     'Daily plan from your trainer + AI'],
      ['analysis',          'Workout Analysis','Post-session AI summary'],
      ['cycle',             'Cycle tracking',  'Adapt intensity to your phase'],
      ['behaviour',         'Behaviour Track', 'Learn from completion + feedback'],
    ]},
    { title: 'Notifications', items: [
      ['notifications', 'Push notifications', 'All app alerts'],
      ['goals',         'Goal reminders',     'Weekly milestone nudges'],
      ['alerts',        'Activity Alerts',    'Inactive day warnings'],
      ['sounds',        'Sounds & Beeps',     'In-workout audio cues'],
    ]},
    { title: 'B2B / Studio', items: [
      ['whiteLabel', 'White-label mode', 'Hide TrAIner brand for your studio'],
    ]},
  ];
  return (
    <>
      <TopBar onMenu={() => nav('menu')} dark={dark} accent={t.accent}/>
      <ScreenTitle dark={dark}>Settings</ScreenTitle>
      <div style={{ padding: '0 22px 14px' }}>
        {groups.map(g => (
          <div key={g.title} style={{ marginBottom: 18 }}>
            <SectionLabel dark={dark}>{g.title}</SectionLabel>
            <div style={{
              background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}`,
              borderRadius: 16, overflow: 'hidden',
            }}>
              {g.items.map(([k, lbl, hint], i) => (
                <div key={k} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderBottom: i < g.items.length - 1 ? `1px solid ${borderSubtle(dark)}` : 'none',
                }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: textPri(dark) }}>{lbl}</div>
                    <div style={{ fontSize: 11.5, color: textMute(dark), marginTop: 2 }}>{hint}</div>
                  </div>
                  <Toggle on={prefs[k]} primary={t.primary} dark={dark} onChange={v => setPrefs({ ...prefs, [k]: v })}/>
                </div>
              ))}
            </div>
          </div>
        ))}
        <button onClick={() => alert('TrAIner v1.1.0 · The PT & ME Experience')} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
          padding: '16px 4px', background: 'transparent', border: 'none',
          fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: textPri(dark) }}>About this app</div>
            <div style={{ fontSize: 11.5, color: textMute(dark), marginTop: 2 }}>Version 1.1.0</div>
          </div>
          <Icon name="chev" size={18} color={textMute(dark)}/>
        </button>
      </div>
    </>
  );
}

function Toggle({ on, primary, onChange, dark }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: 46, height: 26, borderRadius: 999, border: 'none', padding: 0,
      background: on ? primary : (dark ? '#1F2E45' : '#D7DEE7'),
      position: 'relative', cursor: 'pointer', transition: 'background .2s', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 3, left: on ? 23 : 3,
        width: 20, height: 20, borderRadius: '50%',
        background: '#fff', transition: 'left .2s',
        boxShadow: '0 2px 6px rgba(0,0,0,.25)',
      }}/>
    </button>
  );
}

// ─────────── 15. SIDE MENU ───────────
function SideMenu({ open, nav, t, user, current, setUser }) {
  const items = [
    ['Profile',         'profile',    'user'],
    ['Daily check-in',  'checkin',    'sparkle'],
    ['Workout',         'workout',    'play'],
    ['Targets',         'goal',       'target'],
    ['History',         'history',    'history'],
    ['Statistics',      'stats',      'chart'],
    ['Cycle',           'cycle',      'moon'],
    ['Trainer Studio',  'studio',     'flask'],
    ['Settings',        'settings',   'settings'],
  ];
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: open ? 'auto' : 'none',
      zIndex: 10,
    }}>
      <div onClick={() => nav(current)} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(5,8,15,.6)',
        opacity: open ? 1 : 0, transition: 'opacity .25s',
      }}/>
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: 0, width: '82%',
        background: `linear-gradient(180deg, ${t.primaryDeep} 0%, ${t.primary} 100%)`,
        color: '#0E1A2B',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform .28s cubic-bezier(.4,0,.2,1)',
        display: 'flex', flexDirection: 'column',
        padding: '36px 0 20px',
        boxShadow: '6px 0 30px rgba(5,8,15,.45)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '0 24px 22px' }}>
          <PhotoSlot label="me" w={56} h={56} radius={14} dark/>
          <div style={{ marginTop: 14, fontSize: 18, fontWeight: 700, fontFamily: '"Plus Jakarta Sans",sans-serif' }}>{user.name}</div>
          <div style={{ fontSize: 12.5, opacity: .75 }}>{user.email}</div>
          <div style={{
            display: 'inline-block', marginTop: 10, padding: '3px 9px', borderRadius: 999,
            background: 'rgba(14,26,43,.25)', color: '#0E1A2B', fontSize: 9.5, fontWeight: 700, letterSpacing: '.06em',
          }}>{(user.role || 'CLIENT').toUpperCase()}</div>
        </div>
        <div style={{ height: 1, background: 'rgba(14,26,43,.18)', margin: '0 22px 10px' }}/>
        <div style={{ flex: 1, padding: '0 8px', overflow: 'auto' }}>
          {items.map(([lbl, screen, ic]) => (
            <button key={lbl} onClick={() => nav(screen)} style={{
              display: 'flex', alignItems: 'center', gap: 14, width: '100%',
              padding: '12px 18px', border: 'none', background: 'transparent',
              color: '#0E1A2B', fontFamily: 'inherit', fontSize: 16, fontWeight: 500,
              cursor: 'pointer', textAlign: 'left', borderRadius: 12,
              opacity: current === screen ? 1 : 0.85,
              background: current === screen ? 'rgba(14,26,43,.16)' : 'transparent',
            }}>
              <Icon name={ic} size={18} color="#0E1A2B" stroke={2}/>
              {lbl}
            </button>
          ))}
        </div>
        <button onClick={() => { setUser({ name: 'Frances Scott', email: 'frances@trainer.app', role: 'Client' }); nav('welcome'); }} style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 28px', border: 'none', background: 'transparent',
          color: '#0E1A2B', fontFamily: 'inherit', fontSize: 15, fontWeight: 600,
          cursor: 'pointer', textAlign: 'left', marginTop: 8,
        }}>
          <Icon name="logout" size={18} color="#0E1A2B"/> Sign Out
        </button>
      </div>
    </div>
  );
}

export {
  WelcomeScreen, LoginScreen, RegisterScreen, OnboardingScreen,
  ProfileScreen, EditProfileScreen, CheckInScreen,
  StartWorkoutScreen, GoalAchievedScreen, StatsScreen, HistoryScreen,
  CycleScreen, TrainerStudioScreen, SettingsScreen,
  SideMenu, Icon,
};
