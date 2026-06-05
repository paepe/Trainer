import React from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../supabase';
import { Icon } from '../../components/Icon';
import { TopBar } from '../../components/TopBar';
import { ScreenTitle } from '../../components/ScreenTitle';
import { surfRaised, borderSubtle, textPri, textSec, textMute } from '../../theme';
import type { NavFn } from '../../types';

interface Theme {
  primary: string;
  accent:  string;
}

interface AppUser {
  id: string | null;
}

interface StatsScreenProps {
  nav:  NavFn;
  t:    Theme;
  dark: boolean;
  user: AppUser;
}

interface Session {
  started_at:         string;
  duration_minutes:   number | null;
  performance_score:  number | null;
}

export function StatsScreen({ nav, t, dark, user }: StatsScreenProps) {
  const { t: tr } = useTranslation();
  const days      = tr('client.history.days', { returnObjects: true }) as string[];
  const dayLabels = tr('client.history.dayLabels', { returnObjects: true }) as string[];
  const todayDow  = new Date().getDay();
  const [selectedDow, setSelectedDow] = React.useState(todayDow);
  const [sessions,    setSessions]    = React.useState<Session[]>([]);

  React.useEffect(() => {
    if (!user?.id) return;
    // Last 8 weeks
    const since = new Date();
    since.setDate(since.getDate() - 56);
    supabase
      .from('workout_sessions')
      .select('started_at, duration_minutes, performance_score')
      .eq('user_id', user.id)
      .gte('started_at', since.toISOString())
      .order('started_at')
      .then(({ data }) => setSessions((data as Session[]) || []));
  }, [user?.id]);

  // Build chart series: duration per day-of-week bucket (last 7 occurrences of each DOW)
  const byDow = Array.from({ length: 7 }, (_, dow) =>
    sessions.filter(s => new Date(s.started_at).getDay() === dow)
  );
  // For the selected DOW, show duration per session (last 7), normalised to 0–1 scale
  const selectedSessions = (byDow[selectedDow] || []).slice(-7);
  const chartData = selectedSessions.length > 0
    ? selectedSessions.map(s => (s.duration_minutes || 0) / 60)
    : [0, 0, 0, 0, 0, 0, 0];

  const totalSessions  = sessions.length;
  const totalMinutes   = sessions.reduce((a, s) => a + (s.duration_minutes || 0), 0);
  const avgScore       = sessions.length
    ? (sessions.reduce((a, s) => a + (s.performance_score || 0), 0) / sessions.length).toFixed(1)
    : '—';
  const fmtTotal = totalMinutes >= 60
    ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
    : `${totalMinutes}m`;

  // Strongest DOW by total duration
  const dowTotals   = byDow.map(g => g.reduce((a, s) => a + (s.duration_minutes || 0), 0));
  const strongestDow = dowTotals.indexOf(Math.max(...dowTotals));

  return (
    <>
      <TopBar onMenu={() => nav('menu')} dark={dark} accent={t.accent}/>
      <ScreenTitle dark={dark}>{tr('client.stats.title')}</ScreenTitle>

      {/* Summary metrics strip */}
      <div style={{
        padding: '0 22px 14px',
        display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10,
      }}>
        {[
          { val: String(totalSessions),   lbl: tr('client.stats.sessions') },
          { val: fmtTotal || '0m',        lbl: tr('client.stats.totalTime') },
          { val: String(avgScore),        lbl: tr('client.stats.avgScore') },
        ].map(({ val, lbl }) => (
          <div key={lbl} style={{
            padding: '14px 12px', borderRadius: 14,
            background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}`,
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: '"Plus Jakarta Sans",sans-serif',
              fontSize: 22, fontWeight: 700, color: t.primary,
            }}>{val}</div>
            <div style={{ fontSize: 10.5, color: textMute(dark), marginTop: 2 }}>{lbl}</div>
          </div>
        ))}
      </div>

      {/* Day-of-week tabs */}
      <div style={{
        padding: '4px 22px 14px', display: 'flex', gap: 2, justifyContent: 'space-between',
        borderBottom: `1px solid ${borderSubtle(dark)}`,
      }}>
        {days.map((d, i) => (
          <button key={d} onClick={() => setSelectedDow(i)} style={{
            flex: 1, padding: '12px 0', background: 'transparent', border: 'none',
            fontFamily: 'inherit', fontSize: 12.5, cursor: 'pointer',
            color: selectedDow === i ? t.primary : textMute(dark),
            fontWeight: selectedDow === i ? 600 : 500,
            borderBottom: `2px solid ${selectedDow === i ? t.primary : 'transparent'}`,
            marginBottom: -1,
          }}>{dayLabels[i]}</button>
        ))}
      </div>

      <div style={{ padding: '20px 14px 8px' }}>
        <PerfChart data={chartData.length >= 2 ? chartData : [0, 0]} primary={t.primary} dark={dark}/>
      </div>

      {/* AI trend insight */}
      <div style={{ padding: '0 22px 28px' }}>
        <div style={{
          padding: '14px 16px', borderRadius: 14,
          background: `${t.primary}${dark ? '14' : '10'}`,
          border: `1px solid ${t.primary}55`,
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <Icon name="sparkle" size={16} color={t.primary} stroke={2.3}/>
          <div style={{ fontSize: 12.5, color: textSec(dark), lineHeight: 1.55 }}>
            {totalSessions === 0
              ? tr('client.stats.empty')
              : <>
                  <b style={{ color: textPri(dark) }}>{totalSessions}</b> session{totalSessions !== 1 ? 's' : ''} logged.
                  {' '}Strongest day: <b style={{ color: t.primary }}>{days[strongestDow]}</b>.
                  {' '}Keep showing up — consistency builds results.
                </>
            }
          </div>
        </div>
      </div>
    </>
  );
}

interface PerfChartProps {
  data:    number[];
  primary: string;
  dark:    boolean;
}

function PerfChart({ data, primary, dark }: PerfChartProps) {
  const W = 340, H = 180, P = 24;
  const maxV = Math.max(...data, 2.5);
  const x = (i: number) => P + i * ((W - P*2) / (data.length - 1));
  const y = (v: number) => H - P - (v / maxV) * (H - P*2);

  const path = data.map((v, i) => {
    if (i === 0) return `M${x(i)},${y(v)}`;
    const x0 = x(i-1), y0 = y(data[i-1]!);
    const x1 = x(i), y1 = y(v);
    const cx = (x0 + x1) / 2;
    return `C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }).join(' ');

  const ghost = data.map(v => v * 0.7);
  const ghostPath = ghost.map((v, i) => {
    if (i === 0) return `M${x(i)},${y(v)}`;
    const x0 = x(i-1), y0 = y(ghost[i-1]!);
    const x1 = x(i), y1 = y(v);
    const cx = (x0 + x1) / 2;
    return `C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }).join(' ');

  const grid = dark ? '#1F2E45' : '#E7ECF3';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
      {[0, 1, 2, 3].map(i => (
        <line key={i} x1={P} x2={W-P} y1={P + i*((H-P*2)/3)} y2={P + i*((H-P*2)/3)} stroke={grid} strokeWidth="1"/>
      ))}
      <path d={ghostPath} fill="none" stroke={dark ? '#2a3a52' : '#D7DEE7'} strokeWidth="2.5"/>
      {ghost.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r="3.5" fill={dark ? '#2a3a52' : '#D7DEE7'}/>
      ))}
      <path d={path} fill="none" stroke={primary} strokeWidth="3"/>
      {data.map((v, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(v)} r="4.5" fill={primary}/>
          <text x={x(i)} y={y(v) - 10} textAnchor="middle" fontSize="10" fill={primary} fontWeight="600" fontFamily="ui-monospace,monospace">{v.toFixed(1)}km</text>
        </g>
      ))}
    </svg>
  );
}
