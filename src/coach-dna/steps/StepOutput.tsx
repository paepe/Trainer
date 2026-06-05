import React from 'react';
import { useTranslation } from 'react-i18next';
import { Icon }        from '../../components/Icon';
import { PrivacyNote } from '../components/PrivacyNote';
import { TRAINER_BRAND, THEME_VARS as DARK } from '../../theme/tokens';
import type { CoachArchetype } from '../../types/coach-dna';

interface ArchetypeMeta {
  icon:  string;
  color: string;
}

const ARCHETYPE_META: Record<CoachArchetype, ArchetypeMeta> = {
  performance: { icon: 'zap',          color: TRAINER_BRAND.accent       },
  technician:  { icon: 'gauge',        color: TRAINER_BRAND.primarySoft  },
  motivator:   { icon: 'flame',        color: TRAINER_BRAND.amber        },
  guide:       { icon: 'heart',        color: TRAINER_BRAND.success      },
  drill:       { icon: 'shieldCheck',  color: TRAINER_BRAND.primary      },
  movement:    { icon: 'wave',         color: TRAINER_BRAND.lavender     },
};

interface StepOutputProps {
  archetype: CoachArchetype;
}

export const StepOutput: React.FC<StepOutputProps> = ({ archetype }) => {
  const { t: tr } = useTranslation();
  const meta = ARCHETYPE_META[archetype];
  const title = tr(`coachDna.output.archetypes.${archetype}.title`);
  const sub   = tr(`coachDna.output.archetypes.${archetype}.sub`);
  const desc  = tr(`coachDna.output.archetypes.${archetype}.desc`);

  return (
    <div style={{ textAlign: 'center' }}>

      {/* kicker */}
      <div style={{
        fontFamily: '"JetBrains Mono",ui-monospace,monospace',
        fontSize: 9.5, fontWeight: 700, letterSpacing: '.18em',
        textTransform: 'uppercase', color: meta.color,
        marginBottom: 24,
      }}>
        {tr('coachDna.output.kicker')}
      </div>

      {/* archetype icon */}
      <div style={{
        width: 96, height: 96, borderRadius: 28,
        background: `${meta.color}18`,
        border: `2px solid ${meta.color}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px',
        animation: 'dna-appear .4s cubic-bezier(.34,1.56,.64,1) both',
      }}>
        <Icon name={meta.icon} size={44} color={meta.color}/>
      </div>

      {/* title */}
      <div style={{
        fontSize: 26, fontWeight: 800, color: DARK.textPri,
        lineHeight: 1.2, marginBottom: 8,
        animation: 'dna-appear .4s .08s cubic-bezier(.34,1.56,.64,1) both',
      }}>
        {title}
      </div>
      <div style={{
        fontSize: 13, color: meta.color, fontWeight: 600, marginBottom: 28,
        animation: 'dna-appear .4s .12s ease both',
      }}>
        {sub}
      </div>

      {/* description card */}
      <div style={{
        padding: '18px 20px', borderRadius: 16,
        background: DARK.surface,
        border: `1.5px solid ${DARK.border}`,
        textAlign: 'left', marginBottom: 24,
        animation: 'dna-appear .4s .18s ease both',
      }}>
        <p style={{ fontSize: 14, color: DARK.textSec, lineHeight: 1.7, margin: 0 }}>
          {desc}
        </p>
      </div>

      <PrivacyNote tone="coach">
        {tr('coachDna.output.privacyNote')}
      </PrivacyNote>

      <style>{`
        @keyframes dna-appear {
          from { opacity: 0; transform: scale(.88) translateY(8px); }
          to   { opacity: 1; transform: scale(1)   translateY(0);   }
        }
      `}</style>
    </div>
  );
};
