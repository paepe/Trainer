import React from 'react';
import type { StudioMember, Protocol, StudioStats } from '../../types';
import { PageHeader, Section, Row, Empty, C } from './SharedAtoms';

interface DashboardData {
  stats: StudioStats;
  members: StudioMember[];
  protocols: Protocol[];
}

interface DashboardViewProps {
  data: DashboardData;
}

export default function DashboardView({ data }: DashboardViewProps) {
  const { stats, protocols, members } = data;
  return (
    <>
      <PageHeader title="Dashboard" sub="Studio overview" />

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
            <Empty text="No trainers yet. Go to Team to invite." />
          ) : (
            members.slice(0, 5).map(m => (
              <Row key={m.id} label={m.profile?.name || '—'} sub={m.profile?.email} badge={m.role} />
            ))
          )}
        </Section>

        <Section title="Protocols" count={protocols.length}>
          {protocols.length === 0 ? (
            <Empty text="No protocols yet. Go to Protocols to create." />
          ) : (
            protocols.slice(0, 5).map(p => (
              <Row key={p.id} label={p.name} sub={`${p.objective || 'General'} · ${p.exercises?.length || 0} exercises`} badge={p.level || undefined} />
            ))
          )}
        </Section>
      </div>
    </>
  );
}
