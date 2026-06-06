import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TrainerClient } from '../../types';
import { PageHeader, Empty, C } from './SharedAtoms';

interface ClientsData {
  clients: TrainerClient[];
}

interface ClientsViewProps {
  data: ClientsData;
}

export default function ClientsView({ data }: ClientsViewProps) {
  const { t: tr } = useTranslation();
  const [search, setSearch]           = React.useState('');
  const [trainerFilter, setTrainer]   = React.useState('all');
  const [levelFilter, setLevel]       = React.useState('all');

  const LEVEL_COLORS: Record<string, string> = { beginner: '#10B981', intermediate: '#F59E0B', advanced: C.accent };
  const GOAL_ICONS: Record<string, string>   = { 'Strength': '💪', 'Weight loss': '🔥', 'Hypertrophy': '📈', 'Endurance': '🏃', 'Mobility': '🧘', 'Recovery': '❄️' };

  const trainerOptions = React.useMemo(() => {
    const seen = new Set<string>();
    return data.clients
      .map(c => ({ id: c.trainer_id, name: c.trainer?.name || '—' }))
      .filter(t => { if (!t.id) return false; if (seen.has(t.id)) return false; seen.add(t.id); return true; });
  }, [data.clients]);

  const visible = React.useMemo(() => {
    return data.clients.filter(c => {
      const matchSearch  = !search || (c.client?.name || '').toLowerCase().includes(search.toLowerCase());
      const matchTrainer = trainerFilter === 'all' || c.trainer_id === trainerFilter;
      const matchLevel   = levelFilter === 'all'   || c.physical?.fitness_level === levelFilter;
      return matchSearch && matchTrainer && matchLevel;
    });
  }, [data.clients, search, trainerFilter, levelFilter]);

  return (
    <>
      <PageHeader
        title={tr('studio.clients.title')}
        sub={tr('studio.clients.sub', { visible: visible.length, total: data.clients.length })}
      />

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.textMute, fontSize: 14, pointerEvents: 'none' }}>🔍</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder={tr('studio.clients.searchPlaceholder')}
            style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: 10, background: C.surface2, border: `1px solid ${search ? C.primary : C.border}`, color: C.textPri, fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s' }}
          />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.textMute, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>}
        </div>

        <select value={trainerFilter} onChange={e => setTrainer(e.target.value)}
          style={{ padding: '10px 12px', borderRadius: 10, background: C.surface2, border: `1px solid ${trainerFilter !== 'all' ? C.primary : C.border}`, color: trainerFilter !== 'all' ? C.primary : C.textSec, fontSize: 13, outline: 'none', cursor: 'pointer' }}>
          <option value="all">{tr('studio.clients.allTrainers')}</option>
          {trainerOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        <div style={{ display: 'flex', gap: 6 }}>
          {['all','beginner','intermediate','advanced'].map(lv => {
            const active = levelFilter === lv;
            const color  = lv === 'all' ? C.primary : LEVEL_COLORS[lv];
            return (
              <button key={lv} onClick={() => setLevel(lv)} style={{
                padding: '8px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                background: active ? color : 'transparent',
                color: active ? (lv === 'all' ? '#07101D' : '#fff') : C.textSec,
                border: `1.5px solid ${active ? color : C.border}`,
                fontFamily: 'inherit', cursor: 'pointer', textTransform: lv === 'all' ? 'none' : 'capitalize',
              }}>{lv === 'all' ? tr('studio.clients.allLevels') : lv}</button>
            );
          })}
        </div>

        {(search || trainerFilter !== 'all' || levelFilter !== 'all') && (
          <button onClick={() => { setSearch(''); setTrainer('all'); setLevel('all'); }}
            style={{ padding: '8px 14px', borderRadius: 14, fontSize: 12, fontWeight: 600, background: `${C.accent}18`, color: C.accent, border: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
            {tr('studio.clients.clear')}
          </button>
        )}
      </div>

      {data.clients.length === 0 ? (
        <Empty text={tr('studio.clients.noClients')}/>
      ) : visible.length === 0 ? (
        <Empty text={tr('studio.clients.noMatch')}/>
      ) : (
        <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1fr', gap: 0, padding: '12px 20px', borderBottom: `1px solid ${C.border}`, fontSize: 11, fontWeight: 700, color: C.textMute, letterSpacing: '.08em', textTransform: 'uppercase' }}>
            <span>{tr('studio.clients.headers.client')}</span><span>{tr('studio.clients.headers.email')}</span><span>{tr('studio.clients.headers.trainer')}</span><span>{tr('studio.clients.headers.goal')}</span><span>{tr('studio.clients.headers.level')}</span>
          </div>
          {visible.map((c, i) => {
            const lvl    = c.physical?.fitness_level;
            const goal   = c.physical?.primary_goal;
            const lvlClr = lvl ? (LEVEL_COLORS[lvl] || C.textMute) : C.textMute;
            return (
              <div key={c.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1fr',
                padding: '13px 20px', alignItems: 'center',
                borderBottom: i < visible.length - 1 ? `1px solid ${C.border}` : 'none',
                transition: 'background .1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = C.surface2}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                    background: `${C.primary}22`, color: C.primary,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 13,
                  }}>
                    {(c.client?.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.client?.name || '—'}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: C.textSec, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.client?.email || '—'}
                </span>
                <span style={{ fontSize: 12, color: C.textSec, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.trainer?.name || '—'}
                </span>
                <span style={{ fontSize: 12, color: C.textSec }}>
                  {goal ? `${GOAL_ICONS[goal] || ''} ${goal}` : '—'}
                </span>
                {lvl ? (
                  <span style={{ padding: '3px 9px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: `${lvlClr}22`, color: lvlClr, letterSpacing: '.04em', textTransform: 'capitalize', width: 'fit-content' }}>
                    {lvl}
                  </span>
                ) : <span style={{ color: C.textMute, fontSize: 12 }}>—</span>}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
