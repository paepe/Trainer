import React from 'react';
import { Icon } from '../../../components/Icon';
import { textPri, textSec, textMute, surfRaised, borderSubtle } from '../../../theme';
import type { WizardStepProps } from './types';

const FEATURES: { icon: string; text: string }[] = [
  { icon: 'chart',    text: 'Basic data, goals & movement history'    },
  { icon: 'heart',    text: 'Declared health — no diagnosis required' },
  { icon: 'activity', text: 'Functional capacity & accessibility'     },
  { icon: 'lock',     text: 'Sensitive factors stay protected'        },
  { icon: 'moon',     text: 'Body Rhythm — opt-in, always private'   },
];

export function Step01Welcome({ dark, primary, onNext }: WizardStepProps) {
  return (
    <div style={{ padding: '32px 24px 36px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

      {/* kicker */}
      <div style={{
        fontSize: 9.5, fontWeight: 700, letterSpacing: '.18em',
        textTransform: 'uppercase', color: primary,
        marginBottom: 28, textAlign: 'center',
        fontFamily: '"JetBrains Mono",ui-monospace,monospace',
        animation: 'wp-arrive .35s ease both',
      }}>
        TrAIner · Module 01 · Student Profile
      </div>

      {/* hero icon */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22, animation: 'wp-arrive .4s .04s cubic-bezier(.34,1.56,.64,1) both' }}>
        <div style={{
          width: 80, height: 80, borderRadius: 26,
          background: `linear-gradient(135deg, ${primary}, ${primary}aa)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 16px 40px ${primary}44`,
        }}>
          <Icon name="user" size={38} color="#0E1A2B" stroke={2}/>
        </div>
      </div>

      {/* heading */}
      <div style={{ textAlign: 'center', marginBottom: 24, animation: 'wp-arrive .4s .08s ease both' }}>
        <h1 style={{
          margin: '0 0 10px',
          fontFamily: '"Plus Jakarta Sans","Inter",system-ui,sans-serif',
          fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.08,
          color: textPri(dark),
        }}>
          Smart Student Profile
        </h1>
        <p style={{ margin: 0, fontSize: 13.5, color: textSec(dark), lineHeight: 1.6 }}>
          Build your{' '}
          <strong style={{ color: textPri(dark) }}>Extended Trainability Profile</strong>
          {' '}— the data the AI uses to adapt intensity, safety, and progression for every session.
        </p>
      </div>

      {/* feature cards */}
      <div style={{
        background: surfRaised(dark), borderRadius: 16,
        border: `1px solid ${borderSubtle(dark)}`,
        padding: '4px 0', marginBottom: 24,
        animation: 'wp-arrive .4s .14s ease both',
      }}>
        {FEATURES.map(f => (
          <div key={f.text} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '11px 16px',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10, flexShrink: 0,
              background: `${primary}20`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name={f.icon} size={16} color={primary} stroke={2}/>
            </div>
            <span style={{ fontSize: 13.5, color: textSec(dark), lineHeight: 1.4 }}>{f.text}</span>
          </div>
        ))}
      </div>

      <div style={{ flex: 1 }}/>

      {/* time / privacy note */}
      <p style={{
        fontSize: 11.5, color: textMute(dark), textAlign: 'center',
        margin: '0 0 18px', lineHeight: 1.5,
        fontFamily: '"JetBrains Mono",ui-monospace,monospace',
        letterSpacing: '.03em',
        animation: 'wp-arrive .4s .18s ease both',
      }}>
        ≈ 5–8 min · 14 blocks · powers the AI training engine
      </p>

      <p style={{
        fontSize: 11.5, color: textMute(dark), textAlign: 'center',
        margin: '0 0 22px', lineHeight: 1.5,
        animation: 'wp-arrive .4s .2s ease both',
      }}>
        You can leave and return at any time. No data is lost.{' '}
        All sensitive information is encrypted before reaching any recommender.
      </p>

      {/* CTA */}
      <button
        onClick={onNext}
        style={{
          width: '100%', padding: '17px 20px', borderRadius: 16, border: 'none',
          background: primary, color: '#0E1A2B',
          fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
          cursor: 'pointer',
          boxShadow: `0 10px 30px ${primary}44`,
          animation: 'wp-arrive .4s .22s cubic-bezier(.34,1.56,.64,1) both',
        }}
      >
        Build my Smart Profile
      </button>

      <style>{`
        @keyframes wp-arrive {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>
    </div>
  );
}
