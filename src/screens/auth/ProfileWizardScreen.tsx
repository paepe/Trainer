import React from 'react';
import { textPri, textSec, textMute, primaryBtn } from '../../theme';
import { Icon } from '../../components/Icon';
import type { NavFn } from '../../types';
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

interface ProfileWizardScreenProps {
  nav:            NavFn;
  t:              { primary: string; accent: string };
  dark:           boolean;
  saveProfileV2?: (data: WizardData, step: string) => Promise<{ error: unknown }>;
}

export function ProfileWizardScreen({ nav, t, dark, saveProfileV2 }: ProfileWizardScreenProps) {
  const [currentStep, setCurrentStep] = React.useState<ProfileV2Step>('welcome');
  const [data, setData]               = React.useState<WizardData>({});
  const [generating, setGenerating]   = React.useState(false);
  const [done, setDone]               = React.useState(false);

  const stepIndex = STEP_SEQUENCE.indexOf(currentStep);

  const update = (patch: WizardData) => setData(prev => ({ ...prev, ...patch }));

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
    if (saveProfileV2) {
      await saveProfileV2(data, currentStep);
    }
    nav('profile');
  };

  const handleGenerate = async (risk: RiskClassification) => {
    setGenerating(true);
    const finalData = { ...data, risk };
    update({ risk });

    // Fire AI enrichment + DB save in parallel; don't block completion on AI
    const saveP = saveProfileV2 ? saveProfileV2(finalData, 'completed') : Promise.resolve();
    const aiP   = fetch('/api/generate-amplified', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(finalData),
    }).catch(() => null);

    await Promise.all([saveP, aiP]);
    setGenerating(false);
    setDone(true);
  };

  const common = {
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

  if (done) return <CompletionScreen dark={dark} primary={t.primary} nav={nav}/>;

  switch (currentStep) {
    case 'welcome':             return <Step01Welcome            {...common}/>;
    case 'basic_data':          return <Step02BasicData           {...common}/>;
    case 'objectives':          return <Step03Objectives          {...common}/>;
    case 'movement_history':    return <Step04MovementHistory     {...common}/>;
    case 'declared_health':     return <Step05DeclaredHealth      {...common}/>;
    case 'comorbidities':       return <Step06Comorbidities       {...common}/>;
    case 'functional_capacity': return <Step07FunctionalCapacity  {...common}/>;
    case 'habits':              return <Step08Habits              {...common}/>;
    case 'sensitive_factors':   return <Step09SensitiveFactors    {...common}/>;
    case 'body_rhythm':         return (
      <Step10BodyRhythm
        {...common}
        biologicalSex={data.basic_data?.biological_sex}
      />
    );
    case 'environment':         return <Step11Environment         {...common}/>;
    case 'availability':        return <Step12Availability        {...common}/>;
    case 'preferences':         return <Step13Preferences         {...common}/>;
    case 'consent':             return <Step14Consent             {...common}/>;
    case 'risk_classification': return (
      <Step15RiskClassification
        {...common}
        onGenerate={handleGenerate}
        generating={generating}
      />
    );
    default: return <Step01Welcome {...common}/>;
  }
}

// ── Completion screen ─────────────────────────────────────────────────────────

function CompletionScreen({ dark, primary, nav }: { dark: boolean; primary: string; nav: NavFn }) {
  return (
    <div style={{
      padding: '48px 28px 36px', display: 'flex', flexDirection: 'column',
      alignItems: 'center', minHeight: '100%',
    }}>
      {/* Success icon */}
      <div style={{
        width: 72, height: 72, borderRadius: 22,
        background: `${primary}22`, border: `2px solid ${primary}55`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 24,
      }}>
        <Icon name="check" size={34} color={primary} stroke={2.8}/>
      </div>

      <h1 style={{
        margin: '0 0 10px', textAlign: 'center',
        fontFamily: '"Plus Jakarta Sans",sans-serif',
        fontSize: 28, fontWeight: 700, color: dark ? '#fff' : '#102236',
        letterSpacing: '-0.02em',
      }}>
        Perfil Ampliado gerado
      </h1>

      <p style={{
        fontSize: 14, color: textSec(dark), textAlign: 'center',
        lineHeight: 1.6, margin: '0 0 32px', maxWidth: 300,
      }}>
        O AI agora tem contexto completo para adaptar intensidade, segurança e progressão do seu plano.
      </p>

      {/* Summary chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 36 }}>
        {['Perfil de Treinabilidade', 'Safety Gate', 'Privacy masking', 'Ritmo do Corpo', 'LGPD'].map(tag => (
          <span key={tag} style={{
            padding: '5px 12px', borderRadius: 999,
            background: `${primary}18`, border: `1px solid ${primary}44`,
            fontSize: 12, fontWeight: 600, color: primary,
          }}>
            {tag}
          </span>
        ))}
      </div>

      <div style={{ flex: 1 }}/>

      <button onClick={() => nav('profile')} style={primaryBtn(primary)}>
        Ver meu perfil
      </button>
      <button onClick={() => nav('checkin')} style={{
        width: '100%', padding: '15px', borderRadius: 999,
        background: 'transparent', border: `1.5px solid ${primary}`,
        color: primary, fontSize: 15, fontWeight: 600,
        fontFamily: 'inherit', cursor: 'pointer',
      }}>
        Fazer check-in de hoje
      </button>
      <p style={{ fontSize: 11.5, color: textMute(dark), textAlign: 'center', marginTop: 16, lineHeight: 1.45 }}>
        Você pode editar qualquer bloco do perfil a qualquer momento em Configurações.
      </p>
    </div>
  );
}
