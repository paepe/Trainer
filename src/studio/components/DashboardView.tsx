import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t: tr } = useTranslation();
  const { stats, protocols, members } = data;
  return (
    <>
      <PageHeader title={tr('studio.dashboard.title')} sub={tr('studio.dashboard.sub')} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 36 }}>
        {[
          { label: tr('studio.dashboard.activeClients'),     value: stats.clients,          color: C.primary },
          { label: tr('studio.dashboard.activeTrainers'),    value: stats.trainers,         color: '#7B5CFF' },
          { label: tr('studio.dashboard.plansThisWeek'),    value: stats.plansThisWeek,    color: '#F59E0B' },
          { label: tr('studio.dashboard.completedThisWeek'),value: stats.completedThisWeek,color: '#10B981' },
        ].map(k => (
          <div key={k.label} style={{ padding: '22px 24px', borderRadius: 16, background: C.surface, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 32, fontWeight: 800, fontFamily: '"Plus Jakarta Sans",sans-serif', color: k.color, letterSpacing: '-0.03em' }}>{k.value}</div>
            <div style={{ fontSize: 12, color: C.textSec, marginTop: 6 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <Section title={tr('studio.dashboard.trainers')} count={members.length}>
          {members.length === 0 ? (
            <Empty text={tr('studio.dashboard.noTrainers')} />
          ) : (
            members.slice(0, 5).map(m => (
              <Row key={m.id} label={m.profile?.name || '—'} sub={m.profile?.email} badge={m.role} />
            ))
          )}
        </Section>

        <Section title={tr('studio.dashboard.protocolsSection')} count={protocols.length}>
          {protocols.length === 0 ? (
            <Empty text={tr('studio.dashboard.noProtocolsYet')} />
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
