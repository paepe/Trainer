import React from 'react';
import { textPri, textSec, textMute, surfRaised, borderSubtle } from '../../theme';
import type { CheckInQuick as CheckInQuickData, SleepQualityV2, PainRegion } from '../../types/checkin-v2';

interface CheckInQuickProps {
  dark:     boolean;
  primary:  string;
  accent:   string;
  onSubmit: (data: CheckInQuickData) => void;
  onBack:   () => void;
}

const SLEEP_OPTIONS: { value: SleepQualityV2; label: string }[] = [
  { value: 'poor',      label: 'Poor'    },
  { value: 'regular',   label: 'Regular' },
  { value: 'good',      label: 'Good'     },
  { value: 'excellent', label: 'Excellent'   },
];

const PAIN_REGIONS: { value: PainRegion; label: string }[] = [
  { value: 'cervical', label: 'Cervical' }, { value: 'shoulder', label: 'Shoulder'    },
  { value: 'lumbar',   label: 'Lumbar'   }, { value: 'hip',      label: 'Hip'  },
  { value: 'knee',     label: 'Knee'   }, { value: 'ankle',    label: 'Ankle'},
  { value: 'wrist',    label: 'Wrist'    }, { value: 'elbow',    label: 'Elbow' },
  { value: 'other',    label: 'Other'    },
];

const TIME_PRESETS = [15, 30, 45, 60, 90];

const BLOCK_STYLE = (dark: boolean, accent = false, primary = '') => ({
  padding: '14px 16px', borderRadius: 14, marginBottom: 12,
  background: accent ? `${primary}08` : surfRaised(dark),
  border: `1px solid ${borderSubtle(dark)}`,
});

function BlockHeader({ num, icon, label, dark }: { num: number; icon: string; label: string; dark: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <span style={{
        width: 22, height: 22, borderRadius: '50%',
        background: '#ffffff15', display: 'inline-flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 10, fontWeight: 700,
        color: dark ? '#fff' : '#102236', flexShrink: 0,
      }}>
        {num}
      </span>
      <span style={{ fontSize: 10, marginRight: 2 }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: dark ? '#fff' : '#102236' }}>
        {label}
      </span>
    </div>
  );
}

function SliderRow({ label, value, min, max, unit = '', onChange, dark, primary }: {
  label?: string; value: number; min: number; max: number; unit?: string;
  onChange: (v: number) => void; dark: boolean; primary: string;
}) {
  return (
    <div>
      {label && <div style={{ fontSize: 11.5, color: dark ? '#ffffff80' : '#60728a', marginBottom: 6 }}>{label}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <input type="range" min={min} max={max} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ flex: 1, accentColor: primary }}
        />
        <span style={{ fontSize: 16, fontWeight: 700, color: dark ? '#fff' : '#102236', minWidth: 40, textAlign: 'right' }}>
          {value}<span style={{ fontSize: 11, fontWeight: 400, color: dark ? '#ffffff60' : '#9aabb8' }}>/{max}{unit}</span>
        </span>
      </div>
    </div>
  );
}

export function CheckInQuick({ dark, primary, accent, onSubmit, onBack }: CheckInQuickProps) {
  const [energy, setEnergy]             = React.useState(5);
  const [sleep, setSleep]               = React.useState<SleepQualityV2>('regular');
  const [painOn, setPainOn]             = React.useState(false);
  const [painRegion, setPainRegion]     = React.useState<PainRegion | undefined>(undefined);
  const [painIntensity, setPainIntensity] = React.useState(4);
  const [fatigue, setFatigue]           = React.useState(3);
  const [minutes, setMinutes]           = React.useState(45);

  const handleSubmit = () => {
    const pain = painOn && painRegion != null
      ? { present: true, region: painRegion, intensity: painIntensity }
      : { present: painOn };

    const data: CheckInQuickData = {
      energy,
      sleep_quality:     sleep,
      pain,
      fatigue,
      available_minutes: minutes,
    };
    onSubmit(data);
  };

  const btnBase = (active: boolean): React.CSSProperties => ({
    padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
    fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
    background: active ? primary : surfRaised(dark),
    border: `1.5px solid ${active ? primary : borderSubtle(dark)}`,
    color: active ? '#0E1A2B' : textPri(dark),
    transition: 'background .15s, border-color .15s',
  });

  return (
    <div style={{ padding: '20px 20px 32px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: primary, marginBottom: 8 }}>
        QUICK CHECK-IN · 40 SEC
      </div>
      <h2 style={{
        margin: '0 0 20px', fontFamily: '"Plus Jakarta Sans",sans-serif',
        fontSize: 26, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em',
      }}>
        Five questions
      </h2>

      {/* 1 Energia */}
      <div style={BLOCK_STYLE(dark)}>
        <BlockHeader num={1} icon="⚡" label="Energia" dark={dark}/>
        <div style={{ fontSize: 11.5, color: textSec(dark), marginBottom: 8 }}>how are you feeling?</div>
        <SliderRow value={energy} min={1} max={10} onChange={setEnergy} dark={dark} primary={primary}/>
      </div>

      {/* 2 Sono */}
      <div style={BLOCK_STYLE(dark)}>
        <BlockHeader num={2} icon="🌙" label="Sono" dark={dark}/>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SLEEP_OPTIONS.map(o => (
            <button key={o.value} onClick={() => setSleep(o.value)} style={btnBase(sleep === o.value)}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3 Dor */}
      <div style={{ padding: '14px 16px', borderRadius: 14, marginBottom: 12, background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}` }}>
        <BlockHeader num={3} icon="🔴" label="Dor" dark={dark}/>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: painOn ? 14 : 0 }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: textPri(dark) }}>I'm in pain today</div>
            {painOn && <div style={{ fontSize: 11, color: textSec(dark), marginTop: 2 }}>Tap to detail region and intensity</div>}
          </div>
          <button
            onClick={() => { setPainOn(v => !v); if (painOn) setPainRegion(undefined); }}
            style={{
              width: 44, height: 26, borderRadius: 999, cursor: 'pointer', border: 'none',
              background: painOn ? primary : borderSubtle(dark),
              position: 'relative', transition: 'background .2s', flexShrink: 0,
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 3,
              left: painOn ? 21 : 3, transition: 'left .2s',
            }}/>
          </button>
        </div>
        {painOn && (
          <>
            {/* Region chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {PAIN_REGIONS.map(r => (
                <button key={r.value} onClick={() => setPainRegion(r.value)} style={{
                  padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 12, fontWeight: 600,
                  background: painRegion === r.value ? primary : surfRaised(dark),
                  border: `1.5px solid ${painRegion === r.value ? primary : borderSubtle(dark)}`,
                  color: painRegion === r.value ? '#0E1A2B' : textPri(dark),
                }}>
                  {r.label}
                </button>
              ))}
            </div>
            <SliderRow label="Intensity" value={painIntensity} min={0} max={10} onChange={setPainIntensity} dark={dark} primary={accent}/>
          </>
        )}
      </div>

      {/* 4 Fadiga */}
      <div style={BLOCK_STYLE(dark)}>
        <BlockHeader num={4} icon="🔋" label="Fadiga" dark={dark}/>
        <SliderRow label="perceived fatigue" value={fatigue} min={1} max={10} onChange={setFatigue} dark={dark} primary={primary}/>
      </div>

      {/* 5 Available Time */}
      <div style={BLOCK_STYLE(dark)}>
        <BlockHeader num={5} icon="⏱️" label="Available Time" dark={dark}/>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TIME_PRESETS.map(t => (
            <button key={t} onClick={() => setMinutes(t)} style={btnBase(minutes === t)}>
              {t} min
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, color: primary, fontFamily: 'inherit', fontWeight: 600, padding: 0,
        }}>
          ← back
        </button>
        <button onClick={handleSubmit} style={{
          flex: 1, padding: '16px', borderRadius: 999,
          background: primary, border: 'none', color: '#0E1A2B',
          fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
          boxShadow: `0 6px 20px ${primary}44`,
        }}>
          Calculate readiness →
        </button>
      </div>
    </div>
  );
}
