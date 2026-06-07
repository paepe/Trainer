// app.jsx — TrAIner: navigation + tweaks + phone frame

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": ["#7B5CFF","#5F4BFF","#A78BFA"],
  "dark": false,
  "showFrame": true,
  "cardStyle": "soft"
}/*EDITMODE-END*/;

const PALETTES = [
  ['#7B5CFF', '#5F4BFF', '#A78BFA'], // purple (default)
  ['#4F46E5', '#3730A3', '#A5B4FC'], // indigo
  ['#10B981', '#047857', '#6EE7B7'], // emerald
  ['#F97066', '#C2410C', '#FDA4AF'], // coral
];

function TrAInerApp() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const tt = { ...t, primary: t.palette[0], primaryDark: t.palette[1], primarySoft: t.palette[2] };

  const [screen, setScreen] = React.useState('welcome'); // welcome | login | register | profile | editProfile | workout | goal | stats | history | settings
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [user, setUser] = React.useState({ name: 'Frances Scott', email: 'frances@trainer.app', role: 'Trainer' });
  const [prefs, setPrefs] = React.useState({
    notifications: true, goals: true, alerts: true,
    analysis: false, behaviour: true, sounds: false,
  });

  const nav = (target) => {
    if (target === 'menu') { setMenuOpen(true); return; }
    setMenuOpen(false);
    setScreen(target);
  };

  // Whenever screen changes, scroll content to top
  const contentRef = React.useRef(null);
  React.useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [screen]);

  const dark = tt.dark;
  const bg = dark ? '#1A1825' : '#FFFFFF';
  const surfaceBg = dark ? '#1A1825' : '#FFFFFF';

  // Map screen key to component
  const screenContent = (() => {
    const common = { nav, t: tt, dark, user, setUser };
    switch (screen) {
      case 'welcome':     return <WelcomeScreen      {...common}/>;
      case 'login':       return <LoginScreen        {...common}/>;
      case 'register':    return <RegisterScreen     {...common}/>;
      case 'profile':     return <ProfileScreen      {...common}/>;
      case 'editProfile': return <EditProfileScreen  {...common}/>;
      case 'workout':     return <StartWorkoutScreen {...common}/>;
      case 'goal':        return <GoalAchievedScreen {...common}/>;
      case 'stats':       return <StatsScreen        {...common}/>;
      case 'history':     return <HistoryScreen      {...common}/>;
      case 'settings':    return <SettingsScreen     {...common} prefs={prefs} setPrefs={setPrefs}/>;
      case 'targets':     return <GoalAchievedScreen {...common}/>; // alias from side menu
      default:            return <WelcomeScreen      {...common}/>;
    }
  })();

  // Bottom mini-tabbar shown on logged-in screens
  const showTabs = ['profile','workout','goal','stats','history','settings','editProfile','targets'].includes(screen);
  const tabs = [
    ['profile',  'user',     'Profile'],
    ['workout',  'play',     'Workout'],
    ['goal',     'target',   'Targets'],
    ['history',  'history',  'History'],
    ['stats',    'chart',    'Stats'],
  ];

  // Stage that holds the phone
  return (
    <div data-screen-label={`TrAIner · ${screen}`} style={{
      minHeight: '100vh', width: '100%',
      background: dark ? '#0F0D1A' : 'linear-gradient(180deg,#F6F4FB 0%,#EEE9F8 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, boxSizing: 'border-box',
      fontFamily: '"Inter","Plus Jakarta Sans",system-ui,-apple-system,sans-serif',
      color: dark ? '#fff' : '#1F1D2A',
    }}>
      {/* Watermark */}
      <div style={{
        position: 'fixed', top: 22, left: 28,
        fontFamily: '"Plus Jakarta Sans",sans-serif', fontWeight: 700, fontSize: 18,
        color: dark ? 'rgba(255,255,255,.85)' : '#1F1D2A', letterSpacing: '-0.01em',
        display: 'flex', alignItems: 'center', gap: 10, zIndex: 5,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 10, background: tt.primary,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
        }}>
          <Icon name="bolt" size={16} color="#fff"/>
        </div>
        Tr<span style={{ color: tt.primary }}>AI</span>ner
      </div>

      {/* Device frame */}
      <PhoneFrame dark={dark} primary={tt.primary} show={tt.showFrame}>
        <div style={{
          position: 'relative', height: '100%', display: 'flex', flexDirection: 'column',
          background: surfaceBg, overflow: 'hidden',
        }}>
          <div ref={contentRef} style={{
            flex: 1, overflowY: 'auto', overflowX: 'hidden',
            scrollbarWidth: 'none',
            paddingBottom: showTabs ? 76 : 0,
          }}>
            {screenContent}
          </div>
          {showTabs && (
            <BottomTabs tabs={tabs} active={screen} onTap={nav} primary={tt.primary} dark={dark}/>
          )}
          <SideMenu
            open={menuOpen}
            nav={(s) => { setMenuOpen(false); if (s && s !== 'menu') setScreen(s); }}
            t={tt} user={user} current={screen} setUser={setUser}
          />
        </div>
      </PhoneFrame>

      {/* Screen indicator pill (helpful for navigating during review) */}
      <FlowPills screen={screen} setScreen={setScreen} primary={tt.primary} dark={dark}/>

      <TweaksPanel>
        <TweakSection label="Theme"/>
        <TweakColor
          label="Palette"
          value={tt.palette}
          options={PALETTES}
          onChange={(v) => setTweak('palette', v)}
        />
        <TweakToggle label="Dark mode" value={tt.dark} onChange={(v) => setTweak('dark', v)}/>
        <TweakToggle label="Show device frame" value={tt.showFrame} onChange={(v) => setTweak('showFrame', v)}/>
        <TweakSection label="Style"/>
        <TweakRadio
          label="Card style"
          value={tt.cardStyle}
          options={['soft', 'flat']}
          onChange={(v) => setTweak('cardStyle', v)}
        />
        <TweakSection label="Navigate"/>
        <TweakSelect
          label="Go to screen"
          value={screen}
          options={['welcome','login','register','profile','editProfile','workout','goal','stats','history','settings']}
          onChange={(v) => setScreen(v)}
        />
      </TweaksPanel>
    </div>
  );
}

function PhoneFrame({ children, dark, primary, show }) {
  const W = 380, H = 780;
  if (!show) {
    return (
      <div style={{
        width: W, height: H, borderRadius: 36, overflow: 'hidden',
        background: dark ? '#1A1825' : '#fff',
        boxShadow: dark ? '0 30px 80px rgba(0,0,0,.45)' : '0 30px 80px rgba(60,40,120,.18)',
      }}>{children}</div>
    );
  }
  return (
    <div style={{
      width: W + 18, height: H + 18, borderRadius: 46, padding: 9,
      background: dark
        ? 'linear-gradient(160deg,#2a2737,#16141f)'
        : 'linear-gradient(160deg,#cbc4dd,#e9e4f3)',
      boxShadow: dark
        ? '0 50px 120px rgba(0,0,0,.55), inset 0 0 0 1px rgba(255,255,255,.04)'
        : '0 50px 120px rgba(60,40,120,.18), inset 0 0 0 1px rgba(255,255,255,.6)',
      position: 'relative',
    }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: 38, overflow: 'hidden',
        background: dark ? '#1A1825' : '#fff', position: 'relative',
      }}>
        {/* notch */}
        <div style={{
          position: 'absolute', left: '50%', top: 10, transform: 'translateX(-50%)',
          width: 86, height: 22, borderRadius: 999, background: '#0a0814', zIndex: 20,
        }}/>
        {/* status bar text */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 28px', fontSize: 12, fontWeight: 600, zIndex: 19,
          color: dark ? '#fff' : '#1F1D2A', fontVariantNumeric: 'tabular-nums',
        }}>
          <span>9:41</span>
          <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <svg width="14" height="10" viewBox="0 0 14 10"><path d="M1 9h2V6H1v3zm4 0h2V3H5v6zm4 0h2V0H9v9z" fill="currentColor"/></svg>
            <svg width="14" height="10" viewBox="0 0 14 10"><path d="M7 9.5C4.5 7 1 6 1 6s2-4 6-4 6 4 6 4-3.5 1-6 3.5z" fill="none" stroke="currentColor" strokeWidth="1.2"/></svg>
            <svg width="22" height="10" viewBox="0 0 22 10"><rect x="0.5" y="0.5" width="18" height="9" rx="2" fill="none" stroke="currentColor"/><rect x="2" y="2" width="13" height="6" rx="1" fill="currentColor"/><rect x="19" y="3.5" width="2" height="3" rx="0.5" fill="currentColor"/></svg>
          </span>
        </div>
        <div style={{ position: 'absolute', inset: 0, paddingTop: 36, boxSizing: 'border-box' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function BottomTabs({ tabs, active, onTap, primary, dark }) {
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      padding: '8px 8px 14px',
      background: dark ? 'rgba(26,24,37,.92)' : 'rgba(255,255,255,.94)',
      backdropFilter: 'blur(14px)',
      borderTop: `1px solid ${dark ? '#2f2d3e' : '#ECE9F4'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
    }}>
      {tabs.map(([key, ic, lbl]) => {
        const on = active === key;
        return (
          <button key={key} onClick={() => onTap(key)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: '6px 10px', borderRadius: 12, fontFamily: 'inherit',
            color: on ? primary : (dark ? 'rgba(255,255,255,.55)' : '#9b99a8'),
          }}>
            <Icon name={ic} size={20} color={on ? primary : (dark ? 'rgba(255,255,255,.55)' : '#9b99a8')}/>
            <span style={{ fontSize: 10.5, fontWeight: on ? 600 : 500 }}>{lbl}</span>
          </button>
        );
      })}
    </div>
  );
}

function FlowPills({ screen, setScreen, primary, dark }) {
  const flows = [
    { label: 'Auth', items: [['welcome','Welcome'],['login','Login'],['register','Register']] },
    { label: 'App',  items: [['profile','Profile'],['editProfile','Edit'],['workout','Workout'],['goal','Goal'],['stats','Stats'],['history','History'],['settings','Settings']] },
  ];
  return (
    <div style={{
      position: 'fixed', left: 28, bottom: 22, zIndex: 5,
      display: 'flex', flexDirection: 'column', gap: 8,
      fontFamily: '"Inter",sans-serif',
    }}>
      {flows.map(f => (
        <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', maxWidth: 460 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: dark ? 'rgba(255,255,255,.5)' : '#9b99a8', marginRight: 4 }}>{f.label}</span>
          {f.items.map(([key, lbl]) => {
            const on = screen === key;
            return (
              <button key={key} onClick={() => setScreen(key)} style={{
                padding: '6px 11px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                border: `1px solid ${on ? primary : (dark ? '#2f2d3e' : '#E4DEF2')}`,
                background: on ? primary : (dark ? 'rgba(255,255,255,.04)' : '#fff'),
                color: on ? '#fff' : (dark ? 'rgba(255,255,255,.75)' : '#5a5867'),
                cursor: 'pointer', fontFamily: 'inherit',
              }}>{lbl}</button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<TrAInerApp/>);
