import React from 'react';
import { Icon } from '../../components/Icon';
import { ScreenTitle } from '../../components/ScreenTitle';
import { SectionLabel } from '../../components/SectionLabel';
import { surfRaised, borderSubtle, textPri, textSec, textMute } from '../../theme';
import type { NavFn } from '../../types';

interface Theme {
  primary:     string;
  primarySoft: string;
  accent:      string;
}

interface CycleConfig {
  length?:          number;
  lastStartOffset?: number;
  periodLength?:    number;
}

interface CycleScreenProps {
  nav:              NavFn;
  t:                Theme;
  dark:             boolean;
  cycleConfig:      CycleConfig;
  cycleEnabled?:    boolean;
  setCycleConfig?:  (cfg: CycleConfig) => void;
  saveCycleConfig?: (data: { cycleLength: number; periodLength: number; lastStartDate: string }) => Promise<{ error: unknown }>;
}

export interface Phase {
  name:  string;
  range: [number, number];
  color: string;
}

export function computeCyclePhases(cycleLen: number, palette: Theme): Phase[] {
  const mEnd = Math.max(2, Math.round(cycleLen * 5 / 28));
  const fEnd = Math.max(mEnd + 1, Math.round(cycleLen * 13 / 28));
  const oEnd = Math.max(fEnd + 1, Math.round(cycleLen * 16 / 28));
  return [
    { name: 'Menstrual',  range: [1,        mEnd],     color: palette.accent      },
    { name: 'Follicular', range: [mEnd + 1, fEnd],     color: palette.primary     },
    { name: 'Ovulation',  range: [fEnd + 1, oEnd],     color: palette.primarySoft },
    { name: 'Luteal',     range: [oEnd + 1, cycleLen], color: '#A78BFA'           },
  ];
}


export function CycleScreen({
  nav, t, dark, cycleConfig, cycleEnabled, setCycleConfig, saveCycleConfig,
}: CycleScreenProps) {
  if (cycleEnabled === false) {
    return (
      <>
        <ScreenTitle dark={dark}>Cycle</ScreenTitle>
        <div style={{ padding: '40px 22px', textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20, margin: '0 auto 16px',
            background: dark ? '#1A2A40' : '#eef1f6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28,
          }}>
            🌙
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: textPri(dark), marginBottom: 8 }}>
            Cycle tracking is disabled
          </div>
          <p style={{ fontSize: 13, color: textSec(dark), lineHeight: 1.55, maxWidth: 280, margin: '0 auto 16px' }}>
            Enable cycle tracking in Settings to adapt your workout intensity based on your current phase.
          </p>
          <button onClick={() => nav('settings')} style={{
            padding: '11px 24px', borderRadius: 999, border: 'none',
            background: t.primary, color: '#0E1A2B',
            fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
            Go to Settings
          </button>
        </div>
      </>
    );
  }

  const cfg = cycleConfig || { length: 28 };
  const cycleLen = cfg.length || 28;

  // Day is user-controlled. Default sensibly: derive from offset if given, else mid-follicular.
  const initialDay = Math.min(cycleLen, Math.max(1, (cfg.lastStartOffset || 11) + 1));
  const [day, setDay] = React.useState(initialDay);
  const [editing, setEditing] = React.useState(false);
  const [draftDay, setDraftDay] = React.useState(initialDay);
  const [draftLen, setDraftLen] = React.useState(cycleLen);

  // Keep day in range if cycle length changes from outside
  React.useEffect(() => {
    if (day > cycleLen) setDay(cycleLen);
  }, [cycleLen]);

  const phases = computeCyclePhases(cycleLen, t);
  const draftPhases = computeCyclePhases(draftLen, t);
  const phaseOf = (d: number, ps: Phase[]): Phase => ps.find(p => d >= p.range[0] && d <= p.range[1]) || ps[0]!;
  const currentPhase = phaseOf(day, phases);
  const phase = currentPhase.name;
  const c = currentPhase.color;
  const R = 110, stroke = 14;
  const C = 2 * Math.PI * R;
  const seg = (start: number, end: number) => {
    const len = ((end - start + 1) / cycleLen) * C;
    const offset = ((start - 1) / cycleLen) * C;
    return { dasharray: `${len} ${C - len}`, dashoffset: -offset };
  };
  const dotAngle = ((day - 1) / cycleLen) * 360 - 90;
  const dotRad = dotAngle * Math.PI / 180;
  const dotX = 130 + R * Math.cos(dotRad);
  const dotY = 130 + R * Math.sin(dotRad);

  // Drag-to-set on the ring
  const svgRef = React.useRef<SVGSVGElement>(null);
  const dragRef = React.useRef(false);
  const angleToDay = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return day;
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    // angle from top (12 o'clock), clockwise
    let theta = Math.atan2(dx, -dy);
    if (theta < 0) theta += Math.PI * 2;
    const frac = theta / (Math.PI * 2);
    return Math.min(cycleLen, Math.max(1, Math.round(frac * cycleLen) + 1));
  };
  const handlePointer = (clientX: number, clientY: number) => {
    setDay(angleToDay(clientX, clientY));
  };
  const onDown = (e: React.PointerEvent<SVGSVGElement>) => {
    dragRef.current = true;
    handlePointer(e.clientX, e.clientY);
  };
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (dragRef.current) handlePointer(e.clientX, e.clientY);
  };
  const onUp = () => { dragRef.current = false; };

  const lastPeriodDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - (day - 1));
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  })();

  return (
    <>
      <ScreenTitle dark={dark} sub="Tap or drag the dial — your plan adapts to your current phase.">Cycle</ScreenTitle>

      <div style={{ padding: '0 22px 8px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: 260, height: 260 }}>
          <svg
            ref={svgRef}
            width="260" height="260" viewBox="0 0 260 260"
            style={{ touchAction: 'none', cursor: 'pointer' }}
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); onDown(e); }}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            <circle cx="130" cy="130" r={R} fill="none" stroke={dark ? '#162437' : '#F0F3F8'} strokeWidth={stroke}/>
            {phases.map(p => {
              const s = seg(p.range[0], p.range[1]);
              return (
                <circle key={p.name} cx="130" cy="130" r={R} fill="none"
                  stroke={p.color} strokeWidth={stroke}
                  strokeDasharray={s.dasharray} strokeDashoffset={s.dashoffset}
                  transform="rotate(-90 130 130)"/>
              );
            })}
            {/* invisible larger hit ring */}
            <circle cx="130" cy="130" r={R} fill="none" stroke="transparent" strokeWidth={36}/>
            <circle cx={dotX} cy={dotY} r="11" fill={dark ? '#0E1A2B' : '#fff'} stroke={c} strokeWidth="3"/>
            <circle cx={dotX} cy={dotY} r="4" fill={c}/>
          </svg>

          {/* Tappable center to open the day editor */}
          <button
            onClick={() => { setDraftDay(day); setDraftLen(cycleLen); setEditing(true); }}
            aria-label="Edit current cycle day"
            style={{
              position: 'absolute', left: '50%', top: '50%',
              transform: 'translate(-50%,-50%)',
              width: 150, height: 150, borderRadius: '50%',
              border: 'none', background: 'transparent',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', textAlign: 'center',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: textMute(dark), letterSpacing: '.1em', textTransform: 'uppercase' }}>Day</div>
            <div style={{ fontSize: 56, fontWeight: 700, color: textPri(dark), fontFamily: '"Plus Jakarta Sans",sans-serif', lineHeight: 1, letterSpacing: '-0.03em' }}>{day}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: c, marginTop: 6 }}>{phase}</div>
            <div style={{
              marginTop: 6, fontSize: 9.5, fontWeight: 700, letterSpacing: '.08em',
              color: textMute(dark), textTransform: 'uppercase',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              <Icon name="edit" size={10} color={textMute(dark)} stroke={2.2}/> tap to set
            </div>
          </button>
        </div>
      </div>

      <div style={{ padding: '0 22px 4px', textAlign: 'center', fontSize: 11.5, color: textSec(dark) }}>
        Last period started <b style={{ color: textPri(dark) }}>{lastPeriodDate}</b> &middot; cycle <b style={{ color: textPri(dark) }}>{cycleLen} days</b>
      </div>

      <div style={{ padding: '12px 22px 8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {phases.map(p => (
          <div key={p.name} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px', borderRadius: 10,
            background: surfRaised(dark),
            border: `1px solid ${p.name === phase ? p.color : borderSubtle(dark)}`,
          }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: p.color }}/>
            <div style={{ fontSize: 12, fontWeight: 600, color: textPri(dark) }}>{p.name}</div>
            <div style={{ fontSize: 11, color: textMute(dark), marginLeft: 'auto' }}>{p.range[0]}–{p.range[1]}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '14px 22px 0' }}>
        <SectionLabel dark={dark}>Today&rsquo;s recommendation</SectionLabel>
        <div style={{
          padding: '14px 16px', borderRadius: 14,
          background: dark ? 'rgba(45,212,224,.08)' : `${t.primary}10`,
          border: `1px solid ${t.primary}55`,
        }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Icon name="sparkle" size={16} color={t.primary} stroke={2.3}/>
            <div style={{ fontSize: 12.5, color: textSec(dark), lineHeight: 1.55 }}>
              You&rsquo;re in <b style={{ color: c }}>{phase.toLowerCase()} phase</b>.{' '}
              {phase === 'Menstrual' && <>Energy may be low — we&rsquo;ll keep volume light with mobility &amp; easy zone-2.</>}
              {phase === 'Follicular' && <>Estrogen is rising — your <b style={{ color: textPri(dark) }}>peak window</b> for strength gains and high-intensity work.</>}
              {phase === 'Ovulation' && <>Peak performance window — push power and heavy lifts.</>}
              {phase === 'Luteal' && <>Recovery phase — moderate volume, more rest between sets.</>}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 22px 28px', display: 'flex', gap: 10 }}>
        <button onClick={() => setDay(1)} style={{
          flex: 1, padding: '12px', borderRadius: 999, border: `1.5px solid ${t.accent}`,
          background: 'transparent', color: t.accent, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>Period started today</button>
        <button onClick={() => { setDraftDay(day); setDraftLen(cycleLen); setEditing(true); }} style={{
          flex: 1, padding: '12px', borderRadius: 999, border: `1.5px solid ${t.primary}`,
          background: t.primary, color: '#0E1A2B', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>Set current day</button>
      </div>

      {/* Day editor sheet */}
      {editing && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 30,
          background: 'rgba(5,8,15,.6)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }} onClick={() => setEditing(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', background: surfRaised(dark),
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: '18px 22px 24px',
            boxShadow: '0 -20px 60px rgba(0,0,0,.4)',
          }}>
            <div style={{
              width: 40, height: 4, borderRadius: 2,
              background: dark ? '#2a3a52' : '#D7DEE7',
              margin: '0 auto 14px',
            }}/>
            <div style={{ fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 18, fontWeight: 700, color: textPri(dark), marginBottom: 2 }}>
              Set current cycle day
            </div>
            <div style={{ fontSize: 12, color: textSec(dark), marginBottom: 14 }}>
              Where are you in your cycle right now?
            </div>

            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div style={{
                fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 64, fontWeight: 700,
                color: t.primary, letterSpacing: '-0.03em', lineHeight: 1,
              }}>{draftDay}<span style={{ fontSize: 18, color: textMute(dark), marginLeft: 6 }}>/ {draftLen}</span></div>
              <div style={{ fontSize: 12, fontWeight: 600, color: phaseOf(draftDay, draftPhases).color, marginTop: 4 }}>
                {phaseOf(draftDay, draftPhases).name} phase
              </div>
            </div>

            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 6 }}>
              Day in cycle
            </div>
            <input
              type="range" min="1" max={draftLen} value={Math.min(draftDay, draftLen)}
              onChange={e => setDraftDay(+e.target.value)}
              style={{ width: '100%', accentColor: t.primary }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: textMute(dark), marginTop: 4 }}>
              <span>Day 1</span><span>Day {draftLen}</span>
            </div>

            <div style={{
              marginTop: 14, paddingTop: 14, borderTop: `1px dashed ${borderSubtle(dark)}`,
            }}>
              <div style={{
                display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6,
              }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: textMute(dark) }}>
                  Cycle length
                </div>
                <div style={{
                  fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 18, fontWeight: 700,
                  color: t.primary, lineHeight: 1,
                }}>{draftLen}<span style={{ fontSize: 11, color: textMute(dark), marginLeft: 4, fontWeight: 600 }}>days</span></div>
              </div>
              <input
                type="range" min="21" max="35" value={draftLen}
                onChange={e => {
                  const v = +e.target.value;
                  setDraftLen(v);
                  if (draftDay > v) setDraftDay(v);
                }}
                style={{ width: '100%', accentColor: t.primary }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: textMute(dark), marginTop: 2 }}>
                <span>21d</span><span>28d</span><span>35d</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={() => setEditing(false)} style={{
                flex: 1, padding: '13px', borderRadius: 999,
                border: `1.5px solid ${borderSubtle(dark)}`,
                background: 'transparent', color: textPri(dark),
                fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={() => {
                const newDay = Math.min(draftDay, draftLen);
                setDay(newDay);
                const newConfig: CycleConfig = {
                  ...(cycleConfig || {}),
                  length: draftLen,
                  lastStartOffset: newDay - 1,
                };
                if (setCycleConfig) setCycleConfig(newConfig);
                if (saveCycleConfig) {
                  const today = new Date();
                  const lastStartDate = new Date(today.getTime() - (newDay - 1) * 86_400_000)
                    .toISOString().split('T')[0]!;
                  saveCycleConfig({
                    cycleLength: draftLen,
                    periodLength: newConfig.periodLength || 5,
                    lastStartDate,
                  });
                }
                setEditing(false);
              }} style={{
                flex: 1, padding: '13px', borderRadius: 14, border: 'none',
                background: t.primary, color: '#0E1A2B',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
