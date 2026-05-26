import React from 'react';
import { Icon } from '../../components/Icon';
import type { NavFn } from '../../types';
import { useM5Data, C, scoreColor, goodScoreColor, band } from './performance/perf-engines';
import {
  T, FF_DISPLAY, FF_MONO,
  ScreenWrap, ScreenTitle, Section, StatCard,
  AIMessage, ScoreRing, Sparkline, BarChart,
  BodyDiagram, NavCard, InsightCard, Kicker,
} from './performance/perf-atoms';
import type { M5Data } from './performance/perf-types';

// ── Prop types ────────────────────────────────────────────────────────────────

interface Theme { primary: string; accent: string }
interface AppUser { id: string | null; name?: string }

interface Props {
  nav:  NavFn;
  t:    Theme;
  dark: boolean;
  user: AppUser;
}

// ── Internal navigation tabs ──────────────────────────────────────────────────

type ScreenId = 'overview' | 'aderencia' | 'performance' | 'dor' | 'scores' | 'voz' | 'marcos';

const NAV_TABS: { id: ScreenId; label: string }[] = [
  { id: 'overview',     label: 'Visão geral' },
  { id: 'aderencia',    label: 'Aderência'   },
  { id: 'performance',  label: 'Performance' },
  { id: 'dor',          label: 'Dor'         },
  { id: 'scores',       label: 'IA Scores'   },
  { id: 'voz',          label: 'Voz'         },
  { id: 'marcos',       label: 'Marcos'      },
];

// ── Main component ────────────────────────────────────────────────────────────

export function PerformanceDashboardScreen({ nav, t, dark, user }: Props) {
  const [activeScreen, setActiveScreen] = React.useState<ScreenId>('overview');
  const { data, loading } = useM5Data(user.id);

  const tabBarRef = React.useRef<HTMLDivElement>(null);

  // Scroll active tab into view when it changes
  React.useEffect(() => {
    const el = tabBarRef.current?.querySelector(`[data-tab="${activeScreen}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeScreen]);

  const screenContent = (() => {
    if (loading || !data) return <LoadingState />;
    switch (activeScreen) {
      case 'overview':    return <TelaOverview    data={data} nav={nav} setScreen={setActiveScreen} userName={user.name}/>;
      case 'aderencia':   return <TelaAderencia   data={data}/>;
      case 'performance': return <TelaPerformance data={data}/>;
      case 'dor':         return <TelaDor         data={data}/>;
      case 'scores':      return <TelaScores      data={data}/>;
      case 'voz':         return <TelaVoz data={data}/>;
      case 'marcos':      return <TelaMarcos      data={data}/>;
    }
  })();

  return (
    <>

      {/* Internal tab bar */}
      <div
        ref={tabBarRef}
        style={{
          display: 'flex', gap: 6, padding: '8px 18px',
          overflowX: 'auto', scrollbarWidth: 'none',
          borderBottom: `1px solid ${T.border}`,
          background: T.navy,
          flexShrink: 0,
        }}
      >
        {NAV_TABS.map(tab => (
          <button
            key={tab.id}
            data-tab={tab.id}
            onClick={() => setActiveScreen(tab.id)}
            style={{
              padding: '6px 12px', borderRadius: 999, border: 'none',
              cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: FF_MONO,
              fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
              background: activeScreen === tab.id ? C.cyan : T.surf,
              color:      activeScreen === tab.id ? T.navy  : T.textMute,
              transition: 'background .15s, color .15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Screen content */}
      <div style={{ flex: 1, overflowY: 'auto', background: T.navy }}>
        {screenContent}
      </div>
    </>
  );
}

// ── Loading state ─────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div style={{
      padding: '60px 0', display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        border: `3px solid ${T.border}`, borderTopColor: C.cyan,
        animation: 'spin .7s linear infinite',
      }}/>
      <span style={{ fontFamily: FF_MONO, fontSize: 11, color: T.textMute }}>
        Calculando indicadores…
      </span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Tela 01 — Meu Progresso (Overview) ───────────────────────────────────────

function TelaOverview({
  data,
  setScreen,
  userName,
}: {
  data: M5Data;
  nav: NavFn;
  setScreen: (s: ScreenId) => void;
  userName?: string | undefined;
}) {
  const adh = Math.round(data.adherenceRate * 100);
  const mainInsight = data.insights[0];

  const navCards: { id: ScreenId; icon: string; title: string; sub: string; color: string }[] = [
    { id: 'aderencia',   icon: '📅', title: 'Aderência',        sub: `${adh}% · ${data.workoutStreak} dias de sequência`,        color: C.cyan    },
    { id: 'performance', icon: '📈', title: 'Performance',      sub: 'Carga, volume e esforço percebido',                         color: C.cyan    },
    { id: 'dor',         icon: '⚠️', title: 'Dor & Segurança',  sub: `${data.painEvents14d.length} ocorrência(s) em 14 dias`,     color: data.painEvents14d.length ? C.coral : C.green },
    { id: 'scores',      icon: '🤖', title: 'Análise da IA',    sub: '9 indicadores preditivos',                                  color: C.lavender },
    { id: 'voz',         icon: '🎙️', title: 'Voz analítica',    sub: 'Pergunte sobre sua evolução',                               color: C.cyanDeep },
    { id: 'marcos',      icon: '🏆', title: 'Marcos & Conquistas', sub: `${data.milestones.filter(m => m.unlocked).length}/${data.milestones.length} desbloqueados`, color: C.amber },
  ];

  const volumeData = data.weeklyStats.map(w => w.volume / 1000); // tonnes
  const volumeMax  = Math.max(...volumeData, 0.1);

  return (
    <ScreenWrap>
      <ScreenTitle
        kicker={`MEU PROGRESSO · ${data.weeksActive} SEMANAS`}
        title={`Você está evoluindo${userName ? ', ' + userName : ''}.`}
        sub="Resumo da sua evolução nas últimas semanas."
      />

      {/* Hero: score ring + 2 stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          padding: 16, borderRadius: 16, background: T.surf, border: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <ScoreRing
            score={Math.round(data.adherenceRate * 100)}
            color={C.cyan}
            label="ADERÊNCIA"
            sub={`${data.weeksActive} sem.`}
            size={92}
          />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <StatCard
            kicker="Sessões"
            value={`${data.completedSessions}/${data.plannedSessions}`}
            sub={`${data.partialSessions} parciais`}
            color={C.cyan}
            deltaTone={data.adherenceRate >= 0.8 ? 'good' : 'neutral'}
          />
          <StatCard
            kicker="Sequência"
            value={`${data.workoutStreak}d`}
            sub="dias consecutivos"
            color={C.amber}
          />
        </div>
      </div>

      {/* AI main insight */}
      {mainInsight && (
        <AIMessage
          title="Síntese da semana"
          tone={mainInsight.severity === 'positive' ? 'green' : mainInsight.severity === 'critical' ? 'coral' : 'cyan'}
          body={mainInsight.data}
          action={mainInsight.action}
        />
      )}

      {/* 2×2 stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <StatCard kicker="Frequência"  value={`${Math.round(data.completedSessions / Math.max(data.weeksActive, 1) * 10) / 10}×`} sub="por semana"/>
        <StatCard kicker="Check-ins"   value={`${Math.round(data.checkinRate * 100)}%`} sub="de cobertura"/>
        <StatCard kicker="Dor 14d"     value={String(data.painEvents14d.length)}
          sub={data.painRecurrenceCount >= 3 ? 'recorrente' : 'ocorrências'}
          color={data.painEvents14d.length >= 3 ? C.coral : T.text}
          deltaTone={data.painEvents14d.length >= 3 ? 'bad' : 'good'}
        />
        <StatCard kicker="Streak"      value={`${data.workoutStreak}d`}
          color={data.workoutStreak >= 7 ? C.green : T.text}
        />
      </div>

      {/* Volume sparkline */}
      {volumeMax > 0 && (
        <Section title="Volume semanal (t·rep)">
          <Sparkline data={volumeData} color={C.cyan} height={52} showDots/>
          <div style={{
            display: 'flex', justifyContent: 'space-between', marginTop: 4,
          }}>
            {data.weeklyStats.map(w => (
              <span key={w.label} style={{ fontFamily: FF_MONO, fontSize: 9, color: T.textMute }}>
                {w.label}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Navigation cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {navCards.map(c => (
          <NavCard
            key={c.id}
            icon={c.icon}
            title={c.title}
            sub={c.sub}
            color={c.color}
            onClick={() => setScreen(c.id)}
          />
        ))}
      </div>
    </ScreenWrap>
  );
}

// Attach name to override TS "user" property warning (not a real prop)
TelaOverview.defaultProps = {};

// ── Tela 02 — Aderência ───────────────────────────────────────────────────────

function TelaAderencia({ data }: { data: M5Data }) {
  const adh = Math.round(data.adherenceRate * 100);
  const label = adh >= 85 ? 'Excelente consistência' : adh >= 70 ? 'Boa consistência' : 'Em construção';

  const cellColor = (status: number) => {
    if (status === 1)   return C.green;
    if (status === 0.5) return C.amber;
    if (status === 0)   return C.coral;
    return T.border; // future / rest
  };

  return (
    <ScreenWrap>
      <ScreenTitle kicker="ADERÊNCIA · 6 SEMANAS" title="Sua consistência de treino."/>

      {/* Hero ring */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: 16,
        background: T.surf, borderRadius: 16, border: `1px solid ${T.border}`,
      }}>
        <ScoreRing score={adh} color={C.cyan} label="ADERÊNCIA" size={80}/>
        <div>
          <div style={{ fontFamily: FF_DISPLAY, fontSize: 16, fontWeight: 700, color: T.text }}>
            {label}
          </div>
          <div style={{ fontSize: 12, color: T.textSec, marginTop: 2 }}>
            {data.completedSessions} sessões · {data.weeksActive} semanas
          </div>
        </div>
      </div>

      {/* Week grid */}
      <Section title="Semana atual">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
          {data.weekDays.map((day, i) => {
            const status = data.weekStatus[i] ?? 0;
            const c = cellColor(status);
            return (
              <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontFamily: FF_MONO, fontSize: 9, color: T.textMute }}>{day}</span>
                <div style={{
                  width: '100%', aspectRatio: '1',
                  borderRadius: 10, border: `1.5px solid ${c}`,
                  background: status > 0 ? `${c}22` : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11,
                }}>
                  {status === 1 ? '✓' : status === 0.5 ? '½' : ''}
                </div>
              </div>
            );
          })}
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', gap: 12, marginTop: 10, justifyContent: 'center' }}>
          {[['Completa', C.green], ['Parcial', C.amber], ['Faltou', C.coral]].map(([lbl, c]) => (
            <div key={String(lbl)} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: String(c) }}/>
              <span style={{ fontFamily: FF_MONO, fontSize: 9, color: T.textMute }}>{lbl}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Stats 2×2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <StatCard kicker="Concluídas"  value={String(data.completedSessions)} color={C.green}/>
        <StatCard kicker="Parciais"    value={String(data.partialSessions)}   color={C.amber}/>
        <StatCard kicker="Faltas"      value={String(data.missedSessions)}    color={data.missedSessions > 2 ? C.coral : T.text}/>
        <StatCard kicker="Check-ins"   value={`${Math.round(data.checkinRate * 100)}%`} color={C.cyan}/>
      </div>

      <AIMessage
        title="Análise de consistência"
        tone={adh >= 85 ? 'green' : adh >= 70 ? 'cyan' : 'amber'}
        body={
          adh >= 85
            ? `Aderência de ${adh}% é um indicador de consistência sustentada. Continue com a mesma cadência.`
            : adh >= 70
            ? `Aderência de ${adh}% é sólida. Pequenos ajustes de agenda podem elevar ainda mais sua consistência.`
            : `Aderência de ${adh}% indica espaço para crescimento. Revise disponibilidade com seu personal.`
        }
        action={adh >= 85 ? 'Manter volume e frequência' : 'Discutir ajuste de plano com personal'}
      />

      {/* Recent sessions list */}
      {data.recentSessions.length > 0 && (
        <Section title="Últimas sessões">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.recentSessions.slice(0, 5).map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                  background: s.completed ? C.green : s.partial ? C.amber : C.coral,
                }}/>
                <span style={{ fontFamily: FF_MONO, fontSize: 10.5, color: T.textMute, width: 40 }}>
                  {s.date}
                </span>
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: T.text }}>
                  {s.completed ? 'Concluída' : s.partial ? 'Parcial' : 'Abandonada'}
                </span>
                {s.rpe !== null && (
                  <span style={{ fontFamily: FF_MONO, fontSize: 10, color: C.amber }}>
                    RPE {s.rpe}
                  </span>
                )}
                {s.hasPain && (
                  <span style={{ fontFamily: FF_MONO, fontSize: 9, color: C.coral }}>⚠ dor</span>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}
    </ScreenWrap>
  );
}

// ── Tela 03 — Performance ─────────────────────────────────────────────────────

function TelaPerformance({ data }: { data: M5Data }) {
  const volumeData = data.weeklyStats.map(w => w.volume / 1000);
  const rpeData    = data.weeklyStats.map(w => w.rpe).filter(r => r > 0);
  const labels     = data.weeklyStats.map(w => w.label);
  const volDelta   = volumeData.length >= 2
    ? (((volumeData[volumeData.length - 1] ?? 0) - (volumeData[0] ?? 0)) / ((volumeData[0] ?? 0) || 1) * 100).toFixed(0)
    : '0';
  const rpeDelta   = rpeData.length >= 2
    ? ((rpeData[rpeData.length - 1] ?? 0) - (rpeData[0] ?? 0)).toFixed(1)
    : '0';

  return (
    <ScreenWrap>
      <ScreenTitle kicker="PERFORMANCE · carga, volume, esforço" title="Evolução técnica."/>

      {/* Volume bar chart */}
      <Section title="Volume semanal total" right={
        <span style={{ fontFamily: FF_MONO, fontSize: 9.5, color: Number(volDelta) >= 0 ? C.green : C.coral }}>
          {Number(volDelta) >= 0 ? '+' : ''}{volDelta}%
        </span>
      }>
        {volumeData.some(v => v > 0)
          ? <BarChart data={volumeData} labels={labels} color={C.cyan} suffix="t"/>
          : <EmptyMetric label="Nenhum set registrado ainda"/>
        }
      </Section>

      {/* RPE sparkline */}
      <Section title="RPE médio" right={
        <span style={{ fontFamily: FF_MONO, fontSize: 9.5, color: Number(rpeDelta) > 0 ? C.amber : C.green }}>
          {Number(rpeDelta) > 0 ? '↗ subindo' : rpeData.length > 0 ? '↘ estável' : '—'}
        </span>
      }>
        {rpeData.length >= 2
          ? <>
              <Sparkline data={rpeData} color={C.amber} height={52} showDots/>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontFamily: FF_MONO, fontSize: 9, color: T.textMute }}>
                  início: {(rpeData[0] ?? 0).toFixed(1)}
                </span>
                <span style={{ fontFamily: FF_MONO, fontSize: 9, color: C.amber }}>
                  atual: {(rpeData[rpeData.length - 1] ?? 0).toFixed(1)}
                </span>
              </div>
            </>
          : <EmptyMetric label="Registre RPE nas sessões para ver a tendência"/>
        }
      </Section>

      {/* Sessions per week */}
      <Section title="Sessões por semana">
        <BarChart
          data={data.weeklyStats.map(w => w.sessions)}
          labels={labels}
          color={C.cyan}
        />
      </Section>

      <AIMessage
        title="Análise de performance"
        tone={Number(rpeDelta) > 1 ? 'amber' : 'cyan'}
        body={
          rpeData.length < 2
            ? 'Registre RPE nas sessões para ativar a análise preditiva de fadiga.'
            : Number(rpeDelta) > 1
            ? `RPE subiu ${rpeDelta} pontos nas últimas semanas. Monitorar sinais de fadiga acumulada.`
            : `Volume e RPE em progressão compatível. Indicadores de performance saudáveis.`
        }
        action={Number(rpeDelta) > 1.5 ? 'Considerar deload preventivo' : 'Manter progressão atual'}
      />
    </ScreenWrap>
  );
}

// ── Tela 04 — Dor & Segurança ─────────────────────────────────────────────────

function TelaDor({ data }: { data: M5Data }) {
  const hasPain    = data.painEvents14d.length > 0;
  const isRecurrent = data.painRecurrenceCount >= 3;

  return (
    <ScreenWrap>
      <ScreenTitle kicker="DOR & SEGURANÇA · 14 DIAS" title="Monitoramento de sinais de risco."/>

      {/* Hero */}
      <div style={{
        padding: '14px 16px', borderRadius: 16, background: T.surf,
        border: `1px solid ${isRecurrent ? C.coral + '55' : T.border}`,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <BodyDiagram region={data.primaryPainRegion}/>
        <div>
          {hasPain ? (
            <>
              <Kicker color={C.coral}>{data.primaryPainRegion?.toUpperCase() ?? 'REGIÃO'}</Kicker>
              <div style={{
                fontFamily: FF_DISPLAY, fontSize: 22, fontWeight: 800, color: C.coral,
              }}>
                {data.painRecurrenceCount}/{data.painEvents14d.length}
              </div>
              <div style={{ fontSize: 11, color: T.textSec, lineHeight: 1.4, marginTop: 2 }}>
                {isRecurrent
                  ? `ocorrências. Pain Recurrence Engine ativado.`
                  : `ocorrência(s). Monitorando evolução.`
                }
              </div>
            </>
          ) : (
            <>
              <Kicker color={C.green}>SEM DOR</Kicker>
              <div style={{ fontFamily: FF_DISPLAY, fontSize: 22, fontWeight: 800, color: C.green }}>0</div>
              <div style={{ fontSize: 11, color: T.textSec, marginTop: 2 }}>ocorrências nos últimos 14 dias.</div>
            </>
          )}
        </div>
      </div>

      {/* AI message */}
      <AIMessage
        title={isRecurrent ? 'Pain Recurrence Engine' : 'Monitoramento de dor'}
        tone={isRecurrent ? 'coral' : hasPain ? 'amber' : 'green'}
        body={
          isRecurrent
            ? `Dor recorrente em ${data.primaryPainRegion ?? 'região'} detectada (${data.painRecurrenceCount}× em 14d). Exercício de risco identificado — substituição recomendada.`
            : hasPain
            ? `${data.painEvents14d.length} ocorrência(s) registrada(s). Intensidade monitorada. Mantenha o personal informado.`
            : 'Nenhuma dor registrada nos últimos 14 dias. Continue executando com boa técnica.'
        }
        action={
          isRecurrent
            ? 'Substituir exercício e notificar personal'
            : hasPain
            ? 'Informar personal e registrar intensidade em cada sessão'
            : 'Manter atenção à técnica de execução'
        }
      />

      {/* Pain history */}
      {data.painEvents14d.length > 0 && (
        <Section title="Histórico de dor">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.painEvents14d.map((e, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 12,
                background: T.navy, border: `1px solid ${T.border}`,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: `${C.coral}22`, color: C.coral,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12,
                }}>
                  ⚠
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{e.region}</div>
                  <div style={{ fontFamily: FF_MONO, fontSize: 10, color: T.textMute }}>{e.date}</div>
                </div>
                <div style={{
                  fontFamily: FF_DISPLAY, fontSize: 14, fontWeight: 700, color: C.coral,
                }}>
                  {e.intensity}/10
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Actions */}
      {hasPain && (
        <Section title="Ações disponíveis">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Substituir exercício de risco', color: C.coral },
              { label: 'Notificar personal trainer',    color: C.amber },
              { label: 'Registrar dor detalhada',       color: C.cyan  },
            ].map(({ label, color }) => (
              <div key={label} style={{
                padding: '10px 14px', borderRadius: 10,
                border: `1px solid ${color}55`, background: `${color}08`,
                fontSize: 13, fontWeight: 600, color,
                display: 'flex', alignItems: 'center', gap: 8,
                cursor: 'pointer',
              }}>
                <span>→</span>{label}
              </div>
            ))}
          </div>
        </Section>
      )}
    </ScreenWrap>
  );
}

// ── Tela 05 — Scores Preditivos ───────────────────────────────────────────────

function TelaScores({ data }: { data: M5Data }) {
  const scoreList = [
    data.scores.churnRisk,
    data.scores.fatigueRisk,
    data.scores.painRecurrence,
    data.scores.progressionReadiness,
    data.scores.sessionCompletion,
    data.scores.planFit,
    data.scores.recoveryInstability,
    data.scores.responseCompatibility,
    data.scores.plateauRisk,
  ];

  return (
    <ScreenWrap>
      <ScreenTitle
        kicker="ANÁLISE DA IA · CAMADA PREDITIVA"
        title="9 indicadores preditivos."
        sub="Predição não é diagnóstico. Indicadores probabilísticos para apoio à decisão."
      />

      {/* Score grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {scoreList.map(s => {
          const c = s.isGoodScore ? goodScoreColor(s.score) : scoreColor(s.score);
          const b = band(s.score);
          const badgeLabel = s.isGoodScore
            ? s.score >= 75 ? 'BOM' : s.score >= 50 ? 'ATENÇÃO' : 'BAIXO'
            : b.toUpperCase();
          return (
            <div key={s.code} style={{
              padding: 12, borderRadius: 12,
              background: T.surf, border: `1px solid ${c}55`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{s.name}</span>
                <span style={{
                  padding: '2px 6px', borderRadius: 4,
                  background: `${c}22`, color: c,
                  fontFamily: FF_MONO, fontSize: 9, fontWeight: 700,
                }}>
                  {badgeLabel}
                </span>
              </div>
              <div style={{
                fontFamily: FF_DISPLAY, fontSize: 28, fontWeight: 800,
                color: c, letterSpacing: '-0.02em', lineHeight: 1.05, marginBottom: 6,
              }}>
                {Math.round(s.score)}
              </div>
              {/* mini progress bar */}
              <div style={{ height: 6, borderRadius: 999, background: T.navy, marginBottom: 6 }}>
                <div style={{
                  height: '100%', borderRadius: 999, width: `${s.score}%`,
                  background: `linear-gradient(90deg, ${c} 0%, ${c}88 100%)`,
                  transition: 'width .6s ease',
                }}/>
              </div>
              <div style={{ fontSize: 10.5, color: T.textSec, lineHeight: 1.4, marginBottom: 4 }}>
                {s.desc}
              </div>
              <div style={{ fontFamily: FF_MONO, fontSize: 9, color: T.textMute }}>
                → {s.action}
              </div>
            </div>
          );
        })}
      </div>

      {/* Insights */}
      {data.insights.length > 0 && (
        <Section title={`Insights acionáveis · ${data.insights.length}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.insights.map(ins => (
              <InsightCard
                key={ins.id}
                severity={ins.severity}
                title={ins.title}
                data={ins.data}
                interp={ins.interpretation}
                action={ins.action}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Disclaimer RN-5.10 */}
      <div style={{
        padding: 14, borderRadius: 14,
        background: `${C.lavender}10`,
        border: `1px solid ${C.lavender}44`,
        fontSize: 11, color: T.textSec, lineHeight: 1.5,
      }}>
        <span style={{ color: C.lavender, fontWeight: 700 }}>ℹ Predição ≠ diagnóstico.</span>{' '}
        Todos os scores são probabilísticos e têm como objetivo apoiar decisões do personal trainer,
        não substituir avaliação profissional. Dados sensíveis são processados localmente.
      </div>
    </ScreenWrap>
  );
}

// ── Voice query engine ────────────────────────────────────────────────────────

function processVoiceQuery(q: string, data: M5Data): string {
  const n = q.toLowerCase();

  if (n.includes('resumo') || n.includes('mensal')) {
    return `Resumo: ${data.completedSessions} sessões completas de ${data.plannedSessions} planejadas — ${data.adherenceRate}% de aderência. Sequência atual: ${data.workoutStreak} dia(s). ${data.scores.fatigueRisk.desc}`;
  }
  if (n.includes('fadiga') || n.includes('fadigado')) {
    const s = data.scores.fatigueRisk;
    return `Risco de fadiga: ${s.score}/100. ${s.desc} ${s.action}`;
  }
  if (n.includes('abandono') || n.includes('churn') || n.includes('desistir')) {
    const s = data.scores.churnRisk;
    return `Risco de abandono: ${s.score}/100. ${s.desc} ${s.action}`;
  }
  if (n.includes('carga') || n.includes('aumentar') || n.includes('progressão')) {
    const s = data.scores.progressionReadiness;
    return `Prontidão para progressão: ${s.score}/100. ${s.action}`;
  }
  if (n.includes('sessões') || n.includes('completei') || n.includes('mês') || n.includes('mes')) {
    return `Você completou ${data.completedSessions} sessões de ${data.plannedSessions} planejadas — ${data.adherenceRate}% de aderência. Streak atual: ${data.workoutStreak} dia(s).`;
  }
  if (n.includes('performance') || n.includes('semana')) {
    const last = data.weeklyStats[data.weeklyStats.length - 1];
    if (!last) return 'Ainda não há dados de performance registrados.';
    return `Esta semana: ${last.sessions} sessão(ões), RPE médio ${last.rpe.toFixed(1)}, volume ${last.volume} séries.`;
  }
  if (n.includes('dor') || n.includes('doendo') || n.includes('machucou')) {
    if (data.painEvents14d.length === 0) return 'Nenhum episódio de dor nos últimos 14 dias.';
    return `${data.painEvents14d.length} episódio(s) de dor nos últimos 14 dias. Principal região: ${data.primaryPainRegion ?? 'não identificada'}.`;
  }
  if (n.includes('sono') || n.includes('energia')) {
    return `Média de sono: ${data.sleepAvg.toFixed(1)}/10. Média de energia: ${data.energyAvg.toFixed(1)}/10.`;
  }
  return 'Não entendi sua pergunta. Tente: "Estou em risco de fadiga?", "Quantas sessões completei este mês?", "Quando posso aumentar a carga?" ou "Gere meu resumo mensal."';
}

// ── Tela 06 — Voz analítica ───────────────────────────────────────────────────

const SUGGESTED_QUESTIONS = [
  'Como foi minha performance esta semana?',
  'Estou em risco de fadiga?',
  'Quando posso aumentar a carga?',
  'Quantas sessões completei este mês?',
  'Tenho risco de abandono?',
  'Gere meu resumo mensal.',
];

function TelaVoz({ data }: { data: M5Data }) {
  const [query,     setQuery]     = React.useState('');
  const [response,  setResponse]  = React.useState<string | null>(null);
  const [listening, setListening] = React.useState(false);
  const [noSupport, setNoSupport] = React.useState(false);

  const process = (q: string) => {
    setQuery(q);
    setResponse(processVoiceQuery(q, data));
  };

  const startListening = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) { setNoSupport(true); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new SR() as any;
    rec.lang = 'pt-BR';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.start();
    setListening(true);
    setResponse(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      setListening(false);
      process(e.results[0][0].transcript as string);
    };
    rec.onerror = () => setListening(false);
    rec.onend   = () => setListening(false);
  };

  return (
    <ScreenWrap>
      <ScreenTitle
        kicker="VOZ · ANÁLISE CONVERSACIONAL"
        title="Pergunte sobre sua evolução."
        sub="Interface de consulta por voz aos seus dados de performance."
      />

      {/* Mic button */}
      <div style={{
        padding: 24, borderRadius: 16, background: T.surf,
        border: `1px solid ${listening ? C.cyan : T.border}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        transition: 'border-color .2s',
      }}>
        <button
          onClick={startListening}
          disabled={listening}
          style={{
            width: 72, height: 72, borderRadius: '50%', border: 'none',
            background: listening
              ? `radial-gradient(circle, ${C.cyan}cc 0%, ${C.cyanDeep} 100%)`
              : `linear-gradient(135deg, ${C.cyan} 0%, ${C.cyanDeep} 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, cursor: listening ? 'default' : 'pointer',
            boxShadow: listening ? `0 0 0 8px ${C.cyan}33, 0 8px 24px ${C.cyan}44` : `0 8px 24px ${C.cyan}44`,
            transition: 'box-shadow .3s',
          }}
        >
          🎙️
        </button>
        <div style={{ fontFamily: FF_MONO, fontSize: 11, color: listening ? C.cyan : T.textMute, letterSpacing: '0.06em' }}>
          {listening ? 'Ouvindo…' : 'Toque para falar'}
        </div>
        {noSupport && (
          <div style={{ fontSize: 11, color: C.coral, textAlign: 'center' }}>
            Reconhecimento de voz não suportado neste browser. Use as perguntas abaixo.
          </div>
        )}
      </div>

      {/* Response card */}
      {(query || response) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {query && (
            <div style={{
              padding: '10px 14px', borderRadius: 12,
              background: `${C.cyan}15`, border: `1px solid ${C.cyan}33`,
              fontSize: 12, color: T.textSec, fontStyle: 'italic',
            }}>
              "{query}"
            </div>
          )}
          {response && (
            <AIMessage title="Resposta" body={response} tone="cyan" />
          )}
        </div>
      )}

      {/* Suggested questions */}
      <Section title="Perguntas sugeridas">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SUGGESTED_QUESTIONS.map(q => (
            <button
              key={q}
              onClick={() => process(q)}
              style={{
                padding: '9px 12px', borderRadius: 999,
                background: T.surf, border: `1px solid ${T.border}`,
                display: 'flex', alignItems: 'center', gap: 8,
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                width: '100%',
              }}
            >
              <span style={{ fontSize: 11, color: T.textMute, flexShrink: 0 }}>🎙</span>
              <span style={{ fontSize: 12, color: T.textSec }}>"{q}"</span>
            </button>
          ))}
        </div>
      </Section>

      {/* Privacy note RV-5.1 */}
      <div style={{
        padding: 12, borderRadius: 12,
        background: `${C.coral}10`, border: `1px solid ${C.coral}44`,
        display: 'flex', gap: 8, alignItems: 'flex-start',
      }}>
        <span style={{ color: C.coral, fontSize: 13 }}>🔒</span>
        <div style={{ fontSize: 11, color: T.textSec, lineHeight: 1.5 }}>
          <b style={{ color: C.coral }}>Privacidade:</b> Consultas por voz não expõem dados sensíveis
          (saúde, medicamentos, ciclo fisiológico). Dados mascarados por padrão. (RV-5.1)
        </div>
      </div>
    </ScreenWrap>
  );
}

// ── Tela 07 — Marcos & Conquistas ────────────────────────────────────────────

function TelaMarcos({ data }: { data: M5Data }) {
  const unlockedCount = data.milestones.filter(m => m.unlocked).length;
  const total         = data.milestones.length;

  return (
    <ScreenWrap>
      <ScreenTitle kicker="MARCOS · PROVA DE VALOR" title="Suas conquistas."/>

      {/* Hero */}
      <div style={{
        padding: '16px 14px', borderRadius: 16,
        background: `linear-gradient(135deg, ${C.coral}15 0%, ${C.amber}08 100%)`,
        border: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: `linear-gradient(135deg, ${C.coral} 0%, ${C.amber} 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, flexShrink: 0,
        }}>
          🏆
        </div>
        <div>
          <div style={{
            fontFamily: FF_DISPLAY, fontSize: 28, fontWeight: 800,
            letterSpacing: '-0.02em', color: T.text,
          }}>
            {unlockedCount}/{total}
          </div>
          <div style={{ fontSize: 12, color: T.textSec }}>marcos desbloqueados nesta jornada</div>
        </div>
      </div>

      {/* Unlocked milestones */}
      {data.milestones.filter(m => m.unlocked).length > 0 && (
        <Section title="Desbloqueados">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.milestones.filter(m => m.unlocked).map(m => (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 12,
                background: T.navy, border: `1px solid ${T.border}`,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: `${C.green}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, color: C.green,
                }}>
                  ✓
                </div>
                <div style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: T.text }}>
                  {m.label}
                </div>
                <span style={{ color: C.green, fontSize: 14 }}>🏆</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* In-progress milestones */}
      {data.milestones.filter(m => !m.unlocked).length > 0 && (
        <Section title="Em progresso">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.milestones.filter(m => !m.unlocked).map(m => {
              const pct = Math.min(100, (m.current / m.target) * 100);
              return (
                <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>{m.label}</span>
                    <span style={{ fontFamily: FF_MONO, fontSize: 11, fontWeight: 700, color: C.cyan }}>
                      {m.current}/{m.target}
                    </span>
                  </div>
                  <div style={{ height: 5, borderRadius: 999, background: T.navy }}>
                    <div style={{
                      height: '100%', borderRadius: 999, width: `${pct}%`,
                      background: `linear-gradient(90deg, ${C.cyan} 0%, ${C.cyanDeep} 100%)`,
                      transition: 'width .6s ease',
                    }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      <AIMessage
        title="Prova de valor"
        tone="lavender"
        body={
          unlockedCount === 0
            ? 'Complete sua primeira sessão para desbloquear o primeiro marco. Cada treino conta.'
            : `${unlockedCount} marco${unlockedCount > 1 ? 's' : ''} desbloqueado${unlockedCount > 1 ? 's' : ''}. Cada conquista é evidência do seu compromisso.`
        }
        action={unlockedCount > 0 ? 'Gerar relatório mensal — compartilhar com personal' : 'Iniciar o primeiro treino'}
      />
    </ScreenWrap>
  );
}

// ── Empty metric helper ───────────────────────────────────────────────────────

function EmptyMetric({ label }: { label: string }) {
  return (
    <div style={{
      padding: '20px 0', textAlign: 'center',
      fontFamily: FF_MONO, fontSize: 10.5, color: T.textMute,
    }}>
      {label}
    </div>
  );
}
