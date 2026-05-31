// coach-app.jsx — Coach DNA shell: frame, navigation, context panel, live peek, tweaks, archetype engine

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "showFrame": true,
  "showJsonOutput": true,
  "archetypeOverride": "auto",
  "accent": "#EF5B3C",
  "step": 0
}/*EDITMODE-END*/;

// ─────────── ARCHETYPE ENGINE ───────────
function computeArchetype(d) {
  const style = d.dna?.style || [];
  const pr = d.dna?.principles || [];
  const f = d.focus || {};
  const intensity = d.training?.intensity;
  const has = (arr, v) => arr.includes(v);

  const score = { performance: 0, technician: 0, motivator: 0, guide: 0, drill: 0, movement: 0 };

  // style signals
  if (has(style, 'perf')) score.performance += 3;
  if (has(style, 'tech')) score.technician += 3;
  if (has(style, 'motiv')) score.motivator += 3;
  if (has(style, 'humor')) score.motivator += 2;
  if (has(style, 'emp')) score.guide += 3;
  if (has(style, 'prof')) { score.technician += 1; score.guide += 1; }
  if (has(style, 'disc')) score.drill += 3;
  if (has(style, 'direct')) score.drill += 2;

  // principle signals
  if (has(pr, 'Atletismo em primeiro lugar')) score.performance += 2;
  if (has(pr, 'Força em primeiro lugar')) score.performance += 2;
  if (has(pr, 'Intensidade antes da perfeição')) { score.performance += 1; score.drill += 2; }
  if (has(pr, 'Qualidade antes da intensidade')) score.technician += 3;
  if (has(pr, 'Prazer e motivação primeiro')) score.motivator += 3;
  if (has(pr, 'Saúde em primeiro lugar')) score.guide += 3;
  if (has(pr, 'Progresso sustentável')) score.guide += 2;
  if (has(pr, 'Mobilidade em primeiro lugar')) score.movement += 3;
  if (has(pr, 'Função acima da estética')) score.movement += 3;

  // focus distribution signals
  if ((f.athletic || 0) >= 20) score.performance += 2;
  if ((f.strength || 0) >= 30) score.performance += 1;
  if ((f.mobility || 0) >= 25) score.movement += 2;
  if ((f.balance || 0) >= 20) score.movement += 1;
  if ((f.coord || 0) >= 20) score.technician += 1;

  // intensity
  if (intensity === 'Altamente exigente') { score.performance += 1; score.drill += 1; }
  if (intensity === 'Moderada') score.guide += 1;

  // pick max; tie-break order
  const order = ['performance', 'technician', 'movement', 'drill', 'guide', 'motivator'];
  let best = 'technician', bestScore = -1;
  order.forEach(k => { if (score[k] > bestScore) { best = k; bestScore = score[k]; } });
  if (bestScore <= 0) return 'technician';
  return best;
}

function CoachApp() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [step, setStep] = React.useState(t.step || 0);
  const [data, setData] = React.useState({
    identity: { photo: null, name: 'Rafael Mendes', gender: 'Masculino', age: '34' },
    background: { years: 11, certs: ['pt', 'snc', 'edfis'] },
    fitness: { level: 2 },
    training: { methods: ['Treino Funcional', 'Treino de Força', 'Performance Atlética'], envs: ['box', 'gym'], intensity: 'Desafiadora' },
    dna: { style: ['perf', 'direct', 'tech'], principles: ['Atletismo em primeiro lugar', 'Função acima da estética', 'Progresso sustentável'] },
    focus: { strength: 30, endurance: 20, mobility: 15, athletic: 20, coord: 8, balance: 7 },
    exercises: { favorites: ['Kettlebell Swing', 'Farmer Carry', 'Agachamento livre', 'Turkish Get-Up'], avoid: ['Box jump'] },
    design: { formats: ['AMRAP', 'EMOM', 'Força + MetCon'], curve: 'progressive' },
    structure: ['mobility', 'warmup', 'technique', 'strength', 'conditioning', 'cooldown'],
    audience: { tone: ['Atlético', 'Direto', 'Motivacional'], clients: ['Intermediários', 'Atletas avançados', 'Entusiastas de funcional'] },
    philosophy: { motto: 'Força para a vida cotidiana.', prompt: 'Meu coaching une força funcional, condicionamento atlético e progresso sustentável. Quero que cada aluno termine desafiado, capaz e vitorioso.' },
    voice: null,
  });

  React.useEffect(() => { setTweak('step', step); }, [step]);

  const set = (key, val) => setData(d => ({ ...d, [key]: val }));

  const archetype = t.archetypeOverride && t.archetypeOverride !== 'auto'
    ? t.archetypeOverride : computeArchetype(data);

  const renderStep = () => {
    const props = { data, set };
    switch (step) {
      case 0: return <StepIntro/>;
      case 1: return <Step01 {...props}/>;
      case 2: return <Step02 {...props}/>;
      case 3: return <Step03 {...props}/>;
      case 4: return <Step04 {...props}/>;
      case 5: return <Step05 {...props}/>;
      case 6: return <Step06 {...props}/>;
      case 7: return <Step07 {...props}/>;
      case 8: return <Step08 {...props}/>;
      case 9: return <Step09 {...props}/>;
      case 10: return <Step10 {...props}/>;
      case 11: return <Step11 {...props}/>;
      case 12: return <Step12 {...props}/>;
      case 13: return <StepOutput data={data} archetype={archetype}/>;
      default: return <StepIntro/>;
    }
  };

  const last = step === 13;
  const isIntro = step === 0;
  const progressPct = step === 0 ? 0 : Math.min((step / 12) * 100, 100);

  const scrollRef = React.useRef(null);
  React.useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [step]);

  return (
    <div data-screen-label={`Coach DNA · step ${step}`} style={{
      minHeight: '100vh', width: '100%',
      background: 'radial-gradient(1200px 700px at 80% -10%, rgba(239,92,60,.09), transparent 50%), radial-gradient(900px 600px at -10% 110%, rgba(45,212,224,.07), transparent 50%), #08111E',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 28, gap: 32, fontFamily: FF_DISPLAY, color: B.text,
    }}>
      <ContextPanel step={step} archetype={archetype} go={setStep}/>

      <PhoneFrame show={t.showFrame}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: B.navy }}>
          <Header step={step} setStep={setStep} progressPct={progressPct} isIntro={isIntro} last={last}/>
          <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', padding: '18px 22px 100px' }}>
            {renderStep()}
          </div>
          <BottomBar step={step} setStep={setStep} last={last} isIntro={isIntro}/>
        </div>
      </PhoneFrame>

      {t.showJsonOutput && <SidePeek data={data} archetype={archetype} step={step}/>}

      <TweaksPanel title="Tweaks">
        <TweakSection title="Visual">
          <TweakToggle label="Phone frame" value={t.showFrame} onChange={(v) => setTweak('showFrame', v)}/>
          <TweakToggle label="Live JSON peek" value={t.showJsonOutput} onChange={(v) => setTweak('showJsonOutput', v)}/>
        </TweakSection>
        <TweakSection title="Navigation">
          <TweakSelect label="Go to block" value={String(step)} onChange={(v) => setStep(Number(v))}
            options={[
              ['0', 'Intro'],
              ['1', '01 · Identidade'],
              ['2', '02 · Formação'],
              ['3', '03 · Nível físico'],
              ['4', '04 · Métodos & ambientes'],
              ['5', '05 · DNA · Estilo'],
              ['6', '06 · DNA · Princípios'],
              ['7', '07 · Distribuição de foco'],
              ['8', '08 · Exercícios'],
              ['9', '09 · Formatos & curva'],
              ['10', '10 · Estrutura da sessão'],
              ['11', '11 · Comunicação & público'],
              ['12', '12 · Filosofia & IA'],
              ['13', '→ Output: Coach DNA'],
            ].map(([v, l]) => ({ value: v, label: l }))}/>
        </TweakSection>
        <TweakSection title="Coach archetype">
          <TweakSelect label="Override" value={t.archetypeOverride} onChange={(v) => setTweak('archetypeOverride', v)}
            options={[
              { value: 'auto', label: 'auto (calculado)' },
              { value: 'performance', label: 'Arquiteto de Performance' },
              { value: 'technician', label: 'O Técnico' },
              { value: 'motivator', label: 'O Motivador' },
              { value: 'guide', label: 'O Guia' },
              { value: 'drill', label: 'O Disciplinador' },
              { value: 'movement', label: 'Especialista em Movimento' },
            ]}/>
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

// ─────────── HEADER ───────────
function Header({ step, setStep, progressPct, isIntro, last }) {
  return (
    <div style={{ padding: '16px 22px 12px', borderBottom: `1px solid ${B.border}`, background: B.navy, position: 'relative', zIndex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <button onClick={() => !isIntro && setStep(Math.max(0, step - 1))} disabled={isIntro} style={{
          width: 34, height: 34, borderRadius: 10,
          background: B.surfRaised, border: `1px solid ${B.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: isIntro ? 'default' : 'pointer', opacity: isIntro ? 0.3 : 1, color: B.text,
        }}>
          <Icon name="back" size={16} stroke={2.2}/>
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: B.coral, letterSpacing: '.18em', textTransform: 'uppercase', fontFamily: FF_MONO }}>
            TrAIner · Coach Studio
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 2 }}>
            {isIntro ? 'Coach DNA' : last ? 'Concluído' : `Bloco ${step} de 12`}
          </div>
        </div>
        <button onClick={() => alert('Progresso salvo. Você pode refinar seu Coach DNA quando quiser.')} style={{
          width: 34, height: 34, borderRadius: 10,
          background: B.surfRaised, border: `1px solid ${B.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: B.text,
        }} title="Salvar">
          <Icon name="check" size={14} stroke={2.2}/>
        </button>
      </div>
      <div style={{ height: 3, borderRadius: 2, background: B.border, overflow: 'hidden' }}>
        <div style={{
          width: `${progressPct}%`, height: '100%',
          background: `linear-gradient(90deg, #C23B22 0%, ${B.coral} 100%)`,
          transition: 'width .35s ease',
        }}/>
      </div>
    </div>
  );
}

// ─────────── BOTTOM BAR ───────────
function BottomBar({ step, setStep, last, isIntro }) {
  if (last) {
    return (
      <div style={{ padding: '14px 18px 18px', background: B.navy, borderTop: `1px solid ${B.border}`, display: 'flex', gap: 8 }}>
        <button onClick={() => setStep(1)} style={{
          padding: '14px 18px', borderRadius: 14, background: 'transparent',
          border: `1.5px solid ${B.border}`, color: B.text, fontFamily: 'inherit',
          fontWeight: 600, fontSize: 13, cursor: 'pointer',
        }}>Editar</button>
        <button onClick={() => alert('Coach DNA conectado ao AI Coach Engine. Seus treinos agora carregam sua assinatura.')} style={{
          flex: 1, padding: '14px 18px', borderRadius: 14, background: B.coral, border: 'none',
          color: '#fff', fontFamily: FF_DISPLAY, fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          whiteSpace: 'nowrap', boxShadow: `0 10px 30px ${B.coral}44`,
        }}>
          Ativar Coach DNA
          <Icon name="chevron" size={14} stroke={2.4}/>
        </button>
      </div>
    );
  }
  return (
    <div style={{ padding: '14px 18px 18px', background: B.navy, borderTop: `1px solid ${B.border}`, display: 'flex', gap: 8 }}>
      {!isIntro && (
        <button onClick={() => alert('Progresso salvo.')} style={{
          padding: '14px 18px', borderRadius: 14, background: 'transparent',
          border: `1.5px solid ${B.border}`, color: B.textSec, fontFamily: 'inherit',
          fontWeight: 600, fontSize: 12.5, cursor: 'pointer',
        }}>Salvar</button>
      )}
      <button onClick={() => setStep(step + 1)} style={{
        flex: 1, padding: '14px 18px', borderRadius: 14, background: B.coral, border: 'none',
        color: '#fff', fontFamily: FF_DISPLAY, fontWeight: 700, fontSize: 14, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        boxShadow: `0 10px 30px ${B.coral}44`,
      }}>
        {isIntro ? 'Construir meu Coach DNA' : step === 12 ? 'Gerar Coach DNA' : 'Continuar'}
        <Icon name="chevron" size={14} stroke={2.4}/>
      </button>
    </div>
  );
}

// ─────────── PHONE FRAME ───────────
function PhoneFrame({ children, show }) {
  if (!show) {
    return (
      <div style={{
        width: 420, height: 820, borderRadius: 28, overflow: 'hidden',
        border: `1px solid ${B.border}`, boxShadow: '0 40px 80px rgba(0,0,0,.4)', flexShrink: 0,
      }}>{children}</div>
    );
  }
  return (
    <div style={{
      width: 420, height: 860, borderRadius: 52,
      background: 'linear-gradient(180deg,#202B3B 0%,#0E1822 100%)', padding: 12,
      boxShadow: '0 50px 100px rgba(0,0,0,.6), inset 0 0 0 1px #2a3a52',
      position: 'relative', flexShrink: 0,
    }}>
      <div style={{ width: '100%', height: '100%', borderRadius: 42, overflow: 'hidden', position: 'relative', background: B.navy }}>
        <div style={{
          position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
          width: 110, height: 28, borderRadius: 16, background: '#000', zIndex: 100,
        }}/>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 44, padding: '14px 28px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontFamily: FF_DISPLAY, fontSize: 13, fontWeight: 600, color: B.text,
          zIndex: 99, pointerEvents: 'none',
        }}>
          <span>9:41</span>
          <span style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11 }}>
            <span>5G</span>
            <svg width="22" height="11" viewBox="0 0 22 11"><rect x="0" y="0" width="20" height="11" rx="3" fill="none" stroke="#fff" strokeOpacity=".7"/><rect x="2" y="2" width="14" height="7" rx="1.5" fill="#fff"/></svg>
          </span>
        </div>
        <div style={{ paddingTop: 44, height: '100%' }}>{children}</div>
      </div>
    </div>
  );
}

// ─────────── LEFT CONTEXT PANEL ───────────
const STEP_LABELS = [
  'Bem-vindo', 'Identidade', 'Formação', 'Nível físico', 'Métodos & ambientes',
  'DNA · Estilo', 'DNA · Princípios', 'Distribuição de foco', 'Exercícios',
  'Formatos & curva', 'Estrutura da sessão', 'Comunicação & público', 'Filosofia & IA', 'Coach DNA',
];

function ContextPanel({ step, archetype, go }) {
  const a = ARCHETYPES[archetype];
  return (
    <div style={{ width: 280, flexShrink: 0, fontFamily: FF_DISPLAY, alignSelf: 'flex-start', marginTop: 24 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: B.coral, letterSpacing: '.18em', textTransform: 'uppercase', fontFamily: FF_MONO, marginBottom: 6 }}>
        Coach Studio
      </div>
      <h2 style={{ margin: 0, fontSize: 22, lineHeight: 1.1, fontWeight: 800, letterSpacing: '-0.01em' }}>
        Coach DNA<br/>do Personal Trainer
      </h2>
      <div style={{ fontSize: 12, color: B.textSec, marginTop: 8, lineHeight: 1.5 }}>
        Identidade técnica, estilo e metodologia — alimentando o AI Coach Engine.
      </div>

      <div style={{ marginTop: 22, padding: 12, borderRadius: 12, background: B.surfRaised, border: `1px solid ${B.border}` }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: B.textMute, fontFamily: FF_MONO, marginBottom: 8 }}>
          12 BLOCOS DE MÉTODO
        </div>
        <div style={{ display: 'grid', gap: 2 }}>
          {STEP_LABELS.map((l, i) => {
            const isCurrent = i === step;
            const isDone = i < step;
            return (
              <button key={i} onClick={() => go(i)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 8,
                background: isCurrent ? `${B.coral}1a` : 'transparent', border: 'none',
                cursor: 'pointer', textAlign: 'left',
                color: isCurrent ? B.coral : isDone ? B.text : B.textMute,
                fontFamily: 'inherit', fontSize: 11.5, width: '100%',
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                  background: isCurrent ? B.coral : isDone ? `${B.coral}33` : 'transparent',
                  border: isDone || isCurrent ? 'none' : `1px solid ${B.border}`,
                  color: isCurrent ? B.navy : B.coral, fontFamily: FF_MONO, fontWeight: 700, fontSize: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isDone ? <Icon name="check" size={10} color={B.coral} stroke={2.6}/> : (i === 0 ? '•' : i === 13 ? '→' : i)}
                </div>
                {l}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: `${a.color}10`, border: `1px solid ${a.color}44` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: a.color, color: B.navy,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Icon name={a.icon} size={17} stroke={2.2}/></div>
          <div>
            <div style={{ fontSize: 11, color: B.textMute, fontFamily: FF_MONO, letterSpacing: '.04em' }}>COACH_ARCHETYPE</div>
            <div style={{ fontSize: 12.5, fontWeight: 700 }}>{a.name}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────── RIGHT: LIVE JSON PEEK ───────────
function SidePeek({ data, archetype, step }) {
  const a = ARCHETYPES[archetype];
  const styleList = (data.dna?.style || []).map(v => (STYLES.find(s => s.v === v) || {}).v).filter(Boolean);
  const lines = [
    `// coach_dna.json`,
    `archetype: "${a.tag.toLowerCase().replace(/\s+/g, '_')}"`,
    `coach: "${data.identity?.name || '—'}"`,
    `experience_years: ${data.background?.years ?? 0}`,
    `certifications: ${(data.background?.certs || []).length}`,
    `self_fitness_level: ${data.fitness?.level ?? '—'}`,
    `training_methods: ${(data.training?.methods || []).length}`,
    `coaching_style: [${styleList.map(s => `"${s}"`).join(', ')}]`,
    `core_principles: ${(data.dna?.principles || []).length}`,
    `focus_distribution: {`,
    `  strength: ${(data.focus || {}).strength || 0},`,
    `  athletic: ${(data.focus || {}).athletic || 0},`,
    `  mobility: ${(data.focus || {}).mobility || 0}`,
    `}`,
    `favorite_exercises: ${(data.exercises?.favorites || []).length}`,
    `exercises_to_avoid: ${(data.exercises?.avoid || []).length}`,
    `workout_formats: ${(data.design?.formats || []).length}`,
    `session_blocks: ${(data.structure || []).length}`,
    `target_clients: ${(data.audience?.clients || []).length}`,
    `ai_personality_set: ${!!(data.philosophy?.prompt || '').trim()}`,
    `dna_ready: ${step >= 12}`,
  ];
  return (
    <div style={{ width: 320, flexShrink: 0, alignSelf: 'flex-start', marginTop: 24, fontFamily: FF_MONO, fontSize: 11, lineHeight: 1.65 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: B.cyan, letterSpacing: '.18em', textTransform: 'uppercase', marginBottom: 6 }}>
        Live · AI Coach Engine
      </div>
      <div style={{
        padding: 16, borderRadius: 14, background: B.surfRaised, border: `1px solid ${B.border}`,
        color: B.cyanSoft, boxShadow: '0 30px 60px rgba(0,0,0,.3)',
      }}>
        {lines.map((l, i) => (
          <div key={i} style={{
            color: l.startsWith('//') ? B.textMute
              : l.includes('archetype') ? a.color
              : (l.includes('true') || l.includes('false')) ? B.lavender
              : B.cyanSoft,
            opacity: l.startsWith('//') ? 0.7 : 1,
          }}>{l}</div>
        ))}
      </div>

      <div style={{
        marginTop: 14, padding: 14, borderRadius: 12,
        background: `${a.color}10`, border: `1px solid ${a.color}33`,
        fontFamily: FF_DISPLAY, fontSize: 11.5, color: B.text, lineHeight: 1.5,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontWeight: 700, color: a.color, letterSpacing: '.06em', fontSize: 10.5, textTransform: 'uppercase' }}>
          <Icon name="fingerprint" size={12} stroke={2.2}/> Assinatura de coaching
        </div>
        <div style={{ fontStyle: 'italic', color: B.textSec, fontSize: 11.5 }}>“{a.sub}”</div>
      </div>
    </div>
  );
}

// ─────────── MOUNT ───────────
ReactDOM.createRoot(document.getElementById('root')).render(<CoachApp/>);
