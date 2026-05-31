import React from 'react';
import { Icon }          from '../components/Icon';
import { useCoachDNA }   from '../hooks/useCoachDNA';
import { BRAND, DARK }   from '../theme/tokens';
import { TOTAL_STEPS }   from './constants';
import {
  StepIntro, Step01Identity, Step02Background,
  Step03Fitness, Step04Training, Step05Style, Step06Principles,
} from './steps';
import type { NavFn }       from '../types/auth';
import type { CoachDNAData, CoachDNAStep } from '../types/coach-dna';
import { COACH_DNA_DEFAULTS } from '../types/coach-dna';

// ─── Step → DB key map ────────────────────────────────────────────────────────

const STEP_KEYS: CoachDNAStep[] = [
  'identity', 'background', 'fitness', 'training', 'dna_style', 'dna_principles',
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface CoachDNAScreenProps {
  nav:  NavFn;
  user: { id: string; name?: string };
  // trainerId override for Studio context; defaults to user.id
  trainerId?: string;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function CoachDNAScreen({ nav, user, trainerId: trainerIdProp }: CoachDNAScreenProps) {
  const trainerId = trainerIdProp ?? user.id;
  const { fetchCoachDNA, saveCoachDNA } = useCoachDNA(trainerId);

  const [step,    setStep]    = React.useState(0);
  const [data,    setData]    = React.useState<CoachDNAData>(COACH_DNA_DEFAULTS);
  const [loading, setLoading] = React.useState(true);
  const [saving,  setSaving]  = React.useState(false);

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
        // resume from last saved step (capped at phase 1 max = 6)
        const savedIdx = STEP_KEYS.indexOf(row.current_step);
        if (savedIdx > 0) setStep(Math.min(savedIdx + 1, TOTAL_STEPS));
      }
      setLoading(false);
    });
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

  // ── build DB payload for current step ───────────────────────────────────────
  function buildPayload(targetStep: CoachDNAStep) {
    return {
      current_step:   targetStep,
      identity:       data.identity,
      background:     data.background,
      fitness:        data.fitness,
      training:       data.training,
      dna_style:      { style:       data.dna.style       },
      dna_principles: { principles:  data.dna.principles  },
    };
  }

  // ── save current step ────────────────────────────────────────────────────────
  async function save(advance = false) {
    setSaving(true);
    const currentKey: CoachDNAStep = step > 0 ? (STEP_KEYS[step - 1] ?? 'identity') : 'identity';
    const nextKey: CoachDNAStep    = step < STEP_KEYS.length ? (STEP_KEYS[step] ?? 'dna_principles') : 'dna_principles';
    await saveCoachDNA(buildPayload(advance ? nextKey : currentKey));
    setSaving(false);
    if (advance) {
      if (step < 6) {
        setStep(s => s + 1);
      } else {
        // Phase 1 complete — return to dashboard
        nav('trainerDashboard');
      }
    }
  }

  // ── step content ─────────────────────────────────────────────────────────────
  const stepContent = (() => {
    switch (step) {
      case 0:  return <StepIntro/>;
      case 1:  return <Step01Identity  data={data.identity}   onChange={v => set('identity',   { ...data.identity,   ...v })} trainerId={trainerId}/>;
      case 2:  return <Step02Background data={data.background} onChange={v => set('background', { ...data.background, ...v })}/>;
      case 3:  return <Step03Fitness    data={data.fitness}    onChange={v => set('fitness',    { ...data.fitness,    ...v })}/>;
      case 4:  return <Step04Training   data={data.training}   onChange={v => set('training',   { ...data.training,   ...v })}/>;
      case 5:  return <Step05Style      style={data.dna.style} onChange={style => set('dna', { ...data.dna, style })}/>;
      case 6:  return <Step06Principles principles={data.dna.principles} onChange={principles => set('dna', { ...data.dna, principles })}/>;
      default: return null;
    }
  })();

  // ── progress bar width ───────────────────────────────────────────────────────
  const progressPct = step === 0 ? 0 : (step / TOTAL_STEPS) * 100;

  // ── subtitle ─────────────────────────────────────────────────────────────────
  const subtitle = step === 0
    ? 'Coach DNA'
    : `Bloco ${step} de ${TOTAL_STEPS}`;

  if (loading) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: DARK.bg,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: `3px solid ${DARK.border}`, borderTopColor: BRAND.accent,
          animation: 'spin .7s linear infinite',
        }}/>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
        padding:     '16px 22px 12px',
        borderBottom: `1px solid ${DARK.border}`,
        flexShrink:  0,
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
              textTransform: 'uppercase', color: BRAND.accent,
            }}>
              TrAIner · Coach Studio
            </div>
            <div style={{ fontSize: 11.5, color: DARK.textMute, marginTop: 1 }}>
              {subtitle}
            </div>
          </div>

          {/* save icon */}
          <button
            onClick={() => step > 0 && save(false)}
            disabled={step === 0 || saving}
            style={{
              width: 34, height: 34, borderRadius: 10,
              background: DARK.surface, border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: step === 0 ? 'default' : 'pointer',
              opacity: step === 0 ? 0 : 1, flexShrink: 0,
            }}
          >
            <Icon name="check" size={16} color={BRAND.accent}/>
          </button>
        </div>

        {/* progress bar */}
        <div style={{ height: 3, borderRadius: 2, background: DARK.border }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: `linear-gradient(90deg,#C23B22,${BRAND.accent})`,
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
        padding:      '14px 18px 18px',
        borderTop:    `1px solid ${DARK.border}`,
        background:   DARK.bg,
        flexShrink:   0,
      }}>
        {step === 0 ? (
          /* Intro CTA */
          <button
            onClick={() => setStep(1)}
            style={{
              width:        '100%', padding: '16px 20px',
              borderRadius: 14, border: 'none',
              background:   BRAND.accent, color: '#fff',
              fontSize:     15, fontWeight: 700, fontFamily: 'inherit',
              cursor:       'pointer',
              boxShadow:    `0 10px 30px ${BRAND.accent}44`,
            }}
          >
            Construir meu Coach DNA
          </button>
        ) : (
          /* Block CTAs */
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => save(false)}
              disabled={saving}
              style={{
                flex: 1, padding: '15px 20px', borderRadius: 14,
                border: `1.5px solid ${BRAND.accent}`,
                background: 'transparent', color: BRAND.accent,
                fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                cursor: 'pointer', opacity: saving ? 0.6 : 1,
              }}
            >
              Salvar
            </button>
            <button
              onClick={() => save(true)}
              disabled={saving}
              style={{
                flex: 2, padding: '15px 20px', borderRadius: 14,
                border: 'none',
                background: BRAND.accent, color: '#fff',
                fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
                cursor: 'pointer', opacity: saving ? 0.6 : 1,
                boxShadow: `0 8px 24px ${BRAND.accent}44`,
              }}
            >
              {saving ? 'Salvando…' : step < 6 ? 'Continuar' : 'Concluir Fase 1'}
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
