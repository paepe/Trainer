// app.jsx — TrAIner v2: brand palette (navy/cyan/coral) + new AI features

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": ["#2DD4E0","#0F8C85","#EF5B3C","#9DECF3"],
  "dark": true,
  "showFrame": true,
  "cycleEnabled": true,
  "whiteLabel": false,
  "role": "client"
}/*EDITMODE-END*/;

// Palette = [primary, primaryDeep, accent (coral/contrast), primarySoft]
const PALETTES = [
  ['#2DD4E0', '#0F8C85', '#EF5B3C', '#9DECF3'], // brand · cyan/teal/coral
  ['#7B5CFF', '#5F4BFF', '#FF6B8A', '#C9BCFF'], // purple (legacy)
  ['#4F46E5', '#3730A3', '#F59E0B', '#A5B4FC'], // indigo / amber
  ['#10B981', '#047857', '#F97066', '#6EE7B7'], // emerald / coral
];

function TrAInerApp() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const tt = {
    ...t,
    primary:     t.palette[0],
    primaryDeep: t.palette[1],
    accent:      t.palette[2],
    primarySoft: t.palette[3],
  };

  const [screen, setScreen] = React.useState('welcome');
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [user, setUser] = React.useState({
    name: 'Frances Scott', email: 'frances@trainer.app', role: 'Client',
  });
  const [prefs, setPrefs] = React.useState({
    notifications: true, goals: true, alerts: true,
    analysis: true, behaviour: true, sounds: false,
    cycle: true, aiPersonalization: true, whiteLabel: false,
  });

  // Daily check-in state used by Workout/Goal screens
  const [checkin, setCheckin] = React.useState({
    energy: 7,        // 1–10
    soreness: ['Lower back'],
    minutes: 30,
    goal: 'Endurance',
  });

  // Cycle config — used by Onboarding, Cycle screen and Settings
  const [cycleConfig, setCycleConfig] = React.useState({
    length: 28,           // typical 21–35 days
    periodLength: 5,      // days of bleeding
    lastStartOffset: 11,  // days since last period start (=> today is day 12)
  });

  const nav = (target) => {
    if (target === 'menu') { setMenuOpen(true); return; }
    setMenuOpen(false);
    setScreen(target);
  };

  const contentRef = React.useRef(null);
  React.useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [screen]);

  const dark = tt.dark;
  const surfaceBg = dark ? '#0E1A2B' : '#FFFFFF';

  const screenContent = (() => {
    const common = { nav, t: tt, dark, user, setUser, checkin, setCheckin, cycleConfig, setCycleConfig };
    switch (screen) {
      case 'welcome':     return <WelcomeScreen      {...common}/>;
      case 'login':       return <LoginScreen        {...common}/>;
      case 'register':    return <RegisterScreen     {...common}/>;
      case 'onboarding':  return <OnboardingScreen   {...common}/>;
      case 'profile':     return <ProfileScreen      {...common} prefs={prefs}/>;
      case 'editProfile': return <EditProfileScreen  {...common}/>;
      case 'checkin':     return <CheckInScreen      {...common}/>;
      case 'workout':     return <StartWorkoutScreen {...common}/>;
      case 'goal':        return <GoalAchievedScreen {...common}/>;
      case 'stats':       return <StatsScreen        {...common}/>;
      case 'history':     return <HistoryScreen      {...common}/>;
      case 'cycle':       return <CycleScreen        {...common}/>;
      case 'studio':      return <TrainerStudioScreen {...common}/>;
      case 'settings':    return <SettingsScreen     {...common} prefs={prefs} setPrefs={setPrefs}/>;
      case 'targets':     return <GoalAchievedScreen {...common}/>;
      default:            return <WelcomeScreen      {...common}/>;
    }
  })();

  const showTabs = ['profile','workout','goal','stats','history','settings','editProfile','targets','checkin','cycle','studio'].includes(screen);
  const tabs = [
    ['profile', 'user',    'Profile'],
    ['checkin', 'sparkle', 'Coach'],
    ['workout', 'play',    'Workout'],
    ['stats',   'chart',   'Stats'],
    ['history', 'history', 'History'],
  ];

  return (
    <div data-screen-label={`TrAIner · ${screen}`} style={{
      minHeight: '100vh', width: '100%',
      background: dark
        ? 'radial-gradient(1200px 700px at 80% -10%, rgba(45,212,224,.08), transparent 50%), radial-gradient(900px 600px at -10% 110%, rgba(239,92,60,.08), transparent 50%), #08111E'
        : 'linear-gradient(180deg,#F6F8FB 0%,#EAEEF4 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, boxSizing: 'border-box',
      fontFamily: '"Inter","Plus Jakarta Sans",system-ui,-apple-system,sans-serif',
      color: dark ? '#fff' : '#102236',
    }}>
      {/* Logo watermark */}
      <BrandMark dark={dark} primary={tt.primary} accent={tt.accent} whiteLabel={tt.whiteLabel}/>

      <PhoneFrame dark={dark} show={tt.showFrame}>
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

      <FlowPills screen={screen} setScreen={setScreen} primary={tt.primary} accent={tt.accent} dark={dark}/>

      <TweaksPanel>
        <TweakSection label="Brand"/>
        <TweakColor
          label="Palette"
          value={tt.palette}
          options={PALETTES}
          onChange={(v) => setTweak('palette', v)}
        />
        <TweakToggle label="Dark mode" value={tt.dark} onChange={(v) => setTweak('dark', v)}/>
        <TweakToggle label="Device frame" value={tt.showFrame} onChange={(v) => setTweak('showFrame', v)}/>
        <TweakToggle label="White-label (hide brand)" value={tt.whiteLabel} onChange={(v) => setTweak('whiteLabel', v)}/>
        <TweakSection label="Features"/>
        <TweakToggle label="Cycle tracking" value={tt.cycleEnabled} onChange={(v) => setTweak('cycleEnabled', v)}/>
        <TweakRadio label="Role" value={tt.role}
          options={['client','trainer']}
          onChange={(v) => setTweak('role', v)}/>
        <TweakSection label="Navigate"/>
        <TweakSelect
          label="Go to screen"
          value={screen}
          options={['welcome','login','register','onboarding','profile','checkin','workout','goal','stats','history','cycle','studio','settings','editProfile']}
          onChange={(v) => setScreen(v)}
        />
      </TweaksPanel>
    </div>
  );
}

function BrandMark({ dark, primary, accent, whiteLabel }) {
  if (whiteLabel) {
    return (
      <div style={{
        position: 'fixed', top: 22, left: 28, zIndex: 5,
        fontFamily: '"Plus Jakarta Sans",sans-serif', fontWeight: 700, fontSize: 18,
        color: dark ? 'rgba(255,255,255,.85)' : '#102236',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, background: dark ? '#fff' : '#102236',
          color: dark ? '#102236' : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800,
        }}>GYM</div>
        Your Studio
      </div>
    );
  }
  return (
    <div style={{
      position: 'fixed', top: 22, left: 28, zIndex: 5,
      fontFamily: '"Plus Jakarta Sans",sans-serif', fontWeight: 700,
      color: dark ? '#fff' : '#102236',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <LogoMark size={36}/>
      <div>
        <div style={{ fontSize: 18, letterSpacing: '-0.01em', lineHeight: 1 }}>
          Tr<span style={{ color: primary }}>AI</span>ner
        </div>
        <div style={{ fontSize: 9.5, color: dark ? 'rgba(255,255,255,.55)' : '#5a6878', marginTop: 3, letterSpacing: '.04em', fontWeight: 500 }}>
          The PT&amp;ME Experience
        </div>
      </div>
    </div>
  );
}

// Brand logo — uses the uploaded artwork (dumbbell + "AI" in cyan, coral ring).
function LogoMark({ size = 36 }) {
  return (
    <img
      src="assets/trainer-logo-circle.png"
      alt="TrAIner"
      width={size}
      height={size}
      style={{
        width: size, height: size, display: 'block',
        borderRadius: '50%',
        objectFit: 'cover',
        boxShadow: '0 4px 14px rgba(0,0,0,.25)',
      }}
    />
  );
}

function PhoneFrame({ children, dark, show }) {
  const W = 380, H = 780;
  if (!show) {
    return (
      <div style={{
        width: W, height: H, borderRadius: 36, overflow: 'hidden',
        background: dark ? '#0E1A2B' : '#fff',
        boxShadow: dark ? '0 30px 80px rgba(0,0,0,.55)' : '0 30px 80px rgba(20,40,80,.18)',
      }}>{children}</div>
    );
  }
  return (
    <div style={{
      width: W + 18, height: H + 18, borderRadius: 46, padding: 9,
      background: dark
        ? 'linear-gradient(160deg,#1c2a3e,#0c1422)'
        : 'linear-gradient(160deg,#c8d1de,#e9edf3)',
      boxShadow: dark
        ? '0 50px 120px rgba(0,0,0,.6), inset 0 0 0 1px rgba(255,255,255,.04)'
        : '0 50px 120px rgba(20,40,80,.18), inset 0 0 0 1px rgba(255,255,255,.7)',
      position: 'relative',
    }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: 38, overflow: 'hidden',
        background: dark ? '#0E1A2B' : '#fff', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', left: '50%', top: 10, transform: 'translateX(-50%)',
          width: 86, height: 22, borderRadius: 999, background: '#05080F', zIndex: 20,
        }}/>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 28px', fontSize: 12, fontWeight: 600, zIndex: 19,
          color: dark ? '#fff' : '#102236', fontVariantNumeric: 'tabular-nums',
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
      padding: '8px 4px 14px',
      background: dark ? 'rgba(14,26,43,.92)' : 'rgba(255,255,255,.94)',
      backdropFilter: 'blur(14px)',
      borderTop: `1px solid ${dark ? '#1F2E45' : '#E5EAF1'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
    }}>
      {tabs.map(([key, ic, lbl]) => {
        const on = active === key;
        return (
          <button key={key} onClick={() => onTap(key)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: '6px 10px', borderRadius: 12, fontFamily: 'inherit',
            color: on ? primary : (dark ? 'rgba(255,255,255,.5)' : '#7a8694'),
          }}>
            <Icon name={ic} size={20} color={on ? primary : (dark ? 'rgba(255,255,255,.5)' : '#7a8694')} stroke={on ? 2.4 : 2}/>
            <span style={{ fontSize: 10.5, fontWeight: on ? 600 : 500 }}>{lbl}</span>
          </button>
        );
      })}
    </div>
  );
}

function FlowPills({ screen, setScreen, primary, accent, dark }) {
  const flows = [
    { label: 'Auth', items: [['welcome','Welcome'],['login','Login'],['register','Register'],['onboarding','Onboarding']] },
    { label: 'Client', items: [['profile','Profile'],['checkin','Daily Check-in'],['workout','Workout'],['goal','Goal'],['stats','Stats'],['history','History'],['cycle','Cycle']] },
    { label: 'Other', items: [['studio','Trainer Studio'],['settings','Settings'],['editProfile','Edit profile']] },
  ];
  return (
    <div style={{
      position: 'fixed', left: 28, bottom: 22, zIndex: 5,
      display: 'flex', flexDirection: 'column', gap: 6,
      fontFamily: '"Inter",sans-serif', maxWidth: 540,
    }}>
      {flows.map(f => (
        <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 9.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
            color: f.label === 'Other' ? accent : (dark ? 'rgba(255,255,255,.5)' : '#7a8694'),
            marginRight: 4, minWidth: 50,
          }}>{f.label}</span>
          {f.items.map(([key, lbl]) => {
            const on = screen === key;
            return (
              <button key={key} onClick={() => setScreen(key)} style={{
                padding: '5px 10px', borderRadius: 999, fontSize: 10.5, fontWeight: 600,
                border: `1px solid ${on ? primary : (dark ? '#1F2E45' : '#D7DEE7')}`,
                background: on ? primary : (dark ? 'rgba(255,255,255,.04)' : '#fff'),
                color: on ? '#0E1A2B' : (dark ? 'rgba(255,255,255,.75)' : '#3c4a5c'),
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
