import React from 'react';
import { Icon }        from '../../components/Icon';
import { PrivacyNote } from '../components/PrivacyNote';
import { TRAINER_BRAND, THEME_VARS as DARK } from '../../theme/tokens';
import type { CoachArchetype } from '../../types/coach-dna';

interface ArchetypeMeta {
  title: string;
  sub:   string;
  desc:  string;
  icon:  string;
  color: string;
}

const ARCHETYPE_META: Record<CoachArchetype, ArchetypeMeta> = {
  performance: {
    title: 'Performance Coach',
    sub:   'High performance & measurable goals',
    desc:  'You train for results. Every session has metrics, every client has targets. Your DNA generates performance-oriented workouts focused on load progression and personal bests.',
    icon:  'zap',
    color: TRAINER_BRAND.accent,
  },
  technician: {
    title: 'The Technician',
    sub:   'Biomechanics & methodological precision',
    desc:  'You are obsessed with method. Every exercise has a reason, every phase has logic. Your DNA generates workouts with precise technical cuing and well-structured progressions.',
    icon:  'gauge',
    color: TRAINER_BRAND.primarySoft,
  },
  motivator: {
    title: 'The Motivator',
    sub:   'Energy & memorable experiences',
    desc:  'You create environments that inspire. Your DNA generates workouts with energizing language, variety, and challenges that keep clients engaged and coming back.',
    icon:  'flame',
    color: TRAINER_BRAND.amber,
  },
  guide: {
    title: 'The Guide',
    sub:   'Empathy & sustainable progress',
    desc:  'You accompany each client at their own pace. Your DNA generates progressive workouts explained with empathy, focused on long-term health and client autonomy.',
    icon:  'heart',
    color: TRAINER_BRAND.success,
  },
  drill: {
    title: 'Drill Master',
    sub:   'Discipline & progressive rigor',
    desc:  'You demand the best from every client. Your DNA generates challenging workouts with well-defined strength sequences and maximum execution standards in every rep.',
    icon:  'shieldCheck',
    color: TRAINER_BRAND.primary,
  },
  movement: {
    title: 'Movement Specialist',
    sub:   'Function, mobility & motor patterns',
    desc:  'You see the body as an integrated system. Your DNA generates workouts emphasizing movement quality, mobility, and functional patterns.',
    icon:  'wave',
    color: TRAINER_BRAND.lavender,
  },
};

interface StepOutputProps {
  archetype: CoachArchetype;
}

export const StepOutput: React.FC<StepOutputProps> = ({ archetype }) => {
  const meta = ARCHETYPE_META[archetype];

  return (
    <div style={{ textAlign: 'center' }}>

      {/* kicker */}
      <div style={{
        fontFamily: '"JetBrains Mono",ui-monospace,monospace',
        fontSize: 9.5, fontWeight: 700, letterSpacing: '.18em',
        textTransform: 'uppercase', color: meta.color,
        marginBottom: 24,
      }}>
        Coach DNA · Archetype
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
        {meta.title}
      </div>
      <div style={{
        fontSize: 13, color: meta.color, fontWeight: 600, marginBottom: 28,
        animation: 'dna-appear .4s .12s ease both',
      }}>
        {meta.sub}
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
          {meta.desc}
        </p>
      </div>

      <PrivacyNote tone="coach">
        The archetype is derived automatically from your DNA and updates as you evolve your profile.
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
