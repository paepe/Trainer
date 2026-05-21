import React from 'react';
import { supabase } from '../supabase';
import { useStudioData } from '../hooks/useStudioData';

const C = {
  primary:  '#2DD4E0',
  accent:   '#EF5B3C',
  bg:       '#07101D',
  surface:  '#0D1B2E',
  surface2: '#122034',
  border:   '#1C2E44',
  textPri:  '#FFFFFF',
  textSec:  'rgba(255,255,255,.6)',
  textMute: 'rgba(255,255,255,.35)',
};

// ─── TOP-LEVEL APP ────────────────────────────────────────────
export default function StudioApp() {
  const [session, setSession] = React.useState(undefined);
  const [profile, setProfile] = React.useState(null);
  const [view, setView] = React.useState('dashboard');

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) fetchProfile(s.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) fetchProfile(s.user.id);
      else { setProfile(null); setSession(null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(uid) {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
    setProfile(data);
  }

  if (session === undefined) return <Loader/>;
  if (!session) return <LoginView/>;
  if (!profile) return <Loader/>;
  if (profile.role !== 'studio_admin') return <AccessDenied onSignOut={() => supabase.auth.signOut()}/>;

  return <Dashboard session={session} profile={profile} view={view} setView={setView}/>;
}

// ─── MAIN DASHBOARD ──────────────────────────────────────────
function Dashboard({ session, profile, view, setView }) {
  const data = useStudioData(session.user.id);

  const NAV = [
    { key: 'dashboard', icon: '◈', label: 'Dashboard' },
    { key: 'team',      icon: '⬡', label: 'Team' },
    { key: 'clients',   icon: '◉', label: 'Clients' },
    { key: 'protocols', icon: '▤', label: 'Protocols' },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, color: C.textPri }}>
      {/* Sidebar */}
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
          <Btn variant="danger" size="sm" onClick={() => supabase.auth.signOut()} full>Sign out</Btn>
        </div>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, overflow: 'auto', padding: '36px 44px' }}>
        {data.loading ? (
          <Loader inline/>
        ) : !data.studio ? (
          <CreateStudioView onCreate={data.createStudio}/>
        ) : view === 'dashboard' ? (
          <DashboardView data={data}/>
        ) : view === 'team' ? (
          <TeamView data={data}/>
        ) : view === 'clients' ? (
          <ClientsView data={data}/>
        ) : (
          <ProtocolsView data={data}/>
        )}
      </main>
    </div>
  );
}

// ─── CREATE STUDIO ────────────────────────────────────────────
function CreateStudioView({ onCreate }) {
  const [name, setName] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState('');

  async function submit() {
    if (!name.trim()) return;
    setLoading(true);
    const { error } = await onCreate(name.trim());
    if (error) { setErr(error.message); setLoading(false); }
  }

  return (
    <div style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 20 }}>🏢</div>
      <h1 style={{ fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 28, fontWeight: 800, margin: '0 0 10px' }}>Create your Studio</h1>
      <p style={{ color: C.textSec, marginBottom: 32 }}>Give your studio a name to get started. You can always change this later.</p>
      <input
        value={name} onChange={e => setName(e.target.value)}
        placeholder="Studio name (e.g. FitCore Lisboa)"
        style={{ width: '100%', padding: '14px 16px', borderRadius: 12, background: C.surface2, border: `1.5px solid ${C.border}`, color: C.textPri, fontSize: 15, outline: 'none', marginBottom: 12 }}
      />
      {err && <div style={{ color: C.accent, fontSize: 13, marginBottom: 12 }}>{err}</div>}
      <Btn onClick={submit} loading={loading} full>Create Studio →</Btn>
    </div>
  );
}

// ─── DASHBOARD VIEW ───────────────────────────────────────────
function DashboardView({ data }) {
  const { stats, protocols, members } = data;
  return (
    <>
      <PageHeader title="Dashboard" sub="Studio overview"/>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 36 }}>
        {[
          { label: 'Active clients',     value: stats.clients,          color: C.primary },
          { label: 'Active trainers',    value: stats.trainers,         color: '#7B5CFF' },
          { label: 'Plans this week',    value: stats.plansThisWeek,    color: '#F59E0B' },
          { label: 'Completed this week',value: stats.completedThisWeek,color: '#10B981' },
        ].map(k => (
          <div key={k.label} style={{ padding: '22px 24px', borderRadius: 16, background: C.surface, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 32, fontWeight: 800, fontFamily: '"Plus Jakarta Sans",sans-serif', color: k.color, letterSpacing: '-0.03em' }}>{k.value}</div>
            <div style={{ fontSize: 12, color: C.textSec, marginTop: 6 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <Section title="Trainers" count={members.length}>
          {members.length === 0 ? (
            <Empty text="No trainers yet. Go to Team to invite."/>
          ) : members.slice(0, 5).map(m => (
            <Row key={m.id} label={m.profile?.name || '—'} sub={m.profile?.email} badge={m.role}/>
          ))}
        </Section>

        <Section title="Protocols" count={protocols.length}>
          {protocols.length === 0 ? (
            <Empty text="No protocols yet. Go to Protocols to create."/>
          ) : protocols.slice(0, 5).map(p => (
            <Row key={p.id} label={p.name} sub={`${p.objective || 'General'} · ${p.exercises?.length || 0} exercises`} badge={p.level}/>
          ))}
        </Section>
      </div>
    </>
  );
}

// ─── TEAM VIEW ────────────────────────────────────────────────
function TeamView({ data }) {
  const [showInvite, setShowInvite] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [err, setErr] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function invite() {
    if (!email) return;
    setLoading(true); setErr('');
    const { error } = await data.inviteTrainer(email);
    if (error) { setErr(error.message); setLoading(false); return; }
    setEmail(''); setShowInvite(false); setLoading(false);
  }

  return (
    <>
      <PageHeader title="Team" sub={`${data.stats.trainers} trainer${data.stats.trainers !== 1 ? 's' : ''}`}>
        <Btn onClick={() => setShowInvite(v => !v)}>+ Invite trainer</Btn>
      </PageHeader>

      {showInvite && (
        <div style={{ marginBottom: 24, padding: 24, borderRadius: 16, background: C.surface, border: `1.5px solid ${C.primary}` }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Invite trainer by email</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="trainer@email.com"
              style={{ flex: 1, padding: '12px 14px', borderRadius: 10, background: C.surface2, border: `1px solid ${C.border}`, color: C.textPri, fontSize: 14, outline: 'none' }}/>
            <Btn onClick={invite} loading={loading}>Send</Btn>
            <Btn variant="ghost" onClick={() => { setShowInvite(false); setEmail(''); setErr(''); }}>Cancel</Btn>
          </div>
          {err && <div style={{ color: C.accent, fontSize: 12, marginTop: 10 }}>{err}</div>}
        </div>
      )}

      {data.members.length === 0 ? (
        <Empty text="No trainers yet. Invite your first trainer above."/>
      ) : (
        <Table
          headers={['Name', 'Email', 'Role', 'Actions']}
          rows={data.members.map(m => [
            <span style={{ fontWeight: 600 }}>{m.profile?.name || '—'}</span>,
            <span style={{ color: C.textSec }}>{m.profile?.email}</span>,
            <Badge>{m.role}</Badge>,
            <Btn variant="danger" size="sm" onClick={() => data.removeMember(m.id)}>Remove</Btn>,
          ])}
        />
      )}
    </>
  );
}

// ─── PROTOCOLS VIEW ───────────────────────────────────────────
// ─── CLIENTS VIEW ─────────────────────────────────────────────
function ClientsView({ data }) {
  const [search, setSearch]           = React.useState('');
  const [trainerFilter, setTrainer]   = React.useState('all');
  const [levelFilter, setLevel]       = React.useState('all');

  const LEVEL_COLORS = { beginner: '#10B981', intermediate: '#F59E0B', advanced: C.accent };
  const GOAL_ICONS   = { 'Strength': '💪', 'Weight loss': '🔥', 'Hypertrophy': '📈', 'Endurance': '🏃', 'Mobility': '🧘', 'Recovery': '❄️' };

  const trainerOptions = React.useMemo(() => {
    const seen = new Set();
    return data.clients
      .map(c => ({ id: c.trainer_id, name: c.trainer?.name || '—' }))
      .filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true; });
  }, [data.clients]);

  const visible = React.useMemo(() => {
    return data.clients.filter(c => {
      const matchSearch  = !search || (c.client?.name || '').toLowerCase().includes(search.toLowerCase())
                                   || (c.client?.email || '').toLowerCase().includes(search.toLowerCase());
      const matchTrainer = trainerFilter === 'all' || c.trainer_id === trainerFilter;
      const matchLevel   = levelFilter === 'all'   || c.physical?.fitness_level === levelFilter;
      return matchSearch && matchTrainer && matchLevel;
    });
  }, [data.clients, search, trainerFilter, levelFilter]);

  return (
    <>
      <PageHeader
        title="Clients"
        sub={`${visible.length} of ${data.clients.length} active client${data.clients.length !== 1 ? 's' : ''}`}
      />

      {/* ── Filter toolbar ──────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.textMute, fontSize: 14, pointerEvents: 'none' }}>🔍</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: 10, background: C.surface2, border: `1px solid ${search ? C.primary : C.border}`, color: C.textPri, fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s' }}
          />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.textMute, cursor: 'pointer', fontSize: 16 }}>×</button>}
        </div>

        {/* Trainer filter */}
        <select value={trainerFilter} onChange={e => setTrainer(e.target.value)}
          style={{ padding: '10px 12px', borderRadius: 10, background: C.surface2, border: `1px solid ${trainerFilter !== 'all' ? C.primary : C.border}`, color: trainerFilter !== 'all' ? C.primary : C.textSec, fontSize: 13, outline: 'none', cursor: 'pointer' }}>
          <option value="all">All trainers</option>
          {trainerOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        {/* Level filter pills */}
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
              }}>{lv === 'all' ? 'All levels' : lv}</button>
            );
          })}
        </div>

        {(search || trainerFilter !== 'all' || levelFilter !== 'all') && (
          <button onClick={() => { setSearch(''); setTrainer('all'); setLevel('all'); }}
            style={{ padding: '8px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: `${C.accent}18`, color: C.accent, border: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
            Clear ×
          </button>
        )}
      </div>

      {/* ── Client list ─────────────────────────────────────────── */}
      {data.clients.length === 0 ? (
        <Empty text="No active clients yet. Trainers need to be linked to clients first."/>
      ) : visible.length === 0 ? (
        <Empty text="No clients match the current filters."/>
      ) : (
        <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1fr', gap: 0, padding: '12px 20px', borderBottom: `1px solid ${C.border}`, fontSize: 11, fontWeight: 700, color: C.textMute, letterSpacing: '.08em', textTransform: 'uppercase' }}>
            <span>Client</span><span>Email</span><span>Trainer</span><span>Goal</span><span>Level</span>
          </div>
          {visible.map((c, i) => {
            const lvl    = c.physical?.fitness_level;
            const goal   = c.physical?.primary_goal;
            const lvlClr = LEVEL_COLORS[lvl] || C.textMute;
            return (
              <div key={c.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1fr',
                padding: '13px 20px', alignItems: 'center',
                borderBottom: i < visible.length - 1 ? `1px solid ${C.border}` : 'none',
                transition: 'background .1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = C.surface2}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                {/* Name + avatar initial */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                    background: `${C.primary}22`, color: C.primary,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 13,
                  }}>
                    {(c.client?.name || '?')[0].toUpperCase()}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.client?.name || '—'}
                  </span>
                </div>

                {/* Email */}
                <span style={{ fontSize: 12, color: C.textSec, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.client?.email || '—'}
                </span>

                {/* Trainer */}
                <span style={{ fontSize: 12, color: C.textSec, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.trainer?.name || '—'}
                </span>

                {/* Goal */}
                <span style={{ fontSize: 12, color: C.textSec }}>
                  {goal ? `${GOAL_ICONS[goal] || ''} ${goal}` : '—'}
                </span>

                {/* Level badge */}
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

function ProtocolsView({ data }) {
  const [showCreate, setShowCreate] = React.useState(false);
  const [form, setForm]   = React.useState({ name: '', objective: '', level: 'beginner', duration_minutes: 45, description: '' });
  const [loading, setLoading] = React.useState(false);
  const [err, setErr]     = React.useState('');
  const [expanded, setExpanded] = React.useState(null);

  // ── Filter & sort state ──────────────────────────────────────────
  const [search, setSearch]         = React.useState('');
  const [levelFilter, setLevelFilter] = React.useState('all');
  const [sortBy, setSortBy]         = React.useState('name');
  const [sortDir, setSortDir]       = React.useState('asc');

  const LEVELS = ['all', 'beginner', 'intermediate', 'advanced'];
  const LEVEL_COLORS = { beginner: '#10B981', intermediate: '#F59E0B', advanced: C.accent };

  const handleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  const sortIcon = (field) => {
    if (sortBy !== field) return <span style={{ color: C.textMute, fontSize: 11 }}>↕</span>;
    return <span style={{ color: C.primary, fontSize: 11 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const LEVEL_ORDER = { beginner: 0, intermediate: 1, advanced: 2 };

  const visible = React.useMemo(() => {
    return data.protocols
      .filter(p =>
        (levelFilter === 'all' || p.level === levelFilter) &&
        (!search || p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.objective || '').toLowerCase().includes(search.toLowerCase()))
      )
      .sort((a, b) => {
        let va, vb;
        if (sortBy === 'level')     { va = LEVEL_ORDER[a.level] ?? 0; vb = LEVEL_ORDER[b.level] ?? 0; }
        else if (sortBy === 'duration')  { va = a.duration_minutes ?? 0; vb = b.duration_minutes ?? 0; }
        else if (sortBy === 'exercises') { va = a.exercises?.length ?? 0; vb = b.exercises?.length ?? 0; }
        else { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
        if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        return sortDir === 'asc' ? va - vb : vb - va;
      });
  }, [data.protocols, search, levelFilter, sortBy, sortDir]);

  async function create() {
    if (!form.name.trim()) return;
    setLoading(true); setErr('');
    const { error } = await data.createProtocol(form);
    if (error) { setErr(error.message); setLoading(false); return; }
    setForm({ name: '', objective: '', level: 'beginner', duration_minutes: 45, description: '' });
    setShowCreate(false); setLoading(false);
  }

  return (
    <>
      <PageHeader
        title="Protocol Library"
        sub={`${visible.length} of ${data.protocols.length} protocol${data.protocols.length !== 1 ? 's' : ''}`}
      >
        <Btn onClick={() => setShowCreate(v => !v)}>+ New protocol</Btn>
      </PageHeader>

      {/* ── Create form ──────────────────────────────────────────── */}
      {showCreate && (
        <div style={{ marginBottom: 24, padding: 24, borderRadius: 16, background: C.surface, border: `1.5px solid ${C.primary}` }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>New protocol</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <Field label="Name" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="e.g. Hypertrophy Beginner"/>
            <Field label="Objective" value={form.objective} onChange={v => setForm({ ...form, objective: v })} placeholder="e.g. Muscle building"/>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.textMute, textTransform: 'uppercase', letterSpacing: '.06em' }}>Level</span>
              <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}
                style={{ padding: '11px 12px', borderRadius: 10, background: C.surface2, border: `1px solid ${C.border}`, color: C.textPri, fontSize: 14, outline: 'none' }}>
                {['beginner', 'intermediate', 'advanced'].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </label>
            <Field label="Duration (min)" value={String(form.duration_minutes)} onChange={v => setForm({ ...form, duration_minutes: Number(v) || 45 })} placeholder="45"/>
          </div>
          <Field label="Description" value={form.description} onChange={v => setForm({ ...form, description: v })} placeholder="Brief description of this protocol…" multiline/>
          {err && <div style={{ color: C.accent, fontSize: 12, margin: '10px 0' }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Btn onClick={create} loading={loading}>Create protocol</Btn>
            <Btn variant="ghost" onClick={() => { setShowCreate(false); setErr(''); }}>Cancel</Btn>
          </div>
        </div>
      )}

      {/* ── Filter toolbar ───────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        {/* Search box */}
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.textMute, fontSize: 14, pointerEvents: 'none' }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or objective…"
            style={{
              width: '100%', padding: '10px 12px 10px 34px',
              borderRadius: 10, background: C.surface2,
              border: `1px solid ${search ? C.primary : C.border}`,
              color: C.textPri, fontSize: 14, outline: 'none', boxSizing: 'border-box',
              transition: 'border-color .15s',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: C.textMute, cursor: 'pointer', fontSize: 16, lineHeight: 1,
            }}>×</button>
          )}
        </div>

        {/* Level filter pills */}
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
              }}>
                {lv === 'all' ? 'All levels' : lv}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Sort bar ─────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 12,
        padding: '8px 14px', borderRadius: 10,
        background: C.surface, border: `1px solid ${C.border}`,
        fontSize: 12, color: C.textMute, alignItems: 'center',
      }}>
        <span style={{ marginRight: 8, fontWeight: 600 }}>Sort by:</span>
        {[
          { key: 'name',      label: 'Name' },
          { key: 'level',     label: 'Level' },
          { key: 'duration',  label: 'Duration' },
          { key: 'exercises', label: 'Exercises' },
        ].map(col => (
          <button key={col.key} onClick={() => handleSort(col.key)} style={{
            padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: sortBy === col.key ? 700 : 500,
            background: sortBy === col.key ? `${C.primary}18` : 'transparent',
            color: sortBy === col.key ? C.primary : C.textSec,
            border: `1px solid ${sortBy === col.key ? C.primary : 'transparent'}`,
            fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            transition: 'all .12s',
          }}>
            {col.label} {sortIcon(col.key)}
          </button>
        ))}
        {(search || levelFilter !== 'all') && (
          <button onClick={() => { setSearch(''); setLevelFilter('all'); }} style={{
            marginLeft: 'auto', padding: '5px 12px', borderRadius: 8, fontSize: 12,
            background: `${C.accent}18`, color: C.accent, border: 'none',
            fontFamily: 'inherit', cursor: 'pointer',
          }}>
            Clear filters ×
          </button>
        )}
      </div>

      {/* ── Protocol list ────────────────────────────────────────── */}
      {data.protocols.length === 0 ? (
        <Empty text="No protocols yet. Create your first protocol above."/>
      ) : visible.length === 0 ? (
        <Empty text={`No protocols match "${search}"${levelFilter !== 'all' ? ` at ${levelFilter} level` : ''}.`}/>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visible.map(p => {
            const levelColor = LEVEL_COLORS[p.level] || C.primary;
            return (
              <div key={p.id} style={{ borderRadius: 14, background: C.surface, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                <div
                  style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}
                  onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                >
                  {/* Level colour strip */}
                  <div style={{ width: 4, height: 36, borderRadius: 2, background: levelColor, flexShrink: 0 }}/>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: C.textSec, marginTop: 2 }}>
                      {p.objective || 'General'} · {p.duration_minutes} min · {p.exercises?.length || 0} exercises
                    </div>
                  </div>

                  <span style={{
                    padding: '3px 9px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                    background: `${levelColor}22`, color: levelColor,
                    letterSpacing: '.04em', textTransform: 'capitalize', flexShrink: 0,
                  }}>{p.level}</span>

                  <Btn variant="danger" size="sm" onClick={e => { e.stopPropagation(); data.deleteProtocol(p.id); }}>Delete</Btn>

                  <span style={{
                    color: C.textMute, fontSize: 18, flexShrink: 0,
                    transition: 'transform .2s', transform: expanded === p.id ? 'rotate(90deg)' : 'none',
                  }}>›</span>
                </div>

                {expanded === p.id && (
                  <ProtocolDetail protocol={p} onAddExercise={(ex) => data.addProtocolExercise(p.id, ex)}/>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function ProtocolDetail({ protocol, onAddExercise }) {
  const [showAdd, setShowAdd] = React.useState(false);
  const [draft, setDraft] = React.useState({ exercise_name: '', muscle_group: 'Chest', sets: 3, reps: 10, load_kg: '', rest_seconds: 60 });

  async function add() {
    if (!draft.exercise_name.trim()) return;
    await onAddExercise({ ...draft, order_index: protocol.exercises?.length || 0 });
    setDraft({ exercise_name: '', muscle_group: 'Chest', sets: 3, reps: 10, load_kg: '', rest_seconds: 60 });
    setShowAdd(false);
  }

  return (
    <div style={{ borderTop: `1px solid ${C.border}`, padding: '16px 20px 20px' }}>
      {protocol.description && (
        <p style={{ fontSize: 13, color: C.textSec, marginBottom: 16 }}>{protocol.description}</p>
      )}
      <div style={{ fontSize: 11, fontWeight: 700, color: C.textMute, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>
        Exercises ({protocol.exercises?.length || 0})
      </div>
      {protocol.exercises?.length === 0 && !showAdd && (
        <div style={{ color: C.textMute, fontSize: 13, marginBottom: 12 }}>No exercises yet.</div>
      )}
      {showAdd && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14, padding: 16, borderRadius: 12, background: C.surface2 }}>
          <Field label="Exercise" value={draft.exercise_name} onChange={v => setDraft({ ...draft, exercise_name: v })} placeholder="e.g. Bench Press"/>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.textMute, textTransform: 'uppercase', letterSpacing: '.06em' }}>Muscle group</span>
            <select value={draft.muscle_group} onChange={e => setDraft({ ...draft, muscle_group: e.target.value })}
              style={{ padding: '10px 12px', borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, color: C.textPri, fontSize: 13, outline: 'none' }}>
              {['Chest', 'Back', 'Shoulders', 'Arms', 'Core', 'Legs', 'Full body', 'Cardio'].map(g => <option key={g}>{g}</option>)}
            </select>
          </label>
          <Field label="Sets" value={String(draft.sets)} onChange={v => setDraft({ ...draft, sets: Number(v) || 3 })} placeholder="3"/>
          <Field label="Reps" value={String(draft.reps)} onChange={v => setDraft({ ...draft, reps: Number(v) || 10 })} placeholder="10"/>
          <Field label="Load (kg)" value={String(draft.load_kg || '')} onChange={v => setDraft({ ...draft, load_kg: v })} placeholder="optional"/>
          <Field label="Rest (s)" value={String(draft.rest_seconds)} onChange={v => setDraft({ ...draft, rest_seconds: Number(v) || 60 })} placeholder="60"/>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
            <Btn size="sm" onClick={add}>Add</Btn>
            <Btn variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Btn>
          </div>
        </div>
      )}
      {!showAdd && (
        <button onClick={() => setShowAdd(true)} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: `${C.primary}18`, color: C.primary, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          + Add exercise
        </button>
      )}
    </div>
  );
}

// ─── SHARED UI ATOMS ─────────────────────────────────────────
function PageHeader({ title, sub, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
      <div>
        <h1 style={{ fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{title}</h1>
        {sub && <div style={{ fontSize: 13, color: C.textSec, marginTop: 4 }}>{sub}</div>}
      </div>
      {children && <div style={{ display: 'flex', gap: 10 }}>{children}</div>}
    </div>
  );
}

function Section({ title, count, children }) {
  return (
    <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
      <div style={{ padding: '18px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div>
        <Badge>{count}</Badge>
      </div>
      <div style={{ padding: '0 8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>{children}</div>
    </div>
  );
}

function Row({ label, sub, badge }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: C.textSec, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>}
      </div>
      {badge && <Badge>{badge}</Badge>}
    </div>
  );
}

function Table({ headers, rows }) {
  return (
    <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            {headers.map(h => (
              <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.textMute, letterSpacing: '.08em', textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : 'none' }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '14px 20px', fontSize: 14 }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Badge({ children }) {
  return (
    <span style={{ padding: '3px 9px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: `${C.primary}18`, color: C.primary, letterSpacing: '.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

function Empty({ text }) {
  return <div style={{ padding: '28px 0', textAlign: 'center', color: C.textMute, fontSize: 13 }}>{text}</div>;
}

function Btn({ children, onClick, loading, full, variant = 'primary', size = 'md' }) {
  const styles = {
    primary: { background: C.primary,  color: '#07101D', border: 'none' },
    ghost:   { background: 'transparent', color: C.textSec, border: `1px solid ${C.border}` },
    danger:  { background: `${C.accent}18`, color: C.accent, border: 'none' },
  };
  const pad = size === 'sm' ? '7px 14px' : '11px 22px';
  const fs  = size === 'sm' ? 12 : 14;
  return (
    <button onClick={onClick} disabled={loading} style={{
      padding: pad, borderRadius: 10, fontSize: fs, fontWeight: 700,
      cursor: loading ? 'default' : 'pointer', width: full ? '100%' : 'auto',
      opacity: loading ? 0.7 : 1, fontFamily: 'inherit', transition: 'opacity .12s',
      ...styles[variant],
    }}>
      {loading ? 'Loading…' : children}
    </button>
  );
}

function Field({ label, value, onChange, placeholder, multiline }) {
  const style = { padding: '10px 12px', borderRadius: 10, background: C.surface2, border: `1px solid ${C.border}`, color: C.textPri, fontSize: 14, outline: 'none', width: '100%', resize: 'vertical' };
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: C.textMute, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</span>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} style={style}/>
        : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={style}/>
      }
    </label>
  );
}

function Loader({ inline }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: inline ? 200 : '100vh', background: inline ? 'transparent' : C.bg }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${C.border}`, borderTopColor: C.primary, animation: 'spin 0.7s linear infinite' }}/>
    </div>
  );
}

function AccessDenied({ onSignOut }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.bg, color: C.textPri, fontFamily: 'system-ui' }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{ fontSize: 52, marginBottom: 20 }}>🚫</div>
        <h2 style={{ fontFamily: '"Plus Jakarta Sans",sans-serif', margin: '0 0 10px' }}>Access denied</h2>
        <p style={{ color: C.textSec }}>This dashboard requires a Studio Admin account.</p>
        <Btn onClick={onSignOut} full style={{ marginTop: 24 }}>Sign out</Btn>
      </div>
    </div>
  );
}

function LoginView() {
  const [email, setEmail] = React.useState('');
  const [pw, setPw] = React.useState('');
  const [err, setErr] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function login() {
    setLoading(true); setErr('');
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    if (error) { setErr(error.message); setLoading(false); }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.bg, color: C.textPri }}>
      <div style={{ width: 380 }}>
        <div style={{ fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 28, fontWeight: 800, marginBottom: 6 }}>
          Tr<span style={{ color: C.primary }}>AI</span>ner Studio
        </div>
        <p style={{ color: C.textSec, marginBottom: 32 }}>Sign in to manage your studio.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
            style={{ padding: '14px 16px', borderRadius: 12, background: C.surface, border: `1px solid ${C.border}`, color: C.textPri, fontSize: 15, outline: 'none' }}/>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Password"
            onKeyDown={e => e.key === 'Enter' && login()}
            style={{ padding: '14px 16px', borderRadius: 12, background: C.surface, border: `1px solid ${C.border}`, color: C.textPri, fontSize: 15, outline: 'none' }}/>
        </div>
        {err && <div style={{ color: C.accent, fontSize: 13, marginBottom: 12 }}>{err}</div>}
        <Btn onClick={login} loading={loading} full>Sign in</Btn>
      </div>
    </div>
  );
}
