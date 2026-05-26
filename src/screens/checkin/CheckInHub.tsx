import React from 'react';
import { textPri, textSec, textMute, surfRaised, borderSubtle } from '../../theme';
import { Icon } from '../../components/Icon';

type Variant = 'voice' | 'quick' | 'detailed' | 'post_workout';

interface CheckInHubProps {
  dark:        boolean;
  primary:     string;
  accent:      string;
  userName?:   string | undefined;
  onSelect:    (v: Variant) => void;
  onBack:      () => void;
  streak?:     number;
  lastCheckin?: string;
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

const OPTIONS: {
  key:        Variant;
  icon:       string;
  label:      string;
  desc:       string;
  time:       string;
  badge?:     string;
}[] = [
  {
    key:   'voice',
    icon:  'mic',
    label: 'Falar com o app',
    desc:  'O jeito mais rápido. A IA estrutura sua fala em campos.',
    time:  '~30 seg',
    badge: 'RECOMENDADO',
  },
  {
    key:   'quick',
    icon:  'clock',
    label: 'Check-in rápido',
    desc:  'Cinco perguntas essenciais: sono, energia, dor, fadiga, tempo.',
    time:  '~40 seg',
  },
  {
    key:   'detailed',
    icon:  'list',
    label: 'Check-in detalhado',
    desc:  'Doze blocos para o plano que maior precisão para o seu plano.',
    time:  '~5 min',
  },
];

export function CheckInHub({ dark, primary, accent, userName, onSelect, onBack, streak, lastCheckin }: CheckInHubProps) {
  return (
    <div style={{ padding: '0 0 32px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

      {/* Header */}
      <div style={{
        padding: '16px 20px 14px',
        borderBottom: `1px solid ${borderSubtle(dark)}`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', padding: 4,
          cursor: 'pointer', color: textMute(dark), flexShrink: 0,
        }}>
          <Icon name="back" size={22} color={textMute(dark)}/>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: primary, marginBottom: 1 }}>
            TRAINER · MÓDULO 02
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: textPri(dark) }}>Check-in de Prontidão</div>
        </div>
        {streak != null && (
          <div style={{
            background: `${primary}20`, border: `1px solid ${primary}44`,
            borderRadius: 999, padding: '3px 10px',
            fontSize: 11, fontWeight: 700, color: primary,
          }}>
            🔥 {streak}
          </div>
        )}
      </div>

      <div style={{ padding: '24px 20px 0', flex: 1 }}>
        {/* Greeting */}
        <div style={{
          fontSize: 28, fontWeight: 700, color: textPri(dark),
          fontFamily: '"Plus Jakarta Sans",sans-serif', letterSpacing: '-0.02em',
          marginBottom: 4,
        }}>
          {greeting()}{userName ? `, ${userName.split(' ')[0]}` : ''}.
        </div>
        <p style={{ fontSize: 13, color: textSec(dark), margin: '0 0 24px', lineHeight: 1.55 }}>
          Antes de começar, conte rapidamente como você está hoje.
        </p>

        {/* Variant options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => onSelect(opt.key)}
              style={{
                width: '100%', textAlign: 'left', padding: '14px 16px',
                borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
                background: opt.badge ? `${primary}12` : surfRaised(dark),
                border: `1.5px solid ${opt.badge ? primary : borderSubtle(dark)}`,
                display: 'flex', alignItems: 'center', gap: 14,
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: opt.badge ? primary : `${primary}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={opt.icon} size={18} color={opt.badge ? '#0E1A2B' : primary}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: textPri(dark) }}>{opt.label}</span>
                  {opt.badge && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '.06em',
                      background: primary, color: '#0E1A2B',
                      padding: '2px 6px', borderRadius: 4,
                    }}>
                      {opt.badge}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: textSec(dark), lineHeight: 1.4, marginBottom: 4 }}>{opt.desc}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: primary, letterSpacing: '.04em' }}>{opt.time}</div>
              </div>
              <Icon name="forward" size={16} color={textMute(dark)}/>
            </button>
          ))}
        </div>

        {/* Safety Gate note */}
        <div style={{
          padding: '12px 14px', borderRadius: 12,
          background: `${accent}10`, border: `1px solid ${accent}33`,
          display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 24,
        }}>
          <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>⬡</span>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: accent, marginBottom: 2 }}>Safety Gate ativo</div>
            <div style={{ fontSize: 11, color: textSec(dark), lineHeight: 1.45 }}>
              Dor, tontura ou sinal de alerta pausam AI-led automaticamente.
            </div>
          </div>
        </div>

        {/* Post-workout link */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => onSelect('post_workout')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12.5, color: primary, fontFamily: 'inherit', fontWeight: 600,
            }}
          >
            Já treinou hoje? Check-in pós-treino →
          </button>
        </div>
      </div>

      {/* Footer */}
      {lastCheckin && (
        <div style={{
          padding: '12px 20px 0', borderTop: `1px solid ${borderSubtle(dark)}`,
          marginTop: 24, display: 'flex', justifyContent: 'space-between',
          fontSize: 10.5, color: textMute(dark),
        }}>
          <span>Último check-in · {lastCheckin}</span>
          {streak != null && <span>streak · {streak} dias</span>}
        </div>
      )}
    </div>
  );
}
