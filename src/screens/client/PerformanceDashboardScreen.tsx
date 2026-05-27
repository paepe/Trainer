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
interface AppUser { id: string | null; name?: string; gender?: string }

interface Props {
  nav:  NavFn;
  t:    Theme;
  dark: boolean;
  user: AppUser;
}

// ── Internal navigation tabs ──────────────────────────────────────────────────

type ScreenId = 'overview' | 'aderencia' | 'performance' | 'dor' | 'scores' | 'voz' | 'marcos';

const NAV_TABS: { id: ScreenId; label: string }[] = [
  { id: 'overview',     label: 'Overview'   },
  { id: 'aderencia',    label: 'Adherence'  },
  { id: 'performance',  label: 'Performance' },
  { id: 'dor',          label: 'Pain'       },
  { id: 'scores',       label: 'AI Scores'   },
  { id: 'voz',          label: 'Voice'      },
  { id: 'marcos',       label: 'Milestones' },
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
    if (!data) {
      if (loading) return <LoadingState />;
      return <div style={{ padding: 60, textAlign: 'center', color: T.textMute, fontFamily: FF_MONO, fontSize: 13 }}>No data available</div>;
    }
    return (
      <div style={{ position: 'relative', flex: 1 }}>
        {loading && <div style={{
          position: 'absolute', top: 8, left: 0, right: 0, zIndex: 2, textAlign: 'center',
        }}>
          <span style={{
            display: 'inline-block', padding: '4px 12px', borderRadius: 999,
            background: C.cyan, color: T.navy, fontFamily: FF_MONO, fontSize: 9,
            fontWeight: 700, letterSpacing: '.06em',
          }}>
            REFRESHING…
          </span>
        </div>}
        {(() => {
          switch (activeScreen) {
            case 'overview':    return <TelaOverview    data={data} nav={nav} setScreen={setActiveScreen} userName={user.name}/>;
            case 'aderencia':   return <TelaAderencia   data={data}/>;
            case 'performance': return <TelaPerformance data={data}/>;
            case 'dor':         return <TelaDor         data={data} gender={user.gender}/>;
            case 'scores':      return <TelaScores      data={data}/>;
            case 'voz':         return <TelaVoz data={data}/>;
            case 'marcos':      return <TelaMarcos      data={data}/>;
          }
        })()}
      </div>
    );
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
        Calculating indicators…
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
    { id: 'aderencia',   icon: '📅', title: 'Adherence',         sub: `${adh}% · ${data.workoutStreak} days streak`,               color: C.cyan    },
    { id: 'performance', icon: '📈', title: 'Performance',      sub: 'Load, volume and perceived effort',                         color: C.cyan    },
    { id: 'dor',         icon: '⚠️', title: 'Pain & Safety',    sub: `${data.painEvents14d.length} occurrence(s) in 14 days`,    color: data.painEvents14d.length ? C.coral : C.green },
    { id: 'scores',      icon: '🤖', title: 'AI Analysis',      sub: '9 predictive indicators',                                   color: C.lavender },
    { id: 'voz',         icon: '🎙️', title: 'Voice Analytics',  sub: 'Ask about your progress',                                   color: C.cyanDeep },
    { id: 'marcos',      icon: '🏆', title: 'Milestones & Achievements', sub: `${data.milestones.filter(m => m.unlocked).length}/${data.milestones.length} unlocked`, color: C.amber },
  ];

  const volumeData = data.weeklyStats.map(w => w.volume / 1000); // tonnes
  const volumeMax  = Math.max(...volumeData, 0.1);

  return (
    <ScreenWrap>
      <ScreenTitle
        kicker={`MY PROGRESS · ${data.weeksActive} WEEKS`}
        title={`You are progressing${userName ? ', ' + userName : ''}.`}
        sub="Summary of your progress over the last few weeks."
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
            label="ADHERENCE"
            sub={`${data.weeksActive} wks`}
            size={92}
          />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <StatCard
            kicker="Sessions"
            value={`${data.completedSessions}/${data.plannedSessions}`}
            sub={`${data.partialSessions} partial`}
            color={C.cyan}
            deltaTone={data.adherenceRate >= 0.8 ? 'good' : 'neutral'}
          />
          <StatCard
            kicker="Streak"
            value={`${data.workoutStreak}d`}
            sub="consecutive days"
            color={C.amber}
          />
        </div>
      </div>

      {/* AI main insight */}
      {mainInsight && (
        <AIMessage
          title="Week summary"
          tone={mainInsight.severity === 'positive' ? 'green' : mainInsight.severity === 'critical' ? 'coral' : 'cyan'}
          body={mainInsight.data}
          action={mainInsight.action}
        />
      )}

      {/* 2×2 stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <StatCard kicker="Frequency"  value={`${Math.round(data.completedSessions / Math.max(data.weeksActive, 1) * 10) / 10}×`} sub="per week"/>
        <StatCard kicker="Check-ins"   value={`${Math.round(data.checkinRate * 100)}%`} sub="coverage"/>
        <StatCard kicker="Dor 14d"     value={String(data.painEvents14d.length)}
          sub={data.painRecurrenceCount >= 3 ? 'recurrent' : 'occurrences'}
          color={data.painEvents14d.length >= 3 ? C.coral : T.text}
          deltaTone={data.painEvents14d.length >= 3 ? 'bad' : 'good'}
        />
        <StatCard kicker="Streak"      value={`${data.workoutStreak}d`}
          color={data.workoutStreak >= 7 ? C.green : T.text}
        />
      </div>

      {/* Volume sparkline */}
      {volumeMax > 0 && (
        <Section title="Weekly volume (t·rep)">
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

// ── Screen 02 — Adherence ───────────────────────────────────────────────────────

function TelaAderencia({ data }: { data: M5Data }) {
  const adh = Math.round(data.adherenceRate * 100);
  const label = adh >= 85 ? 'Excellent consistency' : adh >= 70 ? 'Good consistency' : 'Under construction';

  const cellColor = (status: number) => {
    if (status === 1)   return C.green;
    if (status === 0.5) return C.amber;
    if (status === 0)   return C.coral;
    return T.border; // future / rest
  };

  return (
    <ScreenWrap>
      <ScreenTitle kicker="ADHERENCE · 6 WEEKS" title="Your training consistency."/>

      {/* Hero ring */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: 16,
        background: T.surf, borderRadius: 16, border: `1px solid ${T.border}`,
      }}>
        <ScoreRing score={adh} color={C.cyan} label="ADHERENCE" size={80}/>
        <div>
          <div style={{ fontFamily: FF_DISPLAY, fontSize: 16, fontWeight: 700, color: T.text }}>
            {label}
          </div>
          <div style={{ fontSize: 12, color: T.textSec, marginTop: 2 }}>
            {data.completedSessions} sessions · {data.weeksActive} weeks
          </div>
        </div>
      </div>

      {/* Week grid */}
      <Section title="Current week">
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
          {[['Complete', C.green], ['Partial', C.amber], ['Missed', C.coral]].map(([lbl, c]) => (
            <div key={String(lbl)} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: String(c) }}/>
              <span style={{ fontFamily: FF_MONO, fontSize: 9, color: T.textMute }}>{lbl}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Stats 2×2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <StatCard kicker="Completed"  value={String(data.completedSessions)} color={C.green}/>
        <StatCard kicker="Partials"   value={String(data.partialSessions)}   color={C.amber}/>
        <StatCard kicker="Missed"     value={String(data.missedSessions)}    color={data.missedSessions > 2 ? C.coral : T.text}/>
        <StatCard kicker="Check-ins"   value={`${Math.round(data.checkinRate * 100)}%`} color={C.cyan}/>
      </div>

      <AIMessage
        title="Consistency analysis"
        tone={adh >= 85 ? 'green' : adh >= 70 ? 'cyan' : 'amber'}
        body={
          adh >= 85
            ? `Adherence of ${adh}% is an indicator of sustained consistency. Continue with the same cadence.`
            : adh >= 70
            ? `Adherence of ${adh}% is solid. Small schedule adjustments can boost your consistency further.`
            : `Adherence of ${adh}% indicates room for growth. Review availability with your trainer.`
        }
        action={adh >= 85 ? 'Maintain volume and frequency' : 'Discuss plan adjustment with trainer'}
      />

      {/* Recent sessions list */}
      {data.recentSessions.length > 0 && (
        <Section title="Latest sessions">
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
                  {s.completed ? 'Completed' : s.partial ? 'Partial' : 'Abandoned'}
                </span>
                {s.rpe !== null && (
                  <span style={{ fontFamily: FF_MONO, fontSize: 10, color: C.amber }}>
                    RPE {s.rpe}
                  </span>
                )}
                {s.hasPain && (
                  <span style={{ fontFamily: FF_MONO, fontSize: 9, color: C.coral }}>⚠ pain</span>
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
      <ScreenTitle kicker="PERFORMANCE · load, volume, effort" title="Technical evolution."/>

      {/* Volume bar chart */}
      <Section title="Total weekly volume" right={
        <span style={{ fontFamily: FF_MONO, fontSize: 9.5, color: Number(volDelta) >= 0 ? C.green : C.coral }}>
          {Number(volDelta) >= 0 ? '+' : ''}{volDelta}%
        </span>
      }>
        {volumeData.some(v => v > 0)
          ? <BarChart data={volumeData} labels={labels} color={C.cyan} suffix="t"/>
          : <EmptyMetric label="No sets recorded yet"/>
        }
      </Section>

      {/* RPE sparkline */}
      <Section title="Avg RPE" right={
        <span style={{ fontFamily: FF_MONO, fontSize: 9.5, color: Number(rpeDelta) > 0 ? C.amber : C.green }}>
          {Number(rpeDelta) > 0 ? '↗ rising' : rpeData.length > 0 ? '↘ stable' : '—'}
        </span>
      }>
        {rpeData.length >= 2
          ? <>
              <Sparkline data={rpeData} color={C.amber} height={52} showDots/>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontFamily: FF_MONO, fontSize: 9, color: T.textMute }}>
                  start: {(rpeData[0] ?? 0).toFixed(1)}
                </span>
                <span style={{ fontFamily: FF_MONO, fontSize: 9, color: C.amber }}>
                  current: {(rpeData[rpeData.length - 1] ?? 0).toFixed(1)}
                </span>
              </div>
            </>
          : <EmptyMetric label="Log RPE in sessions to see the trend"/>
        }
      </Section>

      {/* Sessions per week */}
      <Section title="Sessions per week">
        <BarChart
          data={data.weeklyStats.map(w => w.sessions)}
          labels={labels}
          color={C.cyan}
        />
      </Section>

      <AIMessage
        title="Performance analysis"
        tone={Number(rpeDelta) > 1 ? 'amber' : 'cyan'}
        body={
          rpeData.length < 2
            ? 'Log RPE in sessions to activate predictive fatigue analysis.'
            : Number(rpeDelta) > 1
            ? `RPE has risen ${rpeDelta} points in recent weeks. Monitor signs of accumulated fatigue.`
            : `Volume and RPE progressing in a compatible manner. Healthy performance indicators.`
        }
        action={Number(rpeDelta) > 1.5 ? 'Consider preventive deload' : 'Maintain current progression'}
      />
    </ScreenWrap>
  );
}

// ── Screen 04 — Pain & Safety ─────────────────────────────────────────────────

function TelaDor({ data, gender }: { data: M5Data; gender?: string | undefined }) {
  const hasPain    = data.painEvents14d.length > 0;
  const isRecurrent = data.painRecurrenceCount >= 3;

  return (
    <ScreenWrap>
      <ScreenTitle kicker="PAIN & SAFETY · 14 DAYS" title="Risk signal monitoring."/>

      {/* Hero */}
      <div style={{
        padding: '14px 16px', borderRadius: 16, background: T.surf,
        border: `1px solid ${isRecurrent ? C.coral + '55' : T.border}`,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <BodyDiagram region={data.primaryPainRegion} gender={gender ?? null}/>
        <div>
          {hasPain ? (
            <>
              <Kicker color={C.coral}>{data.primaryPainRegion?.toUpperCase() ?? 'REGION'}</Kicker>
              <div style={{
                fontFamily: FF_DISPLAY, fontSize: 22, fontWeight: 800, color: C.coral,
              }}>
                {data.painRecurrenceCount}/{data.painEvents14d.length}
              </div>
              <div style={{ fontSize: 11, color: T.textSec, lineHeight: 1.4, marginTop: 2 }}>
                {isRecurrent
                  ? `occurrences. Pain Recurrence Engine activated.`
                  : `occurrence(s). Monitoring evolution.`
                }
              </div>
            </>
          ) : (
            <>
              <Kicker color={C.green}>NO PAIN</Kicker>
              <div style={{ fontFamily: FF_DISPLAY, fontSize: 22, fontWeight: 800, color: C.green }}>0</div>
               <div style={{ fontSize: 11, color: T.textSec, marginTop: 2 }}>occurrences in the last 14 days.</div>
            </>
          )}
        </div>
      </div>

      {/* AI message */}
      <AIMessage
        title={isRecurrent ? 'Pain Recurrence Engine' : 'Pain monitoring'}
        tone={isRecurrent ? 'coral' : hasPain ? 'amber' : 'green'}
        body={
          isRecurrent
            ? `Recurring pain in ${data.primaryPainRegion ?? 'region'} detected (${data.painRecurrenceCount}× in 14d). Risk exercise identified — substitution recommended.`
            : hasPain
            ? `${data.painEvents14d.length} registered occurrence(s). Intensity monitored. Keep your trainer informed.`
            : 'No pain recorded in the last 14 days. Continue executing with good technique.'
        }
        action={
          isRecurrent
            ? 'Replace exercise and notify trainer'
            : hasPain
            ? 'Notify trainer and record intensity in each session'
            : 'Maintain attention to execution technique'
        }
      />

      {/* Pain history */}
      {data.painEvents14d.length > 0 && (
        <Section title="Pain history">
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
        <Section title="Available actions">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Replace risk exercise',   color: C.coral },
              { label: 'Notify personal trainer', color: C.amber },
              { label: 'Log detailed pain',       color: C.cyan  },
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
        kicker="AI ANALYSIS · PREDICTIVE LAYER"
        title="9 predictive indicators."
        sub="Prediction is not diagnosis. Probabilistic indicators for decision support."
      />

      {/* Score grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {scoreList.map(s => {
          const c = s.isGoodScore ? goodScoreColor(s.score) : scoreColor(s.score);
          const b = band(s.score);
          const badgeLabel = s.isGoodScore
            ? s.score >= 75 ? 'GOOD' : s.score >= 50 ? 'WARNING' : 'LOW'
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
        <Section title={`Actionable insights · ${data.insights.length}`}>
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
        <span style={{ color: C.lavender, fontWeight: 700 }}>ℹ Prediction ≠ diagnosis.</span>{' '}
        All scores are probabilistic and are intended to support personal trainer decisions,
        not replace professional evaluation. Sensitive data is processed locally.
      </div>
    </ScreenWrap>
  );
}

// ── Voice query engine ────────────────────────────────────────────────────────

function processVoiceQuery(q: string, data: M5Data): string {
  const n = q.toLowerCase();

  if (n.includes('summary') || n.includes('monthly')) {
    return `Summary: ${data.completedSessions} completed sessions of ${data.plannedSessions} planned — ${data.adherenceRate}% adherence. Current streak: ${data.workoutStreak} day(s). ${data.scores.fatigueRisk.desc}`;
  }
  if (n.includes('fatigue') || n.includes('fatigued')) {
    const s = data.scores.fatigueRisk;
    return `Fatigue risk: ${s.score}/100. ${s.desc} ${s.action}`;
  }
  if (n.includes('dropout') || n.includes('churn') || n.includes('quit')) {
    const s = data.scores.churnRisk;
    return `Churn risk: ${s.score}/100. ${s.desc} ${s.action}`;
  }
  if (n.includes('load') || n.includes('increase') || n.includes('progression')) {
    const s = data.scores.progressionReadiness;
    return `Progression readiness: ${s.score}/100. ${s.action}`;
  }
  if (n.includes('sessions') || n.includes('completed') || n.includes('month')) {
    return `You completed ${data.completedSessions} sessions of ${data.plannedSessions} planned — ${data.adherenceRate}% adherence. Current streak: ${data.workoutStreak} day(s).`;
  }
  if (n.includes('performance') || n.includes('week')) {
    const last = data.weeklyStats[data.weeklyStats.length - 1];
    if (!last) return 'No performance data recorded yet.';
    return `This week: ${last.sessions} session(s), avg RPE ${last.rpe.toFixed(1)}, volume ${last.volume} sets.`;
  }
  if (n.includes('pain') || n.includes('aching') || n.includes('hurt')) {
    if (data.painEvents14d.length === 0) return 'No pain episodes in the last 14 days.';
    return `${data.painEvents14d.length} pain episode(s) in the last 14 days. Primary region: ${data.primaryPainRegion ?? 'unidentified'}.`;
  }
  if (n.includes('sleep') || n.includes('energy')) {
    return `Average sleep: ${data.sleepAvg.toFixed(1)}/10. Average energy: ${data.energyAvg.toFixed(1)}/10.`;
  }
  return 'I didn\'t understand your question. Try: "Am I at risk of fatigue?", "How many sessions did I complete this month?", "When can I increase the load?" or "Generate my monthly summary."';
}

// ── Screen 06 — Voice Analytics ───────────────────────────────────────────────────

const SUGGESTED_QUESTIONS = [
  'How was my performance this week?',
  'Am I at risk of fatigue?',
  'When can I increase the load?',
  'How many sessions did I complete this month?',
  'Am I at risk of churn?',
  'Generate my monthly summary.',
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
        kicker="VOICE · CONVERSATIONAL ANALYSIS"
        title="Ask about your progress."
        sub="Voice query interface for your performance data."
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
            cursor: listening ? 'default' : 'pointer',
            boxShadow: listening ? `0 0 0 8px ${C.cyan}33, 0 8px 24px ${C.cyan}44` : `0 8px 24px ${C.cyan}44`,
            transition: 'box-shadow .3s',
          }}
        >
          <Icon name="mic" size={30} color="#0E1A2B" stroke={2}/>
        </button>
        <div style={{ fontFamily: FF_MONO, fontSize: 11, color: listening ? C.cyan : T.textMute, letterSpacing: '0.06em' }}>
          {listening ? 'Listening…' : 'Tap to speak'}
        </div>
        {noSupport && (
          <div style={{ fontSize: 11, color: C.coral, textAlign: 'center' }}>
            Voice recognition not supported in this browser. Use the questions below.
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
            <AIMessage title="Response" body={response} tone="cyan" />
          )}
        </div>
      )}

      {/* Suggested questions */}
      <Section title="Suggested questions">
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
          <b style={{ color: C.coral }}>Privacy:</b> Voice queries do not expose sensitive data
          (health, medication, physiological cycle). Data masked by default. (RV-5.1)
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
      <ScreenTitle kicker="MILESTONES · PROOF OF VALUE" title="Your achievements."/>

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
          <div style={{ fontSize: 12, color: T.textSec }}>milestones unlocked on this journey</div>
        </div>
      </div>

      {/* Unlocked milestones */}
      {data.milestones.filter(m => m.unlocked).length > 0 && (
        <Section title="Unlocked">
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
        <Section title="In progress">
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
        title="Proof of value"
        tone="lavender"
        body={
          unlockedCount === 0
            ? 'Complete your first session to unlock the first milestone. Every workout counts.'
            : `${unlockedCount} milestone${unlockedCount > 1 ? 's' : ''} unlocked. Each achievement is evidence of your commitment.`
        }
        action={unlockedCount > 0 ? 'Generate monthly report — share with trainer' : 'Start your first workout'}
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
