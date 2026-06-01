import React from 'react';
import { supabase } from '../../supabase';
import { Icon, ScreenTitle, SectionLabel } from '../../components';
import { surfRaised, borderSubtle, textPri, textSec, textMute, outlineBtn } from '../../theme';
import type { NavFn } from '../../types';

interface Theme {
  primary:     string;
  primarySoft: string;
  accent:      string;
}

interface AppUser {
  id:         string | null;
  name:       string;
  email:      string;
  role:       string;
  avatar_url: string | null;
}

interface SessionData {
  durationMinutes?: number | null;
  planId?:          string | null;
  completedCount?:  number | null;
  total?:           number | null;
  startedAt?:       string;
  sessionId?:       string | null;
}

interface GoalAchievedScreenProps {
  nav:          NavFn;
  t:            Theme;
  dark:         boolean;
  sessionData?: SessionData | null;
  user:         AppUser;
}

export function GoalAchievedScreen({ nav, t, dark, sessionData, user }: GoalAchievedScreenProps) {
  const [duration,  setDuration]  = React.useState<number | null>(sessionData?.durationMinutes ?? null);
  const [completed, setCompleted] = React.useState<number | null>(sessionData?.completedCount  ?? null);
  const [total,     setTotal]     = React.useState<number | null>(sessionData?.total           ?? null);
  const [loading,   setLoading]   = React.useState<boolean>(false);

  const sessionId = sessionData?.sessionId ?? null;

  // No payload — load the most recent session from DB
  React.useEffect(() => {
    if (sessionData || !user?.id) return;
    setLoading(true);
    supabase
      .from('workout_sessions')
      .select('id, total_duration_min, plan_id, started_at')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) { setLoading(false); return; }
        setDuration((data as { total_duration_min: number | null }).total_duration_min ?? null);
        setLoading(false);
      });
  }, [user?.id, sessionData]);

  // Fetch exercise counts from workout_session_exercises using sessionId
  React.useEffect(() => {
    if (completed !== null || !sessionId) return;
    supabase
      .from('workout_session_exercises')
      .select('id, status')
      .eq('session_id', sessionId)
      .then(({ data }) => {
        if (!data?.length) return;
        setTotal(data.length);
        setCompleted(data.filter(e => e.status === 'completed').length);
      });
  }, [sessionId, completed]);

  const completePct = total && total > 0 && completed !== null ? Math.round((completed / total) * 100) : null;

  const fmtDuration = (min: number | null) => {
    if (!min) return null;
    return min >= 60 ? `${Math.floor(min / 60)}h ${min % 60 > 0 ? `${min % 60}m` : ''}`.trim() : `${min} min`;
  };

  return (
    <>
      <ScreenTitle dark={dark}>Goal Achieved</ScreenTitle>

      {/* Primary metric */}
      <div style={{ padding: '0 22px 6px', textAlign: 'center' }}>
        <div style={{
          fontFamily: '"Plus Jakarta Sans",sans-serif',
          fontSize: 40, fontWeight: 700, color: t.primary, letterSpacing: '-0.02em',
        }}>
          {loading ? '…' : duration ? fmtDuration(duration) : '—'}
        </div>
        <div style={{ color: textSec(dark), fontSize: 12.5, marginTop: 2 }}>Session duration</div>
      </div>

      {/* Completion rings */}
      <div style={{
        padding: '18px 22px 8px',
        display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, justifyItems: 'center',
      }}>
        <RingStat label="Completed" pct={completePct ?? 0}  t={t} dark={dark} big/>
        <RingStat label="Duration"  pct={Math.min(100, Math.round((duration ?? 0) / 60 * 100))} t={t} dark={dark}/>
        <RingStat label="Exercises" pct={completePct ?? 0}  t={t} dark={dark}/>
      </div>

      {/* Session summary row */}
      {(completed !== null || duration !== null) && (
        <div style={{ padding: '14px 22px 8px' }}>
          <SectionDate label={new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })} dark={dark}/>
          <ActivityRow
            title="Workout session"
            sub={completed !== null && total !== null ? `${completed} / ${total} exercises` : 'Completed'}
            right={duration ? fmtDuration(duration) || '' : ''}
            t={t} dark={dark}
          />
        </div>
      )}

      {/* AI summary card */}
      <div style={{ padding: '8px 22px 12px' }}>
        <div style={{
          padding: '14px 16px', borderRadius: 14,
          background: `${t.primary}${dark ? '14' : '10'}`,
          border: `1px solid ${t.primary}55`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Icon name="sparkle" size={16} color={t.primary} stroke={2.3}/>
            <div style={{ fontSize: 13, fontWeight: 700, color: textPri(dark) }}>Session summary</div>
          </div>
          <div style={{ fontSize: 12.5, color: textSec(dark), lineHeight: 1.55 }}>
            {duration ? <>Your session lasted <b style={{ color: textPri(dark) }}>{fmtDuration(duration)}</b>. </> : null}
            {completePct !== null
              ? <><b style={{ color: t.primary }}>{completePct}%</b> of planned exercises completed. </>
              : null}
            Great work — check your stats for progress trends.
          </div>
        </div>
      </div>

      <div style={{ padding: '0 22px 28px' }}>
        <button onClick={() => nav('stats')} style={outlineBtn(t.primary)}>View statistics</button>
      </div>
    </>
  );
}

interface RingStatProps {
  label: string;
  pct:   number;
  t:     Theme;
  dark:  boolean;
  big?:  boolean;
}

function RingStat({ label, pct, t, dark, big }: RingStatProps) {
  const r = big ? 38 : 32;
  const stroke = big ? 7 : 6;
  const c = 2 * Math.PI * r;
  const size = (r + stroke) * 2 + 4;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${t.primary}22`} strokeWidth={stroke}/>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={t.primary} strokeWidth={stroke}
            strokeDasharray={`${(pct/100)*c} ${c}`} strokeLinecap="round"/>
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: textPri(dark), fontWeight: 600, fontFamily: '"Plus Jakarta Sans",sans-serif',
          fontSize: big ? 18 : 15,
        }}>{pct}<span style={{ fontSize: 9, marginLeft: 1, color: textMute(dark) }}>%</span></div>
      </div>
      <div style={{ fontSize: 12, color: textSec(dark) }}>{label}</div>
    </div>
  );
}

interface SectionDateProps {
  label: string;
  dark:  boolean;
}

function SectionDate({ label, dark }: SectionDateProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 2px 6px' }}>
      <div style={{ flex: 1, height: 1, background: borderSubtle(dark) }}/>
      <div style={{ fontSize: 11, color: textMute(dark) }}>{label}</div>
      <div style={{ flex: 1, height: 1, background: borderSubtle(dark) }}/>
    </div>
  );
}

interface ActivityRowProps {
  title: string;
  sub:   string;
  right: string;
  t:     Theme;
  dark:  boolean;
}

function ActivityRow({ title, sub, right, t, dark }: ActivityRowProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 14px', background: surfRaised(dark),
      border: `1px solid ${borderSubtle(dark)}`,
      borderRadius: 12, marginBottom: 8,
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: textPri(dark) }}>{title}</div>
        <div style={{ fontSize: 11.5, color: textMute(dark) }}>{sub}</div>
      </div>
      <div style={{ fontSize: 13, color: textSec(dark), fontVariantNumeric: 'tabular-nums' }}>{right}</div>
    </div>
  );
}
