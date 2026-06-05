import React from 'react';
import { useTranslation } from 'react-i18next';
import { textPri, textSec, textMute, surfRaised, borderSubtle, primaryBtn, outlineBtn } from '../../theme';
import type {
  CheckInDetailed as CheckInDetailedData,
  SleepQualityV2, PainRegion, FatigueType,
  EmotionalState, SafetySignal, AdaptationPreference,
} from '../../types/checkin-v2';
import type { LatestCheckinData } from '../../hooks/useLatestCheckin';

interface CheckInDetailedProps {
  dark:           boolean;
  primary:        string;
  accent:         string;
  userName?:      string | undefined;
  lastCheckin?:   LatestCheckinData;
  biologicalSex?: string | undefined;
  onSubmit:       (data: CheckInDetailedData) => void;
  onBack:         () => void;
}

function BlockHeader({ num, icon, label, dark }: { num: number; icon: string; label: string; dark: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <span style={{
        width: 22, height: 22, borderRadius: '50%', background: '#ffffff15',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700, color: dark ? '#fff' : '#102236', flexShrink: 0,
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
      {label && <div style={{ fontSize: 11.5, color: textSec(dark), marginBottom: 6 }}>{label}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <input type="range" min={min} max={max} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ flex: 1, accentColor: primary }}
        />
        <span style={{ fontSize: 16, fontWeight: 700, color: textPri(dark), minWidth: 40, textAlign: 'right' }}>
          {value}<span style={{ fontSize: 11, fontWeight: 400, color: textMute(dark) }}>/{max}{unit}</span>
        </span>
      </div>
    </div>
  );
}

function ToggleRow({ label, sub, on, onChange, dark, primary }: {
  label: string; sub?: string | undefined; on: boolean; onChange: (v: boolean) => void; dark: boolean; primary: string;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: textPri(dark) }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: textSec(dark), marginTop: 2 }}>{sub}</div>}
      </div>
      <button
        onClick={() => onChange(!on)}
        style={{
          width: 44, height: 26, borderRadius: 999, cursor: 'pointer', border: 'none',
          background: on ? primary : borderSubtle(dark),
          position: 'relative', transition: 'background .2s', flexShrink: 0,
        }}
      >
        <div style={{
          width: 20, height: 20, borderRadius: '50%', background: '#fff',
          position: 'absolute', top: 3, left: on ? 21 : 3, transition: 'left .2s',
        }}/>
      </button>
    </div>
  );
}

function ChipBtn({ label, selected, onClick, dark, primary }: {
  label: string; selected: boolean; onClick: () => void; dark: boolean; primary: string;
}) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
      fontSize: 12, fontWeight: 600,
      background: selected ? primary : surfRaised(dark),
      border: `1.5px solid ${selected ? primary : borderSubtle(dark)}`,
      color: selected ? '#0E1A2B' : textPri(dark),
      transition: 'background .15s, border-color .15s',
    }}>
      {label}
    </button>
  );
}

const PAIN_REGS: PainRegion[] = ['neck','shoulder','elbow','wrist','upper_back','lower_back','hip','knee','ankle','other'];
const EMOTION_VALS: EmotionalState[] = ['calm','neutral','motivated','stressed','anxious','discouraged'];
const SIGNAL_VALS: SafetySignal[] = ['severe_pain','dizziness','shortness_of_breath','chest_pain','malaise','loss_of_balance','fainting_sensation'];
const ADAPT_VALS: AdaptationPreference[] = ['maintain_normal','reduce_intensity','reduce_impact','increase_rest','shorten_session','prioritize_mobility','postpone_training','regenerative'];
const TIME_PRESETS = [15, 30, 45, 60, 90];

export function CheckInDetailed({ dark, primary, accent, userName, lastCheckin, biologicalSex, onSubmit, onBack }: CheckInDetailedProps) {
  const { t: tr } = useTranslation();
  const sleepOpts: { value: SleepQualityV2; label: string }[] = React.useMemo(() => [
    { value: 'poor', label: tr('checkinEnums.sleep.poor') },
    { value: 'regular', label: tr('checkinEnums.sleep.regular') },
    { value: 'good', label: tr('checkinEnums.sleep.good') },
    { value: 'excellent', label: tr('checkinEnums.sleep.excellent') },
  ], [tr]);
  const painRegions = React.useMemo(() => PAIN_REGS.map(r => ({ value: r, label: tr(`checkinEnums.bodyPart.${r}`) })), [tr]);
  const fatigueTypes = React.useMemo(() => [
    { value: 'physical' as FatigueType, label: tr('checkinEnums.emotional.physical') },
    { value: 'mental' as FatigueType, label: tr('checkinEnums.emotional.mental') },
    { value: 'both' as FatigueType, label: tr('checkinEnums.emotional.both') },
  ], [tr]);
  const emotions = React.useMemo(() => EMOTION_VALS.map(e => ({ value: e, label: tr(`checkinEnums.emotional.${e}`) })), [tr]);
  const locations = React.useMemo(() => [
    { value: 'home', label: tr('checkinEnums.location.home') },
    { value: 'gym', label: tr('checkinEnums.location.gym') },
    { value: 'studio', label: tr('checkinEnums.location.studio') },
    { value: 'park', label: tr('checkinEnums.location.park') },
    { value: 'online', label: tr('checkinEnums.location.online') },
  ], [tr]);
  const equipment_ = React.useMemo(() => [
    { value: 'dumbbells', label: tr('checkinEnums.equipment.dumbbells') },
    { value: 'resistance_bands', label: tr('checkinEnums.equipment.resistance_bands') },
    { value: 'barbell', label: tr('checkinEnums.equipment.barbell') },
    { value: 'bench', label: tr('checkinEnums.equipment.bench') },
    { value: 'machines', label: tr('checkinEnums.equipment.machines') },
    { value: 'treadmill', label: tr('checkinEnums.equipment.treadmill') },
    { value: 'kettlebell', label: tr('checkinEnums.equipment.kettlebell') },
    { value: 'none', label: tr('checkinEnums.equipment.none') },
  ], [tr]);
  const safetySignals = React.useMemo(() => SIGNAL_VALS.map(s => ({ value: s, label: tr(`checkinEnums.signals.${s}`) })), [tr]);
  const adaptations = React.useMemo(() => ADAPT_VALS.map(a => ({ value: a, label: tr(`checkinEnums.adaptations.${a}`) })), [tr]);

  const [energy, setEnergy]                     = React.useState(lastCheckin?.energy            ?? 5);
  const [sleep, setSleep]                       = React.useState((lastCheckin?.sleep_quality as SleepQualityV2 | undefined) ?? 'regular');
  const [sleepHours, setSleepHours]             = React.useState(lastCheckin?.sleep_hours       ?? 7);
  const [painOn, setPainOn]                     = React.useState(false);
  const [painRegion, setPainRegion]             = React.useState<PainRegion | undefined>(undefined);
  const [painIntensity, setPainIntensity]       = React.useState(4);
  const [movementTrigger, setMovementTrigger]   = React.useState('');
  const [fatigue, setFatigue]                   = React.useState(lastCheckin?.fatigue           ?? 3);
  const [fatigueType, setFatigueType]           = React.useState((lastCheckin?.fatigue_type as FatigueType | undefined) ?? undefined);
  const [emotion, setEmotion]                   = React.useState((lastCheckin?.emotional_state as EmotionalState | undefined) ?? undefined);
  const [minutes, setMinutes]                   = React.useState(lastCheckin?.available_minutes ?? 45);
  const [location, setLocation]                 = React.useState(lastCheckin?.location_today    ?? undefined);
  const [equipment, setEquipment]               = React.useState(lastCheckin?.equipment_today   ?? []);
  const [floorOk, setFloorOk]                   = React.useState(true);
  const [signals, setSignals]                   = React.useState<SafetySignal[]>([]);
  const [bodyRhythm, setBodyRhythm]             = React.useState(lastCheckin?.body_rhythm_active ?? false);
  const [adaptation, setAdaptation]             = React.useState((lastCheckin?.adaptation_preference as AdaptationPreference | undefined) ?? undefined);

  const toggleEquip = (val: string) => {
    if (val === 'none') { setEquipment(['none']); return; }
    setEquipment(cur => {
      const without = cur.filter(x => x !== 'none');
      return without.includes(val) ? without.filter(x => x !== val) : [...without, val];
    });
  };

  const toggleSignal = (val: SafetySignal) =>
    setSignals(cur => cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val]);

  const btnBase = (active: boolean): React.CSSProperties => ({
    padding: '8px 14px', borderRadius: 999, cursor: 'pointer',
    fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
    background: active ? `${primary}22` : 'transparent',
    border: `1.5px solid ${active ? primary : borderSubtle(dark)}`,
    color: active ? primary : textPri(dark),
    transition: 'all .12s ease',
  });

  const block = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    padding: '14px 16px', borderRadius: 14, marginBottom: 12,
    background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}`, ...extra,
  });

  const handleSubmit = () => {
    const pain = painOn && painRegion != null
      ? {
          present: true, region: painRegion, intensity: painIntensity,
          ...(movementTrigger ? { movement_trigger: movementTrigger } : {}),
        }
      : { present: painOn };

    const base: CheckInDetailedData = {
      energy,
      sleep_quality:     sleep,
      sleep_hours:       sleepHours,
      pain,
      fatigue,
      available_minutes: minutes,
      safety_signals:    signals,
      body_rhythm_active: bodyRhythm,
      can_do_floor_exercises: floorOk,
    };

    if (fatigueType != null)  base.fatigue_type        = fatigueType;
    if (emotion != null)      base.emotional_state     = emotion;
    if (location != null)     base.location_today      = location;
    if (equipment.length > 0) base.equipment_today     = equipment;
    if (adaptation != null)   base.adaptation_preference = adaptation;

    onSubmit(base);
  };

  return (
    <div style={{ padding: '20px 20px 32px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

      {userName && (
        <div style={{ marginBottom: 12, padding: '5px 12px', borderRadius: 999, background: '#10B98122', border: '1px solid #10B98155', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#10B981', letterSpacing: '.06em', textTransform: 'uppercase' }}>{tr('detailedCheckin.viewing')}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#10B981' }}>{userName.split(' ')[0]}</span>
        </div>
      )}

      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: primary, marginBottom: 8 }}>
        {tr('detailedCheckin.kicker')}
      </div>
      <h2 style={{
        margin: '0 0 4px', fontFamily: '"Plus Jakarta Sans",sans-serif',
        fontSize: 24, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em',
      }}>
        Full day context
      </h2>
      <p style={{ fontSize: 12, color: textSec(dark), margin: '0 0 20px', lineHeight: 1.5 }}>
        For greater precision. Skips fields that don't apply.
      </p>

      {/* 1 Energia */}
      <div style={block()}>
        <BlockHeader num={1} icon="⚡" label={tr('detailedCheckin.blocks.energy')} dark={dark}/>
        <SliderRow label="how are you feeling?" value={energy} min={1} max={10} onChange={setEnergy} dark={dark} primary={primary}/>
      </div>

      {/* 2 Sono */}
      <div style={block()}>
        <BlockHeader num={2} icon="🌙" label={tr('detailedCheckin.blocks.sleep')} dark={dark}/>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {sleepOpts.map(o => (
            <button key={o.value} onClick={() => setSleep(o.value)} style={btnBase(sleep === o.value)}>
              {o.label}
            </button>
          ))}
        </div>
        <SliderRow label="hours slept" value={sleepHours} min={2} max={12} unit="h" onChange={setSleepHours} dark={dark} primary={primary}/>
      </div>

      {/* 3 Dor */}
      <div style={block()}>
        <BlockHeader num={3} icon="🔴" label={tr('detailedCheckin.blocks.pain')} dark={dark}/>
        <ToggleRow
          label={tr('detailedCheckin.inPainToday')}
          sub={painOn ? tr('detailedCheckin.painDetailHint') : undefined}
          on={painOn}
          onChange={v => { setPainOn(v); if (!v) { setPainRegion(undefined); } }}
          dark={dark} primary={primary}
        />
        {painOn && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {painRegions.map(r => (
                <ChipBtn key={r.value} label={r.label} selected={painRegion === r.value}
                  onClick={() => setPainRegion(r.value)} dark={dark} primary={primary}/>
              ))}
            </div>
            <SliderRow label={tr('detailedCheckin.intensity')} value={painIntensity} min={0} max={10} onChange={setPainIntensity} dark={dark} primary={accent}/>
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 6 }}>
                TRIGGER MOVEMENT
              </div>
              <input
                type="text"
                value={movementTrigger}
                onChange={e => setMovementTrigger(e.target.value)}
                placeholder="e.g.: squat, lift weight"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8, boxSizing: 'border-box',
                  background: 'var(--sunken)',
                  border: `1px solid ${borderSubtle(dark)}`,
                  color: textPri(dark), fontFamily: 'inherit', fontSize: 13, outline: 'none',
                }}
              />
            </div>
          </div>
        )}
        <ToggleRow
          label={tr('detailedCheckin.floorExercises')}
          sub={tr('detailedCheckin.floorNote')}
          on={floorOk} onChange={setFloorOk} dark={dark} primary={primary}
        />
      </div>

      {/* 4 Fadiga */}
      <div style={block()}>
        <BlockHeader num={4} icon="🔋" label={tr('detailedCheckin.blocks.fatigue')} dark={dark}/>
        <SliderRow label="perceived fatigue" value={fatigue} min={1} max={10} onChange={setFatigue} dark={dark} primary={primary}/>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          {fatigueTypes.map(f => (
            <ChipBtn key={f.value} label={f.label} selected={fatigueType === f.value}
              onClick={() => setFatigueType(f.value)} dark={dark} primary={primary}/>
          ))}
        </div>
      </div>

      {/* 5 Emocional */}
      <div style={block()}>
        <BlockHeader num={5} icon="🧠" label={tr('detailedCheckin.blocks.emotional')} dark={dark}/>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {emotions.map(em => (
            <ChipBtn key={em.value} label={em.label} selected={emotion === em.value}
              onClick={() => setEmotion(em.value)} dark={dark} primary={primary}/>
          ))}
        </div>
      </div>

      {/* 6 Tempo */}
      <div style={block()}>
        <BlockHeader num={6} icon="⏱️" label={tr('detailedCheckin.blocks.time')} dark={dark}/>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TIME_PRESETS.map(t => (
            <button key={t} onClick={() => setMinutes(t)} style={btnBase(minutes === t)}>
              {t} min
            </button>
          ))}
        </div>
      </div>

      {/* 7 Local */}
      <div style={block()}>
        <BlockHeader num={7} icon="📍" label={tr('detailedCheckin.blocks.location')} dark={dark}/>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {locations.map(l => (
            <ChipBtn key={l.value} label={l.label} selected={location === l.value}
              onClick={() => setLocation(l.value)} dark={dark} primary={primary}/>
          ))}
        </div>
      </div>

      {/* 8 Equipamento */}
      <div style={block()}>
        <BlockHeader num={8} icon="🏋️" label={tr('detailedCheckin.blocks.equipment')} dark={dark}/>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {equipment_.map(e => (
            <ChipBtn key={e.value} label={e.label} selected={equipment.includes(e.value)}
              onClick={() => toggleEquip(e.value)} dark={dark} primary={primary}/>
          ))}
        </div>
      </div>

      {/* 9 Capacidade funcional */}
      <div style={block()}>
        <BlockHeader num={9} icon="🤸" label={tr('detailedCheckin.blocks.capacity')} dark={dark}/>
        <SliderRow label="mobility perception" value={energy} min={1} max={10} onChange={setEnergy} dark={dark} primary={primary}/>
      </div>

      {/* 10 Sinais de alerta */}
      <div style={block({ borderColor: signals.length > 0 ? `${accent}55` : undefined })}>
        <BlockHeader num={10} icon="⚠️" label={tr('detailedCheckin.blocks.signals')} dark={dark}/>
        <p style={{ fontSize: 11, color: textMute(dark), lineHeight: 1.45, margin: '0 0 10px' }}>
          {tr('detailedCheckin.signalsNote')}
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {safetySignals.map(s => (
            <ChipBtn key={s.value} label={s.label} selected={signals.includes(s.value)}
              onClick={() => toggleSignal(s.value)} dark={dark} primary={accent}/>
          ))}
        </div>
      </div>

      {/* 11 Body Rhythm */}
      <div style={block()}>
        <BlockHeader num={11} icon="🌙" label={tr('detailedCheckin.blocks.rhythm')} dark={dark}/>
        <ToggleRow
          label={tr('detailedCheckin.rhythmNote')}
          sub={tr('detailedCheckin.rhythmPrivacy')}
          on={bodyRhythm} onChange={setBodyRhythm} dark={dark} primary={primary}
        />
      </div>

      {/* 12 Adaptacao */}
      <div style={block()}>
        <BlockHeader num={12} icon="🔄" label={tr('detailedCheckin.blocks.adaptation')} dark={dark}/>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {adaptations.map(a => (
            <ChipBtn key={a.value} label={a.label} selected={adaptation === a.value}
              onClick={() => setAdaptation(a.value)} dark={dark} primary={primary}/>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        <button onClick={handleSubmit} style={{ ...primaryBtn(primary), marginBottom: 0 }}>
          Calculate readiness →
        </button>
        <button onClick={onBack} style={{ ...outlineBtn(primary), padding: '15px 20px' }}>
          ← Back
        </button>
      </div>
    </div>
  );
}
