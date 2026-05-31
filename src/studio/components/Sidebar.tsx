import React from 'react';
import { Button } from '@/ui';
import { supabase } from '../../supabase';
import { C } from './SharedAtoms';
import type { Profile } from '../../types';
import type { useStudioData } from '../hooks/useStudioData';

interface SidebarProps {
  view: string;
  setView: (view: string) => void;
  profile: Profile;
  data: ReturnType<typeof useStudioData>;
}

export function Sidebar({ view, setView, profile, data }: SidebarProps) {
  const NAV = [
    { key: 'dashboard', icon: '◈', label: 'Dashboard' },
    { key: 'team',      icon: '⬡', label: 'Team' },
    { key: 'clients',   icon: '◉', label: 'Clients' },
    { key: 'protocols', icon: '▤', label: 'Protocols' },
  ];

  return (
    <aside style={{ width: 224, background: C.surface, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ padding: '28px 22px 24px' }}>
        <div style={{ fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>
          Tr<span style={{ color: C.primary }}>AI</span>ner
        </div>
        <div style={{ fontSize: 10, color: C.textMute, marginTop: 3, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' }}>
          Studio
        </div>
      </div>

      {data.studio && (
        <div style={{ margin: '0 14px 20px', padding: '12px 14px', borderRadius: 12, background: `${C.primary}12`, border: `1px solid ${C.primary}30` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.studio.name}</div>
          <div style={{ fontSize: 11, color: C.textMute, marginTop: 2 }}>{data.stats.trainers} trainer{data.stats.trainers !== 1 ? 's' : ''} · {data.stats.clients} clients</div>
        </div>
      )}

      <nav style={{ padding: '0 12px', flex: 1 }}>
        {NAV.map(n => (
          <button key={n.key} onClick={() => setView(n.key)} style={{
            width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 10, marginBottom: 2,
            background: view === n.key ? `${C.primary}18` : 'transparent',
            color: view === n.key ? C.primary : C.textSec,
            border: 'none', fontFamily: 'inherit', fontSize: 14,
            fontWeight: view === n.key ? 600 : 400, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10, transition: 'all .12s',
          }}>
            <span style={{ fontSize: 16, opacity: view === n.key ? 1 : 0.6 }}>{n.icon}</span>
            {n.label}
          </button>
        ))}
      </nav>

      <div style={{ padding: '16px 18px', borderTop: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{profile.name || '—'}</div>
        <div style={{ fontSize: 11, color: C.textMute, marginBottom: 12, overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.email}</div>
        <Button variant="danger" size="sm" onClick={() => supabase.auth.signOut()} full>Sign out</Button>
      </div>
    </aside>
  );
}
