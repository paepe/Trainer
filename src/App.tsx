import React from 'react';
import { BRAND } from './theme';
import { useAuth } from './hooks/useAuth';
import { useData } from './hooks/useData';
import {
  WelcomeScreen, LoginScreen, RegisterScreen, ProfileWizardScreen,
  EditProfileScreen, CheckInProntidaoScreen,
  StartWorkoutScreen, GoalAchievedScreen,
  WorkoutModeScreen, PostWorkoutSummaryScreen,
  StatsScreen, HistoryScreen,
  CycleScreen, TrainerStudioScreen, SettingsScreen,
  TrainerDashboardScreen, TrainerClientDetailScreen,
  WorkoutPlanEditorScreen, TrainerLibraryExercisesScreen,
} from './screens';
import { SideMenu, BottomTabs } from './components';
import type { Profile, CheckIn, Exercise, UserRole, ClientProfile } from './types';
import { TRAINER_ROLES } from './types/auth';

const PUBLIC_SCREENS = ['welcome', 'login', 'register'];

interface AppPreferences {
  notifications: boolean;
  goals: boolean;
  alerts: boolean;
  analysis: boolean;
  behaviour: boolean;
  sounds: boolean;
  cycle: boolean;
  aiPersonalization: boolean;
  whiteLabel: boolean;
  [key: string]: boolean;
}

interface AppCycleConfig {
  length: number;
  periodLength: number;
  lastStartOffset: number;
}

interface AppUser {
  id: string | null;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  dob: string;
  location: string;
  gender: string;
  avatar_url: string | null;
}

export default function App() {
  const { session, profile, loading, signIn, signUp, signOut, updateProfile } = useAuth();
  const {
    saveCycleConfig, fetchCycleConfig,
    savePreferences, fetchPreferences,
    saveProfileV2, saveCheckinV2, updatePainRecurrence,
    startWorkoutSession, logWorkoutSet, updateSessionExerciseStatus,
    reportWorkoutPain, completeWorkoutSession, savePostWorkoutFeedback,
  } = useData(session?.user?.id);

  const [dark, setDark] = React.useState(true);
  const [cycleEnabled] = React.useState(true);

  const isTrainer = profile?.role != null && (TRAINER_ROLES as readonly string[]).includes(profile.role);
  const t = {
    ...BRAND,
    dark,
    cycleEnabled,
    role: (profile?.role ?? 'client') as UserRole | 'client',
  };

  const [screen, setScreen] = React.useState('welcome');
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [selectedClient, setSelectedClient] = React.useState<ClientProfile | null>(null);
  const [prefs, setPrefs] = React.useState<AppPreferences>({
    notifications: true, goals: true, alerts: true,
    analysis: true, behaviour: true, sounds: false,
    cycle: false, aiPersonalization: true, whiteLabel: false,
  });
  const [checkin, setCheckin] = React.useState<CheckIn>({
    energy: 7, soreness: ['Lower back'], minutes: 30, goal: 'Endurance',
    location: 'gym', sleep_quality: 'good', equipment: [],
  });
  const [cycleConfig, setCycleConfig] = React.useState<AppCycleConfig>({
    length: 28, periodLength: 5, lastStartOffset: 11,
  });

  // Load persisted cycle_config and preferences once profile is known (gender required for cycle default)
  React.useEffect(() => {
    if (!profile?.id) return;

    const cycleDefault = profile.gender === 'female';

    fetchCycleConfig().then(({ data }) => {
      if (!data) return;
      const today = new Date();
      const lastStart = data.last_start_date ? new Date(data.last_start_date) : null;
      const offset = lastStart
        ? Math.max(0, Math.floor((today.getTime() - lastStart.getTime()) / 86_400_000))
        : 11;
      setCycleConfig({
        length: data.cycle_length || 28,
        periodLength: data.period_length || 5,
        lastStartOffset: Math.min(offset, (data.cycle_length || 28) - 1),
      });
    });

    fetchPreferences().then(({ data }) => {
      if (!data) {
        // No preferences record yet — apply gender-based cycle default
        setPrefs(prev => ({ ...prev, cycle: cycleDefault }));
        return;
      }
      setPrefs({
        notifications:     (data.notifications      as boolean | undefined) ?? true,
        goals:             (data.goals              as boolean | undefined) ?? true,
        alerts:            (data.alerts             as boolean | undefined) ?? true,
        analysis:          (data.analysis           as boolean | undefined) ?? true,
        behaviour:         (data.behaviour          as boolean | undefined) ?? true,
        sounds:            (data.sounds             as boolean | undefined) ?? false,
        cycle:             (data.cycle_tracking     as boolean | undefined) ?? cycleDefault,
        aiPersonalization: (data.ai_personalization as boolean | undefined) ?? true,
        whiteLabel:        false,
      });
    });
  }, [profile?.id, fetchCycleConfig, fetchPreferences]);

  // Redirect to welcome when session ends
  React.useEffect(() => {
    if (!loading && !session && !PUBLIC_SCREENS.includes(screen)) {
      setScreen('welcome');
    }
  }, [session, loading, screen]);

  // Role-based navigation after login (only when both session and profile are loaded)
  React.useEffect(() => {
    if (session && profile && ['welcome', 'login'].includes(screen)) {
      setScreen(isTrainer ? 'trainerDashboard' : 'profile');
    }
  }, [session, profile, isTrainer, screen]);

  const [screenPayload, setScreenPayload] = React.useState<Record<string, unknown> | null>(null);
  const nav = (target: string, payload?: Record<string, unknown>) => {
    if (target === 'menu') { setMenuOpen(true); return; }
    setMenuOpen(false);
    setScreenPayload(payload ?? null);
    setScreen(target);
  };

  const selectClient = (client: ClientProfile) => {
    setSelectedClient(client);
    setScreen('trainerClientDetail');
  };

  const contentRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [screen]);

  const handleSetPrefs = (newPrefs: AppPreferences) => {
    setPrefs(newPrefs);
    savePreferences({
      notifications:     newPrefs.notifications,
      goals:             newPrefs.goals,
      alerts:            newPrefs.alerts,
      analysis:          newPrefs.analysis,
      behaviour:         newPrefs.behaviour,
      sounds:            newPrefs.sounds,
      cycle_tracking:    newPrefs.cycle,
      ai_personalization: newPrefs.aiPersonalization,
    });
  };

  const handleSetUser = async (data: Partial<Profile> & { email?: string }): Promise<{ error: unknown }> => {
    if (!data || data.email === 'frances@trainer.app') {
      await signOut();
      setScreen('welcome');
      return { error: null };
    }
    const result = await updateProfile(data);
    if (!result?.error && data.gender !== undefined && data.gender !== profile?.gender) {
      handleSetPrefs({ ...prefs, cycle: data.gender === 'female' });
    }
    return result;
  };

  const user: AppUser = profile
    ? {
        id:         profile.id,
        name:       profile.name       ?? '',
        email:      profile.email      ?? '',
        role:       profile.role       ?? 'client',
        phone:      profile.phone      ?? '',
        dob:        profile.dob        ?? '',
        location:   profile.location   ?? '',
        gender:     profile.gender     ?? '',
        avatar_url: profile.avatar_url ?? null,
      }
    : { id: null, name: '', email: '', role: 'client', phone: '', dob: '', location: '', gender: '', avatar_url: null };

  const trainerUser = {
    ...user,
    id: user.id || '',
  };

  const surfaceBg = dark ? '#0E1A2B' : '#FFFFFF';
  const common = {
    nav, t, dark, user,
    setUser: handleSetUser,
    checkin, setCheckin,
    cycleConfig, setCycleConfig,
    saveCycleConfig,
    signIn, signUp,
    selectedClient,
    selectClient,
  };

  const showTabs = [
    'profile','workout','workoutMode','goal','stats','history',
    'settings','editProfile','targets','checkin','cycle','studio',
    'trainerDashboard','trainerClientDetail','workoutPlanEditor','trainerLibraryExercises',
  ].includes(screen);

  const tabs: [string, string, string][] = isTrainer
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
      case 'profile':          return <ProfileWizardScreen     nav={nav} t={t} dark={dark} saveProfileV2={saveProfileV2}/>;
      case 'editProfile':      return <EditProfileScreen       {...common} setUser={handleSetUser}/>;
      case 'checkin':          return <CheckInProntidaoScreen  nav={nav} t={t} dark={dark} userName={profile?.name ?? undefined} saveCheckinV2={saveCheckinV2} updatePainRecurrence={updatePainRecurrence}/>;
      case 'workout':            return <StartWorkoutScreen      {...common}/>;
      case 'workoutMode':        return <WorkoutModeScreen
          nav={nav} t={t} dark={dark} user={user}
          planId={(screenPayload?.planId as string | null) ?? null}
          exercises={(screenPayload?.exercises as Exercise[] | null) ?? null}
          startWorkoutSession={startWorkoutSession}
          logWorkoutSet={logWorkoutSet}
          updateSessionExerciseStatus={updateSessionExerciseStatus}
          reportWorkoutPain={reportWorkoutPain}
          completeWorkoutSession={completeWorkoutSession}
          updatePainRecurrence={updatePainRecurrence}
        />;
      case 'workoutSummary':     return <PostWorkoutSummaryScreen
          nav={nav} t={t} dark={dark} user={user}
          sessionId={(screenPayload?.sessionId as string | null) ?? null}
          durationMin={(screenPayload?.durationMin as number) ?? 0}
          completedCount={(screenPayload?.completedCount as number) ?? 0}
          total={(screenPayload?.total as number) ?? 0}
          totalSets={(screenPayload?.totalSets as number) ?? 0}
          savePostWorkoutFeedback={savePostWorkoutFeedback}
        />;
      case 'goal':               return <GoalAchievedScreen      {...common} sessionData={screenPayload}/>;
      case 'stats':              return <StatsScreen             {...common}/>;
      case 'history':            return <HistoryScreen           {...common}/>;
      case 'cycle':              return <CycleScreen             {...common} setCycleConfig={(cfg) => setCycleConfig(prev => ({ length: cfg.length ?? prev.length, periodLength: cfg.periodLength ?? prev.periodLength, lastStartOffset: cfg.lastStartOffset ?? prev.lastStartOffset }))}/>;
      case 'studio':             return <TrainerStudioScreen     {...common}/>;
      case 'settings':           return <SettingsScreen          {...common} prefs={prefs} setPrefs={(p) => handleSetPrefs({ ...prefs, ...p })} setDark={setDark}/>;
      case 'targets':            return <GoalAchievedScreen      {...common}/>;
      case 'trainerDashboard':    return <TrainerDashboardScreen     {...common} user={trainerUser}/>;
      case 'trainerClientDetail': return <TrainerClientDetailScreen  {...common} user={trainerUser}/>;
      case 'workoutPlanEditor':   return <WorkoutPlanEditorScreen    {...common} user={trainerUser}/>;
      case 'trainerLibraryExercises': return <TrainerLibraryExercisesScreen {...common} user={trainerUser}/>;
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

function LoadingScreen({ dark, primary }: { dark: boolean; primary: string }) {
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
