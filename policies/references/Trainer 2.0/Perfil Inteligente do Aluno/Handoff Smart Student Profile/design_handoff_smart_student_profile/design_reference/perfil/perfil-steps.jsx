// perfil-steps.jsx — 14 blocks of Módulo 1 + intro + output screen
// Atoms come from window: B, Icon, Chip, ChoiceCard, Field, PrivacyNote, Hint, VoiceBar, StepHeader, Slider, ToggleRow, FF_DISPLAY, FF_MONO

const TOTAL = 14;

// ─────────── INTRO ───────────
function StepIntro({ data, set, next }) {
  return (
    <div className="step-fade">
      <div style={{
        width: 56, height: 56, borderRadius: 18,
        background: `linear-gradient(135deg, ${B.cyan} 0%, ${B.cyanDeep} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 18, boxShadow: `0 12px 30px ${B.cyan}33`,
      }}>
        <Icon name="brain" size={28} color={B.navy} stroke={2}/>
      </div>
      <div style={{
        fontSize: 10.5, fontWeight: 700, color: B.cyan, letterSpacing: '.18em',
        textTransform: 'uppercase', fontFamily: FF_MONO, marginBottom: 8,
      }}>MÓDULO 01 · BASE PREDITIVA</div>
      <h1 style={{
        margin: 0, fontFamily: FF_DISPLAY, fontSize: 30, lineHeight: 1.1,
        fontWeight: 700, letterSpacing: '-0.02em',
      }}>Perfil Inteligente<br/>do Aluno</h1>
      <div style={{
        marginTop: 10, fontSize: 13.5, color: B.textSec, lineHeight: 1.55,
      }}>
        Saúde, Movimento, Privacidade e Base Preditiva.
        <br/><br/>
        Vamos construir juntos o seu <b style={{ color: B.text }}>Perfil de Treinabilidade Ampliado</b> —
        a base que o TrAIner usa para adaptar intensidade, segurança e progressão do seu plano.
      </div>

      <div style={{
        marginTop: 22, padding: 14, borderRadius: 14,
        background: B.surfRaised, border: `1px solid ${B.border}`,
      }}>
        {[
          ['user', 'Dados básicos, objetivos e histórico'],
          ['shield', 'Saúde declarada — sem diagnóstico'],
          ['accessibility', 'Capacidade funcional e acessibilidade'],
          ['lock', 'Fatores sensíveis ficam protegidos'],
          ['sparkles', 'Ritmo do Corpo — opt-in, sempre privado'],
        ].map(([icon, label]) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '8px 0', fontSize: 13,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: `${B.cyan}18`, color: B.cyan,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Icon name={icon} size={14} stroke={2}/></div>
            {label}
          </div>
        ))}
      </div>

      <PrivacyNote tone="default">
        Você pode salvar e retomar a qualquer momento. Nenhum dado parcial é perdido.
        Toda informação sensível é mascarada antes de chegar ao seu treinador.
      </PrivacyNote>

      <div style={{ marginTop: 14, fontSize: 11, color: B.textMute, fontFamily: FF_MONO, letterSpacing: '.04em' }}>
        ≈ 6–9 min · 14 blocos · LGPD compatível
      </div>
    </div>
  );
}

// ─────────── 7.1 DADOS BÁSICOS ───────────
function Step01({ data, set }) {
  const d = data.basic || {};
  const u = (k, v) => set('basic', { ...d, [k]: v });
  return (
    <div className="step-fade">
      <StepHeader idx={1} total={TOTAL} title="Dados básicos"
        sub="Para adaptar intensidade, linguagem, segurança e evolução do seu plano."/>
      <div style={{ height: 16 }}/>
      <Hint>Usamos essas informações para adaptar intensidade, linguagem, segurança e evolução do seu plano.</Hint>

      <div style={{ display: 'grid', gap: 12 }}>
        <Field label="Nome" value={d.name} onChange={(v) => u('name', v)} placeholder="Como devemos te chamar?"/>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Idade" value={d.age} onChange={(v) => u('age', v)} placeholder="32" type="number" suffix="anos"/>
          <Field label="Idioma" value={d.lang || 'Português'} onChange={(v) => u('lang', v)} placeholder="Português"/>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Altura" value={d.height} onChange={(v) => u('height', v)} placeholder="172" type="number" suffix="cm"/>
          <Field label="Peso atual" value={d.weight} onChange={(v) => u('weight', v)} placeholder="68" type="number" suffix="kg" helper="opcional"/>
        </div>

        <div>
          <div style={{
            fontSize: 11.5, fontWeight: 600, color: B.textSec,
            textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8,
          }}>Sexo biológico <span style={{ textTransform: 'none', color: B.textMute, fontWeight: 400 }}>· útil para métricas e ciclo</span></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['Feminino', 'Masculino', 'Intersexo', 'Prefiro não informar'].map(s => (
              <Chip key={s} active={d.sex === s} onClick={() => u('sex', s)}>{s}</Chip>
            ))}
          </div>
        </div>

        <Field label="Contato de emergência" value={d.emergency} onChange={(v) => u('emergency', v)}
          placeholder="Nome e telefone" helper="recomendado para treino supervisionado ou risco elevado"/>
      </div>

      <VoiceBar active={data.voice === 1} onToggle={() => set('voice', data.voice === 1 ? null : 1)}
        hint="Ex.: “Tenho 32 anos, 1m72, 68 kg, falo português.”"/>
    </div>
  );
}

// ─────────── 7.2 OBJETIVOS ───────────
const GOALS = [
  { v: 'hipertrofia', l: 'Hipertrofia', icon: 'activity' },
  { v: 'emagrecimento', l: 'Emagrecimento', icon: 'zap' },
  { v: 'forca', l: 'Ganho de força', icon: 'target' },
  { v: 'condicionamento', l: 'Condicionamento', icon: 'heart' },
  { v: 'mobilidade', l: 'Mobilidade', icon: 'accessibility' },
  { v: 'longevidade', l: 'Longevidade', icon: 'shieldCheck' },
  { v: 'retorno', l: 'Retorno ao treino', icon: 'plus' },
  { v: 'bemestar', l: 'Bem-estar emocional', icon: 'sparkles' },
  { v: 'autonomia', l: 'Autonomia diária', icon: 'user' },
  { v: 'equilibrio', l: 'Equilíbrio', icon: 'ruler' },
  { v: 'composicao', l: 'Composição corporal', icon: 'pill' },
  { v: 'performance', l: 'Performance esportiva', icon: 'zap' },
];

function Step02({ data, set }) {
  const d = data.goals || { primary: null, secondary: [] };
  const togglePrimary = (v) => set('goals', { ...d, primary: d.primary === v ? null : v });
  const toggleSec = (v) => {
    const s = new Set(d.secondary || []);
    s.has(v) ? s.delete(v) : s.add(v);
    set('goals', { ...d, secondary: [...s] });
  };
  return (
    <div className="step-fade">
      <StepHeader idx={2} total={TOTAL} title="O que o movimento pode melhorar na sua vida?"
        sub="Estética, performance, saúde, autonomia ou bem-estar — tudo é válido."/>
      <div style={{ height: 16 }}/>
      <Hint>O que você gostaria que o movimento melhorasse na sua vida?</Hint>

      <div style={{ fontSize: 11, fontWeight: 700, color: B.cyan, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>
        Objetivo principal <span style={{ color: B.coral }}>*</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {GOALS.slice(0, 8).map(g => (
          <button key={g.v} onClick={() => togglePrimary(g.v)} style={{
            padding: '12px 10px', borderRadius: 12,
            background: d.primary === g.v ? `${B.cyan}1f` : B.surfRaised,
            border: `1.5px solid ${d.primary === g.v ? B.cyan : B.border}`,
            color: B.text, fontFamily: 'inherit', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
            textAlign: 'left',
          }}>
            <Icon name={g.icon} size={16} color={d.primary === g.v ? B.cyan : B.textSec} stroke={2}/>
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>{g.l}</div>
          </button>
        ))}
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: B.textSec, letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 20, marginBottom: 8 }}>
        Objetivos secundários <span style={{ color: B.textMute, textTransform: 'none', fontWeight: 400 }}>opcionais</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {GOALS.map(g => (
          <Chip key={g.v} active={(d.secondary || []).includes(g.v)} onClick={() => toggleSec(g.v)} multi>
            {g.l}
          </Chip>
        ))}
      </div>

      <VoiceBar active={data.voice === 2} onToggle={() => set('voice', data.voice === 2 ? null : 2)}
        hint="Ex.: “Quero ganhar força, mas o principal é melhorar minha mobilidade.”"/>
    </div>
  );
}

// ─────────── 7.3 HISTÓRICO DE TREINO ───────────
const ABANDON = ['Falta de tempo', 'Lesão', 'Falta de resultado', 'Desmotivação', 'Custo', 'Mudança de rotina', 'Constrangimento', 'Outro'];
const MODALITIES = ['Musculação', 'Corrida', 'Caminhada', 'Yoga', 'Pilates', 'Ciclismo', 'Natação', 'Funcional', 'Lutas', 'Dança', 'Crossfit', 'Outro'];

function Step03({ data, set }) {
  const d = data.history || { trains: null, level: null, freq: 3, mods: [], abandoned: null, reason: null, pace: 'moderada' };
  const u = (k, v) => set('history', { ...d, [k]: v });
  const toggleMod = (m) => {
    const s = new Set(d.mods || []); s.has(m) ? s.delete(m) : s.add(m);
    u('mods', [...s]);
  };
  return (
    <div className="step-fade">
      <StepHeader idx={3} total={TOTAL} title="Histórico e relação com movimento"
        sub="Para entender experiência, padrão de aderência e o que costuma atrapalhar."/>
      <div style={{ height: 14 }}/>

      <div style={{ fontSize: 12, fontWeight: 600, color: B.textSec, marginBottom: 6 }}>Treina atualmente?</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {['Sim, regularmente', 'Às vezes', 'Não treino'].map(v => (
          <Chip key={v} active={d.trains === v} onClick={() => u('trains', v)}>{v}</Chip>
        ))}
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: B.textSec, marginBottom: 6 }}>Nível atual</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {['Iniciante', 'Intermediário', 'Avançado'].map(v => (
          <Chip key={v} active={d.level === v} onClick={() => u('level', v)}>{v}</Chip>
        ))}
      </div>

      <Slider value={d.freq} onChange={(v) => u('freq', v)} min={1} max={7} suffix="× / semana"
        label="Frequência típica"/>

      <div style={{ height: 14 }}/>
      <div style={{ fontSize: 12, fontWeight: 600, color: B.textSec, marginBottom: 6 }}>Modalidades praticadas</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {MODALITIES.map(m => (
          <Chip key={m} active={(d.mods || []).includes(m)} onClick={() => toggleMod(m)} multi>{m}</Chip>
        ))}
      </div>

      <div style={{
        padding: 12, borderRadius: 12, background: B.surfRaised,
        border: `1px solid ${B.border}`,
      }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>Já abandonou um treino antes?</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: d.abandoned === 'Sim' ? 12 : 0 }}>
          {['Sim', 'Não'].map(v => (
            <Chip key={v} active={d.abandoned === v} onClick={() => u('abandoned', v)}>{v}</Chip>
          ))}
        </div>
        {d.abandoned === 'Sim' && (
          <>
            <div style={{ fontSize: 11.5, color: B.textSec, marginBottom: 6 }}>Principal motivo</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ABANDON.map(a => <Chip key={a} active={d.reason === a} onClick={() => u('reason', a)}>{a}</Chip>)}
            </div>
            <PrivacyNote tone="default">Esse dado alimenta o <b>Churn Risk Engine</b> internamente — nunca é exposto como “motivo de fracasso”.</PrivacyNote>
          </>
        )}
      </div>

      <div style={{ height: 14 }}/>
      <div style={{ fontSize: 12, fontWeight: 600, color: B.textSec, marginBottom: 6 }}>Como prefere evoluir?</div>
      <div style={{ display: 'flex', gap: 6 }}>
        {['Gradual', 'Moderada', 'Intensa'].map(v => (
          <Chip key={v} active={d.pace === v.toLowerCase()} onClick={() => u('pace', v.toLowerCase())}>{v}</Chip>
        ))}
      </div>

      <VoiceBar active={data.voice === 3} onToggle={() => set('voice', data.voice === 3 ? null : 3)}
        hint="Ex.: “Treino há 2 anos, parei por uma lesão, prefiro voltar gradual.”"/>
    </div>
  );
}

// ─────────── 7.4 SAÚDE DECLARADA ───────────
const HEALTH_CATS = [
  'Cardiovascular', 'Metabólica', 'Renal', 'Respiratória',
  'Musculoesquelética', 'Neurológica', 'Dor crônica', 'Saúde emocional',
  'Gestação ou pós-parto', 'Pós-operatório', 'Deficiência física', 'Outra condição',
];

function Step04({ data, set }) {
  const d = data.health || { has: null, cats: [], note: '' };
  const u = (k, v) => set('health', { ...d, [k]: v });
  const toggleCat = (c) => {
    const s = new Set(d.cats || []); s.has(c) ? s.delete(c) : s.add(c);
    u('cats', [...s]);
  };
  return (
    <div className="step-fade">
      <StepHeader idx={4} total={TOTAL} title="Saúde declarada"
        sub="O sistema não diagnostica. Apenas usa o que você declarar para adaptar o treino com segurança."
        badge="Sem diagnóstico"/>
      <div style={{ height: 14 }}/>
      <Hint>Existe alguma condição de saúde, limitação, diagnóstico prévio, cirurgia, tratamento ou recomendação profissional que devemos considerar para adaptar seu plano?</Hint>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <Chip active={d.has === 'sim'} onClick={() => u('has', 'sim')}>Sim, quero informar</Chip>
        <Chip active={d.has === 'nao'} onClick={() => u('has', 'nao')}>Não se aplica</Chip>
        <Chip active={d.has === 'prefere'} onClick={() => u('has', 'prefere')}>Prefiro não informar</Chip>
      </div>

      {d.has === 'sim' && (
        <>
          <div style={{ fontSize: 12, fontWeight: 600, color: B.textSec, marginBottom: 6 }}>Categorias</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {HEALTH_CATS.map(c => <Chip key={c} active={(d.cats || []).includes(c)} onClick={() => toggleCat(c)} multi>{c}</Chip>)}
          </div>

          <Field label="Observação livre" value={d.note} onChange={(v) => u('note', v)}
            placeholder="Ex.: cirurgia no joelho em 2023, liberada para musculação leve."
            helper="A IA estrutura o texto em consequência operacional — nunca como diagnóstico."/>
          <PrivacyNote tone="sensitive">
            <b>Dado sensível.</b> Visível apenas para você e para o treinador autorizado.
            Saída para outros perfis: máscara operacional (ex.: “Condição relevante declarada — recomenda-se progressão conservadora.”)
          </PrivacyNote>
        </>
      )}

      {d.has === 'prefere' && (
        <PrivacyNote tone="optional">
          Tudo bem. O sistema seguirá em modo conservador até que você queira complementar — e nunca pressionará você a informar.
        </PrivacyNote>
      )}

      <VoiceBar active={data.voice === 4} onToggle={() => set('voice', data.voice === 4 ? null : 4)}
        hint="Ex.: “Tive cirurgia no joelho em 2023, fui liberado para musculação leve.”"/>
    </div>
  );
}

// ─────────── 7.5 COMORBIDADES ───────────
const COMORBIDS = [
  'Hipertensão', 'Diabetes tipo 1', 'Diabetes tipo 2', 'Asma',
  'Obesidade', 'Osteoartrite', 'Osteoporose', 'Fibromialgia',
  'Dor crônica', 'Condição cardiovascular', 'Condição renal',
  'Pós-operatório', 'Gestação', 'Pós-parto', 'Outra', 'Prefiro não informar',
];

function Step05({ data, set }) {
  const d = data.comorbid || { items: [], controlled: null, releaseDoc: null };
  const u = (k, v) => set('comorbid', { ...d, [k]: v });
  const toggle = (c) => {
    const s = new Set(d.items || []); s.has(c) ? s.delete(c) : s.add(c);
    u('items', [...s]);
  };
  return (
    <div className="step-fade">
      <StepHeader idx={5} total={TOTAL} title="Comorbidades e cuidados"
        sub="Apenas o que você se sentir confortável informando. Influencia automação e validação humana."
        badge="Voluntário"/>
      <div style={{ height: 14 }}/>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {COMORBIDS.map(c => <Chip key={c} active={(d.items || []).includes(c)} onClick={() => toggle(c)} multi color={c === 'Prefiro não informar' ? B.textSec : B.cyan}>{c}</Chip>)}
      </div>

      {(d.items || []).length > 0 && !d.items.includes('Prefiro não informar') && (
        <>
          <div style={{ fontSize: 12, fontWeight: 600, color: B.textSec, marginBottom: 6 }}>A condição está controlada?</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {['Sim, sob acompanhamento', 'Parcialmente', 'Não / não sei'].map(v => (
              <Chip key={v} active={d.controlled === v} onClick={() => u('controlled', v)}>{v}</Chip>
            ))}
          </div>

          <ToggleRow on={d.releaseDoc} onChange={(v) => u('releaseDoc', v)}
            title="Tenho liberação médica para atividade física"
            sub="Quando aplicável. Mantém AI-led habilitado dentro dos limites declarados."/>

          <PrivacyNote tone="default">
            Comorbidade relevante pode <b>limitar automação</b>, exigir AI-assisted ou Trainer-led, e pode requerer validação profissional.
            Você sempre verá o porquê de cada decisão.
          </PrivacyNote>
        </>
      )}

      <VoiceBar active={data.voice === 5} onToggle={() => set('voice', data.voice === 5 ? null : 5)}/>
    </div>
  );
}

// ─────────── 7.6 CAPACIDADE FUNCIONAL ───────────
function Step06({ data, set }) {
  const d = data.func || { mobility: 'boa', balance: 'estavel', autonomy: 'independente', tolerance: 'moderada', supports: [], instruction: 'padrão', supervision: 'autonomo' };
  const u = (k, v) => set('func', { ...d, [k]: v });
  const toggleSup = (s) => {
    const ss = new Set(d.supports || []); ss.has(s) ? ss.delete(s) : ss.add(s);
    u('supports', [...ss]);
  };
  return (
    <div className="step-fade">
      <StepHeader idx={6} total={TOTAL} title="Capacidade funcional e acessibilidade"
        sub="Movimento possível antes de movimento ambicioso. Vamos garantir que o plano seja realista."/>
      <div style={{ height: 14 }}/>

      <div style={{ display: 'grid', gap: 14 }}>
        {[
          { k: 'mobility', label: 'Mobilidade', opts: ['baixa', 'moderada', 'boa'] },
          { k: 'balance', label: 'Equilíbrio', opts: ['instável', 'assistido', 'estável'] },
          { k: 'autonomy', label: 'Autonomia', opts: ['assistida', 'parcial', 'independente'] },
          { k: 'tolerance', label: 'Tolerância ao esforço', opts: ['baixa', 'moderada', 'boa'] },
        ].map(row => (
          <div key={row.k}>
            <div style={{ fontSize: 12, fontWeight: 600, color: B.textSec, marginBottom: 6 }}>{row.label}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {row.opts.map(o => <Chip key={o} active={d[row.k] === o || d[row.k] === o.normalize('NFD').replace(/[\u0300-\u036f]/g, '')} onClick={() => u(row.k, o)}>{o}</Chip>)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ height: 16 }}/>
      <div style={{ fontSize: 12, fontWeight: 600, color: B.textSec, marginBottom: 6 }}>Recursos de apoio que você utiliza</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {['Cadeira de rodas', 'Bengala', 'Andador', 'Prótese', 'Apoio próximo', 'Nenhum'].map(s => (
          <Chip key={s} active={(d.supports || []).includes(s)} onClick={() => toggleSup(s)} multi>{s}</Chip>
        ))}
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: B.textSec, marginBottom: 6 }}>Como prefere receber instruções?</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {['Visual', 'Auditiva', 'Texto simplificado', 'Vibração', 'Padrão'].map(s => (
          <Chip key={s} active={d.instruction === s.toLowerCase()} onClick={() => u('instruction', s.toLowerCase())}>{s}</Chip>
        ))}
      </div>

      <PrivacyNote tone="default">
        Esses dados geram o <b>Perfil de Capacidade Funcional</b> e filtram a biblioteca de exercícios — por exemplo, se você não consegue deitar no chão, treinos de solo deixam de ser padrão.
      </PrivacyNote>

      <VoiceBar active={data.voice === 6} onToggle={() => set('voice', data.voice === 6 ? null : 6)}/>
    </div>
  );
}

// ─────────── 7.7 HÁBITOS E FATORES DE RISCO ───────────
const HABITS = [
  'Sono irregular', 'Estresse elevado', 'Sedentarismo prolongado', 'Baixa hidratação',
  'Rotina exaustiva', 'Turnos noturnos', 'Alimentação irregular', 'Viagens frequentes',
  'Cuidado de filhos / familiares', 'Tabagismo', 'Álcool regular', 'Barreiras de transporte',
];

function Step07({ data, set }) {
  const d = data.habits || { items: [] };
  const toggle = (h) => {
    const s = new Set(d.items || []); s.has(h) ? s.delete(h) : s.add(h);
    set('habits', { items: [...s] });
  };
  return (
    <div className="step-fade">
      <StepHeader idx={7} total={TOTAL} title="Rotina que afeta energia e recuperação"
        sub="Sem julgamento — informe apenas o que achar relevante para o seu treino."/>
      <div style={{ height: 14 }}/>
      <Hint>Algumas rotinas podem influenciar energia, recuperação e segurança. Informe apenas o que achar relevante.</Hint>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {HABITS.map(h => <Chip key={h} active={(d.items || []).includes(h)} onClick={() => toggle(h)} multi>{h}</Chip>)}
      </div>

      <PrivacyNote tone="default">
        Esses dados alimentam predições internas de <b>fadiga</b>, <b>aderência</b> e <b>recuperação</b>. Nada é exibido como “hábito ruim”.
      </PrivacyNote>

      <VoiceBar active={data.voice === 7} onToggle={() => set('voice', data.voice === 7 ? null : 7)}/>
    </div>
  );
}

// ─────────── 7.8 FATORES SENSÍVEIS PROTEGIDOS ───────────
function Step08({ data, set }) {
  const d = data.sensitive || { meds: '', psychiatric: false, recreational: false, reveal: false };
  const u = (k, v) => set('sensitive', { ...d, [k]: v });
  return (
    <div className="step-fade">
      <StepHeader idx={8} total={TOTAL} title="Fatores sensíveis protegidos"
        sub="O dado íntimo fica protegido. Apenas a consequência operacional alimenta seu plano."
        badge="Mascarado"/>
      <div style={{ height: 14 }}/>

      <div style={{
        padding: 14, borderRadius: 14, background: B.surfRaised,
        border: `1px solid ${B.coral}33`,
        display: 'flex', gap: 12, marginBottom: 16,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${B.coral}1f`, color: B.coral, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Icon name="lock" size={18} stroke={2}/></div>
        <div style={{ fontSize: 12, color: B.textSec, lineHeight: 1.5 }}>
          Medicamentos, substâncias declaradas voluntariamente, histórico psiquiátrico —
          ficam visíveis <b style={{ color: B.text }}>apenas para você</b>. Seu treinador vê só:
          <div style={{
            marginTop: 6, padding: '6px 10px', borderRadius: 6,
            background: B.navy, fontFamily: FF_MONO, fontSize: 11, color: B.cyanSoft,
          }}>“Fator de segurança declarado — progressão conservadora.”</div>
        </div>
      </div>

      <Field label="Medicações regulares" value={d.meds} onChange={(v) => u('meds', v)}
        placeholder="Opcional — apenas se afetar energia, sono, equilíbrio ou esforço"
        sensitive helper="Saída operacional: atenção a fadiga, tontura ou tolerância reduzida."/>

      <div style={{ height: 12 }}/>
      <ToggleRow on={d.psychiatric} onChange={(v) => u('psychiatric', v)}
        title="Quero declarar histórico emocional / psiquiátrico"
        sub="Usado apenas para ajustar tom de comunicação e progressão. Mascarado para todos os outros perfis."
        sensitive/>
      <div style={{ height: 8 }}/>
      <ToggleRow on={d.recreational} onChange={(v) => u('recreational', v)}
        title="Quero declarar uso de substância recreativa"
        sub="Voluntário. Influencia recomendação de tolerância e monitoramento."
        sensitive/>

      <PrivacyNote tone="sensitive">
        Regra central: <b>Dado íntimo</b> = privado. <b>Consequência operacional</b> = compartilhável de forma mascarada.
        Você pode revogar a qualquer momento no Bloco 13.
      </PrivacyNote>

      <VoiceBar active={data.voice === 8} onToggle={() => set('voice', data.voice === 8 ? null : 8)}
        hint="Confirmação obrigatória antes de salvar."/>
    </div>
  );
}

// ─────────── 7.9 RITMO DO CORPO ───────────
function Step09({ data, set }) {
  const d = data.rhythm || { active: false, day: 12, length: 28, periodStart: false, adapt: [] };
  const u = (k, v) => set('rhythm', { ...d, [k]: v });
  const toggleAdapt = (a) => {
    const s = new Set(d.adapt || []); s.has(a) ? s.delete(a) : s.add(a);
    u('adapt', [...s]);
  };
  return (
    <div className="step-fade">
      <StepHeader idx={9} total={TOTAL} title="Ritmo do Corpo" badge="Opt-in"
        sub="Adaptação privada ao ciclo fisiológico, quando você quiser ativar. Nunca é anamnese íntima."/>
      <div style={{ height: 14 }}/>

      <ToggleRow on={d.active} onChange={(v) => u('active', v)}
        title="Ativar Ritmo do Corpo"
        sub="O recurso é opt-in. Você pode desativar e apagar os dados a qualquer momento."/>

      {d.active && (
        <div style={{ marginTop: 14, padding: 14, borderRadius: 14, background: B.surfRaised, border: `1px solid ${B.lavender}33` }}>
          <Slider value={d.day} onChange={(v) => u('day', v)} min={1} max={d.length} suffix="º dia"
            label="Dia atual do ciclo" color={B.lavender}/>
          <div style={{ height: 12 }}/>
          <Slider value={d.length} onChange={(v) => u('length', v)} min={21} max={35} suffix=" dias"
            label="Duração média do ciclo" color={B.lavender}/>
          <div style={{ height: 12 }}/>

          <button onClick={() => u('periodStart', !d.periodStart)} style={{
            width: '100%', padding: '11px 14px', borderRadius: 12,
            background: d.periodStart ? `${B.coral}22` : B.navy,
            border: `1.5px solid ${d.periodStart ? B.coral : B.border}`,
            color: B.text, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: B.coral }}/>
            {d.periodStart ? 'Marcado: menstruação começou hoje' : 'Menstruação começou hoje'}
          </button>

          <div style={{ height: 14 }}/>
          <div style={{ fontSize: 12, fontWeight: 600, color: B.textSec, marginBottom: 6 }}>Preferência de adaptação</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['Manter normal', 'Reduzir intensidade', 'Reduzir impacto', 'Aumentar descanso', 'Encurtar sessão', 'Priorizar mobilidade'].map(a => (
              <Chip key={a} active={(d.adapt || []).includes(a)} onClick={() => toggleAdapt(a)} multi color={B.lavender}>{a}</Chip>
            ))}
          </div>

          <PrivacyNote tone="optional">
            Nunca exibimos coisas como “a aluna está menstruada” ou “fase lútea”.
            Sua exibição operacional será: <i style={{ color: B.cyanSoft }}>“Fator fisiológico temporário recomenda versão moderada e menor impacto.”</i>
          </PrivacyNote>
        </div>
      )}

      {!d.active && (
        <PrivacyNote tone="optional">
          Recurso opcional. Não coletamos fluxo, cólica, humor ou contraceptivos como padrão — só o mínimo necessário para adaptar o treino, se você quiser.
        </PrivacyNote>
      )}
    </div>
  );
}

// ─────────── 7.10 AMBIENTE / EQUIPAMENTOS ───────────
const EQUIP = ['Halteres', 'Elásticos', 'Barra', 'Banco', 'Esteira', 'Bicicleta', 'Máquinas', 'Kettlebell', 'Cabo / polia', 'Nenhum'];
const ACCESS_ENV = ['Acessível para cadeira de rodas', 'Barras de apoio', 'Piso seguro', 'Privacidade para treinar', 'Acompanhante disponível', 'Equipamento adaptado'];

function Step10({ data, set }) {
  const d = data.env || { places: [], equip: [], access: [], space: 'médio' };
  const u = (k, v) => set('env', { ...d, [k]: v });
  const togglePlace = (p) => {
    const s = new Set(d.places || []); s.has(p) ? s.delete(p) : s.add(p);
    u('places', [...s]);
  };
  const toggleEq = (e) => {
    const s = new Set(d.equip || []); s.has(e) ? s.delete(e) : s.add(e);
    u('equip', [...s]);
  };
  const toggleAc = (a) => {
    const s = new Set(d.access || []); s.has(a) ? s.delete(a) : s.add(a);
    u('access', [...s]);
  };
  return (
    <div className="step-fade">
      <StepHeader idx={10} total={TOTAL} title="Onde você treina, na vida real"
        sub="Para nunca prescrever exercício que dependa de equipamento, espaço ou apoio que você não tem."/>
      <div style={{ height: 14 }}/>

      <div style={{ fontSize: 12, fontWeight: 600, color: B.textSec, marginBottom: 6 }}>Locais possíveis</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        {[
          ['home', 'Casa'], ['activity', 'Academia'], ['user', 'Studio'],
          ['accessibility', 'Parque'], ['target', 'Condomínio'], ['sparkles', 'Online'],
        ].map(([icon, l]) => (
          <ChoiceCard key={l} active={(d.places || []).includes(l)} onClick={() => togglePlace(l)} icon={icon} title={l}/>
        ))}
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: B.textSec, marginBottom: 6 }}>Equipamentos disponíveis</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {EQUIP.map(e => <Chip key={e} active={(d.equip || []).includes(e)} onClick={() => toggleEq(e)} multi>{e}</Chip>)}
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: B.textSec, marginBottom: 6 }}>Condições de acessibilidade</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {ACCESS_ENV.map(a => <Chip key={a} active={(d.access || []).includes(a)} onClick={() => toggleAc(a)} multi color={B.cyanSoft}>{a}</Chip>)}
      </div>

      <VoiceBar active={data.voice === 10} onToggle={() => set('voice', data.voice === 10 ? null : 10)}
        hint="Ex.: “Treino em casa, tenho halteres de 5 a 20 kg e elásticos.”"/>
    </div>
  );
}

// ─────────── 7.11 DISPONIBILIDADE / ROTINA ───────────
const BARRIERS = ['Turno noturno', 'Cuidado familiar', 'Viagens frequentes', 'Tratamento / fisio', 'Fadiga pós-trabalho', 'Transporte', 'Custo', 'Emocional'];

function Step11({ data, set }) {
  const d = data.routine || { days: 3, duration: 45, prefTime: 'manhã', flex: 'média', barriers: [], days_pref: [] };
  const u = (k, v) => set('routine', { ...d, [k]: v });
  const toggleB = (b) => {
    const s = new Set(d.barriers || []); s.has(b) ? s.delete(b) : s.add(b);
    u('barriers', [...s]);
  };
  const toggleDay = (d2) => {
    const s = new Set(d.days_pref || []); s.has(d2) ? s.delete(d2) : s.add(d2);
    u('days_pref', [...s]);
  };
  return (
    <div className="step-fade">
      <StepHeader idx={11} total={TOTAL} title="Disponibilidade e barreiras"
        sub="Plano realista pesa mais que plano ambicioso. Vamos calibrar para o que cabe."/>
      <div style={{ height: 14 }}/>

      <Slider value={d.days} onChange={(v) => u('days', v)} min={1} max={7} suffix=" dias / semana"
        label="Dias por semana"/>
      <div style={{ height: 12 }}/>
      <Slider value={d.duration} onChange={(v) => u('duration', v)} min={10} max={120} step={5} suffix=" min"
        label="Duração por sessão"/>

      <div style={{ height: 14 }}/>
      <div style={{ fontSize: 12, fontWeight: 600, color: B.textSec, marginBottom: 6 }}>Melhor horário</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {['Manhã', 'Tarde', 'Noite', 'Variável'].map(v => (
          <Chip key={v} active={d.prefTime === v.toLowerCase()} onClick={() => u('prefTime', v.toLowerCase())}>{v}</Chip>
        ))}
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: B.textSec, marginBottom: 6 }}>Dias preferenciais</div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {['S','T','Q','Q','S','S','D'].map((d2, i) => (
          <button key={i} onClick={() => toggleDay(i)} style={{
            flex: 1, padding: '10px 0', borderRadius: 10,
            background: (d.days_pref || []).includes(i) ? `${B.cyan}22` : B.surfRaised,
            border: `1.5px solid ${(d.days_pref || []).includes(i) ? B.cyan : B.border}`,
            color: (d.days_pref || []).includes(i) ? B.cyan : B.text,
            fontFamily: FF_MONO, fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>{d2}</button>
        ))}
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: B.textSec, marginBottom: 6 }}>Barreiras de aderência</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {BARRIERS.map(b => <Chip key={b} active={(d.barriers || []).includes(b)} onClick={() => toggleB(b)} multi color={B.coral}>{b}</Chip>)}
      </div>

      <PrivacyNote tone="default">
        Quem só pode treinar 3× por semana por 30 minutos nunca vai receber um plano de 5×70 — exceto como meta aspiracional declarada.
      </PrivacyNote>
    </div>
  );
}

// ─────────── 7.12 PREFERÊNCIAS DE TREINO E SUPORTE ───────────
function Step12({ data, set }) {
  const d = data.prefs || { intensity: 'moderada', companions: 'sozinho', tone: 'acolhedora', detail: 'simples', focus: 'saúde', support: 'autonomia', love: [], hate: [] };
  const u = (k, v) => set('prefs', { ...d, [k]: v });
  return (
    <div className="step-fade">
      <StepHeader idx={12} total={TOTAL} title="Preferências de treino e suporte"
        sub="Define o tom da comunicação e ajusta o plano ao seu perfil comportamental."/>
      <div style={{ height: 14 }}/>

      <div style={{ display: 'grid', gap: 14 }}>
        {[
          { k: 'intensity', label: 'Intensidade preferida', opts: ['leve', 'moderada', 'intensa'] },
          { k: 'companions', label: 'Treinar sozinho ou acompanhado?', opts: ['sozinho', 'acompanhado', 'indiferente'] },
          { k: 'tone', label: 'Linguagem preferida', opts: ['direta', 'acolhedora', 'técnica'] },
          { k: 'detail', label: 'Nível de explicação', opts: ['simples', 'detalhada', 'técnica'] },
          { k: 'focus', label: 'Foco da meta', opts: ['performance', 'saúde', 'estética', 'consistência'] },
          { k: 'support', label: 'Grau de suporte', opts: ['autonomia', 'orientação próxima', 'acompanhamento contínuo'] },
        ].map(row => (
          <div key={row.k}>
            <div style={{ fontSize: 12, fontWeight: 600, color: B.textSec, marginBottom: 6 }}>{row.label}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {row.opts.map(o => <Chip key={o} active={d[row.k] === o} onClick={() => u(row.k, o)}>{o}</Chip>)}
            </div>
          </div>
        ))}
      </div>

      <PrivacyNote tone="default">
        Preferências alimentam predições de <b>aderência</b>, <b>fricção</b> e <b>tipo de comunicação eficaz</b>.
      </PrivacyNote>
    </div>
  );
}

// ─────────── 7.13 CONSENTIMENTO / LGPD ───────────
const VISIBILITY = [
  { k: 'goal', label: 'Objetivo de treino', defaults: { personal: 'yes', studio: 'yes' }, sensitive: false },
  { k: 'history', label: 'Histórico de treino', defaults: { personal: 'yes', studio: 'partial' }, sensitive: false },
  { k: 'pain', label: 'Dor / restrição operacional', defaults: { personal: 'yes', studio: 'partial' }, sensitive: false },
  { k: 'comorbid', label: 'Comorbidade relevante', defaults: { personal: 'auth', studio: 'masked' }, sensitive: true },
  { k: 'meds', label: 'Medicamento sensível', defaults: { personal: 'auth', studio: 'no' }, sensitive: true },
  { k: 'psych', label: 'Saúde emocional / psiquiátrica', defaults: { personal: 'no', studio: 'no' }, sensitive: true },
  { k: 'cycle', label: 'Ritmo do Corpo', defaults: { personal: 'auth', studio: 'no' }, sensitive: true },
];

const VIS_LABEL = { yes: 'compartilhar', auth: 'somente autorizado', partial: 'resumo', masked: 'mascarado', no: 'oculto' };
const VIS_COLOR = { yes: B.cyan, auth: B.amber, partial: B.cyanSoft, masked: B.lavender, no: B.coral };

function Step13({ data, set }) {
  const d = data.consent || { visibility: {}, ai: true, history: true };
  const u = (k, v) => set('consent', { ...d, [k]: v });
  const setVis = (key, role, val) => u('visibility', { ...d.visibility, [`${key}_${role}`]: val });
  const getVis = (key, role) => d.visibility[`${key}_${role}`] ?? VISIBILITY.find(r => r.k === key).defaults[role];
  return (
    <div className="step-fade">
      <StepHeader idx={13} total={TOTAL} title="Consentimento e visibilidade"
        sub="Você decide quem vê o quê. A qualquer momento, pode revogar."
        badge="LGPD"/>
      <div style={{ height: 14 }}/>

      <div style={{
        padding: '6px 14px 4px', borderRadius: 14,
        background: B.surfRaised, border: `1px solid ${B.border}`,
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr',
          fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
          color: B.textMute, textTransform: 'uppercase', padding: '8px 0',
          borderBottom: `1px solid ${B.border}`,
        }}>
          <span>Categoria</span><span>Personal</span><span>Studio</span>
        </div>
        {VISIBILITY.map(row => (
          <div key={row.k} style={{
            display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr',
            alignItems: 'center', padding: '10px 0',
            borderBottom: `1px solid ${B.border}`,
            fontSize: 12.5,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {row.sensitive && <Icon name="lock" size={11} color={B.coral} stroke={2.2}/>}
              {row.label}
            </div>
            {['personal', 'studio'].map(role => {
              const val = getVis(row.k, role);
              return (
                <select key={role} value={val}
                  onChange={(e) => setVis(row.k, role, e.target.value)}
                  style={{
                    background: 'transparent', color: VIS_COLOR[val],
                    border: `1px solid ${VIS_COLOR[val]}55`, borderRadius: 8,
                    padding: '4px 8px', fontFamily: FF_MONO, fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', appearance: 'none', textTransform: 'uppercase',
                    letterSpacing: '.04em',
                  }}>
                  {Object.entries(VIS_LABEL).map(([k, l]) => <option key={k} value={k} style={{ background: B.navy }}>{l}</option>)}
                </select>
              );
            })}
          </div>
        ))}
      </div>

      <div style={{ height: 14 }}/>
      <ToggleRow on={d.ai} onChange={(v) => u('ai', v)}
        title="Permitir uso pela IA para adaptação do plano"
        sub="A IA usa apenas saídas operacionais — nunca dados íntimos crus."/>
      <div style={{ height: 8 }}/>
      <ToggleRow on={d.history} onChange={(v) => u('history', v)}
        title="Manter histórico de acessos"
        sub="Você poderá auditar quem viu o quê e quando."/>

      <PrivacyNote tone="sensitive">
        Revogar o consentimento <b>impede uso futuro não autorizado</b> e mantém um registro auditável da decisão.
      </PrivacyNote>
    </div>
  );
}

// ─────────── 7.14 RISCO OPERACIONAL (review) ───────────
const RISK = {
  R0: { name: 'Baixo risco operacional', auto: 'AI-led', color: B.green, sub: 'Sem limitação relevante declarada.' },
  R1: { name: 'Atenção leve', auto: 'AI-led com limites', color: B.cyan, sub: 'Dor leve, sedentarismo ou baixa experiência.' },
  R2: { name: 'Moderado', auto: 'AI-assisted', color: B.amber, sub: 'Condição controlada ou limitação funcional.' },
  R3: { name: 'Elevado', auto: 'Revisão humana', color: B.coral, sub: 'Múltiplas condições ou risco de queda.' },
  R4: { name: 'Crítico', auto: 'Trainer-led', color: '#FF4D4D', sub: 'Sinais de alerta — automação bloqueada.' },
};

function Step14({ data, set, risk }) {
  return (
    <div className="step-fade">
      <StepHeader idx={14} total={TOTAL} title="Classificação de risco operacional"
        sub="Calculada a partir dos blocos anteriores. Você pode revisar e pedir validação humana."
        badge="Saída técnica"/>
      <div style={{ height: 14 }}/>

      <div style={{
        padding: 16, borderRadius: 16,
        background: `${RISK[risk].color}10`,
        border: `1.5px solid ${RISK[risk].color}66`,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: RISK[risk].color, color: B.navy,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: FF_DISPLAY, fontWeight: 800, fontSize: 18,
          }}>{risk}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: RISK[risk].color, letterSpacing: '.12em', fontFamily: FF_MONO }}>RISK_LEVEL = "{risk}"</div>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: FF_DISPLAY }}>{RISK[risk].name}</div>
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: B.textSec, lineHeight: 1.5 }}>{RISK[risk].sub}</div>

        <div style={{
          marginTop: 12, padding: 10, borderRadius: 10,
          background: B.navy, fontFamily: FF_MONO, fontSize: 11.5, lineHeight: 1.7,
          color: B.cyanSoft,
        }}>
          <div>automation_allowed = "{RISK[risk].auto.toLowerCase().replace(/[\s-]/g, '_')}"</div>
          <div>human_validation_required = <span style={{ color: risk === 'R3' || risk === 'R4' ? B.coral : B.green }}>{risk === 'R3' || risk === 'R4' ? 'true' : 'false'}</span></div>
          <div>privacy_masking_required = <span style={{ color: B.green }}>true</span></div>
          <div>safety_gate_required = <span style={{ color: risk === 'R0' ? B.green : B.amber }}>{risk === 'R0' ? 'false' : 'true'}</span></div>
        </div>
      </div>

      <div style={{ height: 14 }}/>
      <div style={{ fontSize: 12, fontWeight: 600, color: B.textSec, marginBottom: 8 }}>Escala (R0 → R4)</div>
      <div style={{ display: 'flex', gap: 4 }}>
        {Object.entries(RISK).map(([k, r]) => (
          <div key={k} style={{
            flex: 1, padding: '8px 6px', borderRadius: 8, textAlign: 'center',
            background: k === risk ? `${r.color}22` : B.surfRaised,
            border: `1px solid ${k === risk ? r.color : B.border}`,
          }}>
            <div style={{ fontFamily: FF_MONO, fontWeight: 700, fontSize: 13, color: k === risk ? r.color : B.textSec }}>{k}</div>
            <div style={{ fontSize: 9, color: B.textMute, marginTop: 2 }}>{k === 'R0' ? 'Baixo' : k === 'R1' ? 'Leve' : k === 'R2' ? 'Mod.' : k === 'R3' ? 'Alto' : 'Crítico'}</div>
          </div>
        ))}
      </div>

      <PrivacyNote tone="default">
        A classificação é <b>explicável</b>: você pode pedir o detalhamento dos fatores que pesaram em cada decisão.
      </PrivacyNote>
    </div>
  );
}

// ─────────── OUTPUT: PERFIL DE TREINABILIDADE AMPLIADO ───────────
function StepOutput({ data, risk }) {
  const d = data;
  const goalLabel = d.goals?.primary ? GOALS.find(g => g.v === d.goals.primary)?.l : '—';
  const lines = [
    ['objetivo_principal', goalLabel],
    ['objetivos_secundarios', (d.goals?.secondary || []).length || '—'],
    ['nivel_treino', d.history?.level || '—'],
    ['ambiente', (d.env?.places || []).join(', ') || '—'],
    ['disponibilidade', `${d.routine?.days || 3}x · ${d.routine?.duration || 45}min`],
    ['historico_abandono', d.history?.abandoned === 'Sim' ? d.history.reason : 'sem registros'],
    ['saude_declarada', d.health?.has === 'sim' ? `${(d.health.cats || []).length} categoria(s)` : 'não relevante'],
    ['capacidade_funcional', `${d.func?.mobility || 'boa'} / ${d.func?.balance || 'estável'} / ${d.func?.autonomy || 'independente'}`],
    ['habitos_relevantes', (d.habits?.items || []).length || 0],
    ['ritmo_corpo', d.rhythm?.active ? 'ativo (privado)' : 'desativado'],
    ['risk_level', risk],
    ['automation_allowed', RISK[risk].auto.toLowerCase().replace(/[\s-]/g, '_')],
    ['privacy_masking', 'true'],
  ];
  return (
    <div className="step-fade">
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: `linear-gradient(135deg, ${B.cyan} 0%, ${B.cyanDeep} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16, boxShadow: `0 12px 30px ${B.cyan}33`,
      }}>
        <Icon name="shieldCheck" size={28} color={B.navy} stroke={2.2}/>
      </div>

      <div style={{
        fontSize: 10.5, fontWeight: 700, color: B.cyan, letterSpacing: '.18em',
        textTransform: 'uppercase', fontFamily: FF_MONO, marginBottom: 8,
      }}>SAÍDA PRINCIPAL · MÓDULO 01</div>
      <h1 style={{
        margin: 0, fontFamily: FF_DISPLAY, fontSize: 26, lineHeight: 1.15,
        fontWeight: 700, letterSpacing: '-0.01em',
      }}>Perfil de Treinabilidade<br/>Ampliado</h1>
      <div style={{ marginTop: 6, fontSize: 12, color: B.textSec, fontStyle: 'italic' }}>
        Também chamado de <b style={{ color: B.cyanSoft }}>Perfil Seguro de Movimento</b>.
      </div>

      <div style={{
        marginTop: 18, padding: 16, borderRadius: 14,
        background: B.surfRaised, border: `1px solid ${B.border}`,
      }}>
        <div style={{
          fontFamily: FF_MONO, fontSize: 11, color: B.cyanSoft, letterSpacing: '.04em',
          paddingBottom: 8, marginBottom: 8, borderBottom: `1px dashed ${B.border}`,
        }}>// perfil_treinabilidade_ampliado.json</div>
        <div style={{ display: 'grid', gap: 6, fontFamily: FF_MONO, fontSize: 11.5, lineHeight: 1.45 }}>
          {lines.map(([k, v]) => (
            <div key={k} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'baseline', gap: 8 }}>
              <span style={{ color: B.textMute, fontSize: 10.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k}</span>
              <span style={{ color: k === 'risk_level' ? RISK[risk].color : B.text, fontWeight: 600 }}>{String(v)}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        marginTop: 14, padding: 14, borderRadius: 14,
        background: `${RISK[risk].color}10`,
        border: `1px solid ${RISK[risk].color}44`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: RISK[risk].color, color: B.navy,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: FF_DISPLAY, fontWeight: 800,
        }}>{risk}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{RISK[risk].auto}</div>
          <div style={{ fontSize: 11.5, color: B.textSec, marginTop: 1 }}>{RISK[risk].sub}</div>
        </div>
      </div>

      <PrivacyNote tone="default">
        Pronto para o <b>Módulo 2 — Avaliação Inicial e Check-in Físico</b>. Você pode editar qualquer bloco a qualquer momento.
      </PrivacyNote>
    </div>
  );
}

// Expose
Object.assign(window, {
  TOTAL_STEPS: TOTAL,
  StepIntro, Step01, Step02, Step03, Step04, Step05, Step06, Step07,
  Step08, Step09, Step10, Step11, Step12, Step13, Step14, StepOutput,
  RISK,
});
