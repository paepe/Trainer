import React from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../supabase';
import { Icon } from '../../components/Icon';
import { ScreenTitle } from '../../components/ScreenTitle';
import { borderSubtle, textPri, textMute } from '../../theme';
import { formatTime, formatDate } from '../../lib/format';
import type { NavFn } from '../../types';
import { autoExpirePlans } from '../../lib/autoExpirePlans';

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
  prefs?:         { sessionHistoryLimit?: number };
}

interface Session {
  id:                 string;
  started_at:         string;
  completed_at:       string | null;
  total_duration_min: number | null;
  plan_id:            string | null;
}

export function HistoryScreen({ nav, t, dark, user, selectedClient, prefs }: HistoryScreenProps) {
  const { t: tr, i18n } = useTranslation();
  const historyLimit = prefs?.sessionHistoryLimit ?? 50;
  const targetUserId = selectedClient?.id ?? user.id;
  const targetName  = selectedClient?.name;
  const days      = tr('client.history.days', { returnObjects: true }) as string[];
  const dayLabels = tr('client.history.dayLabels', { returnObjects: true }) as string[];
  const todayDow  = new Date().getDay();
  const [selectedDow, setSelectedDow] = React.useState(todayDow);
  const [sessions, setSessions]       = React.useState<Session[]>([]);
  const [loading,  setLoading]        = React.useState(true);

  React.useEffect(() => {
    if (!targetUserId) { setLoading(false); return; }
    // Auto-cancel stale plans (>10 days) for this user; notify trainer
    void autoExpirePlans(targetUserId, 'client');
    supabase
      .from('workout_sessions')
      .select('id, started_at, completed_at, total_duration_min, plan_id')
      .eq('user_id', targetUserId)
      .order('started_at', { ascending: false })
      .limit(historyLimit)
      .then(({ data }) => {
        setSessions((data as Session[]) || []);
        setLoading(false);
      });
  }, [targetUserId, historyLimit]);

  const filtered = sessions.filter(s => {
    if (!s.started_at) return false;
    return new Date(s.started_at).getDay() === selectedDow;
  });

  const fmtTime = (iso: string) => {
    if (!iso) return '';
    return formatTime(iso, i18n.language);
  };
  const fmtDate = (iso: string) => {
    if (!iso) return '';
    return formatDate(iso, i18n.language, { day: 'numeric', month: 'short' });
  };

  return (
    <>
      <ScreenTitle dark={dark}>{tr('client.history.title')}</ScreenTitle>

      {/* Client badge */}
      {targetName && (
        <div style={{
          margin: '0 22px 8px', padding: '6px 14px', borderRadius: 999,
          background: '#10B98122', border: '1px solid #10B98155',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#10B981', letterSpacing: '.06em', textTransform: 'uppercase' }}>
            {tr('client.history.viewing')}
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
            {tr('client.history.loading')}
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div style={{ padding: '32px 0', textAlign: 'center', color: textMute(dark), fontSize: 13 }}>
            {tr('client.history.emptyForDay', { day: days[selectedDow] })}
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
                {tr('client.goal.workoutSession')}
                {s.total_duration_min ? ` · ${s.total_duration_min} min` : ''}
              </div>
              <div style={{ fontSize: 11.5, color: textMute(dark), marginTop: 2 }}>
                {fmtDate(s.started_at)}
                {s.started_at && s.completed_at
                  ? ` · ${fmtTime(s.started_at)} – ${fmtTime(s.completed_at)}`
                  : ''}
              </div>
            </div>
            <button onClick={() => nav('workoutSummary', {
              sessionId:  s.id,
              durationMin: s.total_duration_min ?? 0,
            })} style={{
              padding: '7px 14px', borderRadius: 999,
              border: `1.5px solid ${t.primary}`, background: 'transparent',
              color: t.primary, fontSize: 12, fontWeight: 700,
              fontFamily: 'inherit', cursor: 'pointer',
            }}>{ tr('client.history.viewProgress')}</button>
          </div>
        ))}
      </div>
    </>
  );
}
