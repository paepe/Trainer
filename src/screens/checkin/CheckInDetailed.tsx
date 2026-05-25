import React from 'react';
import { textPri, textSec, textMute, surfRaised, borderSubtle } from '../../theme';
import type {
  CheckInDetailed as CheckInDetailedData,
  SleepQualityV2, PainRegion, FatigueType,
  EmotionalState, SafetySignal, AdaptationPreference,
} from '../../types/checkin-v2';

interface CheckInDetailedProps {
  dark:     boolean;
  primary:  string;
  accent:   string;
  onSubmit: (data: CheckInDetailedData) => void;
  onBack:   () => void;
}

// ── Local config ──────────────────────────────────────────────────────────────

const SLEEP_OPTIONS: { value: SleepQualityV2; label: string }[] = [
  { value: 'poor', label: 'Ruim' }, { value: 'regular', label: 'Regular' },
  { value: 'good', label: 'Bom'  }, { value: 'excellent', label: 'Ótimo'  },
];

const PAIN_REGIONS: { value: PainRegion; label: string }[] = [
  { value: 'cervical', label: 'Cervical' }, { value: 'shoulder', label: 'Ombro'    },
  { value: 'lumbar',   label: 'Lombar'   }, { value: 'hip',      label: 'Quadril'  },
  { value: 'knee',     label: 'Joelho'   }, { value: 'ankle',    label: 'Tornozelo'},
  { value: 'wrist',    label: 'Punho'    }, { value: 'elbow',    label: 'Cotovelo' },
  { value: 'other',    label: 'Outro'    },
];

const FATIGUE_TYPES: { value: FatigueType; label: string }[] = [
  { value: 'physical', label: 'Físico' },
  { value: 'mental',   label: 'Mental' },
  { value: 'both',     label: 'Os dois'},
];

const EMOTIONS: { value: EmotionalState; label: string }[] = [
  { value: 'calm',        label: 'tranquila'  }, { value: 'neutral',     label: 'neutra'     },
  { value: 'motivated',   label: 'motivada'   }, { value: 'stressed',    label: 'estressada' },
  { value: 'anxious',     label: 'ansiosa'    }, { value: 'discouraged', label: 'desanimada' },
];

const TIME_PRESETS = [15, 30, 45, 60, 90];

const LOCATIONS: { value: string; label: string }[] = [
  { value: 'home',   label: 'Casa'     }, { value: 'gym',    label: 'Academia' },
  { value: 'studio', label: 'Studio'   }, { value: 'park',   label: 'Parque'   },
  { value: 'online', label: 'Online'   },
];

const EQUIPMENT: { value: string; label: string }[] = [
  { value: 'dumbbells',       label: 'Halteres'  }, { value: 'resistance_bands', label: 'Elásticos'  },
  { value: 'barbell',         label: 'Barra'     }, { value: 'bench',            label: 'Banco'      },
  { value: 'machines',        label: 'Máquinas'  }, { value: 'treadmill',        label: 'Esteira'    },
  { value: 'kettlebell',      label: 'Kettlebell'}, { value: 'none',             label: 'Nenhum'     },
];

const SAFETY_SIGNALS: { value: SafetySignal; label: string }[] = [
  { value: 'severe_pain',         label: 'Dor forte'          },
  { value: 'dizziness',           label: 'Tontura'            },
  { value: 'shortness_of_breath', label: 'Falta de ar'        },
  { value: 'chest_pain',          label: 'Dor no peito'       },
  { value: 'malaise',             label: 'Mal-estar'          },
  { value: 'loss_of_balance',     label: 'Perda de equilíbrio'},
  { value: 'fainting_sensation',  label: 'Sensação de desmaio'},
];

const ADAPTATIONS: { value: AdaptationPreference; label: string }[] = [
  { value: 'maintain_normal',    label: 'Manter normal'       },
  { value: 'reduce_intensity',   label: 'Reduzir intensidade' },
  { value: 'reduce_impact',      label: 'Reduzir impacto'     },
  { value: 'increase_rest',      label: 'Aumentar descanso'   },
  { value: 'shorten_session',    label: 'Encurtar sessão'      },
  { value: 'prioritize_mobility',label: 'Mobilidade'          },
  { value: 'postpone_training',  label: 'Adiar treino'        },
  { value: 'regenerative',       label: 'Regenerativo'        },
];

// ── Sub-components ────────────────────────────────────────────────────────────

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

// ── Main component ────────────────────────────────────────────────────────────

export function CheckInDetailed({ dark, primary, accent, onSubmit, onBack }: CheckInDetailedProps) {
  const [energy, setEnergy]                     = React.useState(5);
  const [sleep, setSleep]                       = React.useState<SleepQualityV2>('regular');
  const [sleepHours, setSleepHours]             = React.useState(7);
  const [painOn, setPainOn]                     = React.useState(false);
  const [painRegion, setPainRegion]             = React.useState<PainRegion | undefined>(undefined);
  const [painIntensity, setPainIntensity]       = React.useState(4);
  const [movementTrigger, setMovementTrigger]   = React.useState('');
  const [fatigue, setFatigue]                   = React.useState(3);
  const [fatigueType, setFatigueType]           = React.useState<FatigueType | undefined>(undefined);
  const [emotion, setEmotion]                   = React.useState<EmotionalState | undefined>(undefined);
  const [minutes, setMinutes]                   = React.useState(45);
  const [location, setLocation]                 = React.useState<string | undefined>(undefined);
  const [equipment, setEquipment]               = React.useState<string[]>([]);
  const [floorOk, setFloorOk]                   = React.useState(true);
  const [signals, setSignals]                   = React.useState<SafetySignal[]>([]);
  const [bodyRhythm, setBodyRhythm]             = React.useState(false);
  const [adaptation, setAdaptation]             = React.useState<AdaptationPreference | undefined>(undefined);

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
    padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
    fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
    background: active ? primary : surfRaised(dark),
    border: `1.5px solid ${active ? primary : borderSubtle(dark)}`,
    color: active ? '#0E1A2B' : textPri(dark),
    transition: 'background .15s',
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

      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: primary, marginBottom: 8 }}>
        CHECK-IN DETALHADO · 12 BLOCOS
      </div>
      <h2 style={{
        margin: '0 0 4px', fontFamily: '"Plus Jakarta Sans",sans-serif',
        fontSize: 24, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em',
      }}>
        Contexto completo do dia
      </h2>
      <p style={{ fontSize: 12, color: textSec(dark), margin: '0 0 20px', lineHeight: 1.5 }}>
        Para maior precisão. Pula campos que não se aplicam.
      </p>

      {/* 1 Energia */}
      <div style={block()}>
        <BlockHeader num={1} icon="⚡" label="Energia" dark={dark}/>
        <SliderRow label="como você está se sentindo?" value={energy} min={1} max={10} onChange={setEnergy} dark={dark} primary={primary}/>
      </div>

      {/* 2 Sono */}
      <div style={block()}>
        <BlockHeader num={2} icon="🌙" label="Sono" dark={dark}/>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {SLEEP_OPTIONS.map(o => (
            <button key={o.value} onClick={() => setSleep(o.value)} style={btnBase(sleep === o.value)}>
              {o.label}
            </button>
          ))}
        </div>
        <SliderRow label="horas dormidas" value={sleepHours} min={2} max={12} unit="h" onChange={setSleepHours} dark={dark} primary={primary}/>
      </div>

      {/* 3 Dor */}
      <div style={block()}>
        <BlockHeader num={3} icon="🔴" label="Dor" dark={dark}/>
        <ToggleRow
          label="Estou com dor hoje"
          sub={painOn ? 'Toque para detalhar região e intensidade' : undefined}
          on={painOn}
          onChange={v => { setPainOn(v); if (!v) { setPainRegion(undefined); } }}
          dark={dark} primary={primary}
        />
        {painOn && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {PAIN_REGIONS.map(r => (
                <ChipBtn key={r.value} label={r.label} selected={painRegion === r.value}
                  onClick={() => setPainRegion(r.value)} dark={dark} primary={primary}/>
              ))}
            </div>
            <SliderRow label="Intensidade" value={painIntensity} min={0} max={10} onChange={setPainIntensity} dark={dark} primary={accent}/>
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 6 }}>
                MOVIMENTO GATILHO
              </div>
              <input
                type="text"
                value={movementTrigger}
                onChange={e => setMovementTrigger(e.target.value)}
                placeholder="ex.: agachar, levantar peso"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8, boxSizing: 'border-box',
                  background: dark ? '#0E1A2B' : '#F4F6FA',
                  border: `1px solid ${borderSubtle(dark)}`,
                  color: textPri(dark), fontFamily: 'inherit', fontSize: 13, outline: 'none',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 4 Fadiga */}
      <div style={block()}>
        <BlockHeader num={4} icon="🔋" label="Fadiga" dark={dark}/>
        <SliderRow label="cansaço percebido" value={fatigue} min={1} max={10} onChange={setFatigue} dark={dark} primary={primary}/>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {FATIGUE_TYPES.map(o => (
            <button key={o.value} onClick={() => setFatigueType(o.value)} style={btnBase(fatigueType === o.value)}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5 Estado emocional */}
      <div style={block()}>
        <BlockHeader num={5} icon="🧠" label="Estado emocional" dark={dark}/>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {EMOTIONS.map(o => (
            <ChipBtn key={o.value} label={o.label} selected={emotion === o.value}
              onClick={() => setEmotion(o.value)} dark={dark} primary={primary}/>
          ))}
        </div>
      </div>

      {/* 6 Tempo */}
      <div style={block()}>
        <BlockHeader num={6} icon="⏱️" label="Tempo" dark={dark}/>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TIME_PRESETS.map(t => (
            <button key={t} onClick={() => setMinutes(t)} style={btnBase(minutes === t)}>
              {t} min
            </button>
          ))}
        </div>
      </div>

      {/* 7 Local de hoje */}
      <div style={block()}>
        <BlockHeader num={7} icon="📍" label="Local de hoje" dark={dark}/>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {LOCATIONS.map(o => (
            <button key={o.value} onClick={() => setLocation(o.value)} style={btnBase(location === o.value)}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* 8 Equipamentos */}
      <div style={block()}>
        <BlockHeader num={8} icon="🏋️" label="Equipamentos disponíveis hoje" dark={dark}/>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {EQUIPMENT.map(o => (
            <ChipBtn key={o.value} label={o.label} selected={equipment.includes(o.value)}
              onClick={() => toggleEquip(o.value)} dark={dark} primary={primary}/>
          ))}
        </div>
      </div>

      {/* 9 Capacidade funcional */}
      <div style={block()}>
        <BlockHeader num={9} icon="✅" label="Capacidade funcional do dia" dark={dark}/>
        <ToggleRow
          label="Posso fazer exercícios de solo hoje"
          sub="Esta informação ajuda a filtrar exercícios adequados."
          on={floorOk}
          onChange={setFloorOk}
          dark={dark} primary={primary}
        />
      </div>

      {/* 10 Sinais de alerta */}
      <div style={block({ border: `1px solid ${signals.length > 0 ? `${accent}55` : borderSubtle(dark)}` })}>
        <BlockHeader num={10} icon="⚠️" label="Sinais de alerta" dark={dark}/>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: signals.length > 0 ? 12 : 0 }}>
          {SAFETY_SIGNALS.map(s => (
            <button key={s.value} onClick={() => toggleSignal(s.value)} style={{
              padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 12, fontWeight: 600,
              background: signals.includes(s.value) ? `${accent}20` : surfRaised(dark),
              border: `1.5px solid ${signals.includes(s.value) ? accent : borderSubtle(dark)}`,
              color: signals.includes(s.value) ? accent : textPri(dark),
            }}>
              {s.label}
            </button>
          ))}
        </div>
        {signals.length > 0 && (
          <div style={{
            padding: '10px 12px', borderRadius: 8,
            background: `${accent}14`, border: `1px solid ${accent}44`,
            fontSize: 11.5, color: accent, lineHeight: 1.45,
          }}>
            Sinais relatados acionam o Safety Gate: <strong>AI-led será bloqueado</strong> e revisão humana será exigida.
          </div>
        )}
      </div>

      {/* 11 Ritmo do Corpo */}
      <div style={block({ background: `${primary}08`, border: `1px solid ${primary}22` })}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <BlockHeader num={11} icon="🌊" label="Ritmo do Corpo" dark={dark}/>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '.06em',
            background: `${primary}22`, color: primary,
            padding: '2px 6px', borderRadius: 4, marginTop: 2,
          }}>
            OPT-IN
          </span>
        </div>
        <ToggleRow
          label="Quero versão mais confortável hoje"
          sub="Adaptação privada. Nunca exibimos fase do ciclo ou sintomas."
          on={bodyRhythm}
          onChange={setBodyRhythm}
          dark={dark} primary={primary}
        />
      </div>

      {/* 12 Preferência de adaptação */}
      <div style={block()}>
        <BlockHeader num={12} icon="🎯" label="Preferência de adaptação" dark={dark}/>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {ADAPTATIONS.map(a => (
            <ChipBtn key={a.value} label={a.label} selected={adaptation === a.value}
              onClick={() => setAdaptation(adaptation === a.value ? undefined : a.value)}
              dark={dark} primary={primary}/>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, color: primary, fontFamily: 'inherit', fontWeight: 600, padding: 0,
        }}>
          ← voltar
        </button>
        <button onClick={handleSubmit} style={{
          flex: 1, padding: '16px', borderRadius: 999,
          background: primary, border: 'none', color: '#0E1A2B',
          fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
          boxShadow: `0 6px 20px ${primary}44`,
        }}>
          Calcular Safety Gate →
        </button>
      </div>
    </div>
  );
}
