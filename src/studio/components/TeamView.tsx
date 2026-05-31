import React from 'react';
import { Button, Badge } from '@/ui';
import type { StudioMember, StudioStats } from '../../types';
import { PageHeader, C, Empty, Table } from './SharedAtoms';

interface TeamData {
  stats: StudioStats;
  members: StudioMember[];
  inviteTrainer: (email: string) => Promise<{ error: unknown }>;
  removeMember: (memberId: string) => Promise<void>;
}

interface TeamViewProps {
  data: TeamData;
}

export default function TeamView({ data }: TeamViewProps) {
  const [showInvite, setShowInvite] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [err, setErr] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function invite() {
    if (!email) return;
    setLoading(true);
    setErr('');
    const { error } = await data.inviteTrainer(email);
    if (error) {
      setErr(error instanceof Error ? error.message : String(error));
      setLoading(false);
      return;
    }
    setEmail('');
    setShowInvite(false);
    setLoading(false);
  }

  return (
    <>
      <PageHeader title="Team" sub={`${data.stats.trainers} trainer${data.stats.trainers !== 1 ? 's' : ''}`}>
        <Button onClick={() => setShowInvite(v => !v)}>+ Invite trainer</Button>
      </PageHeader>

      {showInvite && (
        <div style={{ marginBottom: 24, padding: 24, borderRadius: 16, background: C.surface, border: `1.5px solid ${C.primary}` }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Invite trainer by email</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="trainer@email.com"
              style={{ flex: 1, padding: '12px 14px', borderRadius: 10, background: C.surface2, border: `1px solid ${C.border}`, color: C.textPri, fontSize: 14, outline: 'none' }}
            />
            <Button onClick={invite} loading={loading}>Send</Button>
            <Button variant="ghost" onClick={() => { setShowInvite(false); setEmail(''); setErr(''); }}>Cancel</Button>
          </div>
          {err && <div style={{ color: C.accent, fontSize: 12, marginTop: 10 }}>{err}</div>}
        </div>
      )}

      {data.members.length === 0 ? (
        <Empty text="No trainers yet. Invite your first trainer above." />
      ) : (
        <Table
          headers={['Name', 'Email', 'Role', 'Actions']}
          rows={data.members.map(m => [
            <span key="name" style={{ fontWeight: 600 }}>{m.profile?.name || '—'}</span>,
            <span key="email" style={{ color: C.textSec }}>{m.profile?.email}</span>,
            <Badge key="role">{m.role}</Badge>,
            <Button key="action" variant="danger" size="sm" onClick={() => void data.removeMember(m.id)}>Remove</Button>,
          ])}
        />
      )}
    </>
  );
}
