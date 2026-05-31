// coach-steps.jsx — Intro + 12 blocks + output for "Coach DNA · Perfil do Personal Trainer"
// Atoms from window: B, Icon, Chip, ChoiceCard, Field, TextArea, PrivacyNote, Hint,
// StepHeader, FieldLabel, Slider, ToggleRow, VoiceBar, PhotoSlot, LevelPicker, FocusBars,
// StructureSorter, TagPicker, FF_DISPLAY, FF_MONO

const TOTAL = 12;

// ─────────── DATA CONSTANTS (from PTP doc, pt-BR) ───────────
const CERTS = [
  { v: 'pt', l: 'Personal Trainer', icon: 'dumbbell' },
  { v: 'coach', l: 'Treinador Fitness', icon: 'activity' },
  { v: 'edfis', l: 'Graduação em Ed. Física / Ciências do Esporte', icon: 'medal' },
  { v: 'fisio', l: 'Fisioterapeuta', icon: 'shieldCheck' },
  { v: 'snc', l: 'Strength & Conditioning', icon: 'flame' },
  { v: 'outra', l: 'Outra certificação', icon: 'plus' },
];

const FITNESS_LEVELS = [
  { n: 1, title: 'Atleta de elite', sub: 'Competitivo, performance máxima' },
  { n: 2, title: 'Muito condicionado', sub: 'Treino intenso e frequente' },
  { n: 3, title: 'Condicionado', sub: 'Boa base, treino consistente' },
  { n: 4, title: 'Mediano', sub: 'Ativo, sem foco em performance' },
  { n: 5, title: 'Moderadamente ativo', sub: 'Movimento regular e leve' },
];

const METHODS = [
  'CrossFit', 'Treino Funcional', 'HIIT', 'Circuito', 'Musculação / Bodybuilding',
  'Treino de Força', 'Corrida', 'Mobilidade', 'Performance Atlética', 'Calistenia',
  'Treino em Máquinas', 'Outro',
];

const ENVIRONMENTS = [
  { v: 'box', l: 'CrossFit Box' },
  { v: 'gym', l: 'Academia comercial' },
  { v: 'park', l: 'Parque de calistenia' },
  { v: 'out-no', l: 'Ar livre — sem equipamento' },
  { v: 'out-band', l: 'Ar livre — elásticos' },
  { v: 'in-no', l: 'Indoor — sem equipamento' },
  { v: 'in-band', l: 'Indoor — elásticos' },
];

const INTENSITY = ['Moderada', 'Desafiadora', 'Variável', 'Altamente exigente'];

const STYLES = [
  { v: 'motiv', l: 'Motivacional', icon: 'flame' },
  { v: 'prof', l: 'Profissional', icon: 'shield' },
  { v: 'tech', l: 'Técnico', icon: 'compass' },
  { v: 'perf', l: 'Orientado a performance', icon: 'zap' },
  { v: 'humor', l: 'Descontraído / Bem-humorado', icon: 'sparkles' },
  { v: 'emp', l: 'Empático', icon: 'heart' },
  { v: 'direct', l: 'Direto', icon: 'target' },
  { v: 'disc', l: 'Disciplinado', icon: 'mountain' },
];

const PRINCIPLES = [
  'Qualidade antes da intensidade',
  'Intensidade antes da perfeição',
  'Saúde em primeiro lugar',
  'Força em primeiro lugar',
  'Atletismo em primeiro lugar',
  'Mobilidade em primeiro lugar',
  'Prazer e motivação primeiro',
  'Função acima da estética',
  'Progresso sustentável',
];

const FOCUS_ITEMS = [
  { k: 'strength', label: 'Força' },
  { k: 'endurance', label: 'Resistência' },
  { k: 'mobility', label: 'Mobilidade' },
  { k: 'athletic', label: 'Performance atlética' },
  { k: 'coord', label: 'Coordenação' },
  { k: 'balance', label: 'Estabilidade / Equilíbrio' },
];
const FOCUS_COLORS = {
  strength: B.cyan, endurance: B.cyanSoft, mobility: B.lavender,
  athletic: B.coral, coord: B.amber, balance: B.green,
};

const FAV_SUGGEST = ['Burpees', 'Kettlebell Swing', 'Agachamento livre', 'Farmer Carry', 'Wall Ball', 'Afundo', 'Turkish Get-Up', 'Barra fixa', 'Tiros / Sprint', 'Clean', 'Snatch', 'Remada'];
const AVOID_SUGGEST = ['Box jump', 'Levantamento terra pesado', 'Abdominal supra (sit-up)', 'Corrida de longa distância', 'Salto com impacto'];

const FORMATS = ['EMOM', 'AMRAP', 'For Time', 'Intervalado', 'Circuito', 'Super-séries', 'Força + MetCon', 'Apenas Força', 'Apenas Condicionamento', 'Tabata'];

const STRUCTURE_BLOCKS = [
  { k: 'mobility', label: 'Mobilidade', sub: 'Preparar articulações e amplitude', icon: 'wave', color: B.lavender },
  { k: 'warmup', label: 'Aquecimento', sub: 'Elevar temperatura e ativar', icon: 'flame', color: B.amber },
  { k: 'technique', label: 'Técnica', sub: 'Padrão de movimento e drills', icon: 'compass', color: B.cyanSoft },
  { k: 'strength', label: 'Força', sub: 'Bloco principal de carga', icon: 'dumbbell', color: B.cyan },
  { k: 'conditioning', label: 'Condicionamento / WOD', sub: 'Estímulo metabólico', icon: 'zap', color: B.coral },
  { k: 'cooldown', label: 'Volta à calma', sub: 'Reduzir e recuperar', icon: 'heart', color: B.green },
];

const CURVES = [
  { v: 'progressive', l: 'Crescente progressiva', d: 'Sobe de forma constante até o pico final' },
  { v: 'wave', l: 'Ondulatória', d: 'Picos e vales alternados ao longo da sessão' },
  { v: 'early', l: 'Pico inicial', d: 'Estímulo mais forte no começo' },
  { v: 'late', l: 'Pico tardio', d: 'Construção longa, explosão no fim' },
  { v: 'consistent', l: 'Constante', d: 'Intensidade estável do início ao fim' },
];

const TONES = ['Profissional', 'Motivacional', 'Descontraído', 'Atlético', 'Direto', 'Técnico'];

const CLIENTS = [
  'Iniciantes', 'Intermediários', 'Atletas avançados', 'Mulheres', 'Homens', 'Idosos',
  'Trabalho de escritório', 'Emagrecimento', 'Ganho de massa', 'Reabilitação',
  'Entusiastas de funcional', 'Atletas de CrossFit',
];

const MOTTO_EXAMPLES = [
  'Mova-se melhor antes de mover-se mais forte.',
  'Força para a vida cotidiana.',
  'Treino sem desculpas.',
  'Qualidade acima da quantidade.',
];

// ─────────── COACHING ARCHETYPES (output signature) ───────────
const ARCHETYPES = {
  performance: { name: 'Arquiteto de Performance', tag: 'Performance Architect', color: B.coral, icon: 'zap',
    sub: 'Constrói atletas. Carga, potência e progressão mensurável guiam cada sessão.' },
  technician: { name: 'O Técnico', tag: 'The Technician', color: B.cyan, icon: 'compass',
    sub: 'Padrão de movimento impecável antes de qualquer intensidade.' },
  motivator: { name: 'O Motivador', tag: 'The Motivator', color: B.amber, icon: 'flame',
    sub: 'Energia e adesão em primeiro lugar — o treino tem que ser irresistível.' },
  guide: { name: 'O Guia', tag: 'The Guide', color: B.green, icon: 'heart',
    sub: 'Saúde, longevidade e cuidado conduzem o progresso de cada aluno.' },
  drill: { name: 'O Disciplinador', tag: 'The Drill Coach', color: '#FF4D4D', icon: 'mountain',
    sub: 'Padrão alto, sem atalhos. Disciplina constrói resultado.' },
  movement: { name: 'Especialista em Movimento', tag: 'Movement Specialist', color: B.lavender, icon: 'wave',
    sub: 'Mobilidade e função acima da estética. Corpo que se move bem para sempre.' },
};

// ═══════════════════════════════════════════════════════════════
// INTRO
// ═══════════════════════════════════════════════════════════════
function StepIntro() {
  return (
    <div className="step-fade">
      <div style={{
        width: 56, height: 56, borderRadius: 18,
        background: `linear-gradient(135deg, ${B.coral} 0%, #C23B22 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 18, boxShadow: `0 12px 30px ${B.coral}44`,
      }}>
        <Icon name="fingerprint" size={28} color="#fff" stroke={2}/>
      </div>
      <div style={{
        fontSize: 10.5, fontWeight: 700, color: B.coral, letterSpacing: '.18em',
        textTransform: 'uppercase', fontFamily: FF_MONO, marginBottom: 8,
      }}>COACH STUDIO · FEED THE AI</div>
      <h1 style={{
        margin: 0, fontFamily: FF_DISPLAY, fontSize: 30, lineHeight: 1.08,
        fontWeight: 800, letterSpacing: '-0.02em',
      }}>Coach DNA</h1>
      <div style={{
        marginTop: 10, fontSize: 13.5, color: B.textSec, lineHeight: 1.55,
      }}>
        Sua identidade técnica, seu estilo e sua metodologia — capturados para que a
        IA gere treinos com a <b style={{ color: B.text }}>sua assinatura</b>, e não recomendações genéricas.
      </div>

      <div style={{
        marginTop: 22, padding: 14, borderRadius: 14,
        background: B.surfRaised, border: `1px solid ${B.border}`,
      }}>
        {[
          ['user', 'Identidade, formação e nível pessoal'],
          ['compass', 'Métodos, ambientes e princípios de treino'],
          ['fingerprint', 'Coach DNA — seu estilo único de coaching'],
          ['percent', 'Distribuição de foco e estrutura de sessão'],
          ['quote', 'Filosofia e personalidade da IA'],
        ].map(([icon, label]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', fontSize: 13 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: `${B.coral}18`, color: B.coral,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Icon name={icon} size={14} stroke={2}/></div>
            {label}
          </div>
        ))}
      </div>

      <PrivacyNote tone="coach">
        Quanto mais fiel for seu perfil, mais os treinos parecerão escritos por você.
        Pode salvar e refinar a qualquer momento.
      </PrivacyNote>

      <div style={{ marginTop: 14, fontSize: 11, color: B.textMute, fontFamily: FF_MONO, letterSpacing: '.04em' }}>
        ≈ 5–8 min · 12 blocos · alimenta o AI Coach Engine
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 01 · IDENTIDADE
// ═══════════════════════════════════════════════════════════════
function Step01({ data, set }) {
  const d = data.identity || {};
  const u = (k, v) => set('identity', { ...d, [k]: v });
  return (
    <div className="step-fade">
      <StepHeader idx={1} total={TOTAL} title="Identidade do treinador"
        sub="O básico que personaliza a relação com seus alunos."/>
      <div style={{ height: 16 }}/>

      <PhotoSlot value={d.photo} onChange={(v) => u('photo', v)} name={d.name}/>
      <div style={{ height: 16 }}/>

      <div style={{ display: 'grid', gap: 12 }}>
        <Field label="Nome completo" value={d.name} onChange={(v) => u('name', v)} placeholder="Como você assina seus treinos"/>
        <div>
          <FieldLabel hint="ajuda a calibrar exemplos e linguagem">Gênero</FieldLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['Masculino', 'Feminino', 'Outro', 'Prefiro não informar'].map(s => (
              <Chip key={s} active={d.gender === s} onClick={() => u('gender', s)}>{s}</Chip>
            ))}
          </div>
        </div>
        <Field label="Idade" value={d.age} onChange={(v) => u('age', v)} placeholder="34" type="number" suffix="anos" optional/>
      </div>

      <VoiceBar active={data.voice === 1} onToggle={() => set('voice', data.voice === 1 ? null : 1)}
        hint="Ex.: “Sou o Rafael, tenho 34 anos, treinador há 10 anos.”"/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 02 · FORMAÇÃO & EXPERIÊNCIA
// ═══════════════════════════════════════════════════════════════
function Step02({ data, set }) {
  const d = data.background || { years: 8, certs: [] };
  const u = (k, v) => set('background', { ...d, [k]: v });
  const toggle = (c) => {
    const s = new Set(d.certs || []); s.has(c) ? s.delete(c) : s.add(c);
    u('certs', [...s]);
  };
  return (
    <div className="step-fade">
      <StepHeader idx={2} total={TOTAL} title="Formação e experiência"
        sub="Define autoridade técnica e o nível de complexidade que a IA pode propor."/>
      <div style={{ height: 16 }}/>

      <div style={{ padding: 16, borderRadius: 14, background: B.surfRaised, border: `1px solid ${B.border}` }}>
        <Slider value={d.years} onChange={(v) => u('years', v)} min={0} max={40} suffix=" anos"
          label="Anos de experiência como coach"/>
      </div>

      <div style={{ height: 18 }}/>
      <FieldLabel hint="seleção múltipla">Certificações / Formação</FieldLabel>
      <div style={{ display: 'grid', gap: 8 }}>
        {CERTS.map(c => (
          <ChoiceCard key={c.v} active={(d.certs || []).includes(c.v)} onClick={() => toggle(c.v)} icon={c.icon} title={c.l}/>
        ))}
      </div>

      <VoiceBar active={data.voice === 2} onToggle={() => set('voice', data.voice === 2 ? null : 2)}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 03 · NÍVEL FÍSICO PESSOAL
// ═══════════════════════════════════════════════════════════════
function Step03({ data, set }) {
  const d = data.fitness || { level: 3 };
  return (
    <div className="step-fade">
      <StepHeader idx={3} total={TOTAL} title="Seu nível físico atual"
        sub="O treinador também é um atleta. Isso calibra o tom e os exemplos que a IA usa."/>
      <div style={{ height: 16 }}/>
      <Hint>Onde você está hoje? Sem julgamento — apenas referência para a IA conversar na sua linguagem.</Hint>

      <LevelPicker value={d.level} onChange={(v) => set('fitness', { level: v })} items={FITNESS_LEVELS}/>

      <PrivacyNote tone="default">
        Não define a dificuldade dos treinos dos alunos — apenas a sua referência pessoal de performance.
      </PrivacyNote>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 04 · MÉTODOS, AMBIENTES & INTENSIDADE
// ═══════════════════════════════════════════════════════════════
function Step04({ data, set }) {
  const d = data.training || { methods: [], envs: [], intensity: null };
  const u = (k, v) => set('training', { ...d, [k]: v });
  const tog = (key, val) => {
    const s = new Set(d[key] || []); s.has(val) ? s.delete(val) : s.add(val);
    u(key, [...s]);
  };
  return (
    <div className="step-fade">
      <StepHeader idx={4} total={TOTAL} title="Como e onde você treina"
        sub="Os métodos e ambientes que você domina viram o vocabulário da IA."/>
      <div style={{ height: 16 }}/>

      <FieldLabel hint="seleção múltipla">Métodos de treino preferidos</FieldLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
        {METHODS.map(m => <Chip key={m} active={(d.methods || []).includes(m)} onClick={() => tog('methods', m)} multi>{m}</Chip>)}
      </div>

      <FieldLabel hint="seleção múltipla">Ambientes de treino</FieldLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
        {ENVIRONMENTS.map(e => <Chip key={e.v} active={(d.envs || []).includes(e.v)} onClick={() => tog('envs', e.v)} multi color={B.cyanSoft}>{e.l}</Chip>)}
      </div>

      <FieldLabel hint="seleção única">Intensidade geral dos treinos</FieldLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {INTENSITY.map(i => <Chip key={i} active={d.intensity === i} onClick={() => u('intensity', i)} color={B.coral}>{i}</Chip>)}
      </div>

      <VoiceBar active={data.voice === 4} onToggle={() => set('voice', data.voice === 4 ? null : 4)}
        hint="Ex.: “Trabalho funcional e força, em box e ar livre, intensidade desafiadora.”"/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 05 · COACH DNA · ESTILO
// ═══════════════════════════════════════════════════════════════
function Step05({ data, set }) {
  const d = data.dna || { style: [], principles: [] };
  const u = (k, v) => set('dna', { ...d, [k]: v });
  const toggle = (s) => {
    const ss = new Set(d.style || []); ss.has(s) ? ss.delete(s) : ss.add(s);
    u('style', [...ss]);
  };
  return (
    <div className="step-fade">
      <StepHeader idx={5} total={TOTAL} title="Estilo de coaching" badge="Coach DNA"
        sub="A personalidade que atravessa cada treino que você entrega."/>
      <div style={{ height: 16 }}/>
      <Hint>Como seus alunos descreveriam você como treinador? Escolha quantos representarem você.</Hint>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {STYLES.map(s => {
          const active = (d.style || []).includes(s.v);
          return (
            <button key={s.v} onClick={() => toggle(s.v)} style={{
              padding: '13px 12px', borderRadius: 13,
              background: active ? `${B.coral}1c` : B.surfRaised,
              border: `1.5px solid ${active ? B.coral : B.border}`,
              color: B.text, fontFamily: 'inherit', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, textAlign: 'left',
            }}>
              <Icon name={s.icon} size={17} color={active ? B.coral : B.textSec} stroke={2}/>
              <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.2 }}>{s.l}</div>
            </button>
          );
        })}
      </div>

      <PrivacyNote tone="coach">
        Esta é a parte mais decisiva do perfil — é o que dá <b>personalidade de coach</b> aos treinos gerados.
      </PrivacyNote>

      <VoiceBar active={data.voice === 5} onToggle={() => set('voice', data.voice === 5 ? null : 5)}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 06 · COACH DNA · PRINCÍPIOS (max 3)
// ═══════════════════════════════════════════════════════════════
function Step06({ data, set }) {
  const d = data.dna || { style: [], principles: [] };
  const u = (k, v) => set('dna', { ...d, [k]: v });
  const sel = d.principles || [];
  const atMax = sel.length >= 3;
  const toggle = (p) => {
    if (sel.includes(p)) u('principles', sel.filter(x => x !== p));
    else if (!atMax) u('principles', [...sel, p]);
  };
  return (
    <div className="step-fade">
      <StepHeader idx={6} total={TOTAL} title="Princípios fundamentais" badge="Escolha até 3"
        sub="As convicções inegociáveis que orientam toda decisão de treino."/>
      <div style={{ height: 16 }}/>

      <div style={{ display: 'grid', gap: 8 }}>
        {PRINCIPLES.map((p, i) => {
          const active = sel.includes(p);
          const rank = sel.indexOf(p) + 1;
          const dim = atMax && !active;
          return (
            <button key={p} onClick={() => toggle(p)} disabled={dim} style={{
              width: '100%', padding: '13px 14px', borderRadius: 13,
              background: active ? `${B.cyan}14` : B.surfRaised,
              border: `1.5px solid ${active ? B.cyan : B.border}`,
              color: B.text, fontFamily: 'inherit',
              cursor: dim ? 'not-allowed' : 'pointer', opacity: dim ? 0.4 : 1,
              display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: active ? B.cyan : 'transparent',
                border: active ? 'none' : `1.5px solid ${B.borderSoft}`,
                color: B.navy, fontFamily: FF_DISPLAY, fontWeight: 800, fontSize: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{active ? rank : ''}</div>
              <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1 }}>{p}</span>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: atMax ? B.amber : B.textMute, fontFamily: FF_MONO, letterSpacing: '.04em' }}>
        {sel.length}/3 selecionados {atMax ? '· limite atingido' : ''}
      </div>

      <VoiceBar active={data.voice === 6} onToggle={() => set('voice', data.voice === 6 ? null : 6)}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 07 · DISTRIBUIÇÃO DE FOCO (= 100%)
// ═══════════════════════════════════════════════════════════════
function Step07({ data, set }) {
  const d = data.focus || { strength: 30, endurance: 20, mobility: 15, athletic: 15, coord: 10, balance: 10 };
  return (
    <div className="step-fade">
      <StepHeader idx={7} total={TOTAL} title="Distribuição de foco" badge="Total = 100%"
        sub="Quanto de cada capacidade você prioriza, em média, ao desenhar um plano."/>
      <div style={{ height: 16 }}/>

      <FocusBars items={FOCUS_ITEMS} values={d} onChange={(v) => set('focus', v)} colorMap={FOCUS_COLORS}/>

      <PrivacyNote tone="default">
        Vira o <b>peso base</b> de cada sessão gerada — força, resistência, mobilidade e o resto na sua proporção.
      </PrivacyNote>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 08 · EXERCÍCIOS FAVORITOS & A EVITAR
// ═══════════════════════════════════════════════════════════════
function Step08({ data, set }) {
  const d = data.exercises || { favorites: [], avoid: [] };
  const u = (k, v) => set('exercises', { ...d, [k]: v });
  return (
    <div className="step-fade">
      <StepHeader idx={8} total={TOTAL} title="Exercícios assinatura"
        sub="Os movimentos que sempre aparecem nos seus treinos — e os que nunca entram."/>
      <div style={{ height: 16 }}/>

      <FieldLabel hint="até 10">Exercícios favoritos</FieldLabel>
      <TagPicker value={d.favorites} onChange={(v) => u('favorites', v)} suggestions={FAV_SUGGEST}
        max={10} placeholder="Digite e pressione Enter" color={B.cyan}/>

      <div style={{ height: 22 }}/>
      <FieldLabel hint="texto livre">Exercícios a evitar</FieldLabel>
      <TagPicker value={d.avoid} onChange={(v) => u('avoid', v)} suggestions={AVOID_SUGGEST}
        max={12} placeholder="Ex.: box jump, terra pesado…" color={B.coral}/>

      <PrivacyNote tone="default">
        A IA <b>nunca</b> inclui um movimento da lista de evitar — vira regra rígida no gerador.
      </PrivacyNote>

      <VoiceBar active={data.voice === 8} onToggle={() => set('voice', data.voice === 8 ? null : 8)}
        hint="Ex.: “Amo kettlebell swing e farmer carry. Evito box jump.”"/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 09 · FORMATOS & CURVA DE INTENSIDADE
// ═══════════════════════════════════════════════════════════════
function Step09({ data, set }) {
  const d = data.design || { formats: [], curve: null };
  const u = (k, v) => set('design', { ...d, [k]: v });
  const tog = (f) => {
    const s = new Set(d.formats || []); s.has(f) ? s.delete(f) : s.add(f);
    u('formats', [...s]);
  };
  return (
    <div className="step-fade">
      <StepHeader idx={9} total={TOTAL} title="Formatos e curva de intensidade"
        sub="Os moldes de WOD que você usa e como a energia da sessão se distribui."/>
      <div style={{ height: 16 }}/>

      <FieldLabel hint="seleção múltipla">Formatos de treino preferidos</FieldLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
        {FORMATS.map(f => <Chip key={f} active={(d.formats || []).includes(f)} onClick={() => tog(f)} multi mono>{f}</Chip>)}
      </div>

      <FieldLabel hint="seleção única">Curva de intensidade preferida</FieldLabel>
      <div style={{ display: 'grid', gap: 8 }}>
        {CURVES.map(c => (
          <ChoiceCard key={c.v} active={d.curve === c.v} onClick={() => u('curve', c.v)}
            icon="gauge" title={c.l} sub={c.d} color={B.coral}/>
        ))}
      </div>

      <VoiceBar active={data.voice === 9} onToggle={() => set('voice', data.voice === 9 ? null : 9)}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 10 · ESTRUTURA DA SESSÃO (drag-to-order)
// ═══════════════════════════════════════════════════════════════
function Step10({ data, set }) {
  const d = data.structure || STRUCTURE_BLOCKS.map(b => b.k);
  const ordered = d.map(k => STRUCTURE_BLOCKS.find(b => b.k === k)).filter(Boolean);
  return (
    <div className="step-fade">
      <StepHeader idx={10} total={TOTAL} title="Estrutura da sessão" badge="Arraste para ordenar"
        sub="A sequência típica que você usa ao montar um treino. Arraste ou use as setas."/>
      <div style={{ height: 16 }}/>

      <StructureSorter items={ordered} onChange={(next) => set('structure', next.map(b => b.k))}/>

      <PrivacyNote tone="default">
        Vira o <b>esqueleto</b> de toda sessão gerada — seus blocos, na sua ordem.
      </PrivacyNote>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 11 · COMUNICAÇÃO & PÚBLICO-ALVO
// ═══════════════════════════════════════════════════════════════
function Step11({ data, set }) {
  const d = data.audience || { tone: [], clients: [] };
  const u = (k, v) => set('audience', { ...d, [k]: v });
  const tog = (key, val) => {
    const s = new Set(d[key] || []); s.has(val) ? s.delete(val) : s.add(val);
    u(key, [...s]);
  };
  return (
    <div className="step-fade">
      <StepHeader idx={11} total={TOTAL} title="Comunicação e público"
        sub="O tom das suas mensagens e quem você mais atende."/>
      <div style={{ height: 16 }}/>

      <FieldLabel hint="como a IA fala com seus alunos">Tom de comunicação</FieldLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
        {TONES.map(t => <Chip key={t} active={(d.tone || []).includes(t)} onClick={() => tog('tone', t)} multi>{t}</Chip>)}
      </div>

      <FieldLabel hint="seleção múltipla">Perfis de cliente que você foca</FieldLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {CLIENTS.map(c => <Chip key={c} active={(d.clients || []).includes(c)} onClick={() => tog('clients', c)} multi color={B.lavender}>{c}</Chip>)}
      </div>

      <VoiceBar active={data.voice === 11} onToggle={() => set('voice', data.voice === 11 ? null : 11)}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 12 · FILOSOFIA & PERSONALIDADE DA IA
// ═══════════════════════════════════════════════════════════════
function Step12({ data, set }) {
  const d = data.philosophy || { motto: '', prompt: '' };
  const u = (k, v) => set('philosophy', { ...d, [k]: v });
  return (
    <div className="step-fade">
      <StepHeader idx={12} total={TOTAL} title="Filosofia e personalidade da IA" badge="Final"
        sub="A frase que te define e a descrição que dá voz à sua IA."/>
      <div style={{ height: 16 }}/>

      <Field label="Lema / Filosofia" value={d.motto} onChange={(v) => u('motto', v)}
        placeholder="Sua frase de coach"/>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {MOTTO_EXAMPLES.map(m => (
          <button key={m} onClick={() => u('motto', m)} style={{
            padding: '6px 11px', borderRadius: 999,
            background: 'transparent', border: `1px dashed ${B.borderSoft}`,
            color: B.textSec, fontFamily: 'inherit', fontSize: 11, fontWeight: 500,
            cursor: 'pointer', fontStyle: 'italic',
          }}>“{m}”</button>
        ))}
      </div>

      <div style={{ height: 22 }}/>
      <TextArea label="Descrição da experiência de coaching (prompt de IA)" rows={4}
        value={d.prompt} onChange={(v) => u('prompt', v)}
        placeholder="Em 1–2 frases: como seus alunos devem sentir o seu treino?"
        helper="Ex.: “Meu coaching une força funcional, condicionamento atlético e progresso sustentável. Quero que cada aluno termine desafiado, capaz e vitorioso.”"
        optional/>

      <PrivacyNote tone="coach">
        Este campo é o que mantém os treinos <b>consistentes com a sua identidade</b> — como se você os tivesse escrito.
      </PrivacyNote>

      <VoiceBar active={data.voice === 12} onToggle={() => set('voice', data.voice === 12 ? null : 12)}
        hint="Dite sua filosofia e a IA estrutura o prompt para você."/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// OUTPUT · COACH DNA SIGNATURE
// ═══════════════════════════════════════════════════════════════
function StepOutput({ data, archetype }) {
  const a = ARCHETYPES[archetype];
  const d = data;
  const styleLabels = (d.dna?.style || []).map(v => STYLES.find(s => s.v === v)?.l).filter(Boolean);
  const topFocus = FOCUS_ITEMS
    .map(f => ({ ...f, v: (d.focus || {})[f.k] || 0 }))
    .sort((x, y) => y.v - x.v).slice(0, 3);
  const lines = [
    ['coach', d.identity?.name || '—'],
    ['experiencia', `${d.background?.years ?? '—'} anos`],
    ['estilo', styleLabels.slice(0, 3).join(', ') || '—'],
    ['principios', (d.dna?.principles || []).length],
    ['metodos', (d.training?.methods || []).length],
    ['foco_top', topFocus.map(f => `${f.label.split(' ')[0].toLowerCase()} ${f.v}%`).join(' · ')],
    ['favoritos', (d.exercises?.favorites || []).length],
    ['evitar', (d.exercises?.avoid || []).length],
    ['formatos', (d.design?.formats || []).length],
    ['publico', (d.audience?.clients || []).length],
    ['archetype', a.tag],
  ];
  return (
    <div className="step-fade">
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: `linear-gradient(135deg, ${a.color} 0%, ${a.color}99 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16, boxShadow: `0 12px 30px ${a.color}44`,
      }}>
        <Icon name={a.icon} size={28} color={B.navy} stroke={2.2}/>
      </div>

      <div style={{
        fontSize: 10.5, fontWeight: 700, color: a.color, letterSpacing: '.18em',
        textTransform: 'uppercase', fontFamily: FF_MONO, marginBottom: 8,
      }}>SAÍDA · COACH DNA</div>
      <h1 style={{ margin: 0, fontFamily: FF_DISPLAY, fontSize: 27, lineHeight: 1.1, fontWeight: 800, letterSpacing: '-0.01em' }}>
        {a.name}
      </h1>
      <div style={{ marginTop: 6, fontSize: 12.5, color: B.textSec, lineHeight: 1.5 }}>{a.sub}</div>

      {/* archetype scale */}
      <div style={{ display: 'flex', gap: 4, marginTop: 16 }}>
        {Object.entries(ARCHETYPES).map(([k, ar]) => (
          <div key={k} style={{
            flex: 1, height: 6, borderRadius: 3,
            background: k === archetype ? ar.color : B.border,
          }}/>
        ))}
      </div>

      <div style={{
        marginTop: 18, padding: 16, borderRadius: 14,
        background: B.surfRaised, border: `1px solid ${B.border}`,
      }}>
        <div style={{
          fontFamily: FF_MONO, fontSize: 11, color: B.cyanSoft, letterSpacing: '.04em',
          paddingBottom: 8, marginBottom: 8, borderBottom: `1px dashed ${B.border}`,
        }}>// coach_dna.json</div>
        <div style={{ display: 'grid', gap: 6, fontFamily: FF_MONO, fontSize: 11.5, lineHeight: 1.45 }}>
          {lines.map(([k, v]) => (
            <div key={k} style={{ display: 'grid', gridTemplateColumns: '108px 1fr', alignItems: 'baseline', gap: 8 }}>
              <span style={{ color: B.textMute, fontSize: 10.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k}</span>
              <span style={{ color: k === 'archetype' ? a.color : B.text, fontWeight: 600 }}>{String(v)}</span>
            </div>
          ))}
        </div>
      </div>

      {d.philosophy?.motto && (
        <div style={{
          marginTop: 14, padding: 16, borderRadius: 14,
          background: `${a.color}10`, border: `1px solid ${a.color}44`,
          display: 'flex', gap: 12,
        }}>
          <Icon name="quote" size={18} color={a.color} stroke={2}/>
          <div style={{ flex: 1, fontFamily: FF_DISPLAY, fontSize: 15, fontWeight: 700, fontStyle: 'italic', lineHeight: 1.35 }}>
            {d.philosophy.motto}
          </div>
        </div>
      )}

      <PrivacyNote tone="coach">
        Seu <b>Coach DNA</b> está pronto. A partir de agora, todo treino gerado carrega a sua assinatura — pronto para conectar ao seu Studio.
      </PrivacyNote>
    </div>
  );
}

// Expose
Object.assign(window, {
  TOTAL_STEPS: TOTAL,
  StepIntro, Step01, Step02, Step03, Step04, Step05, Step06,
  Step07, Step08, Step09, Step10, Step11, Step12, StepOutput,
  ARCHETYPES, STYLES, FOCUS_ITEMS, FITNESS_LEVELS, CERTS,
});
