import React from 'react';
import { Icon } from '../../../components/Icon';
import { textPri, textSec, textMute, primaryBtn } from '../../../theme';
import type { WizardStepProps } from './types';

const FEATURES: { icon: string; text: string }[] = [
  { icon: 'chart',    text: 'Basic data, goals and history'          },
  { icon: 'heart',    text: 'Declared health — no diagnosis'             },
  { icon: 'activity', text: 'Functional capacity and accessibility'         },
  { icon: 'lock',     text: 'Sensitive factors stay protected'            },
  { icon: 'moon',     text: 'Body Rhythm — opt-in, always private'       },
];

export function Step01Welcome({ dark, primary, onNext }: WizardStepProps) {
  return (
    <div style={{ padding: '28px 24px 32px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Module label */}
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: primary, marginBottom: 12 }}>
        TRAINER · MODULE 01
      </div>

      {/* Icon */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 18,
          background: `${primary}1a`, border: `1.5px solid ${primary}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="user" size={26} color={primary} stroke={2}/>
        </div>
      </div>

      {/* Title */}
      <h1 style={{
        margin: '0 0 8px', fontFamily: '"Plus Jakarta Sans",sans-serif',
        fontSize: 30, fontWeight: 700, color: textPri(dark),
        letterSpacing: '-0.02em', lineHeight: 1.1,
      }}>
        Smart Profile
      </h1>
      <p style={{ fontSize: 13, color: textSec(dark), margin: '0 0 24px', lineHeight: 1.6 }}>
        Let's build your{' '}
        <strong style={{ color: textPri(dark) }}>Amplified Trainability Profile</strong> — data that the AI will
        use to adapt intensity, safety, and progression for your plan.
      </p>

      {/* Feature list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
        {FEATURES.map(f => (
          <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10, background: `${primary}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon name={f.icon} size={16} color={primary} stroke={2}/>
            </div>
            <span style={{ fontSize: 13.5, color: textSec(dark), lineHeight: 1.4 }}>{f.text}</span>
          </div>
        ))}
      </div>

      <div style={{ flex: 1 }}/>

      {/* Privacy note */}
      <p style={{ fontSize: 11.5, color: textMute(dark), textAlign: 'center', margin: '0 0 18px', lineHeight: 1.5 }}>
        You can leave and return at any time. No data is lost. All sensitive information is flagged before reaching the recommender.
      </p>

      <button onClick={onNext} style={primaryBtn(primary)}>
        Start
      </button>
    </div>
  );
}
