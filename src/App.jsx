import React from 'react';
import { BRAND } from './theme';
import { useAuth } from './hooks/useAuth';
import { useData } from './hooks/useData';
import {
  WelcomeScreen, LoginScreen, RegisterScreen, OnboardingScreen,
  ProfileScreen, EditProfileScreen, CheckInScreen,
  StartWorkoutScreen, GoalAchievedScreen, StatsScreen, HistoryScreen,
  CycleScreen, TrainerStudioScreen, SettingsScreen,
  TrainerDashboardScreen,
  WorkoutPlanEditorScreen,
  SideMenu, Icon,
} from './screens';

const PUBLIC_SCREENS = ['welcome', 'login', 'register'];

export default function App() {
  const { session, profile, loading, signIn, signUp, signOut, updateProfile } = useAuth();
  const { savePhysicalProfile, saveCheckin, logWorkoutSession } = useData(session?.user?.id);

  const [dark, setDark] = React.useState(true);
  const [cycleEnabled] = React.useState(true);

  const isTrainer = profile?.role === 'trainer' || profile?.role === 'studio_trainer' || profile?.role === 'studio_admin';
  const t = { ...BRAND, dark, cycleEnabled, role: profile?.role ?? 'client' };

  const [screen, setScreen] = React.useState('welcome');
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [selectedClient, setSelectedClient] = React.useState(null);
  const [prefs, setPrefs] = React.useState({
    notifications: true, goals: true, alerts: true,
    analysis: true, behaviour: true, sounds: false,
    cycle: true, aiPersonalization: true, whiteLabel: false,
  });
  const [checkin, setCheckin] = React.useState({
    energy: 7, soreness: ['Lower back'], minutes: 30, goal: 'Endurance',
  });
  const [cycleConfig, setCycleConfig] = React.useState({
    length: 28, periodLength: 5, lastStartOffset: 11,
  });

  // Redirect to welcome when session ends
  React.useEffect(() => {
    if (!loading && !session && !PUBLIC_SCREENS.includes(screen)) {
      setScreen('welcome');
    }
  }, [session, loading]);

  // Role-based navigation after login (only when both session and profile are loaded)
  React.useEffect(() => {
    if (session && profile && ['welcome', 'login'].includes(screen)) {
      setScreen(isTrainer ? 'trainerDashboard' : 'profile');
    }
  }, [session, profile]);

  const nav = (target) => {
    if (target === 'menu') { setMenuOpen(true); return; }
    setMenuOpen(false);
    setScreen(target);
  };

  const selectClient = (client) => {
    setSelectedClient(client);
    setScreen('workoutPlanEditor');
  };

  const contentRef = React.useRef(null);
  React.useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [screen]);

  const handleSetUser = async (data) => {
    if (!data || data.email === 'frances@trainer.app') {
      await signOut();
      setScreen('welcome');
    } else {
      await updateProfile(data);
    }
  };

  const user = profile
    ? { id: profile.id, name: profile.name ?? '', email: profile.email ?? '', role: profile.role ?? 'Client' }
    : { id: null, name: '', email: '', role: 'Client' };

  const surfaceBg = dark ? '#0E1A2B' : '#FFFFFF';
  const common = {
    nav, t, dark, user,
    setUser: handleSetUser,
    checkin, setCheckin,
    cycleConfig, setCycleConfig,
    signIn, signUp,
    savePhysicalProfile,
    saveCheckin,
    logWorkoutSession,
    selectedClient,
    selectClient,
  };

  const showTabs = [
    'profile','workout','goal','stats','history',
    'settings','editProfile','targets','checkin','cycle','studio',
    'trainerDashboard','workoutPlanEditor',
  ].includes(screen);

  const tabs = isTrainer
    ? [
        ['trainerDashboard', 'user',    'Clients'],
        ['checkin',          'sparkle', 'Coach'],
        ['workout',          'play',    'Workout'],
        ['stats',            'chart',   'Stats'],
        ['history',          'history', 'History'],
      ]
    : [
        ['profile',  'user',    'Profile'],
        ['checkin',  'sparkle', 'Coach'],
        ['workout',  'play',    'Workout'],
        ['stats',    'chart',   'Stats'],
        ['history',  'history', 'History'],
      ];

  if (loading) return <LoadingScreen dark={dark} primary={BRAND.primary} />;

  const screenContent = (() => {
    switch (screen) {
      case 'welcome':          return <WelcomeScreen           {...common}/>;
      case 'login':            return <LoginScreen             {...common}/>;
      case 'register':         return <RegisterScreen          {...common}/>;
      case 'onboarding':       return <OnboardingScreen        {...common}/>;
      case 'profile':          return <ProfileScreen           {...common} prefs={prefs}/>;
      case 'editProfile':      return <EditProfileScreen       {...common}/>;
      case 'checkin':          return <CheckInScreen           {...common}/>;
      case 'workout':          return <StartWorkoutScreen      {...common}/>;
      case 'goal':             return <GoalAchievedScreen      {...common}/>;
      case 'stats':            return <StatsScreen             {...common}/>;
      case 'history':          return <HistoryScreen           {...common}/>;
      case 'cycle':            return <CycleScreen             {...common}/>;
      case 'studio':           return <TrainerStudioScreen     {...common}/>;
      case 'settings':         return <SettingsScreen          {...common} prefs={prefs} setPrefs={setPrefs} setDark={setDark}/>;
      case 'targets':          return <GoalAchievedScreen      {...common}/>;
      case 'trainerDashboard':   return <TrainerDashboardScreen  {...common}/>;
      case 'workoutPlanEditor':  return <WorkoutPlanEditorScreen {...common}/>;
      default:                   return <WelcomeScreen           {...common}/>;
    }
  })();

  return (
    <div style={{
      height: '100dvh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: surfaceBg,
      overflow: 'hidden',
      position: 'relative',
      fontFamily: '"Inter","Plus Jakarta Sans",system-ui,-apple-system,sans-serif',
      color: dark ? '#fff' : '#102236',
    }}>
      <div
        ref={contentRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {screenContent}
      </div>

      {showTabs && (
        <BottomTabs tabs={tabs} active={screen} onTap={nav} primary={t.primary} dark={dark}/>
      )}

      <SideMenu
        open={menuOpen}
        nav={(s) => { setMenuOpen(false); if (s && s !== 'menu') setScreen(s); }}
        t={t} user={user} current={screen} setUser={handleSetUser}
      />
    </div>
  );
}

function LoadingScreen({ dark, primary }) {
  return (
    <div style={{
      height: '100dvh', width: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: dark ? '#0E1A2B' : '#fff',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: `3px solid ${dark ? '#1F2E45' : '#E5EAF1'}`,
        borderTopColor: primary,
        animation: 'spin 0.7s linear infinite',
      }}/>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function BottomTabs({ tabs, active, onTap, primary, dark }) {
  return (
    <div style={{
      flexShrink: 0,
      padding: '8px 4px',
      paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
      background: dark ? 'rgba(14,26,43,.92)' : 'rgba(255,255,255,.94)',
      backdropFilter: 'blur(14px)',
      borderTop: `1px solid ${dark ? '#1F2E45' : '#E5EAF1'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
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
