import React from 'react';
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
  'welcome', 'basic_data', 'objectives', 'movement_history',
  'declared_health', 'comorbidities', 'functional_capacity', 'habits',
  'sensitive_factors', 'body_rhythm', 'environment', 'availability',
  'preferences', 'consent', 'risk_classification', 'completed',
];

const STEP_NUM: Partial<Record<ProfileV2Step, number>> = {
  welcome: 0, basic_data: 1, objectives: 2, movement_history: 3,
  declared_health: 4, comorbidities: 5, functional_capacity: 6, habits: 7,
  sensitive_factors: 8, body_rhythm: 9, environment: 10, availability: 11,
  preferences: 12, consent: 13, risk_classification: 14,
};

// ── Wizard sections shown in the unified profile view ──────────────────────────

const WIZARD_SECTIONS: { step: ProfileV2Step; label: string; icon: string; summary: (d: WizardData) => string | null }[] = [
  { step: 'basic_data',          label: 'Dados de treino',          icon: 'dumbbell',
    summary: d => d.basic_data ? `${d.basic_data.age ?? '?'}a · ${d.basic_data.height_cm ?? '?'}cm · ${d.basic_data.weight_kg ?? '?'}kg` : null },
  { step: 'objectives',          label: 'Objetivos',                icon: 'target',
    summary: d => d.objectives?.primary_goal ?? null },
  { step: 'movement_history',    label: 'Histórico de movimento',   icon: 'history',
    summary: d => d.movement_history?.fitness_level ?? null },
  { step: 'declared_health',     label: 'Saúde declarada',          icon: 'heart',
    summary: d => d.declared_health != null ? (d.declared_health.has_condition ? 'Condições relatadas' : 'Sem condições') : null },
  { step: 'comorbidities',       label: 'Comorbidades',             icon: 'shield',
    summary: d => d.comorbidities?.conditions?.length ? `${d.comorbidities.conditions.length} condição(ões)` : null },
  { step: 'functional_capacity', label: 'Capacidade funcional',     icon: 'activity',
    summary: _ => null },
  { step: 'habits',              label: 'Hábitos',                  icon: 'sun',
    summary: _ => null },
  { step: 'sensitive_factors',   label: 'Fatores sensíveis',        icon: 'lock',
    summary: _ => null },
  { step: 'body_rhythm',         label: 'Ritmo do corpo',           icon: 'moon',
    summary: _ => null },
  { step: 'environment',         label: 'Ambiente',                 icon: 'pin',
    summary: _ => null },
  { step: 'availability',        label: 'Disponibilidade',          icon: 'cal',
    summary: _ => null },
  { step: 'preferences',         label: 'Preferências',             icon: 'settings',
    summary: _ => null },
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

type ScreenMode = 'wizard' | 'view' | 'edit_step';

export function ProfileWizardScreen({ nav, t, dark, saveProfileV2, fetchProfileV2, saveUser, user }: ProfileWizardScreenProps) {
  const [mode,        setMode]        = React.useState<ScreenMode>('wizard');
  const [currentStep, setCurrentStep] = React.useState<ProfileV2Step>('welcome');
  const [data,        setData]        = React.useState<WizardData>({});
  const [generating,  setGenerating]  = React.useState(false);
  const [saveError,   setSaveError]   = React.useState<string | null>(null);
  const [saving,      setSaving]      = React.useState(false);

  React.useEffect(() => {
    if (!fetchProfileV2) return;
    fetchProfileV2().then(({ data: existing }) => {
      if (!existing || Object.keys(existing).length === 0) return;
      const { current_step, completed_at, ...profileData } =
        existing as WizardData & { current_step?: string; completed_at?: string | null };
      setData(profileData);
      if (completed_at) {
        setMode('view');
      } else if (current_step && STEP_SEQUENCE.includes(current_step as ProfileV2Step)) {
        setCurrentStep(current_step as ProfileV2Step);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stepIndex = STEP_SEQUENCE.indexOf(currentStep);
  const update    = (patch: WizardData) => setData(prev => ({ ...prev, ...patch }));

  // ── Wizard navigation ──────────────────────────────────────────────────────

  const goNext = () => {
    const next = STEP_SEQUENCE[stepIndex + 1] as ProfileV2Step | undefined;
    if (!next || next === 'completed') return;
    setCurrentStep(next);
  };

  const goBack = () => {
    if (stepIndex <= 0) { nav('welcome'); return; }
    setCurrentStep(STEP_SEQUENCE[stepIndex - 1] as ProfileV2Step);
  };

  const saveLater = async () => {
    setSaving(true);
    setSaveError(null);
    if (saveProfileV2) {
      const { error } = await saveProfileV2(data, currentStep);
      if (error) {
        setSaveError('Erro ao salvar. Verifique sua conexão.');
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    nav('checkin');
  };

  // ── Edit-step navigation (from view mode) ──────────────────────────────────

  const enterEditStep = (step: ProfileV2Step) => {
    setCurrentStep(step);
    setMode('edit_step');
  };

  const saveStepAndReturn = async () => {
    if (saveProfileV2) await saveProfileV2(data, currentStep);
    setMode('view');
  };

  const cancelStepEdit = () => setMode('view');

  // ── Wizard completion ──────────────────────────────────────────────────────

  const handleGenerate = async (risk: RiskClassification) => {
    setGenerating(true);
    const finalData = { ...data, risk };
    update({ risk });

    const saveP = saveProfileV2 ? saveProfileV2(finalData, 'completed') : Promise.resolve();
    const aiP   = fetch('/api/generate-amplified', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(finalData),
    }).catch(() => null);

    await Promise.all([saveP, aiP]);
    setGenerating(false);
    setMode('view');
  };

  // ── Shared step props ──────────────────────────────────────────────────────

  const wizardCommon = {
    dark,
    primary:     t.primary,
    accent:      t.accent,
    data,
    onUpdate:    update,
    onNext:      goNext,
    onBack:      goBack,
    onSaveLater: saveLater,
    stepNum:     STEP_NUM[currentStep] ?? 0,
    totalSteps:  TOTAL_STEPS,
  };

  const editCommon = {
    ...wizardCommon,
    onNext:      saveStepAndReturn,
    onBack:      cancelStepEdit,
    onSaveLater: saveStepAndReturn,
  };

  const common = mode === 'edit_step' ? editCommon : wizardCommon;

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

  // ── WIZARD / EDIT_STEP mode ────────────────────────────────────────────────

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
      background: '#2DD4E022', border: '1px solid #2DD4E044',
      fontSize: 12, color: '#2DD4E0', fontFamily: 'inherit',
    }}>
      Salvando…
    </div>
  ) : null;

  const editBanner = mode === 'edit_step' ? (
    <button onClick={cancelStepEdit} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '12px 20px', width: '100%', border: 'none',
      background: dark ? 'rgba(45,212,224,.08)' : '#f0fafb',
      color: t.primary, fontFamily: 'inherit', fontSize: 13,
      fontWeight: 700, cursor: 'pointer', textAlign: 'left',
      borderBottom: `1px solid ${borderSubtle(dark)}`,
    }}>
      <Icon name="back" size={16} color={t.primary} stroke={2.2}/>
      Voltar ao Perfil
    </button>
  ) : null;

  const stepContent = (() => {
    switch (currentStep) {
      case 'welcome':             return <Step01Welcome            {...common}/>;
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
      default: return <Step01Welcome {...common}/>;
    }
  })();

  return <>{editBanner}{statusBanner}{stepContent}</>;
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
              border: `2px solid ${dark ? '#0E1A2B' : '#fff'}`,
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
            {user?.name || 'Seu nome'}
          </div>
          {user?.email && (
            <div style={{ fontSize: 12.5, color: textMute(dark), marginTop: 2 }}>{user.email}</div>
          )}
        </div>
      </div>

      {/* ── Perfil inteligente ── */}
      <div>
        <div style={{
          fontSize: 10.5, fontWeight: 700, letterSpacing: '.12em',
          textTransform: 'uppercase', color: textMute(dark), marginBottom: 12,
        }}>
          Perfil inteligente
        </div>

        <div style={{
          background: surfRaised(dark), borderRadius: 16,
          border: `1px solid ${borderSubtle(dark)}`, overflow: 'hidden',
        }}>
          {WIZARD_SECTIONS.map((section, i) => {
            const summary = section.summary(data);
            const isLast  = i === WIZARD_SECTIONS.length - 1;
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
                    {section.label}
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
        Ir para check-in
      </button>
    </div>
  );
}
