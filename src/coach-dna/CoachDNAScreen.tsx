import React from 'react';
import { useTranslation } from 'react-i18next';
import { Icon }          from '../components/Icon';
import { Spinner }       from '../ui';
import { useCoachDNA }   from '../hooks/useCoachDNA';
import { THEME_VARS as DARK }          from '../theme/tokens';
import { useTheme }      from '../contexts';
import { TOTAL_STEPS }   from './constants';
import { computeArchetype } from './computeArchetype';
import {
  StepIntro, Step01Identity, Step02Background,
  Step03Fitness, Step04Training, Step05Style, Step06Principles,
  Step07Focus, Step08Exercises, Step09Design, Step10Structure,
  Step11Audience, Step12Philosophy, StepOutput,
} from './steps';
import type { NavFn }       from '../types/auth';
import type { CoachDNAData, CoachDNAStep } from '../types/coach-dna';
import { COACH_DNA_DEFAULTS } from '../types/coach-dna';
import type { PersistedAvatarUser, SaveUserFn } from '../hooks/usePersistedAvatar';

// ─── Step → DB key map (index 0 = step 1) ────────────────────────────────────

const STEP_KEYS: CoachDNAStep[] = [
  'identity', 'background', 'fitness', 'training', 'dna_style', 'dna_principles',
  'focus', 'exercises', 'design', 'structure', 'audience', 'philosophy',
];

// step 13 = output / archetype reveal (no DB key)
const OUTPUT_STEP = TOTAL_STEPS + 1;

// ─── Props ────────────────────────────────────────────────────────────────────

interface CoachDNAScreenProps {
  nav:  NavFn;
  user: { id: string; name?: string } & PersistedAvatarUser;
  // trainerId override for Studio context; defaults to user.id
  trainerId?: string;
  saveUser?:  SaveUserFn | undefined;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function CoachDNAScreen({ nav, user, trainerId: trainerIdProp, saveUser }: CoachDNAScreenProps) {
  const trainerId = trainerIdProp ?? user.id;
  const { t: theme } = useTheme();
  const { t: tr } = useTranslation();
  const { fetchCoachDNA, saveCoachDNA } = useCoachDNA(trainerId);

  const [step,      setStep]      = React.useState(0);
  const [data,      setData]      = React.useState<CoachDNAData>(COACH_DNA_DEFAULTS);
  const [loading,   setLoading]   = React.useState(true);
  const [saving,    setSaving]    = React.useState(false);
  const [dnaActive, setDnaActive] = React.useState(false);

  const contentRef = React.useRef<HTMLDivElement>(null);

  // ── initial load ────────────────────────────────────────────────────────────
  React.useEffect(() => {
    fetchCoachDNA().then(({ data: row }) => {
      if (row) {
        setData({
          identity:   row.identity   ?? COACH_DNA_DEFAULTS.identity,
          background: row.background ?? COACH_DNA_DEFAULTS.background,
          fitness:    row.fitness    ?? COACH_DNA_DEFAULTS.fitness,
          training:   row.training   ?? COACH_DNA_DEFAULTS.training,
          dna: {
            style:      row.dna_style?.style       ?? [],
            principles: row.dna_principles?.principles ?? [],
          },
          focus:      row.focus      ?? COACH_DNA_DEFAULTS.focus,
          exercises:  row.exercises  ?? COACH_DNA_DEFAULTS.exercises,
          design:     row.design     ?? COACH_DNA_DEFAULTS.design,
          structure:  row.structure?.order ?? COACH_DNA_DEFAULTS.structure,
          audience:   row.audience   ?? COACH_DNA_DEFAULTS.audience,
          philosophy: row.philosophy ?? COACH_DNA_DEFAULTS.philosophy,
        });
        if (row.current_step === 'completed') {
          setDnaActive(true);
          // always open on intro so the trainer can navigate and edit any block
        } else {
          const savedIdx = STEP_KEYS.indexOf(row.current_step);
          if (savedIdx > 0) setStep(Math.min(savedIdx + 1, TOTAL_STEPS));
        }
      }
      setLoading(false);
    });
  // `fetchCoachDNA` is a plain (non-memoized) function from useCoachDNA, so it
  // gets a new identity every render — including it would re-run this effect
  // (and re-fetch) on every render. Re-fetch only when `trainerId` changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainerId]);

  // ── scroll reset on step change ─────────────────────────────────────────────
  React.useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [step]);

  // ── shallow merge per top-level key ─────────────────────────────────────────
  function set<K extends keyof CoachDNAData>(key: K, val: CoachDNAData[K]) {
    setData(prev => ({ ...prev, [key]: val }));
  }

  // ── build DB payload ─────────────────────────────────────────────────────────
  function buildPayload(targetStep: CoachDNAStep) {
    return {
      current_step:   targetStep,
      identity:       data.identity,
      background:     data.background,
      fitness:        data.fitness,
      training:       data.training,
      dna_style:      { style:      data.dna.style       },
      dna_principles: { principles: data.dna.principles  },
      focus:          data.focus,
      exercises:      data.exercises,
      design:         data.design,
      structure:      { order: data.structure },
      audience:       data.audience,
      philosophy:     data.philosophy,
    };
  }

  // ── save current step ────────────────────────────────────────────────────────
  async function save(advance = false) {
    setSaving(true);
    const currentKey: CoachDNAStep = step > 0 ? (STEP_KEYS[step - 1] ?? 'identity')   : 'identity';
    const nextKey:    CoachDNAStep = step < STEP_KEYS.length ? (STEP_KEYS[step] ?? 'philosophy') : 'philosophy';
    await saveCoachDNA(buildPayload(advance ? nextKey : currentKey));
    setSaving(false);
    if (advance) {
      if (step < TOTAL_STEPS) {
        setStep(s => s + 1);
      } else {
        setStep(OUTPUT_STEP);
      }
    }
  }

  // ── activate Coach DNA ───────────────────────────────────────────────────────
  async function activate() {
    setSaving(true);
    const archetype = computeArchetype(data);
    await saveCoachDNA({
      archetype,
      dna_active:   true,
      completed_at: new Date().toISOString(),
      current_step: 'completed',
    });
    setSaving(false);
    nav('trainerDashboard');
  }

  // ── step content ─────────────────────────────────────────────────────────────
  const stepContent = (() => {
    switch (step) {
      case 0:  return <StepIntro/>;
      case 1:  return <Step01Identity  data={data.identity}   onChange={v => set('identity',   { ...data.identity,   ...v })} trainerId={trainerId} user={user} saveUser={saveUser}/>;
      case 2:  return <Step02Background data={data.background} onChange={v => set('background', { ...data.background, ...v })}/>;
      case 3:  return <Step03Fitness    data={data.fitness}    onChange={v => set('fitness',    { ...data.fitness,    ...v })}/>;
      case 4:  return <Step04Training   data={data.training}   onChange={v => set('training',   { ...data.training,   ...v })}/>;
      case 5:  return <Step05Style      style={data.dna.style} onChange={style => set('dna', { ...data.dna, style })}/>;
      case 6:  return <Step06Principles principles={data.dna.principles} onChange={principles => set('dna', { ...data.dna, principles })}/>;
      case 7:  return <Step07Focus      focus={data.focus}         onChange={v => set('focus',     v)}/>;
      case 8:  return <Step08Exercises  exercises={data.exercises}  onChange={v => set('exercises', v)}/>;
      case 9:  return <Step09Design     design={data.design}        onChange={v => set('design',    v)}/>;
      case 10: return <Step10Structure  structure={data.structure}  onChange={v => set('structure', v)}/>;
      case 11: return <Step11Audience   audience={data.audience}    onChange={v => set('audience',  v)}/>;
      case 12: return <Step12Philosophy philosophy={data.philosophy} onChange={v => set('philosophy', v)}/>;
      case OUTPUT_STEP: return <StepOutput archetype={computeArchetype(data)}/>;
      default: return null;
    }
  })();

  // ── progress bar ─────────────────────────────────────────────────────────────
  const progressPct = step === 0 ? 0 : Math.min((step / TOTAL_STEPS) * 100, 100);

  // ── header subtitle ───────────────────────────────────────────────────────────
  const subtitle = (() => {
    if (step === 0)           return tr('coachDna.screen.dnaActive');
    if (step === OUTPUT_STEP) return tr('coachDna.screen.phase2Complete');
    return tr('coachDna.screen.blockOf', { step, total: TOTAL_STEPS });
  })();

  if (loading) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: DARK.bg,
      }}>
        <Spinner size={32} thickness={3} color={theme.accent} trackColor={DARK.border} />
      </div>
    );
  }

  return (
    <div style={{
      display:       'flex', flexDirection: 'column',
      height:        '100%', background: DARK.bg,
      fontFamily:    '"Inter","Plus Jakarta Sans",system-ui,-apple-system,sans-serif',
      color:         DARK.textPri,
    }}>

      {/* ── Header ── */}
      <div style={{
        padding:      '16px 22px 12px',
        borderBottom: `1px solid ${DARK.border}`,
        flexShrink:   0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          {/* back */}
          <button
            onClick={() => step === 0 ? nav('trainerDashboard') : setStep(s => s - 1)}
            style={{
              width: 34, height: 34, borderRadius: 10,
              background: DARK.surface, border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <Icon name="back" size={18} color={DARK.textSec}/>
          </button>

          {/* title */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              fontFamily:    '"JetBrains Mono",ui-monospace,monospace',
              fontSize:      10.5, fontWeight: 700, letterSpacing: '.18em',
              textTransform: 'uppercase', color: theme.accent,
            }}>
              {tr('coachDna.screen.title')}
            </div>
            <div style={{ fontSize: 11.5, color: DARK.textMute, marginTop: 1 }}>
              {subtitle}
            </div>
          </div>

          {/* save icon — hidden on intro and output */}
          <button
            onClick={() => step > 0 && step < OUTPUT_STEP && save(false)}
            disabled={step === 0 || step === OUTPUT_STEP || saving}
            style={{
              width: 34, height: 34, borderRadius: 10,
              background: DARK.surface, border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: (step === 0 || step === OUTPUT_STEP) ? 'default' : 'pointer',
              opacity: (step === 0 || step === OUTPUT_STEP) ? 0 : 1, flexShrink: 0,
            }}
          >
            <Icon name="check" size={16} color={theme.accent}/>
          </button>
        </div>

        {/* progress bar */}
        <div style={{ height: 3, borderRadius: 2, background: DARK.border }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: `linear-gradient(90deg,#C23B22,${theme.accent})`,
            width: `${progressPct}%`,
            transition: 'width .35s ease',
          }}/>
        </div>
      </div>

      {/* ── Content ── */}
      <div
        ref={contentRef}
        style={{
          flex:      1,
          overflowY: 'auto',
          padding:   '18px 22px 100px',
          scrollbarWidth: 'none',
        }}
      >
        {stepContent}
      </div>

      {/* ── Bottom Action Bar ── */}
      <div style={{
        padding:    '14px 18px 18px',
        borderTop:  `1px solid ${DARK.border}`,
        background: DARK.bg,
        flexShrink: 0,
      }}>
        {step === 0 ? (
          <button
            onClick={() => setStep(1)}
            style={{
              width: '100%', padding: '16px 20px',
              borderRadius: 14, border: 'none',
              background: theme.accent, color: '#fff',
              fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
              cursor: 'pointer',
              boxShadow: `0 10px 30px ${theme.accent}44`,
            }}
          >
            {dnaActive ? tr('coachDna.screen.editDna') : tr('coachDna.screen.buildDna')}
          </button>
        ) : step === OUTPUT_STEP ? (
          <button
            onClick={activate}
            disabled={saving}
            style={{
              width: '100%', padding: '16px 20px',
              borderRadius: 14, border: 'none',
              background: theme.accent, color: '#fff',
              fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
              cursor: 'pointer', opacity: saving ? 0.6 : 1,
              boxShadow: `0 10px 30px ${theme.accent}44`,
            }}
          >
            {saving ? tr('coachDna.screen.saving') : dnaActive ? tr('coachDna.screen.updateDna') : tr('coachDna.screen.activateDna')}
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => save(false)}
              disabled={saving}
              style={{
                flex: 1, padding: '15px 20px', borderRadius: 14,
                border: `1.5px solid ${theme.accent}`,
                background: 'transparent', color: theme.accent,
                fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                cursor: 'pointer', opacity: saving ? 0.6 : 1,
              }}
            >
              {tr('coachDna.screen.save')}
            </button>
            <button
              onClick={() => save(true)}
              disabled={saving}
              style={{
                flex: 2, padding: '15px 20px', borderRadius: 14,
                border: 'none',
                background: theme.accent, color: '#fff',
                fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
                cursor: 'pointer', opacity: saving ? 0.6 : 1,
                boxShadow: `0 8px 24px ${theme.accent}44`,
              }}
            >
              {saving ? tr('coachDna.screen.saving') : step < TOTAL_STEPS ? tr('coachDna.screen.continue') : tr('coachDna.screen.complete')}
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
