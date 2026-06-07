import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { supabase } from '../../supabase';
import { textMute, textPri, surfRaised, borderSubtle, primaryBtn } from '../../theme';
import { Icon } from '../../components/Icon';
import { AvatarImage } from '../../components/Avatar';
import type { NavFn, Profile } from '../../types';
import type { ProfileV2Step, RiskClassification } from '../../types/profile-v2';
import type { WizardData } from './wizard/types';
import { Step01Welcome }            from './wizard/Step01Welcome';
import { Step02BasicData }          from './wizard/Step02BasicData';
import { Step03Objectives }         from './wizard/Step03Objectives';
import { Step04MovementHistory }    from './wizard/Step04MovementHistory';
import { Step05DeclaredHealth }     from './wizard/Step05DeclaredHealth';
import { Step06Comorbidities }      from './wizard/Step06Comorbidities';
import { Step07FunctionalCapacity } from './wizard/Step07FunctionalCapacity';
import { Step08Habits }             from './wizard/Step08Habits';
import { Step09SensitiveFactors }   from './wizard/Step09SensitiveFactors';
import { Step10BodyRhythm }         from './wizard/Step10BodyRhythm';
import { Step11Environment }        from './wizard/Step11Environment';
import { Step12Availability }       from './wizard/Step12Availability';
import { Step13Preferences }        from './wizard/Step13Preferences';
import { Step14Consent }            from './wizard/Step14Consent';
import { Step15RiskClassification } from './wizard/Step15RiskClassification';

const TOTAL_STEPS = 14;

const STEP_SEQUENCE: ProfileV2Step[] = [
  'basic_data', 'objectives', 'movement_history',
  'declared_health', 'comorbidities', 'functional_capacity', 'habits',
  'sensitive_factors', 'body_rhythm', 'environment', 'availability',
  'preferences', 'consent', 'risk_classification', 'completed',
];

const STEP_NUM: Partial<Record<ProfileV2Step, number>> = {
  basic_data: 1, objectives: 2, movement_history: 3,
  declared_health: 4, comorbidities: 5, functional_capacity: 6, habits: 7,
  sensitive_factors: 8, body_rhythm: 9, environment: 10, availability: 11,
  preferences: 12, consent: 13, risk_classification: 14,
};

// ── Wizard sections shown in the unified profile view ──────────────────────────

const WIZARD_SECTIONS: { step: ProfileV2Step; labelKey: string; icon: string; summary: (d: WizardData, tr: TFunction) => string | null }[] = [
  { step: 'basic_data',          labelKey: 'wizard.sections.basic_data',          icon: 'user',
    summary: d => d.basic_data ? `${d.basic_data.name ?? ''} · ${d.basic_data.age ?? '?'}a · ${d.basic_data.height_cm ?? '?'}cm · ${d.basic_data.weight_kg ?? '?'}kg`.replace(/^ · /, '') : null },
  { step: 'objectives',          labelKey: 'wizard.sections.objectives',          icon: 'target',
    summary: d => d.objectives?.primary_goal ?? null },
  { step: 'movement_history',    labelKey: 'wizard.sections.movement_history',    icon: 'history',
    summary: d => d.movement_history?.fitness_level ?? null },
  { step: 'declared_health',     labelKey: 'wizard.sections.declared_health',     icon: 'heart',
    summary: (d, tr) => d.declared_health != null ? (d.declared_health.has_condition ? tr('wizard.summary.reportedConditions') : tr('wizard.summary.noConditions')) : null },
  { step: 'comorbidities',       labelKey: 'wizard.sections.comorbidities',       icon: 'shield',
    summary: (d, tr) => d.comorbidities?.conditions?.length ? tr('wizard.summary.conditions', { count: d.comorbidities.conditions.length }) : null },
  { step: 'functional_capacity', labelKey: 'wizard.sections.functional_capacity', icon: 'activity',
    summary: d => d.functional_capacity?.mobility != null
      ? `${d.functional_capacity.mobility} · ${d.functional_capacity.balance}`
      : null },
  { step: 'habits',              labelKey: 'wizard.sections.habits',              icon: 'sun',
    summary: (d, tr) => d.habits != null
      ? (d.habits.lifestyle_barriers?.length
          ? tr('wizard.summary.barriers', { count: d.habits.lifestyle_barriers.length })
          : tr('wizard.summary.noBarriers'))
      : null },
  { step: 'sensitive_factors',   labelKey: 'wizard.sections.sensitive_factors',   icon: 'lock',
    summary: d => d.sensitive_factors != null ? '' : null },
  { step: 'body_rhythm',         labelKey: 'wizard.sections.body_rhythm',         icon: 'moon',
    summary: (d, tr) => d.body_rhythm != null
      ? (d.body_rhythm.enabled ? tr('wizard.summary.activeCycle') : tr('wizard.summary.notMonitored'))
      : null },
  { step: 'environment',         labelKey: 'wizard.sections.environment',         icon: 'pin',
    summary: (d, tr) => d.environment?.locations?.length
      ? d.environment.locations.slice(0, 2).join(' · ')
      : (d.environment != null ? tr('wizard.summary.filled') : null) },
  { step: 'availability',        labelKey: 'wizard.sections.availability',        icon: 'cal',
    summary: d => d.availability?.days_per_week != null
      ? `${d.availability.days_per_week}x · ${d.availability.session_duration_min} min`
      : null },
  { step: 'preferences',         labelKey: 'wizard.sections.preferences',         icon: 'settings',
    summary: d => d.preferences?.preferred_intensity != null
      ? `${d.preferences.preferred_intensity} · ${d.preferences.focus}`
      : null },
  { step: 'consent',             labelKey: 'wizard.sections.consent',             icon: 'list',
    summary: (d, tr) => d.consent != null ? tr('wizard.summary.consentRecorded') : null },
  { step: 'risk_classification', labelKey: 'wizard.sections.risk_classification', icon: 'shield',
    summary: (d, tr) => d.risk?.level != null ? tr('wizard.summary.level', { level: d.risk.level }) : null },
];

// ── Types ─────────────────────────────────────────────────────────────────────

type ProfileUser = {
  id:         string | null;
  name?:      string;
  email?:     string;
  phone?:     string;
  dob?:       string;
  location?:  string;
  gender?:    string;
  avatar_url?: string | null;
};

interface ProfileWizardScreenProps {
  nav:             NavFn;
  t:               { primary: string; accent: string };
  dark:            boolean;
  saveProfileV2?:  (data: WizardData, step: string) => Promise<{ error: unknown }>;
  fetchProfileV2?: () => Promise<{ data: WizardData | null; error: unknown }>;
  saveUser?:       (data: Partial<Profile> & { email?: string }) => Promise<{ error: unknown }>;
  user?:           ProfileUser;
}

// ── Main component ────────────────────────────────────────────────────────────

type ScreenMode = 'wizard' | 'view';

export function ProfileWizardScreen({ nav, t, dark, saveProfileV2, fetchProfileV2, saveUser, user }: ProfileWizardScreenProps) {
  const { t: tr } = useTranslation();
  const [mode,          setMode]          = React.useState<ScreenMode>('view');
  const [showWelcome,   setShowWelcome]   = React.useState(true);   // arrive screen on every entry
  const [profileExists, setProfileExists] = React.useState(false);
  const [currentStep,   setCurrentStep]   = React.useState<ProfileV2Step>('basic_data');
  const [data,        setData]        = React.useState<WizardData>({});
  const [loading,     setLoading]     = React.useState(true);
  const [generating,  setGenerating]  = React.useState(false);
  const [saveError,   setSaveError]   = React.useState<string | null>(null);
  const [saving,      setSaving]      = React.useState(false);

  // Ref mirrors data state so saves always use the current value,
  // regardless of React batching between onUpdate and onSaveLater calls.
  const dataRef = React.useRef<WizardData>({});

  React.useEffect(() => {
    if (!fetchProfileV2) { setLoading(false); return; }
    fetchProfileV2().then(({ data: existing }) => {
      if (existing && Object.keys(existing).length > 0) {
        const { current_step, completed_at, ...profileData } =
          existing as WizardData & { current_step?: string | null; completed_at?: string | null };
        dataRef.current = profileData;
        setData(profileData);
        setProfileExists(true);

        const resumeStep = current_step ?? null;
        const resumeIdx = resumeStep ? STEP_SEQUENCE.indexOf(resumeStep as ProfileV2Step) : -1;
        if (resumeIdx >= 0 && resumeStep !== 'completed') {
          setCurrentStep(resumeStep as ProfileV2Step);
          setMode('wizard');
          setShowWelcome(false);
        } else {
          setMode('view');
        }
      } else {
        setProfileExists(false);
        setMode('wizard');     // revealed after arrive screen is dismissed
      }
      setLoading(false);
    });
  // Intentional run-once-on-mount: loads the existing wizard draft a single
  // time. `fetchProfileV2` is a prop and may not be referentially stable
  // across parent renders — including it would risk re-fetching and
  // resetting in-progress wizard state on unrelated parent re-renders.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stepIndex = STEP_SEQUENCE.indexOf(currentStep);

  // Ref is updated synchronously so any save triggered in the same
  // event cycle (e.g. handleSaveLater calls onUpdate then onSaveLater)
  // always reads the latest data — not a stale React-batch snapshot.
  const update = (patch: WizardData) => {
    const next = { ...dataRef.current, ...patch };
    dataRef.current = next;
    setData(next);
  };

  // ── Wizard navigation ──────────────────────────────────────────────────────

  const userFacingError = (err: unknown): string => {
    const s = (typeof err === 'string' ? err : (err as { message?: string })?.message ?? '').toLowerCase();
    if (s.includes('jwt') || s.includes('expired') || s.includes('token'))
      return tr('wizard.error.expired');
    if (s.includes('network') || s.includes('fetch') || s.includes('timeout') || s.includes('abort'))
      return tr('wizard.error.network');
    if (s.includes('duplicate') || s.includes('unique'))
      return tr('wizard.error.duplicate');
    if (s.includes('foreign') || s.includes('violates') || s.includes('rls'))
      return tr('wizard.error.expired');
    return tr('wizard.error.generic');
  };

  const isMale = () => dataRef.current.basic_data?.biological_sex === 'male';

  const saveAndGoNext = async () => {
    setSaving(true);
    setSaveError(null);
    const snapshot = dataRef.current;
    if (saveProfileV2) {
      const { error } = await saveProfileV2(snapshot, currentStep);
      if (error) {
        setSaveError(userFacingError(error));
        setSaving(false);
        return;
      }
    }
    setData(snapshot);
    setSaving(false);
    let nextIdx = stepIndex + 1;
    if (STEP_SEQUENCE[nextIdx] === 'body_rhythm' && isMale()) nextIdx++;
    const next = STEP_SEQUENCE[nextIdx] as ProfileV2Step | undefined;
    if (next && next !== 'completed') setCurrentStep(next);
  };

  const goBack = () => {
    if (stepIndex <= 0) { setMode('view'); return; }
    let prevIdx = stepIndex - 1;
    if (STEP_SEQUENCE[prevIdx] === 'body_rhythm' && isMale()) prevIdx--;
    setCurrentStep(STEP_SEQUENCE[Math.max(0, prevIdx)] as ProfileV2Step);
  };

  // saveLater: persist ALL accumulated data up to currentStep, then return to list.
  const saveLater = async () => {
    setSaving(true);
    setSaveError(null);
    const snapshot = dataRef.current;
    if (saveProfileV2) {
      const { error } = await saveProfileV2(snapshot, currentStep);
      if (error) {
        setSaveError(userFacingError(error));
        setSaving(false);
        return;
      }
    }
    setData(snapshot);
    setSaving(false);
    setMode('view');
  };

  // enterEditStep: open wizard at the selected step (no mode bifurcation)
  const enterEditStep = (step: ProfileV2Step) => {
    setCurrentStep(step);
    setMode('wizard');
  };

  // ── Wizard completion ──────────────────────────────────────────────────────

  const handleGenerate = async (risk: RiskClassification) => {
    setGenerating(true);
    setSaveError(null);
    const finalData = { ...dataRef.current, risk };
    update({ risk });

    const saveP = saveProfileV2 ? saveProfileV2(finalData, 'completed') : Promise.resolve({ error: null });

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 25_000);
    const aiP = fetch('/api/generate-amplified', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(finalData),
      signal:  ctrl.signal,
    }).catch(() => null)
      .finally(() => clearTimeout(timeout));

    const [saveResult] = await Promise.all([saveP, aiP]).finally(() => clearTimeout(timeout));

    if (saveResult?.error) {
      setSaveError(userFacingError(saveResult.error));
      setGenerating(false);
      return;
    }

    setGenerating(false);
    setMode('view');
  };

  // ── Shared step props (single common object — no mode bifurcation) ─────────

  const common = {
    dark,
    primary:     t.primary,
    accent:      t.accent,
    data,
    onUpdate:    update,
    onNext:      saveAndGoNext,   // saves current step + advances to next
    onBack:      goBack,
    onSaveLater: saveLater,       // saves all accumulated data + returns to list
    saving,
    stepNum:     STEP_NUM[currentStep] ?? 0,
    totalSteps:  TOTAL_STEPS,
  };

  if (loading) return null;

  // ── ARRIVE screen — shown on every module entry ────────────────────────────

  if (showWelcome) {
    return (
      <Step01Welcome
        dark={dark}
        primary={t.primary}
        profileExists={profileExists}
        onNext={() => setShowWelcome(false)}
      />
    );
  }

  // ── VIEW mode ──────────────────────────────────────────────────────────────

  if (mode === 'view') {
    return (
      <UnifiedProfileView
        user={user}
        dark={dark}
        primary={t.primary}
        data={data}
        onEditStep={enterEditStep}
        onStart={() => nav('checkin')}
      />
    );
  }

  // ── WIZARD mode ────────────────────────────────────────────────────────────

  const statusBanner = saveError ? (
    <div style={{
      margin: '0 20px 12px', padding: '10px 14px', borderRadius: 10,
      background: '#EF5B3C22', border: '1px solid #EF5B3C66',
      fontSize: 13, color: '#EF5B3C', fontFamily: 'inherit',
    }}>
      {saveError}
    </div>
  ) : saving ? (
    <div style={{
      margin: '0 20px 12px', padding: '8px 14px', borderRadius: 10,
      background: 'color-mix(in srgb, var(--signature) 13%, transparent)',
      border: '1px solid color-mix(in srgb, var(--signature) 27%, transparent)',
      fontSize: 12, color: 'var(--signature)', fontFamily: 'inherit',
    }}>
      {tr('wizard.saving')}
    </div>
  ) : null;

  // Always shown in wizard mode — the only explicit exit back to the list
  const wizardBanner = (
    <button onClick={() => setMode('view')} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '12px 20px', width: '100%', border: 'none',
      background: 'color-mix(in srgb, var(--signature) 8%, transparent)',
      color: t.primary, fontFamily: 'inherit', fontSize: 13,
      fontWeight: 700, cursor: 'pointer', textAlign: 'left',
      borderBottom: `1px solid ${borderSubtle(dark)}`,
    }}>
      <Icon name="back" size={16} color={t.primary} stroke={2.2}/>
      {tr('wizard.backToProfile')}
    </button>
  );

  const stepContent = (() => {
    switch (currentStep) {
      case 'basic_data':          return <Step02BasicData           {...common} {...(user ? { user } : {})} {...(saveUser ? { saveUser } : {})}/>;
      case 'objectives':          return <Step03Objectives          {...common}/>;
      case 'movement_history':    return <Step04MovementHistory     {...common}/>;
      case 'declared_health':     return <Step05DeclaredHealth      {...common}/>;
      case 'comorbidities':       return <Step06Comorbidities       {...common}/>;
      case 'functional_capacity': return <Step07FunctionalCapacity  {...common}/>;
      case 'habits':              return <Step08Habits              {...common}/>;
      case 'sensitive_factors':   return <Step09SensitiveFactors    {...common}/>;
      case 'body_rhythm':         return (
        <Step10BodyRhythm {...common} biologicalSex={data.basic_data?.biological_sex}/>
      );
      case 'environment':         return <Step11Environment         {...common}/>;
      case 'availability':        return <Step12Availability        {...common}/>;
      case 'preferences':         return <Step13Preferences         {...common}/>;
      case 'consent':             return <Step14Consent             {...common}/>;
      case 'risk_classification': return (
        <Step15RiskClassification {...common} onGenerate={handleGenerate} generating={generating}/>
      );
      default: return <Step02BasicData {...common} {...(user ? { user } : {})} {...(saveUser ? { saveUser } : {})}/>;
    }
  })();

  return <>{wizardBanner}{statusBanner}{stepContent}</>;
}

// ── Unified profile view (shown when wizard is completed) ─────────────────────

interface UnifiedProfileViewProps {
  user?:      ProfileUser | undefined;
  dark:       boolean;
  primary:    string;
  data:       WizardData;
  onEditStep: (step: ProfileV2Step) => void;
  onStart:    () => void;
}

function UnifiedProfileView({ user, dark, primary, data, onEditStep, onStart }: UnifiedProfileViewProps) {
  const { t: tr } = useTranslation();
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(user?.avatar_url ?? null);
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setUploading(true);
    const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
    if (!error) {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(`${urlData.publicUrl}?t=${Date.now()}`);
    }
    setUploading(false);
  };

  return (
    <div style={{ padding: '20px 22px 100px', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <AvatarImage url={avatarUrl} label="me" w={72} h={72} radius={16} dark={dark}/>
          <button
            onClick={() => !uploading && fileRef.current?.click()}
            style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 26, height: 26, borderRadius: '50%',
              background: primary, color: '#0E1A2B',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--bg)',
              cursor: 'pointer', padding: 0,
            }}
          >
            <Icon name="edit" size={12} color="#0E1A2B" stroke={2.5}/>
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarChange}
            style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}/>
        </div>
        <div>
          <div style={{
            fontSize: 20, fontWeight: 700, color: textPri(dark),
            fontFamily: '"Plus Jakarta Sans",sans-serif', letterSpacing: '-0.01em',
          }}>
            {user?.name || tr('wizard.yourName')}
          </div>
          {user?.email && (
            <div style={{ fontSize: 12.5, color: textMute(dark), marginTop: 2 }}>{user.email}</div>
          )}
        </div>
      </div>

      {/* ── Smart Profile ── */}
      <div>
        <div style={{
          fontSize: 10.5, fontWeight: 700, letterSpacing: '.12em',
          textTransform: 'uppercase', color: textMute(dark), marginBottom: 12,
        }}>
          {tr('wizard.smartProfile')}
        </div>

        <div style={{
          background: surfRaised(dark), borderRadius: 16,
          border: `1px solid ${borderSubtle(dark)}`, overflow: 'hidden',
        }}>
          {WIZARD_SECTIONS
            .filter(s => !(s.step === 'body_rhythm' && data.basic_data?.biological_sex === 'male'))
            .map((section, i, arr) => {
            const summary = section.summary(data, tr);
            const isLast  = i === arr.length - 1;
            const filled  = summary !== null;
            return (
              <button key={section.step} onClick={() => onEditStep(section.step)} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                width: '100%', padding: '13px 16px',
                background: 'transparent', border: 'none', cursor: 'pointer',
                borderBottom: isLast ? 'none' : `1px solid ${borderSubtle(dark)}`,
                textAlign: 'left',
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  background: filled ? `${primary}22` : surfRaised(dark),
                  border: `1px solid ${filled ? primary + '55' : borderSubtle(dark)}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={section.icon} size={16} color={filled ? primary : textMute(dark)} stroke={2}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: textPri(dark) }}>
                    {tr(section.labelKey)}
                  </div>
                  {summary && (
                    <div style={{ fontSize: 11.5, color: textMute(dark), marginTop: 1, textTransform: 'capitalize' }}>
                      {summary}
                    </div>
                  )}
                </div>
                <Icon name="forward" size={14} color={textMute(dark)} stroke={2}/>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CTA ── */}
      <button onClick={onStart} style={primaryBtn(primary)}>
        {tr('wizard.goToCheckin')}
      </button>
    </div>
  );
}
