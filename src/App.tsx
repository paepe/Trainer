import React from 'react';
import { supabase } from './supabase';
import type { Database } from './types/supabase';
import { BRAND, TRAINER_BRAND, setVizProfile } from './theme';
import { useAuth } from './hooks/useAuth';
import { useProfileData }  from './hooks/useProfileData';
import { useCheckinData }  from './hooks/useCheckinData';
import { useWorkoutData }  from './hooks/useWorkoutData';
import { usePushNotifications } from './hooks/usePushNotifications';
import { useTrainerLink } from './hooks/useTrainerLink';
import { WelcomeScreen, LoginScreen, RegisterScreen, ResetPasswordScreen } from './screens/auth';
import { AppLayout } from './layouts';
import { ChunkErrorBoundary } from './components/ChunkErrorBoundary';
import { Spinner } from './ui';
import { NotificationProvider, useNotification, ThemeProvider } from './contexts';
import type { Profile, CheckIn, Exercise, UserRole, ClientProfile } from './types';
import type { AppPreferences } from './types/preferences';
import { TRAINER_ROLES } from './types/auth';
import i18n, { detectDeviceLanguage } from './i18n';
import { useTranslation } from 'react-i18next';

const ProfileWizardScreen        = React.lazy(() => import('./screens/auth/ProfileWizardScreen').then(m => ({ default: m.ProfileWizardScreen })));
const CheckInProntidaoScreen     = React.lazy(() => import('./screens/checkin/CheckInProntidaoScreen').then(m => ({ default: m.CheckInProntidaoScreen })));
const StartWorkoutScreen         = React.lazy(() => import('./screens/client/StartWorkoutScreen').then(m => ({ default: m.StartWorkoutScreen })));
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
const TrainerAlertsScreen        = React.lazy(() => import('./screens/trainer/TrainerAlertsScreen').then(m => ({ default: m.TrainerAlertsScreen })));
const ClientInboxScreen          = React.lazy(() => import('./screens/client/ClientInboxScreen').then(m => ({ default: m.ClientInboxScreen })));
const AcceptInvitationScreen     = React.lazy(() => import('./screens/auth/AcceptInvitationScreen').then(m => ({ default: m.AcceptInvitationScreen })));

type NotificationLogRow = Database['public']['Tables']['notification_log']['Row'];

const PUBLIC_SCREENS = ['welcome', 'login', 'register', 'acceptInvitation', 'resetPassword'];

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
  const {
    session, profile, loading, passwordRecovery,
    signIn, signUp, signOut, updateProfile,
    requestPasswordReset, updatePassword, clearPasswordRecovery, resendConfirmation,
  } = useAuth();
  const { t: tr } = useTranslation();  // i18n translate (distinct from theme `t`)

  const [prefs, setPrefs] = React.useState<AppPreferences>({
    notifications: true, goals: true, alerts: true,
    analysis: true, behaviour: true, sounds: false,
    cycle: false, aiPersonalization: true, whiteLabel: false,
    darkMode: true,
    defaultLocation: 'gym', defaultDurationMin: 45, preferredIntensity: 'moderate',
    planExpiryDays: 10, workoutReadyExpiryMin: 30,
    lightPalette: 'arctic',
    aiFocusStrength: 5, aiFocusEndurance: 5, aiFocusMobility: 5,
    sessionHistoryLimit: 50, trainerDashboardLimit: 10,
    language: detectDeviceLanguage(),
  });

  // Keep the active i18n language in sync with the saved/selected preference.
  React.useEffect(() => { void i18n.changeLanguage(prefs.language); }, [prefs.language]);

  // On mount: mark any active workout session older than 24h as abandoned.
  // Prevents permanently orphaned sessions from force-quits, crashes, or dead batteries.
  React.useEffect(() => {
    if (!profile?.id) return;
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    void supabase.from('workout_sessions')
      .update({ status: 'abandoned' })
      .eq('user_id', profile.id)
      .eq('status', 'active')
      .lt('started_at', cutoff)
      .then(({ error }) => { if (error) console.error('[App] stale session cleanup:', error); });
  }, [profile?.id]);

  // Seed checkin defaults from live prefs (so changes apply immediately, not just on reload)
  React.useEffect(() => {
    setCheckin(prev => ({
      ...prev,
      location: prefs.defaultLocation ?? prev.location,
      minutes:  prefs.defaultDurationMin ?? prev.minutes,
    }));
  }, [prefs.defaultLocation, prefs.defaultDurationMin]);

  const {
    saveCycleConfig, fetchCycleConfig,
    savePreferences, fetchPreferences,
    saveProfileV2: saveProfileV2Raw, fetchProfileV2,
  } = useProfileData(session?.user?.id);

  const syncCyclePref = (bodyRhythm?: Record<string, unknown> | null) => {
    if (bodyRhythm?.enabled === true) {
      setPrefs(prev => (prev.cycle ? prev : { ...prev, cycle: true }));
      void savePreferences({ cycle_tracking: true } as Parameters<typeof savePreferences>[0]);
    }
  };

  const saveProfileV2 = React.useCallback(async (
    data: Parameters<typeof saveProfileV2Raw>[0],
    step: string,
  ) => {
    const result = await saveProfileV2Raw(data, step);
    syncCyclePref((data as Record<string, unknown> | null)?.body_rhythm as Record<string, unknown> | null);
    return result;
  }, [saveProfileV2Raw, savePreferences]);

  const { saveCheckinV2, updatePainRecurrence } = useCheckinData(session?.user?.id, prefs.alerts);

  const {
    startWorkoutSession, logWorkoutSet, updateSessionExerciseStatus,
    reportWorkoutPain, completeWorkoutSession, savePostWorkoutFeedback,
  } = useWorkoutData(session?.user?.id);

  const isTrainer = profile?.role != null && (TRAINER_ROLES as readonly string[]).includes(profile.role);
  // Trainer is always dark per coach_dna_system_design.md §8; only the client
  // respects the persisted dark_mode preference.
  const dark = isTrainer ? true : prefs.darkMode;
  // Single profile switch: drives `t.primary` (all screens) and the static
  // data-viz signature (Performance Dashboard) from one place.
  setVizProfile(isTrainer);

  // Active theme palette (theme/themes.css) — one attribute drives all CSS vars.
  // Trainer always-dark (§8); client toggles client-dark|client-light (Arctic).
  React.useEffect(() => {
    const clientLight = prefs.lightPalette === 'sand' ? 'client-light-sand' : 'client-light';
    document.documentElement.dataset.theme =
      isTrainer ? 'trainer-dark' : (dark ? 'client-dark' : clientLight);
  }, [isTrainer, dark, prefs.lightPalette]);
  const t = {
    ...(isTrainer ? TRAINER_BRAND : BRAND),
    dark,
    role: (profile?.role ?? 'client') as UserRole | 'client',
  };

  const [checkin, setCheckin] = React.useState<CheckIn>({
    energy: 7, soreness: ['Lower back'], minutes: 30, goal: 'Endurance',
    location: 'gym', sleep_quality: 'good', equipment: [],
  });
  const [screen, setScreen] = React.useState('welcome');
  const [prefSaveError, setPrefSaveError] = React.useState<string | null>(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const { trainerId: linkedTrainerIdResolved } = useTrainerLink(!isTrainer ? (profile?.id ?? null) : null);
  // Preserve legacy string shape: null while loading → empty string when no trainer
  const linkedTrainerId = isTrainer ? null : (linkedTrainerIdResolved ?? '');
  const [pendingAlerts, setPendingAlerts] = React.useState(0);
  const [pendingInbox,  setPendingInbox]  = React.useState(0);
  const [selectedClient, setSelectedClient] = React.useState<ClientProfile | null>(null);
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
        const day = (typeof br.cycle_current_day === 'number' ? br.cycle_current_day : 14);
        setCycleConfig({
          length: br.cycle_duration_days as number,
          periodLength: 5,
          lastStartOffset: Math.max(0, day - 1),
        });
        setPrefsFromApi(prefsRes.data, true);
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
        goals:             (data.goals              as boolean | undefined) ?? true,     // Reserved — future goal-tracking consent
        alerts:            (data.alerts             as boolean | undefined) ?? true,
        analysis:          (data.analysis           as boolean | undefined) ?? true,     // Reserved — future analytics consent
        behaviour:         (data.behaviour          as boolean | undefined) ?? true,     // Reserved — future behavioral tracking consent
        sounds:            (data.sounds             as boolean | undefined) ?? false,
        cycle:             (data.cycle_tracking     as boolean | undefined) ?? cyDefault,
        aiPersonalization: (data.ai_personalization as boolean | undefined) ?? true,
        whiteLabel:        (data.white_label        as boolean | undefined) ?? false,
        darkMode:          (data.dark_mode          as boolean | undefined) ?? true,
        defaultLocation:       (data.default_location        as AppPreferences['defaultLocation']       | undefined) ?? 'gym',
        defaultDurationMin:    (data.default_duration_min     as AppPreferences['defaultDurationMin']    | undefined) ?? 45,
        preferredIntensity:    (data.preferred_intensity      as AppPreferences['preferredIntensity']    | undefined) ?? 'moderate',
        planExpiryDays:        (data.plan_expiry_days         as AppPreferences['planExpiryDays']        | undefined) ?? 10,
        workoutReadyExpiryMin: (data.workout_ready_expiry_min as AppPreferences['workoutReadyExpiryMin'] | undefined) ?? 30,
        lightPalette:          (data.light_palette            as AppPreferences['lightPalette']          | undefined) ?? 'arctic',
        aiFocusStrength:       (data.ai_focus_strength        as number | undefined) ?? 5,
        aiFocusEndurance:      (data.ai_focus_endurance       as number | undefined) ?? 5,
        aiFocusMobility:       (data.ai_focus_mobility        as number | undefined) ?? 5,
        sessionHistoryLimit:   (data.session_history_limit    as AppPreferences['sessionHistoryLimit']   | undefined) ?? 50,
        trainerDashboardLimit: (data.trainer_dashboard_limit  as AppPreferences['trainerDashboardLimit'] | undefined) ?? 10,
        language:              (data.language                 as AppPreferences['language']              | undefined) ?? detectDeviceLanguage(),
      });
      // Seed the check-in defaults from saved training preferences (pre-fill)
      const loc = (data.default_location     as CheckIn['location'] | undefined) ?? 'gym';
      const dur = (data.default_duration_min as number             | undefined) ?? 45;
      setCheckin(prev => ({ ...prev, location: loc, minutes: dur }));
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

  // trainer link resolved via useTrainerLink hook above

  // Trainer: subscribe to pending alert count via Realtime
  React.useEffect(() => {
    if (!isTrainer || !profile?.id) return;

    // Initial count of unresponded workout_ready notifications
    supabase
      .from('notification_log')
      .select('id', { count: 'exact', head: true })
      .eq('to_user_id', profile.id)
      .eq('type', 'workout_ready')
      .is('response', null)
      .then(({ count }) => setPendingAlerts(count ?? 0));

    // Realtime: increment on new insert, re-count on update (response set)
    const ch = supabase
      .channel(`alerts_badge:${profile.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notification_log', filter: `to_user_id=eq.${profile.id}` },
        (p) => { if ((p.new as NotificationLogRow).type === 'workout_ready') setPendingAlerts(n => n + 1); }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notification_log', filter: `to_user_id=eq.${profile.id}` },
        (p) => { if ((p.new as NotificationLogRow).response != null) setPendingAlerts(n => Math.max(0, n - 1)); }
      )
      .subscribe();

    return () => { void supabase.removeChannel(ch); };
  }, [isTrainer, profile?.id]);

  // Client: badge count for unread inbox messages (any INSERT not yet read)
  React.useEffect(() => {
    if (isTrainer || !profile?.id) return;

    supabase
      .from('notification_log')
      .select('id', { count: 'exact', head: true })
      .eq('to_user_id', profile.id)
      .is('read_at', null)
      .then(({ count }) => setPendingInbox(count ?? 0));

    const ch = supabase
      .channel(`inbox_badge:${profile.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notification_log', filter: `to_user_id=eq.${profile.id}` },
        () => setPendingInbox(n => n + 1)
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notification_log', filter: `to_user_id=eq.${profile.id}` },
        (p) => { if ((p.new as NotificationLogRow).read_at != null) setPendingInbox(n => Math.max(0, n - 1)); }
      )
      .subscribe();

    return () => { void supabase.removeChannel(ch); };
  }, [isTrainer, profile?.id]);

  const [screenPayload,  setScreenPayload]  = React.useState<Record<string, unknown> | null>(null);
  const [profileNavKey,  setProfileNavKey]  = React.useState(0);
  const nav = (target: string, payload?: Record<string, unknown>) => {
    if (target === 'menu') { setMenuOpen(true); return; }
    setMenuOpen(false);
    setScreenPayload(payload ?? null);
    if (target === 'profile') setProfileNavKey(k => k + 1);
    setScreen(target);
  };

  // Password recovery deep link → force the reset-password screen until the
  // user sets a new password (Supabase already issues a session at this point).
  React.useEffect(() => {
    if (passwordRecovery && screen !== 'resetPassword') setScreen('resetPassword');
  }, [passwordRecovery, screen]);

  // Role-based navigation after login (only when both session and profile are loaded)
  React.useEffect(() => {
    if (!session || !profile || passwordRecovery) return;
    if (!['welcome', 'login', 'register'].includes(screen)) return;
    let cancelled = false;
    // Resolve any pending invitation server-side (by the authenticated user's
    // own e-mail) instead of relying on sessionStorage — that mechanism loses
    // its reference whenever the flow crosses a tab/window boundary, e.g. a
    // password-recovery link opened from the e-mail client in a new tab.
    // See policies/references/post-invite-onboarding-qa-20260608.md (Fase 0).
    supabase.rpc('get_pending_invitation_for_user').then(({ data }) => {
      if (cancelled) return;
      const row = (data as { token: string }[] | null)?.[0];
      if (row?.token) {
        setScreenPayload({ token: row.token });
        setScreen('acceptInvitation');
        return;
      }
      if (!['welcome', 'login'].includes(screen)) return;
      if (isTrainer) { setScreen('trainerDashboard'); return; }
      // For clients: check if profile wizard was already completed
      fetchProfileV2().then(({ data }) => {
        if (cancelled) return;
        const completed = data && (data as Record<string, unknown>).completed_at;
        setScreen(completed ? 'checkin' : 'profile');
      });
    });
    return () => { cancelled = true; };
  }, [session, profile, isTrainer, screen, fetchProfileV2]);

  // Deep link: /invite/:token → AcceptInvitationScreen (web path; native opens via universal/app links to the same URL)
  React.useEffect(() => {
    const m = window.location.pathname.match(/^\/invite\/([^/]+)/);
    if (m) {
      window.history.replaceState(null, '', '/');
      nav('acceptInvitation', { token: m[1] });
    }
  }, []);

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
      dark_mode:         newPrefs.darkMode,
      default_location:         newPrefs.defaultLocation,
      default_duration_min:     newPrefs.defaultDurationMin,
      preferred_intensity:      newPrefs.preferredIntensity,
      plan_expiry_days:         newPrefs.planExpiryDays,
      workout_ready_expiry_min: newPrefs.workoutReadyExpiryMin,
      light_palette:            newPrefs.lightPalette,
      ai_focus_strength:        newPrefs.aiFocusStrength,
      ai_focus_endurance:       newPrefs.aiFocusEndurance,
      ai_focus_mobility:        newPrefs.aiFocusMobility,
      session_history_limit:    newPrefs.sessionHistoryLimit,
      trainer_dashboard_limit:  newPrefs.trainerDashboardLimit,
      language:                 newPrefs.language,
      white_label:              newPrefs.whiteLabel,
    }).then(({ error }) => {
      if (error) setPrefSaveError(tr('settings.saveFailed'));
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

  // App background reads the active theme palette (theme/themes.css). The
  // data-theme attribute (set above) already encodes role + dark per §8.
  const surfaceBg = 'var(--bg)';
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
      syncCyclePref({ enabled: true });
    }

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
    requestPasswordReset, updatePassword, clearPasswordRecovery,
    selectedClient,
    selectClient,
    linkedTrainerId: linkedTrainerId ?? '',
    prefs,
  };

  const showTabs = (isTrainer
    ? ['workout','workoutMode','stats','history',
       'settings','checkin','cycle','studio',
       'trainerDashboard','trainerClientDetail','workoutPlanEditor','trainerLibraryExercises',
       'workoutSummary','coachDNA','alerts']
    : ['profile','workout','workoutMode','stats','history',
       'settings','checkin','cycle','studio',
       'workoutSummary','inbox']
  ).includes(screen);

  const tabs: [string, string, string][] = isTrainer
    ? [
        ['trainerDashboard', 'user',    tr('nav.clients')],
        ['checkin',          'sparkle', tr('nav.checkin')],
        ['alerts',           'bell',    tr('nav.inbox')],
        ['history',          'history', tr('nav.history')],
        ['menu',             'menu',    tr('nav.menu')],
      ]
    : [
        ['checkin',  'sparkle', tr('nav.checkin')],
        ['workout',  'play',    tr('nav.workout')],
        ['stats',    'chart',   tr('nav.progress')],
        ['inbox',    'bell',    tr('nav.inbox')],
        ['menu',     'menu',    tr('nav.menu')],
      ];

  if (loading) return <LoadingScreen primary={t.primary} />;

  const screenContent = (() => {
    const noClient = isTrainer && !selectedClient;
    const noClientBanner = noClient ? (
      <div style={{
        margin: '12px 22px', padding: '16px 18px', borderRadius: 14,
        background: 'var(--surface-3)',
        border: '1px solid var(--border)',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: 8.5, fontWeight: 700, letterSpacing: '.1em',
          textTransform: 'uppercase', color: '#F5A623', marginBottom: 8,
        }}>
          {tr('app.noClientSelected')}
        </div>
        <p style={{
          margin: '0 0 14px', fontSize: 12.5, color: 'var(--text-sec)',
          lineHeight: 1.5,
        }}>
          {tr('app.selectClientBanner')}
        </p>
        <button onClick={() => { setScreen('trainerDashboard'); setSelectedClient(null); }} style={{
          padding: '9px 22px', borderRadius: 14, border: 'none',
          background: t.primary, color: '#0E1A2B',
          fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
        }}>
          {tr('app.goToMyClients')}
        </button>
      </div>
    ) : null;

    switch (screen) {
      case 'welcome':          return <WelcomeScreen           {...common}/>;
      case 'login':            return <LoginScreen             {...common}/>;
      case 'register':         return <RegisterScreen          {...common} lockedEmail={screenPayload?.lockedEmail as string | undefined} inviteToken={screenPayload?.inviteToken as string | undefined}/>;
      case 'resetPassword':    return <ResetPasswordScreen     nav={nav} t={t} dark={dark} updatePassword={updatePassword} onDone={() => { clearPasswordRecovery(); setScreen('login'); }}/>;
      case 'acceptInvitation': return <AcceptInvitationScreen  nav={nav} t={t} dark={dark} user={profile && session ? { id: profile.id, name: profile.name, email: session.user.email ?? '' } : null} token={(screenPayload?.token as string) ?? ''} signIn={signIn} signOut={signOut} resendConfirmation={resendConfirmation}/>;
      case 'profile':          return <ProfileWizardScreen     key={profileNavKey} nav={nav} t={t} dark={dark} saveProfileV2={saveProfileV2} fetchProfileV2={fetchProfileV2} saveUser={handleSetUser} user={user}/>;
      case 'checkin':          return (
        <>
          {(noClient && !screenPayload?.clientUserId) && noClientBanner}
          <CheckInProntidaoScreen  nav={nav} t={t} dark={dark} user={user} userName={profile?.name ?? undefined} biologicalSex={profile?.gender ?? undefined} clientUserId={(screenPayload?.clientUserId as string) ?? (isTrainer ? selectedClient?.id : undefined)} clientName={(screenPayload?.clientName as string) ?? (isTrainer ? selectedClient?.name : undefined)} linkedTrainerId={linkedTrainerId ?? ''} workoutReadyExpiryMin={prefs.workoutReadyExpiryMin} saveCheckinV2={saveCheckinV2}/>
        </>
      );
      case 'workout':            return <StartWorkoutScreen      {...common}/>;
      case 'workoutMode':        return <WorkoutModeScreen
          nav={nav} t={t} dark={dark} user={user}
          planId={(screenPayload?.planId as string | null) ?? null}
          exercises={(screenPayload?.exercises as Exercise[] | null) ?? null}
          plannedDurationMin={(screenPayload?.plannedDurationMin as number) ?? undefined}
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
          startedAt={(screenPayload?.startedAt as string) ?? undefined}
          forClientName={(screenPayload?.forClientName as string) ?? undefined}
          forClientId={(screenPayload?.forClientId as string) ?? undefined}
          returnTo={(screenPayload?.returnTo as string) ?? undefined}
          savePostWorkoutFeedback={savePostWorkoutFeedback}
        />;
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
      case 'settings':           return <SettingsScreen          {...common} prefs={prefs} setPrefs={(p) => handleSetPrefs({ ...prefs, ...p })} isTrainer={isTrainer} hasTrainer={!!linkedTrainerId} saveError={prefSaveError} clearSaveError={() => setPrefSaveError(null)} isMale={user.gender === 'male'}/>;
      case 'trainerDashboard':    return <TrainerDashboardScreen     nav={nav} user={trainerUser} selectClient={selectClient}/>;
      case 'trainerClientDetail': return <TrainerClientDetailScreen  nav={nav} selectedClient={selectedClient} planExpiryDays={prefs.planExpiryDays} dashboardLimit={prefs.trainerDashboardLimit}/>;
      case 'workoutPlanEditor':   return <WorkoutPlanEditorScreen    nav={nav} user={trainerUser} selectedClient={selectedClient}/>;
      case 'trainerLibraryExercises': return <TrainerLibraryExercisesScreen nav={nav} user={trainerUser}/>;
      case 'coachDNA':            return <CoachDNAScreen nav={nav} user={trainerUser}/>;
      case 'alerts':              return <TrainerAlertsScreen nav={nav} user={trainerUser}/>;
      case 'inbox':               return <ClientInboxScreen   nav={nav} user={user}/> ;
      default:                   return <WelcomeScreen           {...common}/>;
    }
  })();

  // Trainer tabs/menu items that require a selected client to be usable.
  // Keys match both the bottom-tab key and the screen/route key used in SideMenu.
  const TRAINER_CLIENT_REQUIRED = ['checkin', 'history', 'stats'];

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
    tabBadges: isTrainer
      ? (pendingAlerts > 0 ? { alerts: pendingAlerts } : {})
      : (pendingInbox  > 0 ? { inbox:  pendingInbox  } : {}),
    disabledNavKeys: (isTrainer && !selectedClient) ? TRAINER_CLIENT_REQUIRED : [],
  };

  return (
    <ThemeProvider t={t} dark={dark} isTrainer={isTrainer}>
      <NotificationProvider t={t}>
        <PushListener push={push} />
        <AppLayout role={isTrainer ? "trainer" : "client"} {...layoutProps}>
          <ChunkErrorBoundary primary={t.primary}>
            <React.Suspense fallback={<LoadingScreen primary={t.primary} />}>
              {screenContent}
            </React.Suspense>
          </ChunkErrorBoundary>
        </AppLayout>
      </NotificationProvider>
    </ThemeProvider>
  );
}

function PushListener({ push }: { push: ReturnType<typeof usePushNotifications> }) {
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

function LoadingScreen({ primary }: { primary: string }) {
  return (
    <div style={{
      height: '100dvh', width: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <Spinner color={primary} trackColor="var(--border)" size={36} thickness={3} />
    </div>
  );
}
