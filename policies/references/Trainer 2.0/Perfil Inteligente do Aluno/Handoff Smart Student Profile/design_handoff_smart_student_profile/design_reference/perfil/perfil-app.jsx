// perfil-app.jsx — Módulo 1 Perfil Inteligente: shell, frame, navigation, tweaks

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "showFrame": true,
  "language": "pt-BR",
  "riskOverride": "auto",
  "voiceEnabled": true,
  "showJsonOutput": true,
  "step": 0
}/*EDITMODE-END*/;

// Compute risk from collected data (matches doc rules)
function computeRisk(d) {
  let level = 0;
  // R4 triggers
  const comorbids = (d.comorbid?.items || []).filter(x => x !== 'Prefiro não informar');
  if (d.comorbid?.controlled === 'Não / não sei' && comorbids.length > 0) level = Math.max(level, 4);
  if (d.health?.has === 'sim' && (d.health?.cats || []).includes('Pós-operatório') && d.comorbid?.releaseDoc === false) level = Math.max(level, 4);
  // R3 triggers
  if (comorbids.length >= 2) level = Math.max(level, 3);
  if ((d.func?.supports || []).some(s => s !== 'Nenhum' && s !== 'Apoio próximo')) level = Math.max(level, 3);
  if (d.func?.balance === 'instável') level = Math.max(level, 3);
  // R2 triggers
  if (comorbids.length === 1) level = Math.max(level, 2);
  if (d.health?.has === 'sim') level = Math.max(level, 2);
  if (d.func?.tolerance === 'baixa') level = Math.max(level, 2);
  if (d.func?.mobility === 'baixa') level = Math.max(level, 2);
  // R1 triggers
  if (d.history?.trains === 'Não treino') level = Math.max(level, 1);
  if (d.history?.level === 'Iniciante') level = Math.max(level, 1);
  if ((d.habits?.items || []).length >= 3) level = Math.max(level, 1);

  return `R${level}`;
}

function PerfilApp() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [step, setStep] = React.useState(t.step || 0);
  const [data, setData] = React.useState({
    basic: { name: 'Mariana Costa', age: '32', lang: 'Português', height: '168', weight: '64', sex: 'Feminino' },
    goals: { primary: 'mobilidade', secondary: ['saude', 'longevidade'] },
    history: { trains: 'Às vezes', level: 'Intermediário', freq: 3, mods: ['Musculação', 'Pilates'], abandoned: 'Sim', reason: 'Lesão', pace: 'gradual' },
    health: { has: 'sim', cats: ['Musculoesquelética'], note: 'Cirurgia no joelho em 2023, liberada para musculação leve.' },
    comorbid: { items: [], controlled: null, releaseDoc: true },
    func: { mobility: 'moderada', balance: 'estável', autonomy: 'independente', tolerance: 'moderada', supports: ['Nenhum'], instruction: 'padrão' },
    habits: { items: ['Sono irregular', 'Estresse elevado'] },
    sensitive: { meds: '', psychiatric: false, recreational: false },
    rhythm: { active: false, day: 12, length: 28, periodStart: false, adapt: [] },
    env: { places: ['Casa', 'Academia'], equip: ['Halteres', 'Elásticos'], access: ['Piso seguro', 'Privacidade para treinar'] },
    routine: { days: 3, duration: 45, prefTime: 'manhã', days_pref: [1, 3, 5], barriers: ['Fadiga pós-trabalho'] },
    prefs: { intensity: 'moderada', companions: 'sozinho', tone: 'acolhedora', detail: 'simples', focus: 'saúde', support: 'orientação próxima' },
    consent: { visibility: {}, ai: true, history: true },
    voice: null,
  });

  // Sync step into tweaks for direct manipulation
  React.useEffect(() => { setTweak('step', step); }, [step]);

  const set = (key, val) => setData(d => ({ ...d, [key]: val }));

  const risk = t.riskOverride && t.riskOverride !== 'auto' ? t.riskOverride : computeRisk(data);

  // Step renderer
  const renderStep = () => {
    const props = { data, set };
    switch (step) {
      case 0: return <StepIntro {...props}/>;
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
      case 13: return <Step13 {...props}/>;
      case 14: return <Step14 {...props} risk={risk}/>;
      case 15: return <StepOutput data={data} risk={risk}/>;
      default: return <StepIntro {...props}/>;
    }
  };

  const last = step === 15;
  const isIntro = step === 0;

  const progressPct = step === 0 ? 0 : Math.min((step / 14) * 100, 100);

  const scrollRef = React.useRef(null);
  React.useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [step]);

  return (
    <div data-screen-label={`Perfil M1 · step ${step}`} style={{
      minHeight: '100vh', width: '100%',
      background: 'radial-gradient(1200px 700px at 80% -10%, rgba(45,212,224,.08), transparent 50%), radial-gradient(900px 600px at -10% 110%, rgba(239,92,60,.07), transparent 50%), #08111E',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 28, gap: 32,
      fontFamily: FF_DISPLAY,
      color: B.text,
    }}>
      {/* Left context panel — outside the frame */}
      <ContextPanel step={step} data={data} risk={risk} go={setStep}/>

      {/* Phone frame */}
      <PhoneFrame show={t.showFrame}>
        <div style={{
          height: '100%', display: 'flex', flexDirection: 'column',
          background: B.navy,
        }}>
          {/* Header */}
          <Header step={step} setStep={setStep} progressPct={progressPct} isIntro={isIntro} last={last}/>

          {/* Scrollable content */}
          <div ref={scrollRef} style={{
            flex: 1, overflow: 'auto', padding: '18px 22px 100px',
          }}>
            {renderStep()}
          </div>

          {/* Bottom action bar */}
          <BottomBar step={step} setStep={setStep} last={last} isIntro={isIntro}/>
        </div>
      </PhoneFrame>

      {/* Right side: live output (json view) */}
      {t.showJsonOutput && <SidePeek data={data} risk={risk} step={step}/>}

      <TweaksPanel title="Tweaks">
        <TweakSection title="Visual">
          <TweakToggle label="Phone frame" value={t.showFrame} onChange={(v) => setTweak('showFrame', v)}/>
          <TweakToggle label="Live JSON peek" value={t.showJsonOutput} onChange={(v) => setTweak('showJsonOutput', v)}/>
        </TweakSection>
        <TweakSection title="Navigation">
          <TweakSelect label="Go to step" value={String(step)} onChange={(v) => setStep(Number(v))}
            options={[
              ['0', 'Intro'],
              ['1', '01 · Dados básicos'],
              ['2', '02 · Objetivos'],
              ['3', '03 · Histórico de treino'],
              ['4', '04 · Saúde declarada'],
              ['5', '05 · Comorbidades'],
              ['6', '06 · Capacidade funcional'],
              ['7', '07 · Hábitos'],
              ['8', '08 · Fatores sensíveis'],
              ['9', '09 · Ritmo do Corpo'],
              ['10', '10 · Ambiente'],
              ['11', '11 · Disponibilidade'],
              ['12', '12 · Preferências'],
              ['13', '13 · Consentimento / LGPD'],
              ['14', '14 · Risco operacional'],
              ['15', '→ Output: Perfil Ampliado'],
            ].map(([v, l]) => ({ value: v, label: l }))}/>
        </TweakSection>
        <TweakSection title="Risk simulation">
          <TweakRadio label="Override risk" value={t.riskOverride} onChange={(v) => setTweak('riskOverride', v)}
            options={[
              { value: 'auto', label: 'auto' },
              { value: 'R0', label: 'R0' },
              { value: 'R1', label: 'R1' },
              { value: 'R2', label: 'R2' },
              { value: 'R3', label: 'R3' },
              { value: 'R4', label: 'R4' },
            ]}/>
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

// ─────────── HEADER ───────────
function Header({ step, setStep, progressPct, isIntro, last }) {
  return (
    <div style={{
      padding: '16px 22px 12px',
      borderBottom: `1px solid ${B.border}`,
      background: B.navy,
      position: 'relative', zIndex: 1,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12,
      }}>
        <button onClick={() => !isIntro && setStep(Math.max(0, step - 1))}
          disabled={isIntro}
          style={{
            width: 34, height: 34, borderRadius: 10,
            background: B.surfRaised, border: `1px solid ${B.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: isIntro ? 'default' : 'pointer', opacity: isIntro ? 0.3 : 1,
            color: B.text,
          }}>
          <Icon name="back" size={16} stroke={2.2}/>
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{
            fontSize: 10.5, fontWeight: 700, color: B.cyan, letterSpacing: '.18em',
            textTransform: 'uppercase', fontFamily: FF_MONO,
          }}>TrAIner · Módulo 01</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 2 }}>
            {isIntro ? 'Configuração inicial' : last ? 'Concluído' : `Passo ${step} de 14`}
          </div>
        </div>
        <button onClick={() => alert('Progresso salvo. Você pode retomar a qualquer momento.')} style={{
          width: 34, height: 34, borderRadius: 10,
          background: B.surfRaised, border: `1px solid ${B.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: B.text,
        }} title="Salvar e retomar depois">
          <Icon name="check" size={14} stroke={2.2}/>
        </button>
      </div>
      <div style={{
        height: 3, borderRadius: 2, background: B.border, overflow: 'hidden',
      }}>
        <div style={{
          width: `${progressPct}%`, height: '100%',
          background: `linear-gradient(90deg, ${B.cyanDeep} 0%, ${B.cyan} 100%)`,
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
      <div style={{
        padding: '14px 18px 18px',
        background: B.navy, borderTop: `1px solid ${B.border}`,
        display: 'flex', gap: 8,
      }}>
        <button onClick={() => setStep(0)} style={{
          padding: '14px 18px', borderRadius: 14,
          background: 'transparent', border: `1.5px solid ${B.border}`,
          color: B.text, fontFamily: 'inherit', fontWeight: 600, fontSize: 13,
          cursor: 'pointer',
        }}>Editar</button>
        <button onClick={() => alert('→ Módulo 2: Check-in Físico')} style={{
          flex: 1, padding: '14px 18px', borderRadius: 14,
          background: B.cyan, border: 'none',
          color: B.navy, fontFamily: FF_DISPLAY, fontWeight: 700, fontSize: 13.5,
          cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          whiteSpace: 'nowrap',
          boxShadow: `0 10px 30px ${B.cyan}33`,
        }}>
          Ir para Módulo 2
          <Icon name="chevron" size={14} stroke={2.4}/>
        </button>
      </div>
    );
  }
  return (
    <div style={{
      padding: '14px 18px 18px',
      background: B.navy, borderTop: `1px solid ${B.border}`,
      display: 'flex', gap: 8,
    }}>
      {!isIntro && (
        <button onClick={() => alert('Progresso salvo. Você pode retomar a qualquer momento.')} style={{
          padding: '14px 18px', borderRadius: 14,
          background: 'transparent', border: `1.5px solid ${B.border}`,
          color: B.textSec, fontFamily: 'inherit', fontWeight: 600, fontSize: 12.5,
          cursor: 'pointer',
        }}>Salvar p/ depois</button>
      )}
      <button onClick={() => setStep(step + 1)} style={{
        flex: 1, padding: '14px 18px', borderRadius: 14,
        background: B.cyan, border: 'none',
        color: B.navy, fontFamily: FF_DISPLAY, fontWeight: 700, fontSize: 14,
        cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        boxShadow: `0 10px 30px ${B.cyan}33`,
      }}>
        {isIntro ? 'Começar' : step === 14 ? 'Gerar Perfil Ampliado' : 'Continuar'}
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
        width: 420, height: 820, borderRadius: 28,
        overflow: 'hidden', border: `1px solid ${B.border}`,
        boxShadow: '0 40px 80px rgba(0,0,0,.4)',
      }}>{children}</div>
    );
  }
  return (
    <div style={{
      width: 420, height: 860,
      borderRadius: 52,
      background: 'linear-gradient(180deg,#202B3B 0%,#0E1822 100%)',
      padding: 12,
      boxShadow: '0 50px 100px rgba(0,0,0,.6), inset 0 0 0 1px #2a3a52',
      position: 'relative',
      flexShrink: 0,
    }}>
      <div style={{
        width: '100%', height: '100%',
        borderRadius: 42, overflow: 'hidden', position: 'relative',
        background: B.navy,
      }}>
        {/* Notch */}
        <div style={{
          position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
          width: 110, height: 28, borderRadius: 16,
          background: '#000', zIndex: 100,
        }}/>
        {/* Status bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 44, padding: '14px 28px',
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
  'Bem-vindo', 'Dados básicos', 'Objetivos', 'Histórico', 'Saúde declarada',
  'Comorbidades', 'Capacidade funcional', 'Hábitos', 'Sensíveis', 'Ritmo do Corpo',
  'Ambiente', 'Disponibilidade', 'Preferências', 'LGPD', 'Risco', 'Perfil Ampliado',
];

function ContextPanel({ step, data, risk, go }) {
  return (
    <div style={{
      width: 280, flexShrink: 0, fontFamily: FF_DISPLAY,
      alignSelf: 'flex-start', marginTop: 24,
    }}>
      <div style={{
        fontSize: 10.5, fontWeight: 700, color: B.cyan, letterSpacing: '.18em',
        textTransform: 'uppercase', fontFamily: FF_MONO, marginBottom: 6,
      }}>Módulo 01</div>
      <h2 style={{
        margin: 0, fontSize: 22, lineHeight: 1.1, fontWeight: 700,
        letterSpacing: '-0.01em',
      }}>Perfil Inteligente<br/>do Aluno</h2>
      <div style={{
        fontSize: 12, color: B.textSec, marginTop: 8, lineHeight: 1.5,
      }}>Saúde, Movimento, Privacidade e Base Preditiva.</div>

      <div style={{
        marginTop: 22, padding: 12, borderRadius: 12,
        background: B.surfRaised, border: `1px solid ${B.border}`,
      }}>
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '.12em',
          textTransform: 'uppercase', color: B.textMute, fontFamily: FF_MONO,
          marginBottom: 8,
        }}>14 BLOCOS FUNCIONAIS</div>
        <div style={{ display: 'grid', gap: 2 }}>
          {STEP_LABELS.map((l, i) => {
            const isCurrent = i === step;
            const isDone = i < step;
            return (
              <button key={i} onClick={() => go(i)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 8px', borderRadius: 8,
                background: isCurrent ? `${B.cyan}1a` : 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                color: isCurrent ? B.cyan : isDone ? B.text : B.textMute,
                fontFamily: 'inherit', fontSize: 11.5,
                width: '100%',
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                  background: isCurrent ? B.cyan : isDone ? `${B.cyan}33` : 'transparent',
                  border: isDone || isCurrent ? 'none' : `1px solid ${B.border}`,
                  color: isCurrent ? B.navy : B.cyan,
                  fontFamily: FF_MONO, fontWeight: 700, fontSize: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isDone ? <Icon name="check" size={10} color={B.cyan} stroke={2.6}/> : (i === 0 ? '•' : i === 15 ? '→' : i)}
                </div>
                {l}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{
        marginTop: 14, padding: 12, borderRadius: 12,
        background: `${RISK[risk].color}10`, border: `1px solid ${RISK[risk].color}44`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: RISK[risk].color, color: B.navy,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: FF_DISPLAY, fontWeight: 800, fontSize: 13,
          }}>{risk}</div>
          <div>
            <div style={{ fontSize: 11, color: B.textMute, fontFamily: FF_MONO, letterSpacing: '.04em' }}>RISK_LEVEL</div>
            <div style={{ fontSize: 12.5, fontWeight: 700 }}>{RISK[risk].auto}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────── RIGHT SIDE: JSON LIVE OUTPUT PEEK ───────────
function SidePeek({ data, risk, step }) {
  const lines = [
    `// student_profile.json`,
    `risk_level: "${risk}"`,
    `automation: "${RISK[risk].auto.toLowerCase().replace(/[\s-]/g, '_')}"`,
    `name: "${data.basic?.name || '—'}"`,
    `age: ${data.basic?.age || '—'}`,
    `goal_primary: "${data.goals?.primary || '—'}"`,
    `goal_secondary: [${(data.goals?.secondary || []).map(g => `"${g}"`).join(', ')}]`,
    `level: "${(data.history?.level || '—').toLowerCase()}"`,
    `health_declared: ${data.health?.has === 'sim'}`,
    `comorbids: ${(data.comorbid?.items || []).filter(x => x !== 'Prefiro não informar').length}`,
    `func_capacity: {`,
    `  mobility: "${data.func?.mobility}",`,
    `  balance: "${data.func?.balance}",`,
    `  tolerance: "${data.func?.tolerance}"`,
    `}`,
    `env: {`,
    `  places: ${(data.env?.places || []).length},`,
    `  equip: ${(data.env?.equip || []).length}`,
    `}`,
    `availability: "${data.routine?.days}x · ${data.routine?.duration}min"`,
    `cycle_aware: ${data.rhythm?.active || false}`,
    `consent_ai: ${data.consent?.ai}`,
    `privacy_masking: true`,
    `prediction_seed_created: ${step >= 14}`,
  ];
  return (
    <div style={{
      width: 320, flexShrink: 0,
      alignSelf: 'flex-start', marginTop: 24,
      fontFamily: FF_MONO, fontSize: 11, lineHeight: 1.65,
    }}>
      <div style={{
        fontSize: 10.5, fontWeight: 700, color: B.coral, letterSpacing: '.18em',
        textTransform: 'uppercase', marginBottom: 6,
      }}>Live · Saída operacional</div>
      <div style={{
        padding: 16, borderRadius: 14,
        background: B.surfRaised, border: `1px solid ${B.border}`,
        color: B.cyanSoft,
        boxShadow: '0 30px 60px rgba(0,0,0,.3)',
      }}>
        {lines.map((l, i) => (
          <div key={i} style={{
            color: l.startsWith('//') ? B.textMute : l.includes('risk_level') ? RISK[risk].color : l.includes('true') || l.includes('false') ? B.lavender : B.cyanSoft,
            opacity: l.startsWith('//') ? 0.7 : 1,
          }}>{l}</div>
        ))}
      </div>

      <div style={{
        marginTop: 14, padding: 14, borderRadius: 12,
        background: `${B.coral}10`, border: `1px solid ${B.coral}33`,
        fontFamily: FF_DISPLAY, fontSize: 11.5, color: B.text, lineHeight: 1.5,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
          fontWeight: 700, color: B.coral, letterSpacing: '.06em', fontSize: 10.5, textTransform: 'uppercase' }}>
          <Icon name="lock" size={12} stroke={2.2}/> Visível ao Studio
        </div>
        <div style={{ fontStyle: 'italic', color: B.textSec, fontSize: 11.5 }}>
          “{risk === 'R0' ? 'Aluno apto para AI-led sem restrições.' :
              risk === 'R1' ? 'Aluno apto para AI-led com limites de progressão.' :
              risk === 'R2' ? 'Condição relevante declarada — recomenda-se progressão conservadora e AI-assisted.' :
              risk === 'R3' ? 'Múltiplos fatores limitantes — revisão humana obrigatória.' :
              'Sinais de alerta presentes — automação bloqueada, encaminhar a Trainer-led.'}”
        </div>
      </div>
    </div>
  );
}

// ─────────── MOUNT ───────────
ReactDOM.createRoot(document.getElementById('root')).render(<PerfilApp/>);
