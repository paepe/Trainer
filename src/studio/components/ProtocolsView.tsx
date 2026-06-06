import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, TextInput } from '@/ui';
import type { Protocol, CreateProtocolPayload, FitnessLevel, ProtocolExercise } from '../../types';
import { PageHeader, Empty, C } from './SharedAtoms';
import { ProtocolDetail } from './ProtocolDetail';

interface ProtocolsViewProps {
  data: {
    protocols: Protocol[];
    createProtocol: (payload: CreateProtocolPayload) => Promise<{ protocol: Protocol | null; error: unknown }>;
    deleteProtocol: (id: string) => Promise<void>;
    addProtocolExercise: (protocolId: string, exercise: Omit<ProtocolExercise, 'id' | 'protocol_id'> & { order_index: number }) => Promise<{ error: unknown }>;
  };
}

export function ProtocolsView({ data }: ProtocolsViewProps) {
  const { t: tr } = useTranslation();
  const [showCreate, setShowCreate] = React.useState(false);
  const [form, setForm] = React.useState<CreateProtocolPayload>({
    name: '', objective: '', level: 'beginner', duration_minutes: 45, description: '', contraindications: null, tags: null,
  });
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState('');
  const [expanded, setExpanded] = React.useState<string | null>(null);

  const [search, setSearch]         = React.useState('');
  const [levelFilter, setLevelFilter] = React.useState('all');
  const [sortBy, setSortBy]         = React.useState('name');
  const [sortDir, setSortDir]       = React.useState<'asc' | 'desc'>('asc');

  const LEVELS = ['all', 'beginner', 'intermediate', 'advanced'];
  const LEVEL_COLORS: Record<string, string> = { beginner: '#10B981', intermediate: '#F59E0B', advanced: C.accent };
  const LEVEL_ORDER: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };

  const handleSort = (field: string) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  const sortIcon = (field: string) => {
    if (sortBy !== field) return <span style={{ color: C.textMute, fontSize: 11 }}>↕</span>;
    return <span style={{ color: C.primary, fontSize: 11 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const visible = React.useMemo(() => {
    return data.protocols
      .filter(p => (levelFilter === 'all' || p.level === levelFilter) && (!search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.objective || '').toLowerCase().includes(search.toLowerCase())))
      .sort((a, b) => {
        let va: string | number, vb: string | number;
        if (sortBy === 'level') { va = LEVEL_ORDER[a.level || ''] ?? 0; vb = LEVEL_ORDER[b.level || ''] ?? 0; }
        else if (sortBy === 'duration') { va = a.duration_minutes ?? 0; vb = b.duration_minutes ?? 0; }
        else if (sortBy === 'exercises') { va = a.exercises?.length ?? 0; vb = b.exercises?.length ?? 0; }
        else { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
        if (typeof va === 'string' && typeof vb === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number);
      });
  }, [data.protocols, search, levelFilter, sortBy, sortDir]);

  async function create() {
    if (!form.name.trim()) return;
    setLoading(true); setErr('');
    const { error } = await data.createProtocol(form);
    if (error) { setErr(error instanceof Error ? error.message : String(error)); setLoading(false); return; }
    setForm({ name: '', objective: '', level: 'beginner', duration_minutes: 45, description: '', contraindications: null, tags: null });
    setShowCreate(false); setLoading(false);
  }

  return (
    <>
      <PageHeader
        title={tr('studio.protocols.title')}
        sub={tr('studio.protocols.sub', { visible: visible.length, total: data.protocols.length })}
      >
        <Button onClick={() => setShowCreate(v => !v)}>{tr('studio.protocols.newProtocol')}</Button>
      </PageHeader>

      {showCreate && (
        <div style={{ marginBottom: 24, padding: 24, borderRadius: 16, background: C.surface, border: `1.5px solid ${C.primary}` }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>{tr('studio.protocols.newProtocolHeading')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <TextInput label={tr('studio.protocols.name')} value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="e.g. Hypertrophy Beginner"/>
            <TextInput label={tr('studio.protocols.objective')} value={form.objective || ''} onChange={v => setForm({ ...form, objective: v })} placeholder="e.g. Muscle building"/>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.textMute, textTransform: 'uppercase', letterSpacing: '.06em' }}>{tr('studio.protocols.level')}</span>
              <select value={form.level || 'beginner'} onChange={e => setForm({ ...form, level: e.target.value as FitnessLevel })}
                style={{ padding: '11px 12px', borderRadius: 10, background: C.surface2, border: `1px solid ${C.border}`, color: C.textPri, fontSize: 14, outline: 'none' }}>
                {['beginner', 'intermediate', 'advanced'].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </label>
            <TextInput label={tr('studio.protocols.durationLabel')} value={String(form.duration_minutes || '')} onChange={v => setForm({ ...form, duration_minutes: Number(v) || null })} placeholder="45"/>
          </div>
          <TextInput label={tr('studio.protocols.description')} value={form.description || ''} onChange={v => setForm({ ...form, description: v })} placeholder={tr('studio.protocols.descriptionPlaceholder')} multiline/>
          {err && <div style={{ color: C.accent, fontSize: 12, margin: '10px 0' }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Button onClick={create} loading={loading}>{tr('studio.protocols.createProtocol')}</Button>
            <Button variant="ghost" onClick={() => { setShowCreate(false); setErr(''); }}>{tr('studio.protocols.cancel')}</Button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.textMute, fontSize: 14, pointerEvents: 'none' }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={tr('studio.protocols.searchPlaceholder')}
            style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: 10, background: C.surface2, border: `1px solid ${search ? C.primary : C.border}`, color: C.textPri, fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s' }} />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.textMute, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>}
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {LEVELS.map(lv => {
            const active = levelFilter === lv;
            const color  = lv === 'all' ? C.primary : LEVEL_COLORS[lv];
            return (
              <button key={lv} onClick={() => setLevelFilter(lv)} style={{
                padding: '8px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                background: active ? color : 'transparent',
                color: active ? (lv === 'all' ? '#07101D' : '#fff') : C.textSec,
                border: `1.5px solid ${active ? color : C.border}`,
                fontFamily: 'inherit', cursor: 'pointer', transition: 'all .12s',
                textTransform: lv === 'all' ? 'none' : 'capitalize',
              }}>{lv === 'all' ? tr('studio.clients.allLevels') : lv}</button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 12, padding: '8px 14px', borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, fontSize: 12, color: C.textMute, alignItems: 'center' }}>
        <span style={{ marginRight: 8, fontWeight: 600 }}>{tr('studio.protocols.sortBy')}</span>
        {[
          { key: 'name',      label: tr('studio.protocols.sortName') },
          { key: 'level',     label: tr('studio.protocols.sortLevel') },
          { key: 'duration',  label: tr('studio.protocols.sortDuration') },
          { key: 'exercises', label: tr('studio.protocols.sortExercises') },
        ].map(col => (
          <button key={col.key} onClick={() => handleSort(col.key)} style={{
            padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: sortBy === col.key ? 700 : 500,
            background: sortBy === col.key ? `${C.primary}18` : 'transparent',
            color: sortBy === col.key ? C.primary : C.textSec,
            border: `1px solid ${sortBy === col.key ? C.primary : 'transparent'}`,
            fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: 'all .12s',
          }}>
            {col.label} {sortIcon(col.key)}
          </button>
        ))}
        {(search || levelFilter !== 'all') && (
          <button onClick={() => { setSearch(''); setLevelFilter('all'); }} style={{
            marginLeft: 'auto', padding: '5px 12px', borderRadius: 8, fontSize: 12,
            background: `${C.accent}18`, color: C.accent, border: 'none', fontFamily: 'inherit', cursor: 'pointer',
          }}>{tr('studio.protocols.clearFilters')}</button>
        )}
      </div>

      {data.protocols.length === 0 ? (
        <Empty text={tr('studio.protocols.noProtocolsYet')}/>
      ) : visible.length === 0 ? (
        <Empty text={tr('studio.protocols.noMatch').replace('{{search}}', search)}/>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visible.map(p => {
            const levelColor = LEVEL_COLORS[p.level ?? ''] ?? C.primary;
            return (
              <div key={p.id} style={{ borderRadius: 14, background: C.surface, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}
                  onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                  <div style={{ width: 4, height: 36, borderRadius: 2, background: levelColor, flexShrink: 0 }}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: C.textSec, marginTop: 2 }}>{p.objective || 'General'} · {p.duration_minutes} min · {p.exercises?.length || 0} exercises</div>
                  </div>
                  {p.level && (
                    <span style={{ padding: '3px 9px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: `${levelColor}22`, color: levelColor, letterSpacing: '.04em', textTransform: 'capitalize', flexShrink: 0 }}>{p.level}</span>
                  )}
                  <Button variant="danger" size="sm" onClick={e => { e.stopPropagation(); void data.deleteProtocol(p.id); }}>{tr('studio.protocols.delete')}</Button>
                  <span style={{ color: C.textMute, fontSize: 18, flexShrink: 0, transition: 'transform .2s', transform: expanded === p.id ? 'rotate(90deg)' : 'none' }}>›</span>
                </div>
                {expanded === p.id && <ProtocolDetail protocol={p} onAddExercise={(ex) => data.addProtocolExercise(p.id, ex)}/>}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
