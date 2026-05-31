import React from 'react';
import { BRAND } from './theme';
import { useAuth } from './hooks/useAuth';
import { useData } from './hooks/useData';
import { usePushNotifications } from './hooks/usePushNotifications';
import { vibrate } from './lib/haptics';
import {
  WelcomeScreen, LoginScreen, RegisterScreen, ProfileWizardScreen,
  CheckInProntidaoScreen,
  StartWorkoutScreen, GoalAchievedScreen,
  WorkoutModeScreen, PostWorkoutSummaryScreen,
  PerformanceDashboardScreen, HistoryScreen,
  CycleScreen, TrainerStudioScreen, SettingsScreen,
  TrainerDashboardScreen, TrainerClientDetailScreen,
  WorkoutPlanEditorScreen, TrainerLibraryExercisesScreen,
} from './screens';
import { CoachDNAScreen } from './coach-dna';
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

  const [prefs, setPrefs] = React.useState<AppPreferences>({
    notifications: true, goals: true, alerts: true,
    analysis: true, behaviour: true, sounds: false,
    cycle: false, aiPersonalization: true, whiteLabel: false,
  });

  const {
    saveCycleConfig, fetchCycleConfig,
    savePreferences, fetchPreferences,
    saveProfileV2, fetchProfileV2, saveCheckinV2, updatePainRecurrence,
    startWorkoutSession, logWorkoutSet, updateSessionExerciseStatus,
    reportWorkoutPain, completeWorkoutSession, savePostWorkoutFeedback,
  } = useData(session?.user?.id, prefs.alerts);

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

  // Push notification — request permission, register token, and listen for foreground messages
  const push = usePushNotifications();
  const pushInitRef = React.useRef(false);
  React.useEffect(() => {
    if (!profile?.id || pushInitRef.current) return;
    if (prefs.notifications === false) return;
    pushInitRef.current = true;
    push.request().then(granted => { if (granted) push.registerToken(profile.id); });
  }, [profile?.id, prefs.notifications, push]);

  const [fgNotif, setFgNotif] = React.useState<{ title: string; body: string } | null>(null);
  const fgTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => {
    if (push.status !== 'registered') return;
    const unsub = push.listenForeground((title, body) => {
      setFgNotif({ title, body });
      vibrate('notification');
      if (fgTimerRef.current) clearTimeout(fgTimerRef.current);
      fgTimerRef.current = setTimeout(() => setFgNotif(null), 5000);
    });
    return () => { unsub(); if (fgTimerRef.current) clearTimeout(fgTimerRef.current); };
  }, [push.status, push.listenForeground]);

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

  const surfaceBg = dark ? '#0E1A2B' : '#FFFFFF';
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
       'postWorkoutSummary','coachDNA']
    : ['profile','workout','workoutMode','goal','stats','history',
       'settings','targets','checkin','cycle','studio',
       'postWorkoutSummary']
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

  if (loading) return <LoadingScreen dark={dark} primary={BRAND.primary} />;

  const screenContent = (() => {
    const noClient = isTrainer && !selectedClient;
    const noClientBanner = noClient ? (
      <div style={{
        margin: '12px 22px', padding: '16px 18px', borderRadius: 14,
        background: dark ? '#1A2A40' : '#f0f4f8',
        border: dark ? '1px solid #1F2E45' : '1px solid #d0d8e4',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: 8.5, fontWeight: 700, letterSpacing: '.1em',
          textTransform: 'uppercase', color: '#F5A623', marginBottom: 8,
        }}>
          ⚠ No client selected
        </div>
        <p style={{
          margin: '0 0 14px', fontSize: 12.5, color: dark ? 'rgba(255,255,255,.55)' : '#546a7e',
          lineHeight: 1.5,
        }}>
          Select a client from My Clients first to load their data.
        </p>
        <button onClick={() => { setScreen('trainerDashboard'); setSelectedClient(null); }} style={{
          padding: '9px 22px', borderRadius: 14, border: 'none',
          background: BRAND.primary, color: '#0E1A2B',
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
          <CheckInProntidaoScreen  nav={nav} t={t} dark={dark} user={user} userName={profile?.name ?? undefined} clientUserId={(screenPayload?.clientUserId as string) ?? (isTrainer ? selectedClient?.id : undefined)} clientName={(screenPayload?.clientName as string) ?? (isTrainer ? selectedClient?.name : undefined)} saveCheckinV2={saveCheckinV2} updatePainRecurrence={updatePainRecurrence}/>
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
      case 'trainerDashboard':    return <TrainerDashboardScreen     {...common} user={trainerUser}/>;
      case 'trainerClientDetail': return <TrainerClientDetailScreen  {...common} user={trainerUser}/>;
      case 'workoutPlanEditor':   return <WorkoutPlanEditorScreen    {...common} user={trainerUser}/>;
      case 'trainerLibraryExercises': return <TrainerLibraryExercisesScreen {...common} user={trainerUser}/>;
      case 'coachDNA':            return <CoachDNAScreen nav={nav} user={trainerUser}/>;
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
        t={t} user={user} current={screen} setUser={handleSetUser} role={profile?.role}
      />

      {fgNotif && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, maxWidth: 380, width: 'calc(100% - 32px)',
          background: dark ? '#1A2A40' : '#fff',
          border: `1px solid ${BRAND.primary}`,
          borderRadius: 14, padding: '14px 16px',
          boxShadow: '0 8px 32px rgba(0,0,0,.35)',
          display: 'flex', alignItems: 'flex-start', gap: 12,
          animation: 'slideDown .25s ease',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3, color: dark ? '#fff' : '#102236' }}>
              {fgNotif.title}
            </div>
            <div style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,.65)' : '#546a7e', lineHeight: 1.4 }}>
              {fgNotif.body}
            </div>
          </div>
          <button
            onClick={() => setFgNotif(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: dark ? 'rgba(255,255,255,.4)' : '#9aacbc', fontSize: 20, lineHeight: 1, padding: 0, marginTop: -2 }}
          >×</button>
        </div>
      )}
      <style>{`@keyframes slideDown { from { opacity:0; transform:translateX(-50%) translateY(-12px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
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
