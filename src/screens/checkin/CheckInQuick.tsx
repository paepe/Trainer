import React from 'react';
import { useTranslation } from 'react-i18next';
import { textPri, textSec, textMute, surfRaised, borderSubtle, primaryBtn, outlineBtn } from '../../theme';
import type { CheckInQuick as CheckInQuickData, SleepQualityV2, PainRegion } from '../../types/checkin-v2';
import type { LatestCheckinData } from '../../hooks/useLatestCheckin';

interface CheckInQuickProps {
  dark:     boolean;
  primary:  string;
  accent:   string;
  userName?: string | undefined;
  lastCheckin?: LatestCheckinData;
  onSubmit: (data: CheckInQuickData) => void;
  onBack:   () => void;
}

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

export function CheckInQuick({ dark, primary, accent, userName, lastCheckin, onSubmit, onBack }: CheckInQuickProps) {
  const { t: tr } = useTranslation();
  const [energy, setEnergy]             = React.useState(lastCheckin?.energy            ?? 5);
  const [sleep, setSleep]               = React.useState((lastCheckin?.sleep_quality as SleepQualityV2 | undefined) ?? 'regular');
  const [painOn, setPainOn]             = React.useState(false);
  const [painRegion, setPainRegion]     = React.useState<PainRegion | undefined>(undefined);
  const [painIntensity, setPainIntensity] = React.useState(4);
  const [fatigue, setFatigue]           = React.useState(lastCheckin?.fatigue           ?? 3);
  const [minutes, setMinutes]           = React.useState(lastCheckin?.available_minutes ?? 45);

  const sleepOpts: { value: SleepQualityV2; label: string }[] = [
    { value: 'poor', label: tr('checkinEnums.sleep.poor') },
    { value: 'regular', label: tr('checkinEnums.sleep.regular') },
    { value: 'good', label: tr('checkinEnums.sleep.good') },
    { value: 'excellent', label: tr('checkinEnums.sleep.excellent') },
  ];

  const painRegions: { value: PainRegion; label: string }[] = [
    { value: 'neck', label: tr('checkinEnums.bodyPart.neck') },
    { value: 'shoulder', label: tr('checkinEnums.bodyPart.shoulder') },
    { value: 'elbow', label: tr('checkinEnums.bodyPart.elbow') },
    { value: 'wrist', label: tr('checkinEnums.bodyPart.wrist') },
    { value: 'upper_back', label: tr('checkinEnums.bodyPart.upper_back') },
    { value: 'lower_back', label: tr('checkinEnums.bodyPart.lower_back') },
    { value: 'hip', label: tr('checkinEnums.bodyPart.hip') },
    { value: 'knee', label: tr('checkinEnums.bodyPart.knee') },
    { value: 'ankle', label: tr('checkinEnums.bodyPart.ankle') },
    { value: 'other', label: tr('checkinEnums.bodyPart.other') },
  ];

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
    padding: '8px 14px', borderRadius: 999, cursor: 'pointer',
    fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
    background: active ? `${primary}22` : 'transparent',
    border: `1.5px solid ${active ? primary : borderSubtle(dark)}`,
    color: active ? primary : textPri(dark),
    transition: 'all .12s ease',
  });

  const blockStyle = { padding: '14px 16px', borderRadius: 14, marginBottom: 12, background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}` };

  return (
    <div style={{ padding: '20px 20px 32px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

      {userName && (
        <div style={{ marginBottom: 12, padding: '5px 12px', borderRadius: 999, background: '#10B98122', border: '1px solid #10B98155', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#10B981', letterSpacing: '.06em', textTransform: 'uppercase' }}>{tr('quickCheckin.viewing')}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#10B981' }}>{userName.split(' ')[0]}</span>
        </div>
      )}

      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: primary, marginBottom: 8 }}>
        {tr('quickCheckin.kicker')}
      </div>
      <h2 style={{
        margin: '0 0 20px', fontFamily: '"Plus Jakarta Sans",sans-serif',
        fontSize: 26, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em',
      }}>
        {tr('quickCheckin.title')}
      </h2>

      {/* 1 Energia */}
      <div style={blockStyle}>
        <BlockHeader num={1} icon="⚡" label={tr('quickCheckin.blocks.energy')} dark={dark}/>
        <div style={{ fontSize: 11.5, color: textSec(dark), marginBottom: 8 }}>{tr('quickCheckin.energyHint')}</div>
        <SliderRow value={energy} min={1} max={10} onChange={setEnergy} dark={dark} primary={primary}/>
      </div>

      {/* 2 Sono */}
      <div style={blockStyle}>
        <BlockHeader num={2} icon="🌙" label={tr('quickCheckin.blocks.sleep')} dark={dark}/>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {sleepOpts.map(o => (
            <button key={o.value} onClick={() => setSleep(o.value)} style={btnBase(sleep === o.value)}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3 Dor */}
      <div style={{ padding: '14px 16px', borderRadius: 14, marginBottom: 12, background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}` }}>
        <BlockHeader num={3} icon="🔴" label={tr('quickCheckin.blocks.pain')} dark={dark}/>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: painOn ? 14 : 0 }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: textPri(dark) }}>{tr('quickCheckin.inPainToday')}</div>
            {painOn && <div style={{ fontSize: 11, color: textSec(dark), marginTop: 2 }}>{tr('quickCheckin.painDetailHint')}</div>}
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {painRegions.map(r => (
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
            <SliderRow label={tr('quickCheckin.intensity')} value={painIntensity} min={0} max={10} onChange={setPainIntensity} dark={dark} primary={accent}/>
          </>
        )}
      </div>

      {/* 4 Fadiga */}
      <div style={blockStyle}>
        <BlockHeader num={4} icon="🔋" label={tr('quickCheckin.blocks.fatigue')} dark={dark}/>
        <SliderRow label={tr('quickCheckin.fatigueHint')} value={fatigue} min={1} max={10} onChange={setFatigue} dark={dark} primary={primary}/>
      </div>

      {/* 5 Available Time */}
      <div style={blockStyle}>
        <BlockHeader num={5} icon="⏱️" label={tr('quickCheckin.blocks.time')} dark={dark}/>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[15, 30, 45, 60, 90].map(t => (
            <button key={t} onClick={() => setMinutes(t)} style={btnBase(minutes === t)}>
              {t} min
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        <button onClick={handleSubmit} style={{ ...primaryBtn(primary), marginBottom: 0 }}>
          {tr('quickCheckin.calculate')}
        </button>
        <button onClick={onBack} style={{ ...outlineBtn(primary), padding: '15px 20px' }}>
          {tr('quickCheckin.back')}
        </button>
      </div>
    </div>
  );
}
