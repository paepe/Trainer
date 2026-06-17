import React from 'react';
import { useTranslation } from 'react-i18next';
import { textPri, textSec, textMute, surfRaised, borderSubtle } from '../../theme';
import { Icon } from '../../components/Icon';

type Variant = 'voice' | 'quick' | 'detailed';

interface CheckInHubProps {
  dark:               boolean;
  primary:            string;
  accent:             string;
  userName?:          string | undefined;
  isClient?:          boolean;
  onSelect:           (v: Variant) => void;
  onBack:             () => void;
  streak?:            number;
  lastCheckin?:       string;
  freeSession?:       boolean; // Free Training Session: only the Detailed check-in is offered
  fullCheckinAllowed?: boolean; // plan gate: false = Quick only (free plan clients)
}

const OPTIONS: { key: Variant; icon: string; time: string; badge?: true }[] = [
  { key: 'voice',    icon: 'mic',   time: '~30 sec', badge: true },
  { key: 'quick',   icon: 'clock', time: '~40 sec' },
  { key: 'detailed',icon: 'list',  time: '~5 min'  },
];

export function CheckInHub({ dark, primary, accent, userName, isClient, onSelect, onBack, streak, lastCheckin, freeSession, fullCheckinAllowed = true }: CheckInHubProps) {
  const { t: tr } = useTranslation();
  // Free Training Session mandates the Complete (Detailed) check-in as the sole,
  // authoritative input — Quick and Voice are withheld to maximise data quality.
  // Plan gate: free-plan clients see only Quick check-in (no Detailed or Voice).
  const options = freeSession
    ? OPTIONS.filter(o => o.key === 'detailed')
    : !fullCheckinAllowed
      ? OPTIONS.filter(o => o.key === 'quick')
      : OPTIONS;
  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? tr('checkin.hub.greet.morning') : h < 18 ? tr('checkin.hub.greet.afternoon') : tr('checkin.hub.greet.evening');
  };
  return (
    <div style={{ padding: '0 0 32px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <style>{`@keyframes livePulse { 0%, 100% { opacity: 1; box-shadow: 0 0 6px #4ade80; } 50% { opacity: 0.6; box-shadow: 0 0 2px #4ade80; } }`}</style>

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
            TRAINER · {tr('checkin.hub.moduleLabel')}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: textPri(dark) }}>{tr('checkin.hub.readinessCheckin')}</div>
        </div>
        {/* LIVE badge — data is always live via Supabase Realtime */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: '#4ade8018', border: '1px solid #4ade8044',
          borderRadius: 999, padding: '3px 9px',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#4ade80',
            boxShadow: '0 0 6px #4ade80',
            display: 'inline-block',
            animation: 'livePulse 2s ease-in-out infinite',
          }}/>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.06em', color: '#4ade80' }}>{tr('checkin.hub.live')}</span>
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
          {isClient && userName ? `Check-in to ${userName.split(' ')[0]}` : `${greeting()}${userName ? `, ${userName.split(' ')[0]}` : ''}`}.
        </div>
        <p style={{ fontSize: 13, color: textSec(dark), margin: '0 0 24px', lineHeight: 1.55 }}>
          {tr('checkin.hub.beforeStart')}
        </p>

        {/* Variant options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {options.map(opt => (
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
                  <span style={{ fontSize: 14, fontWeight: 600, color: textPri(dark) }}>{tr(`checkin.hub.options.${opt.key}.label` as `checkin.hub.options.${string}`)}</span>
                  {opt.badge && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '.06em',
                      background: primary, color: '#0E1A2B',
                      padding: '2px 6px', borderRadius: 4,
                    }}>
                      {tr('checkin.hub.options.voice.badge')}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: textSec(dark), lineHeight: 1.4, marginBottom: 4 }}>{tr(`checkin.hub.options.${opt.key}.desc` as `checkin.hub.options.${string}`, '')}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: primary, letterSpacing: '.04em' }}>{opt.time}</div>
              </div>
              <Icon name="forward" size={16} color={textMute(dark)}/>
            </button>
          ))}
        </div>

        {/* Plan upgrade teaser — shown when full check-in is gated */}
        {!freeSession && !fullCheckinAllowed && (
          <div style={{
            padding: '12px 14px', borderRadius: 12, marginBottom: 10,
            background: `${primary}10`, border: `1px solid ${primary}33`,
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>🔒</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: primary, marginBottom: 2 }}>
                {tr('checkin.hub.fullLocked')}
              </div>
              <div style={{ fontSize: 11, color: textSec(dark), lineHeight: 1.45, marginBottom: 8 }}>
                {tr('checkin.hub.fullLockedNote')}
              </div>
              <button
                onClick={() => onBack()}
                style={{
                  fontSize: 11, fontWeight: 700, color: primary,
                  background: 'none', border: `1px solid ${primary}`,
                  borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                  letterSpacing: '.04em',
                }}
              >
                {tr('checkin.hub.fullLockedCta')}
              </button>
            </div>
          </div>
        )}

        {/* Safety Gate note */}
        <div style={{
          padding: '12px 14px', borderRadius: 12,
          background: `${accent}10`, border: `1px solid ${accent}33`,
          display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 24,
        }}>
          <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>⬡</span>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: accent, marginBottom: 2 }}>{tr('checkin.hub.safetyGateActive')}</div>
            <div style={{ fontSize: 11, color: textSec(dark), lineHeight: 1.45 }}>
              {tr('checkin.hub.safetyGateNote')}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      {lastCheckin && (
        <div style={{
          padding: '12px 20px 0', borderTop: `1px solid ${borderSubtle(dark)}`,
          marginTop: 24, display: 'flex', justifyContent: 'space-between',
          fontSize: 10.5, color: textMute(dark),
        }}>
          <span>{tr('checkin.hub.lastCheckin', { date: lastCheckin })}</span>
          {streak != null && <span>{tr('checkin.hub.streak', { count: streak })}</span>}
        </div>
      )}
    </div>
  );
}
