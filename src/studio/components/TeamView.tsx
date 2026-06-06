import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t: tr } = useTranslation();
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
      <PageHeader title={tr('studio.team.title')} sub={tr('studio.team.sub', { count: data.stats.trainers })}>
        <Button onClick={() => setShowInvite(v => !v)}>{tr('studio.team.inviteTrainerBtn')}</Button>
      </PageHeader>

      {showInvite && (
        <div style={{ marginBottom: 24, padding: 24, borderRadius: 16, background: C.surface, border: `1.5px solid ${C.primary}` }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>{tr('studio.team.inviteTrainer')}</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={tr('studio.team.emailPlaceholder')}
              style={{ flex: 1, padding: '12px 14px', borderRadius: 10, background: C.surface2, border: `1px solid ${C.border}`, color: C.textPri, fontSize: 14, outline: 'none' }}
            />
            <Button onClick={invite} loading={loading}>{tr('studio.team.send')}</Button>
            <Button variant="ghost" onClick={() => { setShowInvite(false); setEmail(''); setErr(''); }}>{tr('studio.team.cancel')}</Button>
          </div>
          {err && <div style={{ color: C.accent, fontSize: 12, marginTop: 10 }}>{err}</div>}
        </div>
      )}

      {data.members.length === 0 ? (
        <Empty text={tr('studio.team.noTrainers')} />
      ) : (
        <Table
          headers={[tr('studio.team.headers.name'), tr('studio.team.headers.email'), tr('studio.team.headers.role'), tr('studio.team.headers.actions')]}
          rows={data.members.map(m => [
            <span key="name" style={{ fontWeight: 600 }}>{m.profile?.name || '—'}</span>,
            <span key="email" style={{ color: C.textSec }}>{m.profile?.email}</span>,
            <Badge key="role">{m.role}</Badge>,
            <Button key="action" variant="danger" size="sm" onClick={() => void data.removeMember(m.id)}>{tr('studio.team.remove')}</Button>,
          ])}
        />
      )}
    </>
  );
}
