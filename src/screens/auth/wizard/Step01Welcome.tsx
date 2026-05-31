import { Icon } from '../../../components/Icon';
import { textPri, textSec, textMute, surfRaised, borderSubtle } from '../../../theme';
import { VStack, Spacer } from '../../../ui';

const FEATURES = [
  { icon: 'user',     text: 'Basic data, goals and history'           },
  { icon: 'shield',   text: 'Declared health — no diagnosis required' },
  { icon: 'activity', text: 'Functional capacity and accessibility'   },
  { icon: 'lock',     text: 'Sensitive factors stay protected'        },
  { icon: 'sparkle',  text: 'Body Rhythm — opt-in, always private'   },
] as const;

interface Step01WelcomeProps {
  dark:           boolean;
  primary:        string;
  onNext:         () => void;
  profileExists?: boolean | undefined;
}

export function Step01Welcome({ dark, primary, onNext, profileExists }: Step01WelcomeProps) {
  const cyanDeep = '#0F8C85';

  return (
    <VStack padding="28px 24px 32px" style={{ minHeight: '100%' }}>

      {/* hero icon — centered */}
      <div style={{
        display: 'flex', justifyContent: 'center', marginBottom: 18,
        animation: 'wp-arrive .4s .04s cubic-bezier(.34,1.56,.64,1) both',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 18,
          background: `linear-gradient(135deg, ${primary} 0%, ${cyanDeep} 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 12px 30px ${primary}33`,
        }}>
          <Icon name="brain" size={28} color="#0E1A2B" stroke={2}/>
        </div>
      </div>

      {/* kicker — centered */}
      <div style={{
        fontSize: 10.5, fontWeight: 700, letterSpacing: '.18em',
        textTransform: 'uppercase', color: primary, marginBottom: 8,
        fontFamily: '"JetBrains Mono",ui-monospace,monospace',
        textAlign: 'center',
        animation: 'wp-arrive .35s ease both',
      }}>
        MODULE 01 · PREDICTIVE BASE
      </div>

      {/* title — centered */}
      <h1 style={{
        margin: '0 0 10px',
        fontFamily: '"Plus Jakarta Sans","Inter",system-ui,sans-serif',
        fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1,
        color: textPri(dark), textAlign: 'center',
        animation: 'wp-arrive .4s .06s ease both',
      }}>
        Smart Student Profile
      </h1>

      {/* subtitle + body — centered */}
      <div style={{
        fontSize: 13.5, color: textSec(dark), lineHeight: 1.55, marginBottom: 22,
        textAlign: 'center',
        animation: 'wp-arrive .4s .1s ease both',
      }}>
        Health, Movement, Privacy and Predictive Base.
        <br/><br/>
        Let's build your{' '}
        <strong style={{ color: textPri(dark) }}>Extended Trainability Profile</strong>
        {' '}— the foundation TrAIner uses to adapt intensity, safety, and progression of your plan.
      </div>

      {/* feature card */}
      <div style={{
        borderRadius: 14, padding: 14,
        background: surfRaised(dark),
        border: `1px solid ${borderSubtle(dark)}`,
        marginBottom: 16,
        animation: 'wp-arrive .4s .14s ease both',
      }}>
        {FEATURES.map(f => (
          <div key={f.text} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: `${primary}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name={f.icon} size={14} color={primary} stroke={2}/>
            </div>
            <span style={{ fontSize: 13, color: textSec(dark) }}>{f.text}</span>
          </div>
        ))}
      </div>

      {/* privacy note */}
      <p style={{
        margin: '0 0 14px', padding: '10px 14px', borderRadius: 12,
        background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}`,
        fontSize: 11.5, color: textMute(dark), lineHeight: 1.5,
        animation: 'wp-arrive .4s .18s ease both',
      }}>
        You can save and return at any time. No partial data is lost.
        All sensitive information is masked before reaching your trainer.
      </p>

      {/* time / LGPD note */}
      <div style={{
        fontSize: 11, color: textMute(dark),
        fontFamily: '"JetBrains Mono",ui-monospace,monospace',
        letterSpacing: '.04em',
        animation: 'wp-arrive .4s .2s ease both',
      }}>
        ≈ 6–9 min · 14 blocks · LGPD compatible
      </div>

      <Spacer />

      {/* CTA */}
      <button
        onClick={onNext}
        style={{
          width: '100%', padding: '17px 20px', marginTop: 24,
          borderRadius: 16, border: 'none',
          background: primary, color: '#0E1A2B',
          fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
          cursor: 'pointer',
          boxShadow: `0 10px 30px ${primary}44`,
          animation: 'wp-arrive .4s .22s cubic-bezier(.34,1.56,.64,1) both',
        }}
      >
        {profileExists ? 'Edit Smart Profile' : 'Build my Smart Profile'} →
      </button>

      <style>{`
        @keyframes wp-arrive {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>
    </VStack>
  );
}
