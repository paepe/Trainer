import React from 'react';
import { supabase } from '../../supabase';
import { Icon } from '../../components/Icon';
import { AvatarImage } from '../../components/Avatar';
import { TopBar } from '../../components/TopBar';
import { ScreenTitle } from '../../components/ScreenTitle';
import { surfRaised, borderSubtle, textPri, textMute } from '../../theme';
import type { NavFn } from '../../types';

interface Theme {
  primary:     string;
  primaryDeep: string;
  primarySoft: string;
  accent:      string;
}

interface AppCycleConfig {
  length:          number;
  periodLength?:   number;
  lastStartOffset: number;
}

interface AppUser {
  id:         string | null;
  name:       string;
  email:      string;
  role:       string;
  avatar_url: string | null;
}

interface Prefs { cycle?: boolean }

interface ProfileScreenProps {
  nav:         NavFn;
  t:           Theme;
  dark:        boolean;
  user:        AppUser;
  prefs?:      Prefs;
  cycleConfig?: AppCycleConfig | null;
}

interface StatCardProps {
  icon:     string;
  label:    string;
  sub:      string;
  t:        Theme;
  dark:     boolean;
  onClick:  () => void;
  accent?:  boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, sub, t, dark, onClick, accent = false }) => {
  const c = accent ? t.accent : t.primary;
  return (
    <button onClick={onClick} style={{
      textAlign: 'left', padding: '18px 16px',
      background: surfRaised(dark),
      border: `1px solid ${borderSubtle(dark)}`,
      borderRadius: 16, fontFamily: 'inherit', cursor: 'pointer',
      boxShadow: dark ? 'none' : '0 1px 0 rgba(20,40,80,.02), 0 8px 18px rgba(20,40,80,.04)',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 12,
        background: `${c}1f`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
      }}>
        <Icon name={icon} size={20} color={c} stroke={2}/>
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: textPri(dark), fontFamily: '"Plus Jakarta Sans",sans-serif' }}>{label}</div>
      <div style={{ fontSize: 12, color: textMute(dark), marginTop: 2 }}>{sub}</div>
    </button>
  );
};

export function ProfileScreen({ nav, t, dark, user, prefs, cycleConfig }: ProfileScreenProps) {
  const [sessionCount,   setSessionCount]   = React.useState<number | null>(null);
  const [completedToday, setCompletedToday] = React.useState(false);

  React.useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('workout_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => setSessionCount(count ?? 0));

    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from('checkins')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle()
      .then(({ data }) => setCompletedToday(!!data));
  }, [user?.id]);

  const cycleDay = cycleConfig?.lastStartOffset != null ? cycleConfig.lastStartOffset + 1 : null;
  const cycleLen = cycleConfig?.length ?? 28;

  return (
    <>
      <TopBar onMenu={() => nav('menu')} dark={dark} accent={t.accent}/>
      <ScreenTitle dark={dark}>User Profile</ScreenTitle>

      <div style={{ padding: '0 22px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <AvatarImage url={user.avatar_url} label="photo" w={88} h={88} radius={16} dark={dark}/>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 19, fontWeight: 600, color: textPri(dark), fontFamily: '"Plus Jakarta Sans",sans-serif' }}>
            {user.name}
          </div>
          <div style={{
            display: 'inline-block', marginTop: 4, padding: '3px 10px', borderRadius: 999,
            background: `${t.primary}22`, color: t.primary, fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em',
          }}>{(user.role || 'Client').toUpperCase()}</div>
          <div style={{ fontSize: 12.5, color: textMute(dark), marginTop: 4 }}>{user.email}</div>
        </div>
      </div>

      <div style={{ padding: '0 22px 14px' }}>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: textPri(dark) }}>
          Physical fitness is a state of health and well-being and, more specifically, the ability
          to perform aspects of sports, occupations and daily activities.
        </p>
      </div>

      {/* Daily check-in CTA */}
      <div style={{ padding: '6px 22px 16px' }}>
        <button onClick={() => nav('checkin')} style={{
          width: '100%', textAlign: 'left', padding: '16px',
          background: `linear-gradient(135deg, ${t.primaryDeep} 0%, ${t.primary} 100%)`,
          border: 'none', borderRadius: 18, cursor: 'pointer', fontFamily: 'inherit',
          color: '#0E1A2B', display: 'flex', alignItems: 'center', gap: 14,
          boxShadow: `0 12px 28px ${t.primary}33`,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'rgba(14,26,43,.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="sparkle" size={22} color="#0E1A2B" stroke={2.4}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: '"Plus Jakarta Sans",sans-serif' }}>Daily check-in</div>
            <div style={{ fontSize: 11.5, fontWeight: 500, opacity: .8 }}>Tell us how you feel today — AI adapts your plan</div>
          </div>
          <Icon name="chev" size={20} color="#0E1A2B" stroke={2.4}/>
        </button>
      </div>

      <div style={{ padding: '0 18px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <StatCard icon="target"  label="Targets"  sub={completedToday ? '✓ Checked in today' : 'Check in to start'} t={t} dark={dark} onClick={() => nav('goal')}/>
        <StatCard icon="history" label="History"  sub={sessionCount !== null ? `${sessionCount} session${sessionCount !== 1 ? 's' : ''}` : '…'} t={t} dark={dark} onClick={() => nav('history')}/>
        <StatCard icon="flame"   label="Workout"  sub="Start today's plan" t={t} dark={dark} onClick={() => nav('workout')}/>
        {prefs?.cycle
          ? <StatCard icon="moon" label="Cycle"
              sub={cycleDay ? `Day ${cycleDay} / ${cycleLen}` : 'Set up cycle'}
              t={t} dark={dark} accent onClick={() => nav('cycle')}/>
          : <StatCard icon="settings" label="Settings" sub="Manage preferences" t={t} dark={dark} onClick={() => nav('settings')}/>}
      </div>

      <div style={{ padding: '0 22px 28px' }}>
        <button onClick={() => nav('editProfile')} style={{
          padding: '13px 22px', border: `1.5px solid ${t.primary}`, borderRadius: 999,
          background: 'transparent', color: t.primary, fontFamily: 'inherit', fontSize: 14,
          fontWeight: 600, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Icon name="edit" size={16} color={t.primary}/> Edit profile
        </button>
      </div>
    </>
  );
}
