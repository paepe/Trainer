import React from 'react';
import { Icon } from './Icon';
import { AvatarImage } from './Avatar';
import type { NavFn, Profile } from '../types';

type SideMenuUser = Pick<Profile, 'name' | 'email' | 'role' | 'avatar_url'> & { gender?: string | undefined };

interface SideMenuProps {
  open:     boolean;
  nav:      NavFn;
  t:        { primary: string; primaryDeep: string };
  user:     SideMenuUser;
  current:  string;
  setUser:  (data: Partial<Profile>) => void;
  role?:    string | undefined;
}

const MENU_ITEMS: [string, string, string][] = [
  ['Smart Student Profile', 'profile',                  'brain'],
  ['Check-in',             'checkin',                  'sparkle'],
  ['Workout',              'workout',                  'play'],
  ['History',              'history',                  'history'],
  ['Progress',             'stats',                    'chart'],
  ['Cycle',                'cycle',                    'moon'],
  ['Coach DNA',            'coachDNA',                 'fingerprint'],
  ['Trainer Studio',       'studio',                   'flask'],
  ['Exercise Library',     'trainerLibraryExercises',  'dumbbell'],
  ['Settings',             'settings',                 'settings'],
];

const TRAINER_EXCLUDE = new Set(['profile', 'workout', 'goal', 'cycle', 'studio']);
const CLIENT_EXCLUDE   = new Set(['trainerLibraryExercises', 'studio', 'coachDNA']);

export const SideMenu: React.FC<SideMenuProps> = ({ open, nav, t, user, current, setUser, role }) => {
  const isTrainerRole = role === 'trainer' || role === 'studio_trainer' || role === 'internal_trainer' || role === 'technical_coordinator' || role === 'studio_admin' || role === 'studio_manager';
  const isMale = user.gender === 'male';
  const items = isTrainerRole
    ? MENU_ITEMS.filter(([, screen]) => !TRAINER_EXCLUDE.has(screen)).sort(([a], [b]) => a.localeCompare(b))
    : MENU_ITEMS.filter(([, screen]) => !CLIENT_EXCLUDE.has(screen) && !(isMale && screen === 'cycle'));

  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: open ? 'auto' : 'none',
    zIndex: 10,
  }}>
    <div onClick={() => nav(current)} style={{
      position: 'absolute', inset: 0,
      background: 'rgba(5,8,15,.6)',
      opacity: open ? 1 : 0, transition: 'opacity .25s',
    }}/>
    <div style={{
      position: 'absolute', top: 0, bottom: 0, left: 0, width: '82%',
      background: `linear-gradient(180deg, ${t.primaryDeep} 0%, ${t.primary} 100%)`,
      color: '#0E1A2B',
      transform: open ? 'translateX(0)' : 'translateX(-100%)',
      transition: 'transform .28s cubic-bezier(.4,0,.2,1)',
      display: 'flex', flexDirection: 'column',
      padding: '36px 0 20px',
      boxShadow: '6px 0 30px rgba(5,8,15,.45)',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '0 24px 22px' }}>
        <AvatarImage url={user.avatar_url} label="me" w={56} h={56} radius={14} dark/>
        <div style={{ marginTop: 14, fontSize: 18, fontWeight: 700, fontFamily: '"Plus Jakarta Sans",sans-serif' }}>
          {user.name}
        </div>
        <div style={{ fontSize: 12.5, opacity: .75 }}>{user.email}</div>
        <div style={{
          display: 'inline-block', marginTop: 10, padding: '3px 9px', borderRadius: 999,
          background: 'rgba(14,26,43,.25)', color: '#0E1A2B', fontSize: 9.5, fontWeight: 700, letterSpacing: '.06em',
        }}>
          {(user.role ?? 'CLIENT').toUpperCase()}
        </div>
      </div>

      <div style={{ height: 1, background: 'rgba(14,26,43,.18)', margin: '0 22px 10px' }}/>

      <div style={{ flex: 1, padding: '0 8px', overflow: 'auto' }}>
        {items.map(([lbl, screen, ic]) => (
          <button key={lbl} onClick={() => nav(screen)} style={{
            display: 'flex', alignItems: 'center', gap: 14, width: '100%',
            padding: '12px 18px', border: 'none',
            background: current === screen ? 'rgba(14,26,43,.16)' : 'transparent',
            color: '#0E1A2B', fontFamily: 'inherit', fontSize: 16, fontWeight: 500,
            cursor: 'pointer', textAlign: 'left', borderRadius: 12,
            opacity: current === screen ? 1 : 0.85,
          }}>
            <Icon name={ic} size={18} color="#0E1A2B" stroke={2}/>
            {lbl}
          </button>
        ))}
      </div>

      <button
        onClick={() => { void setUser({ name: 'Frances Scott', email: 'frances@trainer.app', role: 'client' }); nav('welcome'); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 28px', border: 'none', background: 'transparent',
          color: '#0E1A2B', fontFamily: 'inherit', fontSize: 15, fontWeight: 600,
          cursor: 'pointer', textAlign: 'left', marginTop: 8,
        }}
      >
        <Icon name="logout" size={18} color="#0E1A2B"/> Sign Out
      </button>
    </div>
  </div>
  );
};
