import React from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../../components/Icon';
import { surfRaised, borderSubtle, textPri, textSec, textMute } from '../../../theme';
import type { ExState } from './types';

interface ExerciseCardProps {
  ex:          ExState;
  isActive:    boolean;
  dark:        boolean;
  t:           { primary: string; accent: string };
  onLogSet:    () => void;
  onSkip:      () => void;
  onPain:      () => void;
  onSetActive: () => void;
}

export function ExerciseCard({ ex, isActive, dark, t, onLogSet, onSkip, onPain, onSetActive }: ExerciseCardProps) {
  const { t: tr } = useTranslation();
  const statusColor = ex.status === 'completed' ? t.primary
    : ex.status === 'skipped' ? textMute(dark)
    : ex.status === 'in_progress' ? t.primary
    : borderSubtle(dark);

  return (
    <div
      onClick={onSetActive}
      style={{
        marginBottom: 10, borderRadius: 14, overflow: 'hidden',
        background: surfRaised(dark),
        border: `1.5px solid ${isActive ? t.primary : borderSubtle(dark)}`,
        opacity: ex.status === 'skipped' ? 0.55 : 1,
        transition: 'border-color .2s, opacity .2s',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px 10px' }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: statusColor,
        }}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: textPri(dark),
            textDecoration: ex.status === 'skipped' ? 'line-through' : 'none',
          }}>{ex.name}</div>
          <div style={{ fontSize: 11.5, color: textMute(dark), marginTop: 1 }}>
            {[
              ex.muscleGroup,
              ex.setsPrescribed && ex.repsPrescribed ? `${ex.setsPrescribed}×${ex.repsPrescribed}` : null,
              ex.loadPrescribed ? `${ex.loadPrescribed} ${tr('common.units.kg')}` : null,
              ex.restSeconds    ? tr('common.units.restSec', { seconds: ex.restSeconds })  : null,
            ].filter(Boolean).join(' · ')}
          </div>
        </div>
        {ex.status === 'completed' && <Icon name="check" size={16} color={t.primary} stroke={2.5}/>}
      </div>

      {/* Active controls */}
      {isActive && ex.status !== 'completed' && ex.status !== 'skipped' && (
        <div style={{ padding: '0 14px 14px' }}>
          {/* Sets progress dots */}
          {ex.setsPrescribed > 1 && (
            <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
              {Array.from({ length: ex.setsPrescribed }, (_, i) => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: i < ex.setsLogged ? t.primary : (dark ? '#1F2E45' : '#E5EAF1'),
                  transition: 'background .2s',
                }}/>
              ))}
              <span style={{ fontSize: 11.5, color: textSec(dark), marginLeft: 4 }}>
                {ex.setsLogged}/{ex.setsPrescribed} {tr('common.units.sets')}
              </span>
            </div>
          )}
          {ex.notes && (
            <div style={{ fontSize: 11.5, color: t.primary, fontStyle: 'italic', marginBottom: 10 }}>
              {ex.notes}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={(e) => { e.stopPropagation(); onLogSet(); }} style={{
              flex: 2, padding: '10px 0', borderRadius: 14, border: 'none',
              background: t.primary, color: '#0E1A2B',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <Icon name="play" size={12} color="#0E1A2B" stroke={2.5}/> {tr('client.mode.logSet')}
            </button>
            <button onClick={(e) => { e.stopPropagation(); onPain(); }} style={{
              flex: 1, padding: '10px 0', borderRadius: 999,
              border: `1.5px solid ${t.accent}55`, background: 'transparent',
              color: t.accent, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
            }}>{tr('client.mode.painBtn')}</button>
            <button onClick={(e) => { e.stopPropagation(); onSkip(); }} style={{
              flex: 1, padding: '10px 0', borderRadius: 999,
              border: `1.5px solid ${borderSubtle(dark)}`, background: 'transparent',
              color: textSec(dark), fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
            }}>{tr('client.mode.skip')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
