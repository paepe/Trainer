import React from 'react';
import { supabase } from '../../supabase';
import { Icon } from '../../components/Icon';
import { ScreenTitle } from '../../components/ScreenTitle';
import { borderSubtle, textPri, textMute } from '../../theme';
import type { NavFn } from '../../types';

interface Theme {
  primary: string;
  accent:  string;
}

interface AppUser {
  id: string | null;
}

interface HistoryScreenProps {
  nav:            NavFn;
  t:              Theme;
  dark:           boolean;
  user:           AppUser;
  selectedClient?: { id: string; name?: string } | null;
}

interface Session {
  id:                 string;
  started_at:         string;
  completed_at:       string | null;
  total_duration_min: number | null;
  plan_id:            string | null;
}

export function HistoryScreen({ nav, t, dark, user, selectedClient }: HistoryScreenProps) {
  const targetUserId = selectedClient?.id ?? user.id;
  const targetName  = selectedClient?.name;
  const days      = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const todayDow  = new Date().getDay();
  const [selectedDow, setSelectedDow] = React.useState(todayDow);
  const [sessions, setSessions]       = React.useState<Session[]>([]);
  const [loading,  setLoading]        = React.useState(true);

  React.useEffect(() => {
    if (!targetUserId) { setLoading(false); return; }
    supabase
      .from('workout_sessions')
      .select('id, started_at, completed_at, total_duration_min, plan_id')
      .eq('user_id', targetUserId)
      .order('started_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setSessions((data as Session[]) || []);
        setLoading(false);
      });
  }, [targetUserId]);

  const filtered = sessions.filter(s => {
    if (!s.started_at) return false;
    return new Date(s.started_at).getDay() === selectedDow;
  });

  const fmtTime = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };
  const fmtDate = (iso: string) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  return (
    <>
      <ScreenTitle dark={dark}>Workout History</ScreenTitle>

      {/* Client badge */}
      {targetName && (
        <div style={{
          margin: '0 22px 8px', padding: '6px 14px', borderRadius: 999,
          background: '#10B98122', border: '1px solid #10B98155',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#10B981', letterSpacing: '.06em', textTransform: 'uppercase' }}>
            Viewing
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#10B981' }}>
            {targetName.split(' ')[0]}
          </span>
        </div>
      )}

      {/* Day-of-week filter */}
      <div style={{
        padding: '0 22px 0', display: 'flex', gap: 2, justifyContent: 'space-between',
        borderBottom: `1px solid ${borderSubtle(dark)}`,
      }}>
        {days.map((d, i) => (
          <button key={d} onClick={() => setSelectedDow(i)} style={{
            flex: 1, padding: '14px 0', background: 'transparent', border: 'none',
            fontFamily: 'inherit', fontSize: 12.5, cursor: 'pointer',
            color: selectedDow === i ? t.primary : textMute(dark),
            fontWeight: selectedDow === i ? 600 : 500,
            borderBottom: `2px solid ${selectedDow === i ? t.primary : 'transparent'}`,
            marginBottom: -1,
          }}>{dayLabels[i]}</button>
        ))}
      </div>

      <div style={{ padding: '8px 14px 28px' }}>
        {loading && (
          <div style={{ padding: '32px 0', textAlign: 'center', color: textMute(dark), fontSize: 13 }}>
            Loading…
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div style={{ padding: '32px 0', textAlign: 'center', color: textMute(dark), fontSize: 13 }}>
            No sessions on {days[selectedDow]}s yet.
          </div>
        )}
        {!loading && filtered.map((s, i) => (
          <div key={s.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 12px',
            borderBottom: i < filtered.length - 1 ? `1px solid ${borderSubtle(dark)}` : 'none',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              border: `1.5px solid ${t.primary}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `${t.primary}1f`,
            }}>
              <Icon name="check" size={16} color={t.primary} stroke={2.6}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: textPri(dark) }}>
                Workout session
                {s.total_duration_min ? ` · ${s.total_duration_min} min` : ''}
              </div>
              <div style={{ fontSize: 11.5, color: textMute(dark), marginTop: 2 }}>
                {fmtDate(s.started_at)}
                {s.started_at && s.completed_at
                  ? ` · ${fmtTime(s.started_at)} – ${fmtTime(s.completed_at)}`
                  : ''}
              </div>
            </div>
            <button onClick={() => nav('stats', {
              durationMinutes: s.total_duration_min,
              startedAt:       s.started_at,
              planId:          s.plan_id,
              sessionId:       s.id,
            })} style={{
              padding: '7px 14px', borderRadius: 999,
              border: `1.5px solid ${t.primary}`, background: 'transparent',
              color: t.primary, fontSize: 12, fontWeight: 700,
              fontFamily: 'inherit', cursor: 'pointer',
            }}>View Progress</button>
          </div>
        ))}
      </div>
    </>
  );
}
