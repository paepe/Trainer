// screens.jsx — All TrAIner app screens.
// Each screen is a function component that takes ({ nav, t, user, ...ctx }).
// `nav(name)` switches screens. `t` is the tweaks object (colors etc).

// ─────────── SHARED ATOMS ───────────
const Icon = ({ name, size = 22, color = 'currentColor', stroke = 2 }) => {
  const paths = {
    menu: <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    search: <><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    more: <><circle cx="12" cy="5" r="1.4" fill={color}/><circle cx="12" cy="12" r="1.4" fill={color}/><circle cx="12" cy="19" r="1.4" fill={color}/></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    mail: <><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,6 12,13 2,6"/></>,
    phone: <><rect x="6" y="2" width="12" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></>,
    cal: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    pin: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,
    trophy: <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 4h3v2a3 3 0 0 1-3 3M7 4H4v2a3 3 0 0 0 3 3"/></>,
    rocket: <><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></>,
    flame: <><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    check: <><polyline points="20 6 9 17 4 12"/></>,
    chev: <><polyline points="9 18 15 12 9 6"/></>,
    chevL: <><polyline points="15 18 9 12 15 6"/></>,
    play: <><polygon points="5 3 19 12 5 21 5 3" fill={color}/></>,
    target: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
    bolt: <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill={color}/></>,
    bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    sparkle: <><path d="M12 2l1.8 5.8L19.5 9l-5.7 1.2L12 16l-1.8-5.8L4.5 9l5.7-1.2z"/></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    male: <><circle cx="10" cy="14" r="5"/><line x1="14" y1="10" x2="20" y2="4"/><polyline points="15 4 20 4 20 9"/></>,
    activity: <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>,
    history: <><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></>,
    chart: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
    map: <><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></>,
    edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
};

// Subtle striped placeholder for trainer/photo cells when no real image.
const PhotoSlot = ({ label, w, h, dark = true, radius = 10, style = {} }) => (
  <div style={{
    width: w, height: h, borderRadius: radius,
    background: dark
      ? 'repeating-linear-gradient(135deg,#3a3a44 0 8px,#2e2e36 8px 16px)'
      : 'repeating-linear-gradient(135deg,#e6e7ec 0 8px,#dadbe2 8px 16px)',
    color: dark ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.4)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start',
    padding: 10, fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
    fontSize: 10, letterSpacing: '.04em', textTransform: 'uppercase',
    overflow: 'hidden', position: 'relative', flexShrink: 0,
    ...style,
  }}>{label}</div>
);

// Soft map placeholder with a route line
const MapPlaceholder = ({ h = 160, withRoute = false, withPin = false, primary = '#7B5CFF' }) => (
  <div style={{
    width: '100%', height: h, borderRadius: 14, overflow: 'hidden',
    position: 'relative', background: '#f1f1f4',
    backgroundImage:
      'linear-gradient(180deg,rgba(0,0,0,.04),rgba(0,0,0,0)),' +
      'repeating-linear-gradient(90deg,transparent 0 38px,rgba(0,0,0,.05) 38px 39px),' +
      'repeating-linear-gradient(0deg,transparent 0 46px,rgba(0,0,0,.05) 46px 47px),' +
      'repeating-linear-gradient(28deg,transparent 0 90px,rgba(0,0,0,.06) 90px 92px),' +
      'repeating-linear-gradient(-58deg,transparent 0 120px,rgba(0,0,0,.05) 120px 122px)',
  }}>
    {/* subtle street labels */}
    <div style={{ position: 'absolute', top: 10, left: 14, fontSize: 9, color: '#9aa0a6', letterSpacing: '.05em' }}>PROSPECT</div>
    <div style={{ position: 'absolute', top: 28, right: 18, fontSize: 9, color: '#9aa0a6', letterSpacing: '.05em' }}>BROOKLYN</div>
    <div style={{ position: 'absolute', bottom: 14, left: 14, fontSize: 9, color: '#9aa0a6', letterSpacing: '.05em' }}>CLINTON HILL</div>
    {withRoute && (
      <svg viewBox="0 0 320 160" preserveAspectRatio="none" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <path d="M30 35 L70 50 L95 95 L140 110 L200 90 L240 130" stroke={primary} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="30" cy="35" r="6" fill={primary}/>
        <circle cx="30" cy="35" r="9" fill={primary} opacity=".22"/>
        <circle cx="240" cy="130" r="5" fill="#fff" stroke={primary} strokeWidth="3"/>
      </svg>
    )}
    {withPin && (
      <div style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-100%)',
        width: 26, height: 26, borderRadius: '50% 50% 50% 0', background: primary,
        transform: 'translate(-50%,-100%) rotate(-45deg)',
        boxShadow: '0 6px 16px rgba(123,92,255,.45)',
      }}>
        <div style={{ position: 'absolute', top: 6, left: 6, width: 14, height: 14, borderRadius: '50%', background: '#fff' }}/>
      </div>
    )}
  </div>
);

// Cute illustrated hero (geometric, not human-detailed)
const HeroIllustration = ({ variant = 'lift', primary = '#7B5CFF' }) => {
  if (variant === 'run') {
    return (
      <svg viewBox="0 0 320 200" width="100%" height="200">
        <defs>
          <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#EAE2FF"/>
            <stop offset="1" stopColor="#F7F4FF"/>
          </linearGradient>
        </defs>
        <ellipse cx="160" cy="170" rx="150" ry="22" fill="#E9E6F2"/>
        <path d="M30 150 Q80 110 130 145 T260 130 L290 170 L20 170 Z" fill={primary} opacity=".18"/>
        <circle cx="60" cy="70" r="32" fill="url(#sky)"/>
        <circle cx="240" cy="55" r="22" fill="url(#sky)"/>
        {/* runner 1 */}
        <g transform="translate(120 95)">
          <circle r="11" fill="#F7C9B5" cx="0" cy="0"/>
          <rect x="-9" y="10" width="18" height="22" rx="4" fill={primary}/>
          <rect x="-6" y="30" width="6" height="20" rx="3" fill="#2D2A3A"/>
          <rect x="2" y="32" width="6" height="22" rx="3" fill="#2D2A3A"/>
        </g>
        {/* runner 2 */}
        <g transform="translate(190 88)">
          <circle r="11" fill="#F7C9B5" cx="0" cy="0"/>
          <rect x="-9" y="10" width="18" height="22" rx="4" fill="#FF6B6B"/>
          <rect x="-6" y="30" width="6" height="20" rx="3" fill="#2D2A3A"/>
          <rect x="2" y="32" width="6" height="22" rx="3" fill="#2D2A3A"/>
        </g>
      </svg>
    );
  }
  // 'lift' = dumbbell scene
  return (
    <svg viewBox="0 0 320 200" width="100%" height="200">
      <ellipse cx="160" cy="170" rx="140" ry="18" fill="#EFEBFA"/>
      {/* big circle */}
      <circle cx="160" cy="110" r="78" fill="#EFEBFA"/>
      {/* dumbbell */}
      <g transform="translate(160 110)">
        <rect x="-50" y="-6" width="100" height="12" rx="3" fill="#2D2A3A"/>
        <rect x="-62" y="-14" width="14" height="28" rx="3" fill={primary}/>
        <rect x="48" y="-14" width="14" height="28" rx="3" fill={primary}/>
        <rect x="-78" y="-10" width="10" height="20" rx="3" fill="#2D2A3A"/>
        <rect x="68" y="-10" width="10" height="20" rx="3" fill="#2D2A3A"/>
      </g>
      {/* leaves */}
      <path d="M40 130 Q50 100 75 110 Q60 130 40 130Z" fill={primary} opacity=".55"/>
      <path d="M280 130 Q270 100 245 110 Q260 130 280 130Z" fill={primary} opacity=".55"/>
      {/* sparkle badge */}
      <g transform="translate(220 50)">
        <rect x="-22" y="-12" width="44" height="22" rx="6" fill="#FF6B8A"/>
        <text x="0" y="3" textAnchor="middle" fill="#fff" fontSize="11" fontFamily="ui-monospace,monospace" fontWeight="700">1·2·3</text>
      </g>
    </svg>
  );
};

// ─────────── APP CHROME (top bar + side menu) ───────────
const TopBar = ({ onMenu, onRight, dark }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 18px 6px', flexShrink: 0,
  }}>
    <button onClick={onMenu} style={iconBtn(dark)} aria-label="Menu">
      <Icon name="menu" size={22} color={dark ? '#fff' : '#2D2A3A'} stroke={2}/>
    </button>
    <div style={{ display: 'flex', gap: 4 }}>
      <button style={iconBtn(dark)} aria-label="Search">
        <Icon name="search" size={20} color={dark ? '#fff' : '#2D2A3A'}/>
      </button>
      <button style={iconBtn(dark)} aria-label="More">
        <Icon name="more" size={20} color={dark ? '#fff' : '#2D2A3A'}/>
      </button>
    </div>
  </div>
);

const iconBtn = (dark) => ({
  width: 38, height: 38, borderRadius: 12, border: 'none',
  background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', padding: 0, color: dark ? '#fff' : '#2D2A3A',
});

const ScreenTitle = ({ children, sub, dark }) => (
  <div style={{ padding: '4px 22px 18px' }}>
    <h1 style={{
      margin: 0, fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
      fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em',
      color: dark ? '#fff' : '#1F1D2A',
    }}>{children}</h1>
    {sub && (
      <div style={{ marginTop: 4, fontSize: 13, color: dark ? 'rgba(255,255,255,.6)' : '#7c7a8a' }}>{sub}</div>
    )}
  </div>
);

// ─────────── 1. WELCOME ───────────
function WelcomeScreen({ nav, t }) {
  return (
    <div style={{ padding: '40px 28px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginTop: 30 }}>
        <HeroIllustration variant="run" primary={t.primary}/>
      </div>
      <div style={{ marginTop: 28, textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 100,
          background: `${t.primary}14`, color: t.primary,
          fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase',
        }}>
          <Icon name="sparkle" size={12} color={t.primary} stroke={2.2}/>
          AI-powered coach
        </div>
        <h1 style={{
          margin: '14px 0 8px', fontFamily: '"Plus Jakarta Sans",system-ui,sans-serif',
          fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: '#1F1D2A',
        }}>TrAIner</h1>
        <p style={{ margin: 0, color: '#7c7a8a', fontSize: 14, lineHeight: 1.5 }}>
          Your fitness & gym workout, planned and analyzed by AI.
        </p>
      </div>
      <div style={{ flex: 1 }}/>
      <button onClick={() => nav('login')} style={primaryBtn(t.primary)}>Log In</button>
      <button onClick={() => nav('register')} style={outlineBtn(t.primary)}>Register</button>
    </div>
  );
}

const primaryBtn = (primary) => ({
  width: '100%', padding: '17px 20px', border: 'none', borderRadius: 999,
  background: primary, color: '#fff', fontSize: 15, fontWeight: 600,
  fontFamily: 'inherit', cursor: 'pointer', marginBottom: 12,
  boxShadow: `0 8px 22px ${primary}44`,
});
const outlineBtn = (primary) => ({
  width: '100%', padding: '16px 20px', borderRadius: 999,
  background: 'transparent', color: primary, fontSize: 15, fontWeight: 600,
  fontFamily: 'inherit', cursor: 'pointer', border: `1.5px solid ${primary}`,
});
const ghostBtn = () => ({
  background: 'transparent', border: 'none', color: '#7c7a8a',
  fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', padding: 12,
});

// ─────────── 2. LOGIN ───────────
function LoginScreen({ nav, t, setUser }) {
  const [u, setU] = React.useState('frances');
  const [p, setP] = React.useState('••••••••');
  const [err, setErr] = React.useState('');
  const submit = () => {
    if (!u || !p) { setErr('Please fill in both fields.'); return; }
    setUser({ name: 'Frances Scott', email: 'frances@trainer.app', role: 'Trainer' });
    nav('profile');
  };
  return (
    <div style={{ padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <button onClick={() => nav('welcome')} style={{ ...iconBtn(false), marginLeft: -8 }}>
        <Icon name="chevL" size={22} color="#2D2A3A"/>
      </button>
      <div style={{ marginTop: 8 }}>
        <HeroIllustration variant="lift" primary={t.primary}/>
      </div>
      <div style={{ marginTop: 16 }}>
        <h1 style={{
          margin: 0, fontFamily: '"Plus Jakarta Sans",system-ui,sans-serif',
          fontSize: 26, fontWeight: 700, color: '#1F1D2A', letterSpacing: '-0.02em',
        }}>Welcome back</h1>
        <div style={{ color: '#7c7a8a', fontSize: 13, marginTop: 4 }}>Log in to continue your training.</div>
      </div>
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <PillInput icon="user" placeholder="Username" value={u} onChange={setU} primary={t.primary}/>
        <PillInput icon="lock" placeholder="Password" value={p} type="password" onChange={setP} primary={t.primary}/>
      </div>
      {err && <div style={{ color: '#E64C5C', fontSize: 12, marginTop: 10 }}>{err}</div>}
      <div style={{ flex: 1 }}/>
      <button onClick={submit} style={primaryBtn(t.primary)}>Log In</button>
      <button onClick={() => alert('A reset link would be sent to your email.')} style={{ ...ghostBtn(), alignSelf: 'center' }}>Forgot Password?</button>
    </div>
  );
}

function PillInput({ icon, placeholder, value, onChange, type = 'text', primary }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 18px', borderRadius: 999,
      background: '#F2F1F6',
      border: `1.5px solid ${focus ? primary : 'transparent'}`,
      transition: 'border-color .15s',
    }}>
      <Icon name={icon} size={18} color="#9b99a8" stroke={2}/>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          flex: 1, border: 'none', outline: 'none', background: 'transparent',
          fontSize: 14, color: '#2D2A3A', fontFamily: 'inherit', minWidth: 0,
        }}
      />
    </label>
  );
}

// ─────────── 3. REGISTER ───────────
function RegisterScreen({ nav, t, setUser }) {
  const [name, setName] = React.useState('');
  const [pw, setPw] = React.useState('');
  const [pw2, setPw2] = React.useState('');
  const [err, setErr] = React.useState('');
  const submit = () => {
    if (!name || !pw) { setErr('Username and password are required.'); return; }
    if (pw !== pw2) { setErr('Passwords do not match.'); return; }
    setUser({ name: name || 'New user', email: `${name.toLowerCase()}@trainer.app`, role: 'Trainer' });
    nav('profile');
  };
  return (
    <div style={{ padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <button onClick={() => nav('welcome')} style={{ ...iconBtn(false), marginLeft: -8 }}>
        <Icon name="chevL" size={22} color="#2D2A3A"/>
      </button>
      <div style={{ marginTop: 0 }}>
        <HeroIllustration variant="lift" primary={t.primary}/>
      </div>
      <h1 style={{
        margin: '8px 0 4px', fontFamily: '"Plus Jakarta Sans",system-ui,sans-serif',
        fontSize: 24, fontWeight: 700, color: '#1F1D2A', letterSpacing: '-0.02em',
      }}>Create account</h1>
      <div style={{ color: '#7c7a8a', fontSize: 13 }}>Start training smarter with AI today.</div>
      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <PillInput icon="user" placeholder="Username" value={name} onChange={setName} primary={t.primary}/>
        <PillInput icon="lock" placeholder="Password" value={pw} type="password" onChange={setPw} primary={t.primary}/>
        <PillInput icon="lock" placeholder="Confirm Password" value={pw2} type="password" onChange={setPw2} primary={t.primary}/>
      </div>
      {err && <div style={{ color: '#E64C5C', fontSize: 12, marginTop: 10 }}>{err}</div>}
      <div style={{ flex: 1 }}/>
      <button onClick={submit} style={primaryBtn(t.primary)}>Register</button>
      <button onClick={() => nav('login')} style={{ ...ghostBtn(), alignSelf: 'center' }}>Already have an account?</button>
    </div>
  );
}

// ─────────── 4. USER PROFILE ───────────
function ProfileScreen({ nav, t, user, dark }) {
  return (
    <>
      <TopBar onMenu={() => nav('menu')} dark={dark}/>
      <ScreenTitle dark={dark}>User Profile</ScreenTitle>
      <div style={{ padding: '0 22px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <PhotoSlot label="trainer photo" w={88} h={88} radius={14}/>
        <div>
          <div style={{ fontSize: 19, fontWeight: 600, color: dark ? '#fff' : '#1F1D2A', fontFamily: '"Plus Jakarta Sans",sans-serif' }}>{user.name}</div>
          <div style={{ fontSize: 13, color: dark ? 'rgba(255,255,255,.6)' : '#7c7a8a', marginTop: 2 }}>{user.role}</div>
          <div style={{ fontSize: 13, color: dark ? 'rgba(255,255,255,.5)' : '#9b99a8', marginTop: 2 }}>{user.email}</div>
        </div>
      </div>
      <div style={{ padding: '0 22px 18px' }}>
        <p style={{
          margin: 0, fontSize: 13.5, lineHeight: 1.55,
          color: dark ? 'rgba(255,255,255,.72)' : '#5a5867',
        }}>
          Physical fitness is a state of health and well-being and, more specifically, the ability
          to perform aspects of sports, occupations and daily activities.
        </p>
      </div>
      <div style={{
        padding: '4px 18px 24px',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
      }}>
        <StatCard icon="target" label="Targets" sub="67% Achieved" t={t} dark={dark} onClick={() => nav('targets')}/>
        <StatCard icon="rocket" label="Activity" sub="8,000 steps" t={t} dark={dark} onClick={() => nav('history')}/>
        <StatCard icon="flame" label="Workout" sub="78% Complete" t={t} dark={dark} onClick={() => nav('workout')}/>
        <StatCard icon="settings" label="Settings" sub="100% Complete" t={t} dark={dark} onClick={() => nav('settings')}/>
      </div>
      <div style={{ padding: '0 22px 28px' }}>
        <button onClick={() => nav('editProfile')} style={{
          ...outlineBtn(t.primary), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Icon name="edit" size={16} color={t.primary}/> Edit profile
        </button>
      </div>
    </>
  );
}

function StatCard({ icon, label, sub, t, dark, onClick }) {
  return (
    <button onClick={onClick} style={{
      textAlign: 'left', padding: '18px 16px',
      background: dark ? '#262433' : '#fff',
      border: dark ? '1px solid #2f2d3e' : '1px solid #ECE9F4',
      borderRadius: 16, fontFamily: 'inherit', cursor: 'pointer',
      boxShadow: dark ? 'none' : '0 1px 0 rgba(20,16,40,.02), 0 8px 18px rgba(80,70,130,.05)',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 12,
        background: `${t.primary}14`, color: t.primary,
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
      }}>
        <Icon name={icon} size={20} color={t.primary} stroke={2}/>
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: dark ? '#fff' : '#1F1D2A', fontFamily: '"Plus Jakarta Sans",sans-serif' }}>{label}</div>
      <div style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,.55)' : '#9b99a8', marginTop: 2 }}>{sub}</div>
    </button>
  );
}

// ─────────── 5. EDIT PROFILE ───────────
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
      <TopBar onMenu={() => nav('menu')} dark={dark}/>
      <ScreenTitle dark={dark}>Edit Profile</ScreenTitle>
      <div style={{ padding: '0 22px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {fields.map(([k, ic]) => (
          <PillInput key={k} icon={ic} placeholder={k}
            value={draft[k]} onChange={v => setDraft({ ...draft, [k]: v })}
            primary={t.primary}/>
        ))}
      </div>
      <div style={{ padding: '8px 22px 28px' }}>
        <button onClick={save} style={primaryBtn(t.primary)}>
          {saved ? '✓ Saved' : 'Save changes'}
        </button>
      </div>
    </>
  );
}

// ─────────── 6. START WORKOUT ───────────
function StartWorkoutScreen({ nav, t, dark }) {
  const [mode, setMode] = React.useState('Running');
  const modes = ['Treadmill', 'Running', 'Walking'];
  return (
    <>
      <TopBar onMenu={() => nav('menu')} dark={dark}/>
      <ScreenTitle dark={dark}>Start Workout</ScreenTitle>
      <div style={{ padding: '0 22px 16px' }}>
        <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden' }}>
          <PhotoSlot label="trainer hero · gym lift" w="100%" h={170} radius={18}/>
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            padding: 18, color: '#fff',
            background: 'linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.55))',
          }}>
            <div style={{ fontSize: 19, fontWeight: 600, fontFamily: '"Plus Jakarta Sans",sans-serif' }}>Norman Lloyd</div>
            <div style={{ fontSize: 12, opacity: .82, marginTop: 2 }}>Gym Trainer</div>
          </div>
        </div>
      </div>
      <div style={{ padding: '4px 22px 14px', display: 'flex', gap: 4, justifyContent: 'space-between', borderBottom: `1px solid ${dark ? '#2f2d3e' : '#ECE9F4'}` }}>
        {modes.map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            flex: 1, padding: '12px 4px', background: 'transparent', border: 'none',
            fontFamily: 'inherit', fontSize: 13.5, cursor: 'pointer',
            color: mode === m ? t.primary : (dark ? 'rgba(255,255,255,.55)' : '#7c7a8a'),
            fontWeight: mode === m ? 600 : 500,
            borderBottom: `2px solid ${mode === m ? t.primary : 'transparent'}`,
            marginBottom: -1,
          }}>{m}</button>
        ))}
      </div>
      <div style={{ padding: '14px 22px 0' }}>
        <MapPlaceholder h={170} withPin primary={t.primary}/>
      </div>
      <div style={{ padding: '14px 22px 16px' }}>
        <div style={{
          display: 'flex', gap: 10,
          padding: '12px 14px', borderRadius: 14,
          background: dark ? '#262433' : '#F7F5FE',
          border: `1px solid ${dark ? '#2f2d3e' : '#EAE3FF'}`,
        }}>
          <Icon name="sparkle" size={18} color={t.primary} stroke={2.2}/>
          <div style={{ fontSize: 12.5, color: dark ? 'rgba(255,255,255,.75)' : '#5a5867', lineHeight: 1.5 }}>
            <b style={{ color: t.primary }}>AI plan:</b> 5 km tempo run, target pace 5:30/km. Cool with 10 min walk.
          </div>
        </div>
      </div>
      <div style={{ padding: '8px 22px 28px' }}>
        <button onClick={() => nav('goal')} style={{ ...primaryBtn(t.primary), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Icon name="play" size={14} color="#fff"/> Start Workout
        </button>
      </div>
    </>
  );
}

// ─────────── 7. GOAL ACHIEVED (weekly + analysis) ───────────
function GoalAchievedScreen({ nav, t, dark }) {
  return (
    <>
      <TopBar onMenu={() => nav('menu')} dark={dark}/>
      <ScreenTitle dark={dark}>Goal Achieved</ScreenTitle>
      <div style={{ padding: '0 22px 6px', textAlign: 'center' }}>
        <div style={{
          fontFamily: '"Plus Jakarta Sans",sans-serif',
          fontSize: 38, fontWeight: 700, color: t.primary, letterSpacing: '-0.02em',
        }}>58.23 <span style={{ fontSize: 22, fontWeight: 600 }}>km</span></div>
        <div style={{ color: dark ? 'rgba(255,255,255,.6)' : '#7c7a8a', fontSize: 12.5, marginTop: 2 }}>Weekly Workout</div>
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
        <ActivityRow title="Gym workout" sub="Exercise" right="2 hours" dark={dark}/>
        <ActivityRow title="Morning Workout" sub="Outdoor" right="1 hour" dark={dark}/>
        <SectionDate label="24th Dec, Saturday" dark={dark}/>
        <ActivityRow title="Gym Workout" sub="Exercise" right="1 hour" dark={dark}/>
      </div>
      <div style={{ padding: '8px 22px 16px' }}>
        <MapPlaceholder h={160} withRoute primary={t.primary}/>
      </div>
      <div style={{ padding: '0 22px 12px' }}>
        <div style={{
          padding: '14px 16px', borderRadius: 14,
          background: dark ? '#262433' : '#F7F5FE',
          border: `1px solid ${dark ? '#2f2d3e' : '#EAE3FF'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Icon name="sparkle" size={16} color={t.primary} stroke={2.2}/>
            <div style={{ fontSize: 13, fontWeight: 600, color: dark ? '#fff' : '#1F1D2A' }}>AI workout analysis</div>
          </div>
          <div style={{ fontSize: 12.5, color: dark ? 'rgba(255,255,255,.7)' : '#5a5867', lineHeight: 1.55 }}>
            Your workout lasted <b>1 h 5 min</b> and burned <b>234 kcal</b>. Heart rate stayed in zone 3 for 72% of the
            session — solid endurance work. Recommend a recovery walk tomorrow.
          </div>
        </div>
      </div>
      <div style={{ padding: '0 22px 28px' }}>
        <button onClick={() => nav('stats')} style={outlineBtn(t.primary)}>View statistics</button>
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
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${t.primary}1f`} strokeWidth={stroke}/>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={t.primary} strokeWidth={stroke}
            strokeDasharray={`${(pct/100)*c} ${c}`} strokeLinecap="round"/>
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: dark ? '#fff' : '#1F1D2A', fontWeight: 600, fontFamily: '"Plus Jakarta Sans",sans-serif',
          fontSize: big ? 18 : 15,
        }}>{pct}<span style={{ fontSize: 9, marginLeft: 1, color: dark ? 'rgba(255,255,255,.6)' : '#9b99a8' }}>%</span></div>
      </div>
      <div style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,.7)' : '#5a5867' }}>{label}</div>
    </div>
  );
}
function SectionDate({ label, dark }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 2px 6px' }}>
      <div style={{ flex: 1, height: 1, background: dark ? '#2f2d3e' : '#ECE9F4' }}/>
      <div style={{ fontSize: 11, color: dark ? 'rgba(255,255,255,.5)' : '#9b99a8' }}>{label}</div>
      <div style={{ flex: 1, height: 1, background: dark ? '#2f2d3e' : '#ECE9F4' }}/>
    </div>
  );
}
function ActivityRow({ title, sub, right, dark }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 14px', background: dark ? '#262433' : '#fff',
      border: `1px solid ${dark ? '#2f2d3e' : '#ECE9F4'}`,
      borderRadius: 12, marginBottom: 8,
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: dark ? '#fff' : '#1F1D2A' }}>{title}</div>
        <div style={{ fontSize: 11.5, color: dark ? 'rgba(255,255,255,.5)' : '#9b99a8' }}>{sub}</div>
      </div>
      <div style={{ fontSize: 13, color: dark ? 'rgba(255,255,255,.75)' : '#5a5867', fontVariantNumeric: 'tabular-nums' }}>{right}</div>
    </div>
  );
}

// ─────────── 8. WORKOUT STATISTICS ───────────
function StatsScreen({ nav, t, dark }) {
  const [day, setDay] = React.useState('Mon');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  // Synthetic series per day
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
      <TopBar onMenu={() => nav('menu')} dark={dark}/>
      <ScreenTitle dark={dark}>Workout Statistics</ScreenTitle>
      <div style={{ padding: '0 22px 14px' }}>
        <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden' }}>
          <PhotoSlot label="trainer hero · stretch" w="100%" h={170} radius={18}/>
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
        borderBottom: `1px solid ${dark ? '#2f2d3e' : '#ECE9F4'}`,
      }}>
        {days.map(d => (
          <button key={d} onClick={() => setDay(d)} style={{
            flex: 1, padding: '12px 0', background: 'transparent', border: 'none',
            fontFamily: 'inherit', fontSize: 12.5, cursor: 'pointer',
            color: day === d ? t.primary : (dark ? 'rgba(255,255,255,.55)' : '#9b99a8'),
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
          background: dark ? '#262433' : '#F7F5FE',
          border: `1px solid ${dark ? '#2f2d3e' : '#EAE3FF'}`,
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <Icon name="sparkle" size={16} color={t.primary} stroke={2.2}/>
          <div style={{ fontSize: 12.5, color: dark ? 'rgba(255,255,255,.7)' : '#5a5867', lineHeight: 1.55 }}>
            Distance trend up <b style={{ color: t.primary }}>+18%</b> this week. Strongest day: <b>{day}</b>.
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
  // Smooth path via Catmull-Rom-ish
  const path = data.map((v, i) => {
    if (i === 0) return `M${x(i)},${y(v)}`;
    const x0 = x(i-1), y0 = y(data[i-1]);
    const x1 = x(i), y1 = y(v);
    const cx = (x0 + x1) / 2;
    return `C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }).join(' ');
  // ghost series (gray)
  const ghost = data.map(v => v * 0.7);
  const ghostPath = ghost.map((v, i) => {
    if (i === 0) return `M${x(i)},${y(v)}`;
    const x0 = x(i-1), y0 = y(ghost[i-1]);
    const x1 = x(i), y1 = y(v);
    const cx = (x0 + x1) / 2;
    return `C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }).join(' ');
  const grid = dark ? '#2f2d3e' : '#ECE9F4';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
      {[0, 1, 2, 3].map(i => (
        <line key={i} x1={P} x2={W-P} y1={P + i*((H-P*2)/3)} y2={P + i*((H-P*2)/3)} stroke={grid} strokeWidth="1"/>
      ))}
      <path d={ghostPath} fill="none" stroke={dark ? '#3a3848' : '#D9D5E6'} strokeWidth="2.5"/>
      {ghost.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r="3.5" fill={dark ? '#3a3848' : '#D9D5E6'}/>
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

// ─────────── 9. WORKOUT HISTORY ───────────
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
      <TopBar onMenu={() => nav('menu')} dark={dark}/>
      <ScreenTitle dark={dark}>Workout History</ScreenTitle>
      <div style={{
        padding: '0 22px 0', display: 'flex', gap: 2, justifyContent: 'space-between',
        borderBottom: `1px solid ${dark ? '#2f2d3e' : '#ECE9F4'}`,
      }}>
        {days.map(d => (
          <button key={d} onClick={() => setDay(d)} style={{
            flex: 1, padding: '14px 0', background: 'transparent', border: 'none',
            fontFamily: 'inherit', fontSize: 12.5, cursor: 'pointer',
            color: day === d ? t.primary : (dark ? 'rgba(255,255,255,.55)' : '#9b99a8'),
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
            borderBottom: i < items.length - 1 ? `1px solid ${dark ? '#2f2d3e' : '#F1EEF8'}` : 'none',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              border: `1.5px solid ${t.primary}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: t.primary, background: `${t.primary}10`,
            }}>
              <Icon name="check" size={16} color={t.primary} stroke={2.6}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: dark ? '#fff' : '#1F1D2A' }}>{it.kind} {it.km}</div>
              <div style={{ fontSize: 11.5, color: dark ? 'rgba(255,255,255,.5)' : '#9b99a8', marginTop: 2 }}>From {it.t}</div>
            </div>
            <button onClick={() => nav('goal')} style={{
              padding: '7px 14px', borderRadius: 999, border: 'none',
              background: t.primary, color: '#fff', fontSize: 12, fontWeight: 600,
              fontFamily: 'inherit', cursor: 'pointer',
              boxShadow: `0 4px 10px ${t.primary}55`,
            }}>View</button>
          </div>
        ))}
      </div>
    </>
  );
}

// ─────────── 10. SETTINGS ───────────
function SettingsScreen({ nav, t, prefs, setPrefs, dark }) {
  const items = [
    ['notifications', 'Notifications'],
    ['goals', 'Goals'],
    ['alerts', 'Activity Alerts'],
    ['analysis', 'Workout Analysis'],
    ['behaviour', 'Behaviour Track'],
    ['sounds', 'Sounds & Beeps'],
  ];
  return (
    <>
      <TopBar onMenu={() => nav('menu')} dark={dark}/>
      <ScreenTitle dark={dark}>Settings</ScreenTitle>
      <div style={{ padding: '0 22px 14px' }}>
        {items.map(([k, lbl]) => (
          <div key={k} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 4px', borderBottom: `1px solid ${dark ? '#2f2d3e' : '#F1EEF8'}`,
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500, color: dark ? '#fff' : '#1F1D2A' }}>{lbl}</div>
              <div style={{ fontSize: 11.5, color: dark ? 'rgba(255,255,255,.5)' : '#9b99a8', marginTop: 2 }}>{prefs[k] ? 'Enabled' : 'Disabled'}</div>
            </div>
            <Toggle on={prefs[k]} primary={t.primary} dark={dark} onChange={v => setPrefs({ ...prefs, [k]: v })}/>
          </div>
        ))}
        <button onClick={() => alert('TrAIner v1.1.0 · Original design by Frances Scott')} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
          padding: '16px 4px', background: 'transparent', border: 'none',
          fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: dark ? '#fff' : '#1F1D2A' }}>About this app</div>
            <div style={{ fontSize: 11.5, color: dark ? 'rgba(255,255,255,.5)' : '#9b99a8', marginTop: 2 }}>Version 1.1.0</div>
          </div>
          <Icon name="chev" size={18} color={dark ? 'rgba(255,255,255,.5)' : '#9b99a8'}/>
        </button>
      </div>
    </>
  );
}

function Toggle({ on, primary, onChange, dark }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: 46, height: 26, borderRadius: 999, border: 'none', padding: 0,
      background: on ? primary : (dark ? '#3a3848' : '#D9D5E6'),
      position: 'relative', cursor: 'pointer', transition: 'background .2s',
    }}>
      <div style={{
        position: 'absolute', top: 3, left: on ? 23 : 3,
        width: 20, height: 20, borderRadius: '50%',
        background: '#fff', transition: 'left .2s',
        boxShadow: '0 2px 6px rgba(0,0,0,.18)',
      }}/>
    </button>
  );
}

// ─────────── 11. SIDE MENU (overlay) ───────────
function SideMenu({ open, nav, t, user, current, setUser }) {
  const items = [
    ['Profile',    'profile',    'user'],
    ['Workout',    'workout',    'play'],
    ['Activity',   'history',    'activity'],
    ['Targets',    'goal',       'target'],
    ['History',    'history',    'history'],
    ['Statistics', 'stats',      'chart'],
    ['Settings',   'settings',   'settings'],
  ];
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: open ? 'auto' : 'none',
      zIndex: 10,
    }}>
      <div onClick={() => nav(current)} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(20,16,40,.4)',
        opacity: open ? 1 : 0, transition: 'opacity .25s',
      }}/>
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: 0, width: '78%',
        background: t.primary, color: '#fff',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform .28s cubic-bezier(.4,0,.2,1)',
        display: 'flex', flexDirection: 'column',
        padding: '40px 0 28px',
        boxShadow: '6px 0 30px rgba(20,16,40,.25)',
      }}>
        <div style={{ padding: '0 28px 28px' }}>
          <PhotoSlot label="me" w={56} h={56} radius={14} dark/>
          <div style={{ marginTop: 14, fontSize: 18, fontWeight: 600, fontFamily: '"Plus Jakarta Sans",sans-serif' }}>{user.name}</div>
          <div style={{ fontSize: 12.5, opacity: .8 }}>{user.role}</div>
        </div>
        <div style={{ height: 1, background: 'rgba(255,255,255,.18)', margin: '0 22px 14px' }}/>
        <div style={{ flex: 1, padding: '0 8px', overflow: 'auto' }}>
          {items.map(([lbl, screen, ic]) => (
            <button key={lbl} onClick={() => nav(screen)} style={{
              display: 'flex', alignItems: 'center', gap: 16, width: '100%',
              padding: '14px 20px', border: 'none', background: 'transparent',
              color: '#fff', fontFamily: 'inherit', fontSize: 17, fontWeight: 500,
              cursor: 'pointer', textAlign: 'left', borderRadius: 12,
              opacity: current === screen ? 1 : 0.86,
              background: current === screen ? 'rgba(255,255,255,.12)' : 'transparent',
            }}>
              <Icon name={ic} size={20} color="#fff" stroke={2}/>
              {lbl}
            </button>
          ))}
        </div>
        <button onClick={() => { setUser({ name: 'Frances Scott', email: 'frances@trainer.app', role: 'Trainer' }); nav('welcome'); }} style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '16px 28px', border: 'none', background: 'transparent',
          color: '#fff', fontFamily: 'inherit', fontSize: 17, fontWeight: 500,
          cursor: 'pointer', textAlign: 'left',
        }}>
          <Icon name="logout" size={20} color="#fff"/> Sign Out
        </button>
      </div>
    </div>
  );
}

Object.assign(window, {
  WelcomeScreen, LoginScreen, RegisterScreen, ProfileScreen, EditProfileScreen,
  StartWorkoutScreen, GoalAchievedScreen, StatsScreen, HistoryScreen, SettingsScreen,
  SideMenu, Icon,
});
