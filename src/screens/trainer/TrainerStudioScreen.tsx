import React from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../components/Icon';
import { ScreenTitle } from '../../components/ScreenTitle';
import { SectionLabel } from '../../components/SectionLabel';
import { surfRaised, borderSubtle, textPri, textMute, outlineBtn } from '../../theme';
import type { NavFn } from '../../types';

import { useTrainerTheme } from '../../hooks/useTrainerTheme';

interface TrainerStudioScreenProps {
  nav: NavFn;
}

interface KpiProps {
  val: string;
  lbl: string;
  t: any;
  dark: boolean;
  accent?: boolean;
}

function Kpi({ val, lbl, t, dark, accent = false }: KpiProps) {
  const c = accent ? t.accent : t.primary;
  return (
    <div style={{
      padding: '14px 12px', borderRadius: 14,
      background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}`,
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: c, fontFamily: '"Plus Jakarta Sans",sans-serif', lineHeight: 1 }}>{val}</div>
      <div style={{ fontSize: 10.5, color: textMute(dark), letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 600, marginTop: 6 }}>{lbl}</div>
    </div>
  );
}

export function TrainerStudioScreen({ nav }: TrainerStudioScreenProps) {
  const { t, dark } = useTrainerTheme();
  const { t: tr } = useTranslation();
  const clients = [
    { name: 'Frances Scott',  goal: 'Endurance',    streak: 12, status: 'on-track', last: 'today' },
    { name: 'Lukas Becker',   goal: 'Strength',     streak: 5,  status: 'behind',   last: '3d ago' },
    { name: 'Marie Dubois',   goal: 'Mobility',     streak: 28, status: 'on-track', last: 'today' },
    { name: 'Leon Brandt',    goal: 'Weight loss',  streak: 2,  status: 'new',      last: 'today' },
  ];

  const statusColor = (s: string) => {
    if (s === 'on-track') return t.primary;
    if (s === 'behind') return t.accent;
    return t.primarySoft;
  };

  return (
    <>
      <ScreenTitle dark={dark} sub={tr('trainer.studio.sub')}>{tr('trainer.studio.title')}</ScreenTitle>

      {/* KPI strip */}
      <div style={{ padding: '0 22px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <Kpi val="24"  lbl={tr('trainer.studio.clients')}   t={t} dark={dark}/>
        <Kpi val="187" lbl={tr('trainer.studio.thisWeek')}  t={t} dark={dark}/>
        <Kpi val="92%" lbl={tr('trainer.studio.adherence')} t={t} dark={dark} accent/>
      </div>

      {/* Methodology feeder */}
      <div style={{ padding: '0 22px 14px' }}>
        <SectionLabel dark={dark}>{tr('trainer.studio.feedAI')}</SectionLabel>
        <div style={{
          padding: 16, borderRadius: 16,
          background: `linear-gradient(135deg, #C23B22 0%, ${t.accent}cc 100%)`,
          color: '#0E1A2B',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Icon name="flask" size={18} color="#0E1A2B" stroke={2.4}/>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{tr('trainer.studio.methodology')}</div>
          </div>
          <div style={{ fontSize: 12, opacity: .85, lineHeight: 1.5, marginBottom: 12 }}>
            {tr('trainer.studio.aiSummary')}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button style={{
              padding: '9px 14px', borderRadius: 999, border: 'none',
              background: '#0E1A2B', color: t.accent, fontSize: 12, fontWeight: 700, fontFamily: '"Plus Jakarta Sans",sans-serif', cursor: 'pointer',
            }}>{tr('trainer.studio.addWorkout')}</button>
            <button onClick={() => nav('trainerLibraryExercises')} style={{
              padding: '9px 14px', borderRadius: 999, border: '1.5px solid rgba(14,26,43,.4)',
              background: 'transparent', color: '#0E1A2B', fontSize: 12, fontWeight: 600, fontFamily: '"Plus Jakarta Sans",sans-serif', cursor: 'pointer',
            }}>{tr('trainer.studio.exerciseLibrary')}</button>
            <button style={{
              padding: '9px 14px', borderRadius: 14, border: '1.5px solid rgba(14,26,43,.4)',
              background: 'transparent', color: '#0E1A2B', fontSize: 12, fontWeight: 600, fontFamily: '"Plus Jakarta Sans",sans-serif', cursor: 'pointer',
            }}>{tr('trainer.studio.retrainAI')}</button>
          </div>
        </div>
      </div>

      {/* Client list */}
      <div style={{ padding: '0 22px 14px' }}>
        <SectionLabel dark={dark}>{tr('trainer.studio.yourClients')}</SectionLabel>
        {clients.map((c, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', marginBottom: 8,
            background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}`,
            borderRadius: 14,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: `${statusColor(c.status)}26`, color: statusColor(c.status),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, fontFamily: '"Plus Jakarta Sans",sans-serif',
            }}>{c.name.split(' ').map(n => n[0]).join('')}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: textPri(dark) }}>{c.name}</div>
              <div style={{ fontSize: 11.5, color: textMute(dark) }}>{c.goal} · {c.last}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: statusColor(c.status), fontFamily: '"Plus Jakarta Sans",sans-serif' }}>{c.streak}d</div>
              <div style={{ fontSize: 10, color: textMute(dark), letterSpacing: '.05em', textTransform: 'uppercase' }}>{c.status}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '0 22px 28px' }}>
        <button onClick={() => alert(tr('trainer.studio.inviteCopied'))} style={{ ...outlineBtn(t.accent), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Icon name="plus" size={16} color={t.primary} stroke={2.4}/> {tr('trainer.dashboard.inviteClient')}
        </button>
      </div>
    </>
  );
}
