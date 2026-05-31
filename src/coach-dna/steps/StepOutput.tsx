import React from 'react';
import { Icon }        from '../../components/Icon';
import { PrivacyNote } from '../components/PrivacyNote';
import { BRAND, DARK } from '../../theme/tokens';
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
    title: 'Coach de Performance',
    sub:   'Alto rendimento & metas mensuráveis',
    desc:  'Você treina para resultados. Cada sessão tem métricas, cada aluno tem metas. O seu DNA gera treinos orientados a performance, progressão de carga e superação pessoal.',
    icon:  'zap',
    color: BRAND.accent,
  },
  technician: {
    title: 'O Técnico',
    sub:   'Biomecânica & precisão metodológica',
    desc:  'Você é obcecado por método. Cada exercício tem razão de ser, cada fase tem lógica. O seu DNA gera treinos com cueing técnico preciso e progressões bem estruturadas.',
    icon:  'gauge',
    color: BRAND.primarySoft,
  },
  motivator: {
    title: 'O Motivador',
    sub:   'Energia & experiências memoráveis',
    desc:  'Você cria ambientes que inspiram. O seu DNA gera treinos com linguagem energizante, variedade e desafios que mantêm o aluno engajado e voltando sempre.',
    icon:  'flame',
    color: BRAND.amber,
  },
  guide: {
    title: 'O Guia',
    sub:   'Empatia & evolução sustentável',
    desc:  'Você acompanha cada aluno no seu ritmo. O seu DNA gera treinos progressivos, explicados com empatia e focados em saúde e autonomia de longo prazo.',
    icon:  'heart',
    color: BRAND.success,
  },
  drill: {
    title: 'Drill Master',
    sub:   'Disciplina & rigor progressivo',
    desc:  'Você exige o melhor de cada aluno. O seu DNA gera treinos desafiadores com sequências de força bem definidas e exigência de execução máxima em cada repetição.',
    icon:  'shieldCheck',
    color: BRAND.primary,
  },
  movement: {
    title: 'Especialista em Movimento',
    sub:   'Função, mobilidade & padrão motor',
    desc:  'Você enxerga o corpo como um sistema integrado. O seu DNA gera treinos com ênfase em qualidade de movimento, mobilidade e padrões funcionais.',
    icon:  'wave',
    color: BRAND.lavender,
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
        Coach DNA · Arquétipo
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
        O arquétipo é derivado automaticamente do seu DNA e atualiza conforme você evolui o perfil.
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
