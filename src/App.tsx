import React from 'react';
import { BRAND, TRAINER_BRAND } from './theme';
import { useAuth } from './hooks/useAuth';
import { useProfileData }  from './hooks/useProfileData';
import { useCheckinData }  from './hooks/useCheckinData';
import { useWorkoutData }  from './hooks/useWorkoutData';
import { usePushNotifications } from './hooks/usePushNotifications';
import { WelcomeScreen, LoginScreen, RegisterScreen } from './screens/auth';
import { AppLayout } from './layouts';
import { NotificationProvider, useNotification, ThemeProvider } from './contexts';
import type { Profile, CheckIn, Exercise, UserRole, ClientProfile } from './types';
import { TRAINER_ROLES } from './types/auth';

const ProfileWizardScreen        = React.lazy(() => import('./screens/auth/ProfileWizardScreen').then(m => ({ default: m.ProfileWizardScreen })));
const CheckInProntidaoScreen     = React.lazy(() => import('./screens/checkin/CheckInProntidaoScreen').then(m => ({ default: m.CheckInProntidaoScreen })));
const StartWorkoutScreen         = React.lazy(() => import('./screens/client/StartWorkoutScreen').then(m => ({ default: m.StartWorkoutScreen })));
const GoalAchievedScreen         = React.lazy(() => import('./screens/client/GoalAchievedScreen').then(m => ({ default: m.GoalAchievedScreen })));
const WorkoutModeScreen          = React.lazy(() => import('./screens/client/WorkoutModeScreen').then(m => ({ default: m.WorkoutModeScreen })));
const PostWorkoutSummaryScreen   = React.lazy(() => import('./screens/client/PostWorkoutSummaryScreen').then(m => ({ default: m.PostWorkoutSummaryScreen })));
const PerformanceDashboardScreen = React.lazy(() => import('./screens/client/PerformanceDashboardScreen').then(m => ({ default: m.PerformanceDashboardScreen })));
const HistoryScreen              = React.lazy(() => import('./screens/client/HistoryScreen').then(m => ({ default: m.HistoryScreen })));
const CycleScreen                = React.lazy(() => import('./screens/client/CycleScreen').then(m => ({ default: m.CycleScreen })));
const SettingsScreen             = React.lazy(() => import('./screens/client/SettingsScreen').then(m => ({ default: m.SettingsScreen })));
const TrainerStudioScreen        = React.lazy(() => import('./screens/trainer/TrainerStudioScreen').then(m => ({ default: m.TrainerStudioScreen })));
const TrainerDashboardScreen     = React.lazy(() => import('./screens/trainer/TrainerDashboardScreen').then(m => ({ default: m.TrainerDashboardScreen })));
const TrainerClientDetailScreen  = React.lazy(() => import('./screens/trainer/TrainerClientDetailScreen').then(m => ({ default: m.TrainerClientDetailScreen })));
const WorkoutPlanEditorScreen    = React.lazy(() => import('./screens/trainer/WorkoutPlanEditorScreen').then(m => ({ default: m.WorkoutPlanEditorScreen })));
const TrainerLibraryExercisesScreen = React.lazy(() => import('./screens/trainer/TrainerLibraryExercisesScreen').then(m => ({ default: m.TrainerLibraryExercisesScreen })));
const CoachDNAScreen             = React.lazy(() => import('./coach-dna/CoachDNAScreen').then(m => ({ default: m.CoachDNAScreen })));

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

  const [prefs, setPrefs] = React.useState<AppPreferences>({
    notifications: true, goals: true, alerts: true,
    analysis: true, behaviour: true, sounds: false,
    cycle: false, aiPersonalization: true, whiteLabel: false,
  });

  const {
    saveCycleConfig, fetchCycleConfig,
    savePreferences, fetchPreferences,
    saveProfileV2, fetchProfileV2,
  } = useProfileData(session?.user?.id);

  const { saveCheckinV2, updatePainRecurrence } = useCheckinData(session?.user?.id, prefs.alerts);

  const {
    startWorkoutSession, logWorkoutSet, updateSessionExerciseStatus,
    reportWorkoutPain, completeWorkoutSession, savePostWorkoutFeedback,
  } = useWorkoutData(session?.user?.id);

  const [dark, setDark] = React.useState(true);
  const [cycleEnabled] = React.useState(true);

  const isTrainer = profile?.role != null && (TRAINER_ROLES as readonly string[]).includes(profile.role);
  const t = {
    ...(isTrainer ? TRAINER_BRAND : BRAND),
    dark,
    cycleEnabled,
    role: (profile?.role ?? 'client') as UserRole | 'client',
  };

  const [screen, setScreen] = React.useState('welcome');
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [selectedClient, setSelectedClient] = React.useState<ClientProfile | null>(null);
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

    // Parallel: fetch profile_v2 + preferences simultaneously
    Promise.all([
      fetchProfileV2('body_rhythm'),
      fetchPreferences(),
    ]).then(([pv2Res, prefsRes]) => {
      const br = pv2Res.data && (pv2Res.data as Record<string, unknown>).body_rhythm as Record<string, unknown> | null;
      if (br && br.enabled && typeof br.cycle_duration_days === 'number') {
        // Use profile_v2.body_rhythm as source of truth
        const day = (typeof br.cycle_current_day === 'number' ? br.cycle_current_day : 14);
        setCycleConfig({
          length: br.cycle_duration_days as number,
          periodLength: 5,
          lastStartOffset: Math.max(0, day - 1),
        });
        setPrefsFromApi(prefsRes.data, cycleDefault);
        return;
      }

      // Fallback: read from legacy cycle_config table
      fetchCycleConfig().then(({ data: legacy }) => {
        setPrefsFromApi(prefsRes.data, cycleDefault);
        if (!legacy) return;
        const today = new Date();
        const lastStart = legacy.last_start_date ? new Date(legacy.last_start_date) : null;
        const offset = lastStart
          ? Math.max(0, Math.floor((today.getTime() - lastStart.getTime()) / 86_400_000))
          : 11;
        const len = legacy.cycle_length || 28;
        setCycleConfig({
          length: len,
          periodLength: legacy.period_length || 5,
          lastStartOffset: Math.min(offset, len - 1),
        });
        // Migrate legacy → profile_v2.body_rhythm (one-time sync)
        const currentDay = Math.min(len, Math.max(1, offset + 1));
        saveProfileV2({ body_rhythm: { enabled: true, cycle_current_day: currentDay, cycle_duration_days: len, adaptation_preference: [] } } as Parameters<typeof saveProfileV2>[0], 'completed');
      });
    });

    // Helper: apply preferences from API response
    function setPrefsFromApi(data: Record<string, unknown> | null | undefined, cyDefault: boolean) {
      if (!data) {
        setPrefs(prev => ({ ...prev, cycle: cyDefault }));
        return;
      }
      setPrefs({
        notifications:     (data.notifications      as boolean | undefined) ?? true,
        goals:             (data.goals              as boolean | undefined) ?? true,
        alerts:            (data.alerts             as boolean | undefined) ?? true,
        analysis:          (data.analysis           as boolean | undefined) ?? true,
        behaviour:         (data.behaviour          as boolean | undefined) ?? true,
        sounds:            (data.sounds             as boolean | undefined) ?? false,
        cycle:             (data.cycle_tracking     as boolean | undefined) ?? cyDefault,
        aiPersonalization: (data.ai_personalization as boolean | undefined) ?? true,
        whiteLabel:        false,
      });
    }
  }, [profile?.id, fetchCycleConfig, fetchPreferences, saveProfileV2, fetchProfileV2]);

  // Push notification — request permission, register token
  const push = usePushNotifications();
  const pushInitRef = React.useRef(false);
  React.useEffect(() => {
    if (!profile?.id || pushInitRef.current) return;
    if (prefs.notifications === false) return;
    pushInitRef.current = true;
    push.request().then(granted => { if (granted) push.registerToken(profile.id); });
  }, [profile?.id, prefs.notifications, push]);

  // Redirect to welcome when session ends
  React.useEffect(() => {
    if (!loading && !session && !PUBLIC_SCREENS.includes(screen)) {
      setScreen('welcome');
    }
  }, [session, loading, screen]);

  // Role-based navigation after login (only when both session and profile are loaded)
  React.useEffect(() => {
    if (!session || !profile || !['welcome', 'login'].includes(screen)) return;
    if (isTrainer) { setScreen('trainerDashboard'); return; }
    // For clients: check if profile wizard was already completed
    fetchProfileV2().then(({ data }) => {
      const completed = data && (data as Record<string, unknown>).completed_at;
      setScreen(completed ? 'checkin' : 'profile');
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, profile, isTrainer, screen]);

  const [screenPayload,  setScreenPayload]  = React.useState<Record<string, unknown> | null>(null);
  const [profileNavKey,  setProfileNavKey]  = React.useState(0);
  const nav = (target: string, payload?: Record<string, unknown>) => {
    if (target === 'menu') { setMenuOpen(true); return; }
    setMenuOpen(false);
    setScreenPayload(payload ?? null);
    if (target === 'profile') setProfileNavKey(k => k + 1);
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

  // Trainer is always dark (DARK.bg) per coach_dna_system_design.md §8.
  // Client respects the user's dark preference toggle.
  const surfaceBg = isTrainer ? '#0E1A2B' : (dark ? '#0E1A2B' : '#FFFFFF');
  // Unified cycle save: writes to profile_v2.body_rhythm (primary) + cycle_config (legacy)
  const saveCycleUnified = React.useCallback(async (params: { cycleLength: number; periodLength: number; lastStartDate: string }) => {
    // Update local state immediately
    const today = new Date();
    const offset = Math.max(0, Math.floor((today.getTime() - new Date(params.lastStartDate).getTime()) / 86_400_000));
    setCycleConfig({ length: params.cycleLength, periodLength: params.periodLength, lastStartOffset: Math.min(offset, params.cycleLength - 1) });

    // Save to profile_v2.body_rhythm (primary source) — preserve existing data
    if (saveProfileV2 && fetchProfileV2) {
      const { data: existing } = await fetchProfileV2();
      const prev = (existing as Record<string, unknown> | null)?.body_rhythm as Record<string, unknown> | null;
      saveProfileV2({
        body_rhythm: {
          enabled: true,
          cycle_current_day: Math.min(params.cycleLength, Math.max(1, offset + 1)),
          cycle_duration_days: params.cycleLength,
          adaptation_preference: (prev?.adaptation_preference as unknown[]) ?? [],
        },
      } as Parameters<typeof saveProfileV2>[0], 'completed');
    }

    // Also save to legacy cycle_config for backward compat
    void saveCycleConfig(params);
    return { error: null } as { error: unknown };
  }, [saveProfileV2, fetchProfileV2, saveCycleConfig, setCycleConfig]);

  const common = {
    nav, t, dark, user,
    setUser: handleSetUser,
    checkin, setCheckin,
    cycleConfig, setCycleConfig,
    saveCycleConfig: saveCycleUnified,
    signIn, signUp,
    selectedClient,
    selectClient,
  };

  const showTabs = (isTrainer
    ? ['workout','workoutMode','goal','stats','history',
       'settings','targets','checkin','cycle','studio',
       'trainerDashboard','trainerClientDetail','workoutPlanEditor','trainerLibraryExercises',
       'workoutSummary','coachDNA']
    : ['profile','workout','workoutMode','goal','stats','history',
       'settings','targets','checkin','cycle','studio',
       'workoutSummary']
  ).includes(screen);

  const tabs: [string, string, string][] = isTrainer
    ? [
        ['trainerDashboard', 'user',    'Clients'],
        ['checkin',          'sparkle', 'Check-in'],
        ['stats',            'chart',   'Progress'],
        ['history',          'history', 'History'],
        ['menu',             'menu',    'Menu'],
      ]
    : [
        ['checkin',  'sparkle', 'Check-in'],
        ['workout',  'play',    'Workout'],
        ['stats',    'chart',   'Progress'],
        ['history',  'history', 'History'],
        ['menu',     'menu',    'Menu'],
      ];

  if (loading) return <LoadingScreen dark={dark} primary={t.primary} />;

  const screenContent = (() => {
    const noClient = isTrainer && !selectedClient;
    const noClientBanner = noClient ? (
      <div style={{
        margin: '12px 22px', padding: '16px 18px', borderRadius: 14,
        // Trainer is always dark; use DARK tokens directly
        background: '#1A2A40',
        border: '1px solid #1F2E45',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: 8.5, fontWeight: 700, letterSpacing: '.1em',
          textTransform: 'uppercase', color: '#F5A623', marginBottom: 8,
        }}>
          ⚠ No client selected
        </div>
        <p style={{
          margin: '0 0 14px', fontSize: 12.5, color: 'rgba(255,255,255,.55)',
          lineHeight: 1.5,
        }}>
          Select a client from My Clients first to load their data.
        </p>
        <button onClick={() => { setScreen('trainerDashboard'); setSelectedClient(null); }} style={{
          padding: '9px 22px', borderRadius: 14, border: 'none',
          background: t.primary, color: '#0E1A2B',
          fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
        }}>
          Go to My Clients
        </button>
      </div>
    ) : null;

    switch (screen) {
      case 'welcome':          return <WelcomeScreen           {...common}/>;
      case 'login':            return <LoginScreen             {...common}/>;
      case 'register':         return <RegisterScreen          {...common}/>;
      case 'profile':          return <ProfileWizardScreen     key={profileNavKey} nav={nav} t={t} dark={dark} saveProfileV2={saveProfileV2} fetchProfileV2={fetchProfileV2} saveUser={handleSetUser} user={user}/>;
      case 'checkin':          return (
        <>
          {(noClient && !screenPayload?.clientUserId) && noClientBanner}
          <CheckInProntidaoScreen  nav={nav} t={t} dark={dark} user={user} userName={profile?.name ?? undefined} biologicalSex={profile?.gender ?? undefined} clientUserId={(screenPayload?.clientUserId as string) ?? (isTrainer ? selectedClient?.id : undefined)} clientName={(screenPayload?.clientName as string) ?? (isTrainer ? selectedClient?.name : undefined)} saveCheckinV2={saveCheckinV2} updatePainRecurrence={updatePainRecurrence}/>
        </>
      );
      case 'workout':            return <StartWorkoutScreen      {...common}/>;
      case 'workoutMode':        return <WorkoutModeScreen
          nav={nav} t={t} dark={dark} user={user}
          planId={(screenPayload?.planId as string | null) ?? null}
          exercises={(screenPayload?.exercises as Exercise[] | null) ?? null}
          clientUserId={(screenPayload?.clientUserId as string) ?? undefined}
          clientName={(screenPayload?.clientName as string) ?? undefined}
          startWorkoutSession={startWorkoutSession}
          logWorkoutSet={logWorkoutSet}
          updateSessionExerciseStatus={updateSessionExerciseStatus}
          reportWorkoutPain={reportWorkoutPain}
          completeWorkoutSession={completeWorkoutSession}
          updatePainRecurrence={updatePainRecurrence}
          sounds={prefs.sounds}
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
      case 'stats':              return (
        <>
          {noClient && noClientBanner}
          <PerformanceDashboardScreen nav={nav} t={t} dark={dark} user={user} selectedClient={selectedClient}/>
        </>
      );
      case 'history':            return (
        <>
          {noClient && noClientBanner}
          <HistoryScreen           {...common}/>
        </>
      );
      case 'cycle':              return <CycleScreen             {...common} setCycleConfig={(cfg) => setCycleConfig(prev => ({ length: cfg.length ?? prev.length, periodLength: cfg.periodLength ?? prev.periodLength, lastStartOffset: cfg.lastStartOffset ?? prev.lastStartOffset }))} cycleEnabled={prefs.cycle}/>;
      case 'studio':             return <TrainerStudioScreen     {...common}/>;
      case 'settings':           return <SettingsScreen          {...common} prefs={prefs} setPrefs={(p) => handleSetPrefs({ ...prefs, ...p })} setDark={setDark}/>;
      case 'targets':            return <GoalAchievedScreen      {...common}/>;
      case 'trainerDashboard':    return <TrainerDashboardScreen     nav={nav} user={trainerUser} selectClient={selectClient}/>;
      case 'trainerClientDetail': return <TrainerClientDetailScreen  nav={nav} user={trainerUser} selectedClient={selectedClient}/>;
      case 'workoutPlanEditor':   return <WorkoutPlanEditorScreen    nav={nav} user={trainerUser} selectedClient={selectedClient}/>;
      case 'trainerLibraryExercises': return <TrainerLibraryExercisesScreen nav={nav} user={trainerUser}/>;
      case 'coachDNA':            return <CoachDNAScreen nav={nav} user={trainerUser}/>;
      default:                   return <WelcomeScreen           {...common}/>;
    }
  })();

  const layoutProps = {
    contentRef,
    surfaceBg,
    dark,
    showTabs,
    tabs,
    screen,
    nav,
    t,
    user: isTrainer ? trainerUser : user,
    menuOpen,
    setMenuOpen,
    handleSetUser,
    profile,
  };

  return (
    <ThemeProvider t={t} dark={dark} isTrainer={isTrainer}>
      <NotificationProvider t={t} dark={dark} isTrainer={isTrainer}>
        <PushListener push={push} />
        <AppLayout role={isTrainer ? "trainer" : "client"} {...layoutProps}>
          <React.Suspense fallback={<LoadingScreen dark={dark} primary={t.primary} />}>
            {screenContent}
          </React.Suspense>
        </AppLayout>
      </NotificationProvider>
    </ThemeProvider>
  );
}

function PushListener({ push }: { push: any }) {
  const { showNotification } = useNotification();
  React.useEffect(() => {
    if (push.status !== 'registered') return;
    const unsub = push.listenForeground((title: string, body: string) => {
      showNotification(title, body);
    });
    return () => { unsub(); };
  }, [push.status, push.listenForeground, showNotification]);
  return null;
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
