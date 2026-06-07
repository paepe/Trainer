// app-print.jsx — Renders every screen on its own page for PDF export.

const PRINT_PALETTE = ["#2DD4E0","#0F8C85","#EF5B3C","#9DECF3"];
const tt = {
  palette: PRINT_PALETTE,
  primary: PRINT_PALETTE[0],
  primaryDeep: PRINT_PALETTE[1],
  accent: PRINT_PALETTE[2],
  primarySoft: PRINT_PALETTE[3],
  dark: true,
  whiteLabel: false,
  cycleEnabled: true,
  role: 'client',
  showFrame: true,
};

const USER = { name: 'Frances Scott', email: 'frances@trainer.app', role: 'Client' };
const PREFS = {
  notifications: true, goals: true, alerts: true,
  analysis: true, behaviour: true, sounds: false,
  cycle: true, aiPersonalization: true, whiteLabel: false,
};
const CHECKIN = { energy: 7, soreness: ['Lower back'], minutes: 30, goal: 'Endurance' };

// All screens to render, in order
const SCREENS = [
  { key: 'welcome',     title: '01 · Welcome',          Comp: WelcomeScreen },
  { key: 'login',       title: '02 · Log In',           Comp: LoginScreen },
  { key: 'register',    title: '03 · Register',         Comp: RegisterScreen },
  { key: 'onboarding',  title: '04 · Onboarding · Goal',Comp: OnboardingScreen },
  { key: 'profile',     title: '05 · User Profile',     Comp: ProfileScreen },
  { key: 'editProfile', title: '06 · Edit Profile',     Comp: EditProfileScreen },
  { key: 'checkin',     title: '07 · Daily Check-in',   Comp: CheckInScreen },
  { key: 'workout',     title: '08 · Start Workout',    Comp: StartWorkoutScreen },
  { key: 'goal',        title: '09 · Goal Achieved',    Comp: GoalAchievedScreen },
  { key: 'stats',       title: '10 · Workout Stats',    Comp: StatsScreen },
  { key: 'history',     title: '11 · Workout History',  Comp: HistoryScreen },
  { key: 'cycle',       title: '12 · Cycle Tracking',   Comp: CycleScreen },
  { key: 'studio',      title: '13 · Trainer Studio (B2B)', Comp: TrainerStudioScreen },
  { key: 'settings',    title: '14 · Settings',         Comp: SettingsScreen },
  { key: 'sidemenu',    title: '15 · Side Menu',        Comp: null /* special */ },
];

// Stub nav — does nothing (no interactivity in print)
const noopNav = () => {};
const noopSetUser = () => {};
const noopSetCheckin = () => {};
const noopSetPrefs = () => {};

function PrintPhone({ children }) {
  const W = 380, H = 780;
  return (
    <div style={{
      width: W + 18, height: H + 18, borderRadius: 46, padding: 9,
      background: 'linear-gradient(160deg,#1c2a3e,#0c1422)',
      boxShadow: '0 30px 60px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,.04)',
      position: 'relative',
      WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
    }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: 38, overflow: 'hidden',
        background: '#0E1A2B', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', left: '50%', top: 10, transform: 'translateX(-50%)',
          width: 86, height: 22, borderRadius: 999, background: '#05080F', zIndex: 20,
        }}/>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 28px', fontSize: 12, fontWeight: 600, zIndex: 19,
          color: '#fff', fontVariantNumeric: 'tabular-nums',
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
      }}
    />
  );
}

// Show the side menu rendered "open" via a wrapped profile screen
function SideMenuPageContent() {
  const common = { nav: noopNav, t: tt, dark: true, user: USER, setUser: noopSetUser, checkin: CHECKIN, setCheckin: noopSetCheckin };
  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', background: '#0E1A2B', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <ProfileScreen {...common} prefs={PREFS}/>
      </div>
      <SideMenu open={true} nav={noopNav} t={tt} user={USER} current="profile" setUser={noopSetUser}/>
    </div>
  );
}

function ScreenPage({ title, Comp, k }) {
  const common = { nav: noopNav, t: tt, dark: true, user: USER, setUser: noopSetUser, checkin: CHECKIN, setCheckin: noopSetCheckin };
  let content;
  if (k === 'sidemenu') {
    content = <SideMenuPageContent/>;
  } else if (k === 'settings') {
    content = (
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', background: '#0E1A2B', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Comp {...common} prefs={PREFS} setPrefs={noopSetPrefs}/>
        </div>
      </div>
    );
  } else if (k === 'profile') {
    content = (
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', background: '#0E1A2B', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Comp {...common} prefs={PREFS}/>
        </div>
      </div>
    );
  } else {
    content = (
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', background: '#0E1A2B', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Comp {...common}/>
        </div>
      </div>
    );
  }

  return (
    <section className="page" data-screen-label={title}>
      <header className="page-hdr">
        <div className="brand">
          <LogoMark size={32}/>
          <div>
            <div className="brand-name">Tr<span style={{ color: tt.primary }}>AI</span>ner</div>
            <div className="brand-claim">The PT &amp; ME Experience</div>
          </div>
        </div>
        <div className="page-title">{title}</div>
      </header>
      <div className="phone-wrap">
        <PrintPhone>{content}</PrintPhone>
      </div>
      <footer className="page-ftr">
        <span>TrAIner · Fitness &amp; Gym Workout · AI-powered coach</span>
        <span>Prototype · 2026</span>
      </footer>
    </section>
  );
}

function CoverPage() {
  const features = [
    ['AI workouts',       'Personalized plans built from real trainer methodology'],
    ['Daily check-in',    'Adapts to today\'s energy, time, soreness'],
    ['Cycle tracking',    'Phase-aware intensity for the female cycle'],
    ['Trainer Studio',    'B2B tool — trainers feed the AI'],
    ['White-label',       'Studios can co-brand the app'],
    ['Workout history',   'Full database for long-term coaching'],
  ];
  return (
    <section className="page page-cover">
      <div className="cover-bg"/>
      <div className="cover-inner">
        <div className="cover-brand">
          <LogoMark size={72}/>
          <div>
            <div className="cover-name">Tr<span style={{ color: tt.primary }}>AI</span>ner</div>
            <div className="cover-claim">The PT &amp; ME Experience</div>
          </div>
        </div>
        <div className="cover-tag">
          <span style={{ color: tt.accent, fontWeight: 700, letterSpacing: '.1em' }}>● TRAIN SMARTER, NOT HARDER</span>
        </div>
        <h1 className="cover-h1">
          Fitness &amp; Gym Workout app<br/>
          <span style={{ color: tt.primary }}>powered by AI &amp; real trainers.</span>
        </h1>
        <p className="cover-sub">
          A high-fidelity interactive prototype — 15 screens covering onboarding, daily AI
          coaching, cycle-aware training, workout analytics, and a B2B Trainer Studio.
        </p>
        <div className="cover-grid">
          {features.map(([t, d]) => (
            <div key={t} className="feat">
              <div className="feat-dot"/>
              <div>
                <div className="feat-title">{t}</div>
                <div className="feat-desc">{d}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="cover-palette">
          <div className="swatch" style={{ background: '#0E1A2B' }}><span>Navy<br/>#0E1A2B</span></div>
          <div className="swatch" style={{ background: tt.primary }}><span style={{ color: '#0E1A2B' }}>Cyan<br/>#2DD4E0</span></div>
          <div className="swatch" style={{ background: tt.primaryDeep }}><span>Teal<br/>#0F8C85</span></div>
          <div className="swatch" style={{ background: tt.accent }}><span>Coral<br/>#EF5B3C</span></div>
        </div>
      </div>
    </section>
  );
}

function PrintDoc() {
  return (
    <>
      <CoverPage/>
      {SCREENS.map(s => <ScreenPage key={s.key} k={s.key} title={s.title} Comp={s.Comp}/>)}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<PrintDoc/>);

// Auto-print once everything settled
(async () => {
  try { await document.fonts.ready; } catch (e) {}
  setTimeout(() => window.print(), 600);
})();
