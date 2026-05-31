// coach-atoms.jsx — shared atoms for "Coach DNA · Perfil do Personal Trainer"
// Mirrors the visual system of Módulo 01 (perfil) so the two profiles feel like one product.

// ─────────── BRAND TOKENS ───────────
const B = {
  navy: '#0E1A2B',
  navyDeep: '#08111E',
  surfRaised: '#142233',
  surfRaised2: '#1A2A40',
  border: '#1F2E45',
  borderSoft: '#243650',
  cyan: '#2DD4E0',
  cyanDeep: '#0F8C85',
  cyanSoft: '#9DECF3',
  coral: '#EF5B3C',
  lavender: '#A78BFA',
  amber: '#F5B45A',
  text: '#FFFFFF',
  textSec: 'rgba(255,255,255,.65)',
  textMute: 'rgba(255,255,255,.4)',
  green: '#4ADE80',
};

const FF_DISPLAY = '"Plus Jakarta Sans","Inter",system-ui,sans-serif';
const FF_MONO = '"JetBrains Mono",ui-monospace,SFMono-Regular,monospace';

// ─────────── ICON ATOM ───────────
const ICONS = {
  back: 'M15 6l-6 6 6 6',
  check: 'M5 12l5 5 9-11',
  x: 'M6 6l12 12M18 6L6 18',
  chevron: 'M9 6l6 6-6 6',
  chevronDown: 'M6 9l6 6 6-6',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c.6-4 4-7 8-7s7.4 3 8 7',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c.5-3.5 3.4-6 7-6s6.5 2.5 7 6M16 3.5a4 4 0 0 1 0 7.7M22 21c-.3-2.2-1.7-4-3.8-5',
  camera: 'M3 8h3l2-2h8l2 2h3v12H3zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  medal: 'M8 3l4 7 4-7M7 15a5 5 0 1 0 10 0 5 5 0 0 0-10 0zM12 13v4',
  dumbbell: 'M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12',
  flame: 'M12 3c1 3-2 4-2 7a2 2 0 0 0 4 0c2 2 2 4 2 5a4 4 0 0 1-8 0c0-4 4-5 4-12z',
  run: 'M13 4a2 2 0 1 0 0-.001M6 21l3-5 2-3 4 2 1 6M11 13l-2-4 5-2 3 3 3-1',
  gauge: 'M12 13l4-4M12 21a9 9 0 1 1 0-18 9 9 0 0 1 9 9',
  percent: 'M19 5L5 19M7.5 6.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM19.5 17.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z',
  layers: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5',
  grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  target: 'M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0M12 12m-4 0a4 4 0 1 0 8 0 4 4 0 1 0-8 0M12 12v0',
  activity: 'M3 12h4l3-9 4 18 3-9h4',
  heart: 'M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.5-7 10-7 10z',
  zap: 'M13 2L4 14h7l-1 8 9-12h-7l1-8z',
  sparkles: 'M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5zM19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z',
  quote: 'M7 7H4a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h2v2a2 2 0 0 1-2 2M17 7h-3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h2v2a2 2 0 0 1-2 2',
  compass: 'M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0M15.5 8.5l-2 5-5 2 2-5z',
  shield: 'M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z',
  shieldCheck: 'M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3zM9 12l2 2 4-4',
  brain: 'M12 4a4 4 0 0 0-4 4v1a3 3 0 0 0-3 3 3 3 0 0 0 3 3v1a4 4 0 0 0 4 4 4 4 0 0 0 4-4v-1a3 3 0 0 0 3-3 3 3 0 0 0-3-3V8a4 4 0 0 0-4-4z',
  mic: 'M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  clock: 'M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0M12 7v5l3 2',
  fingerprint: 'M12 11a2 2 0 0 0-2 2c0 3-1 5-1 5M12 7a6 6 0 0 0-6 6v1M12 4a9 9 0 0 0-9 9M18 13a6 6 0 0 0-3-5.2M15 13c0 4 .5 6 .5 6M12 13v3',
  wave: 'M3 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0',
  ban: 'M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0M5.6 5.6l12.8 12.8',
  mountain: 'M3 20l6-12 4 7 2-3 6 8z',
  trophy: 'M8 4h8v4a4 4 0 0 1-8 0V4zM8 6H5v2a3 3 0 0 0 3 3M16 6h3v2a3 3 0 0 1-3 3M9 16h6M10 16v-3M14 16v-3M8 20h8',
};

function Icon({ name, size = 18, color = 'currentColor', stroke = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
      <path d={ICONS[name] || ''}/>
    </svg>
  );
}

// ─────────── PILL / CHIP ───────────
function Chip({ active, onClick, children, color = B.cyan, multi = false, locked = false, mono = false }) {
  return (
    <button onClick={onClick} disabled={locked} style={{
      padding: '9px 14px', borderRadius: 999,
      background: active ? `${color}22` : 'transparent',
      color: active ? color : B.text,
      border: `1.5px solid ${active ? color : B.border}`,
      fontFamily: mono ? FF_MONO : 'inherit',
      fontSize: 12.5, fontWeight: 600,
      cursor: locked ? 'not-allowed' : 'pointer',
      opacity: locked ? 0.4 : 1,
      display: 'inline-flex', alignItems: 'center', gap: 6,
      transition: 'all .12s ease',
      letterSpacing: mono ? '0.02em' : 'normal',
    }}>
      {multi && active && <Icon name="check" size={12}/>}
      {children}
    </button>
  );
}

// ─────────── BIG CARD CHOICE ───────────
function ChoiceCard({ active, onClick, icon, title, sub, color = B.cyan }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: 14, borderRadius: 14,
      background: active ? `${color}14` : B.surfRaised,
      border: `1.5px solid ${active ? color : B.border}`,
      cursor: 'pointer', textAlign: 'left',
      display: 'flex', alignItems: 'center', gap: 12,
      transition: 'all .12s ease',
      color: B.text, fontFamily: 'inherit',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: active ? `${color}22` : B.navy,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: active ? color : B.textSec, flexShrink: 0,
      }}>
        {typeof icon === 'string' ? <Icon name={icon} size={18}/> : icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14.5, fontFamily: FF_DISPLAY }}>{title}</div>
        {sub && <div style={{ fontSize: 11.5, color: B.textSec, marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{
        width: 18, height: 18, borderRadius: '50%',
        border: `1.5px solid ${active ? color : B.borderSoft}`,
        background: active ? color : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {active && <Icon name="check" size={12} color={B.navy} stroke={2.5}/>}
      </div>
    </button>
  );
}

// ─────────── TEXT INPUT ───────────
function Field({ label, value, onChange, placeholder, type = 'text', suffix, mono = false, helper, optional = false }) {
  return (
    <label style={{ display: 'block' }}>
      {label && <div style={{
        fontSize: 11.5, fontWeight: 600, color: B.textSec,
        textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {label}
        {optional && <span style={{ textTransform: 'none', color: B.textMute, fontWeight: 400, letterSpacing: 0 }}>· opcional</span>}
      </div>}
      <div style={{
        display: 'flex', alignItems: 'center',
        background: B.navy, border: `1.5px solid ${B.border}`,
        borderRadius: 12, padding: '0 14px',
      }}>
        <input
          type={type} value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: B.text, padding: '13px 0', fontSize: 14.5,
            fontFamily: mono ? FF_MONO : 'inherit',
          }}
        />
        {suffix && <span style={{ color: B.textSec, fontSize: 12.5, fontFamily: FF_MONO }}>{suffix}</span>}
      </div>
      {helper && <div style={{ fontSize: 11, color: B.textMute, marginTop: 6 }}>{helper}</div>}
    </label>
  );
}

// ─────────── TEXTAREA ───────────
function TextArea({ label, value, onChange, placeholder, helper, rows = 3, optional = false }) {
  return (
    <label style={{ display: 'block' }}>
      {label && <div style={{
        fontSize: 11.5, fontWeight: 600, color: B.textSec,
        textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {label}
        {optional && <span style={{ textTransform: 'none', color: B.textMute, fontWeight: 400, letterSpacing: 0 }}>· opcional</span>}
      </div>}
      <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        style={{
          width: '100%', background: B.navy, border: `1.5px solid ${B.border}`,
          borderRadius: 12, padding: '12px 14px', color: B.text, fontSize: 14,
          fontFamily: 'inherit', outline: 'none', resize: 'vertical', lineHeight: 1.5,
        }}/>
      {helper && <div style={{ fontSize: 11, color: B.textMute, marginTop: 6 }}>{helper}</div>}
    </label>
  );
}

// ─────────── INFO NOTE ───────────
function PrivacyNote({ children, tone = 'default' }) {
  const tones = {
    default: { bg: `${B.cyan}10`, border: `${B.cyan}40`, color: B.cyan, icon: 'sparkles' },
    coach: { bg: `${B.coral}10`, border: `${B.coral}40`, color: B.coral, icon: 'fingerprint' },
    optional: { bg: `${B.lavender}10`, border: `${B.lavender}40`, color: B.lavender, icon: 'brain' },
  };
  const c = tones[tone];
  return (
    <div style={{
      display: 'flex', gap: 10, padding: '10px 12px', marginTop: 14,
      background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10,
      fontSize: 11.5, lineHeight: 1.45, color: B.text,
    }}>
      <Icon name={c.icon} size={14} color={c.color} stroke={2}/>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

// ─────────── MICROCOPY HINT ───────────
function Hint({ children }) {
  return (
    <div style={{
      fontSize: 12.5, color: B.textSec, lineHeight: 1.5, marginBottom: 18,
      fontStyle: 'italic',
    }}>“{children}”</div>
  );
}

// ─────────── SECTION HEADER (inside step) ───────────
function StepHeader({ idx, total, title, sub, badge }) {
  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 10.5, fontWeight: 700, color: B.cyan,
        letterSpacing: '.15em', textTransform: 'uppercase',
        fontFamily: FF_MONO, marginBottom: 8,
      }}>
        <span>BLOCO {String(idx).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
        {badge && (
          <span style={{
            padding: '2px 7px', borderRadius: 4,
            background: `${B.coral}22`, color: B.coral, letterSpacing: '.05em',
          }}>{badge}</span>
        )}
      </div>
      <h2 style={{
        margin: 0, fontFamily: FF_DISPLAY,
        fontSize: 24, lineHeight: 1.15, fontWeight: 700,
        letterSpacing: '-0.01em',
      }}>{title}</h2>
      {sub && <div style={{
        marginTop: 6, fontSize: 13, color: B.textSec, lineHeight: 1.5,
      }}>{sub}</div>}
    </>
  );
}

// ─────────── LABEL ───────────
function FieldLabel({ children, hint }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 600, color: B.textSec, marginBottom: 8 }}>
      {children}
      {hint && <span style={{ color: B.textMute, fontWeight: 400 }}> · {hint}</span>}
    </div>
  );
}

// ─────────── SLIDER ───────────
function Slider({ value, onChange, min, max, step = 1, label, suffix, color = B.cyan }) {
  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        fontSize: 12, color: B.textSec, marginBottom: 6,
      }}>
        <span>{label}</span>
        <span style={{ color: B.text, fontWeight: 700, fontFamily: FF_MONO, fontSize: 14 }}>
          {value}{suffix}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: color, cursor: 'pointer' }}/>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 10, color: B.textMute, fontFamily: FF_MONO,
      }}>
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );
}

// ─────────── TOGGLE ROW ───────────
function ToggleRow({ on, onChange, title, sub }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: '100%', padding: 14, borderRadius: 12,
      background: B.surfRaised, border: `1px solid ${on ? B.cyan : B.border}`,
      cursor: 'pointer', textAlign: 'left',
      display: 'flex', alignItems: 'center', gap: 12,
      color: B.text, fontFamily: 'inherit',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{title}</div>
        {sub && <div style={{ fontSize: 11.5, color: B.textSec, marginTop: 3, lineHeight: 1.4 }}>{sub}</div>}
      </div>
      <div style={{
        width: 38, height: 22, borderRadius: 999,
        background: on ? B.cyan : B.border,
        position: 'relative', flexShrink: 0, transition: 'background .15s',
      }}>
        <div style={{
          position: 'absolute', top: 2, left: on ? 18 : 2,
          width: 18, height: 18, borderRadius: '50%',
          background: B.navy, transition: 'left .15s',
        }}/>
      </div>
    </button>
  );
}

// ─────────── VOICE BAR ───────────
function VoiceBar({ active, onToggle, hint }) {
  return (
    <button onClick={onToggle} style={{
      width: '100%', padding: '12px 14px', borderRadius: 14,
      background: active ? `${B.coral}22` : B.navy,
      border: `1.5px dashed ${active ? B.coral : B.borderSoft}`,
      color: B.text, fontFamily: 'inherit', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 12,
      marginTop: 16, textAlign: 'left',
    }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {active && <div style={{
          position: 'absolute', inset: -4, borderRadius: '50%',
          border: `2px solid ${B.coral}`, animation: 'pulse-ring 1.6s ease-out infinite',
        }}/>}
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: active ? B.coral : `${B.cyan}22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="mic" size={15} color={active ? B.navy : B.cyan} stroke={2.2}/>
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700 }}>{active ? 'Gravando…' : 'Ditar para a IA'}</div>
        <div style={{ fontSize: 10.5, color: B.textMute, marginTop: 1 }}>
          {active ? 'Solte para confirmar. A IA estrutura sua fala em método.' : (hint || 'Entrada por voz disponível neste bloco')}
        </div>
      </div>
      {active && (
        <div style={{ display: 'flex', gap: 2, alignItems: 'center', height: 22 }}>
          {[0.6, 1, 0.7, 1.2, 0.8].map((dd, i) => (
            <div key={i} style={{
              width: 3, height: '100%', background: B.coral, borderRadius: 2,
              animation: `wave ${dd}s ease-in-out infinite`, animationDelay: `${i * 0.1}s`,
              transformOrigin: 'center',
            }}/>
          ))}
        </div>
      )}
    </button>
  );
}

// ─────────── PHOTO SLOT (avatar upload) ───────────
function PhotoSlot({ value, onChange, name }) {
  const inputRef = React.useRef(null);
  const pick = () => inputRef.current && inputRef.current.click();
  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) onChange(URL.createObjectURL(f));
  };
  const initials = (name || '').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '+';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <button onClick={pick} style={{
        width: 92, height: 92, borderRadius: 24, flexShrink: 0,
        background: value ? `center/cover no-repeat url(${value})` : B.navy,
        border: `1.5px dashed ${value ? 'transparent' : B.borderSoft}`,
        cursor: 'pointer', position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: B.cyan, fontFamily: FF_DISPLAY, fontWeight: 800, fontSize: 26,
      }}>
        {!value && (initials === '+'
          ? <Icon name="camera" size={26} color={B.textMute} stroke={1.8}/>
          : <span style={{ color: B.cyan }}>{initials}</span>)}
        {value && <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 0',
          background: 'rgba(8,17,30,.7)', fontSize: 9, color: B.cyanSoft,
          fontFamily: FF_MONO, letterSpacing: '.06em',
        }}>TROCAR</div>}
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, fontFamily: FF_DISPLAY }}>Foto profissional</div>
        <div style={{ fontSize: 11.5, color: B.textSec, marginTop: 3, lineHeight: 1.45 }}>
          É o rosto que os alunos veem ao receber treinos seus. Use foto nítida ou avatar.
        </div>
        <button onClick={pick} style={{
          marginTop: 8, padding: '7px 12px', borderRadius: 9,
          background: `${B.cyan}18`, border: `1px solid ${B.cyan}44`,
          color: B.cyan, fontFamily: 'inherit', fontSize: 11.5, fontWeight: 700,
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <Icon name="camera" size={13} stroke={2.2}/>{value ? 'Trocar imagem' : 'Enviar imagem'}
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }}/>
    </div>
  );
}

// ─────────── FITNESS LEVEL PICKER (1–5) ───────────
function LevelPicker({ value, onChange, items }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {items.map((it) => {
        const active = value === it.n;
        return (
          <button key={it.n} onClick={() => onChange(it.n)} style={{
            width: '100%', padding: '12px 14px', borderRadius: 14,
            background: active ? `${B.cyan}14` : B.surfRaised,
            border: `1.5px solid ${active ? B.cyan : B.border}`,
            cursor: 'pointer', textAlign: 'left', color: B.text, fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: active ? B.cyan : B.navy, color: active ? B.navy : B.textSec,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: FF_DISPLAY, fontWeight: 800, fontSize: 16,
            }}>{it.n}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: FF_DISPLAY }}>{it.title}</div>
              <div style={{ fontSize: 11.5, color: B.textSec, marginTop: 1 }}>{it.sub}</div>
            </div>
            {/* mini strength bars */}
            <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 22 }}>
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} style={{
                  width: 4, borderRadius: 2,
                  height: 6 + (4 - i) * 4,
                  background: (5 - it.n) > i ? (active ? B.cyan : B.textSec) : B.border,
                }}/>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─────────── FOCUS DISTRIBUTION (must total 100) ───────────
function FocusBars({ items, values, onChange, colorMap }) {
  const total = Object.values(values).reduce((a, b) => a + b, 0);
  const ok = total === 100;
  const setOne = (key, raw) => {
    const v = Math.max(0, Math.min(100, raw));
    onChange({ ...values, [key]: v });
  };
  const autoBalance = () => {
    const n = items.length;
    const base = Math.floor(100 / n);
    const next = {};
    items.forEach((it, i) => { next[it.k] = base + (i < 100 - base * n ? 1 : 0); });
    onChange(next);
  };
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <button onClick={autoBalance} style={{
          padding: '6px 11px', borderRadius: 8,
          background: B.surfRaised, border: `1px solid ${B.border}`,
          color: B.textSec, fontFamily: 'inherit', fontSize: 11, fontWeight: 600,
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
        }}>
          <Icon name="wave" size={12} stroke={2}/> Equilibrar
        </button>
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 6,
          fontFamily: FF_MONO,
        }}>
          <span style={{ fontSize: 11, color: B.textMute }}>TOTAL</span>
          <span style={{
            fontSize: 18, fontWeight: 700,
            color: ok ? B.green : total > 100 ? B.coral : B.amber,
          }}>{total}%</span>
        </div>
      </div>

      {/* stacked bar */}
      <div style={{
        display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden',
        background: B.navy, marginBottom: 16, border: `1px solid ${B.border}`,
      }}>
        {items.map(it => values[it.k] > 0 && (
          <div key={it.k} style={{
            width: `${values[it.k]}%`, background: colorMap[it.k],
            transition: 'width .2s ease',
          }}/>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        {items.map(it => (
          <div key={it.k}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
            }}>
              <div style={{ width: 9, height: 9, borderRadius: 3, background: colorMap[it.k] }}/>
              <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>{it.label}</span>
              <span style={{
                fontFamily: FF_MONO, fontSize: 13, fontWeight: 700,
                color: B.text, minWidth: 38, textAlign: 'right',
              }}>{values[it.k]}%</span>
            </div>
            <input type="range" min={0} max={100} step={5} value={values[it.k]}
              onChange={(e) => setOne(it.k, Number(e.target.value))}
              style={{ width: '100%', accentColor: colorMap[it.k], cursor: 'pointer' }}/>
          </div>
        ))}
      </div>

      {!ok && (
        <div style={{
          marginTop: 12, fontSize: 11.5, color: total > 100 ? B.coral : B.amber,
          fontFamily: FF_MONO, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Icon name={total > 100 ? 'minus' : 'plus'} size={12} stroke={2.4}/>
          {total > 100 ? `Reduza ${total - 100}% para fechar em 100%` : `Faltam ${100 - total}% para fechar em 100%`}
        </div>
      )}
    </div>
  );
}

// ─────────── STRUCTURE SORTER (drag-to-order) ───────────
function StructureSorter({ items, onChange }) {
  const [dragIdx, setDragIdx] = React.useState(null);
  const [overIdx, setOverIdx] = React.useState(null);

  const move = (from, to) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    onChange(next);
  };

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {items.map((it, i) => {
        const isDrag = dragIdx === i;
        const isOver = overIdx === i && dragIdx !== null && dragIdx !== i;
        return (
          <div key={it.k}
            draggable
            onDragStart={() => setDragIdx(i)}
            onDragEnter={() => setOverIdx(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { move(dragIdx, i); setDragIdx(null); setOverIdx(null); }}
            onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', borderRadius: 12,
              background: isDrag ? B.surfRaised2 : B.surfRaised,
              border: `1.5px solid ${isOver ? B.cyan : isDrag ? B.cyanDeep : B.border}`,
              opacity: isDrag ? 0.6 : 1,
              cursor: 'grab', userSelect: 'none', transition: 'border-color .12s',
            }}>
            <div style={{
              width: 26, height: 26, borderRadius: 8, flexShrink: 0,
              background: B.navy, color: B.cyan,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: FF_MONO, fontWeight: 700, fontSize: 12,
            }}>{i + 1}</div>
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: `${it.color || B.cyan}1f`, color: it.color || B.cyan,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Icon name={it.icon} size={15} stroke={2}/></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, fontFamily: FF_DISPLAY }}>{it.label}</div>
              {it.sub && <div style={{ fontSize: 11, color: B.textSec, marginTop: 1 }}>{it.sub}</div>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <button onClick={() => move(i, i - 1)} disabled={i === 0} style={arrowBtn(i === 0)}>
                <span style={{ display: 'flex', transform: 'rotate(180deg)' }}>
                  <Icon name="chevronDown" size={13} stroke={2.4} color={i === 0 ? B.textMute : B.text}/>
                </span>
              </button>
              <button onClick={() => move(i, i + 1)} disabled={i === items.length - 1} style={arrowBtn(i === items.length - 1)}>
                <Icon name="chevronDown" size={13} stroke={2.4} color={i === items.length - 1 ? B.textMute : B.text}/>
              </button>
            </div>
            <Icon name="grip" size={16} color={B.textMute} stroke={2}/>
          </div>
        );
      })}
    </div>
  );
}
function arrowBtn(disabled) {
  return {
    width: 22, height: 16, borderRadius: 5, padding: 0,
    background: B.navy, border: `1px solid ${B.border}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1,
  };
}
// up arrow needs rotation — render via wrapper
function SortArrowUp() { return null; }

// ─────────── TAG PICKER (favorites + free add) ───────────
function TagPicker({ value, onChange, suggestions, max = 10, placeholder, color = B.cyan }) {
  const [draft, setDraft] = React.useState('');
  const list = value || [];
  const atMax = list.length >= max;
  const add = (tag) => {
    const t = (tag || '').trim();
    if (!t || atMax || list.some(x => x.toLowerCase() === t.toLowerCase())) return;
    onChange([...list, t]);
    setDraft('');
  };
  const remove = (tag) => onChange(list.filter(x => x !== tag));
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center',
        background: B.navy, border: `1.5px solid ${atMax ? B.border : B.borderSoft}`,
        borderRadius: 12, padding: '0 6px 0 14px', opacity: atMax ? 0.55 : 1,
      }}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} disabled={atMax}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(draft); } }}
          placeholder={atMax ? `Limite de ${max} atingido` : placeholder}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: B.text, padding: '13px 0', fontSize: 14, fontFamily: 'inherit',
          }}/>
        <button onClick={() => add(draft)} disabled={atMax || !draft.trim()} style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: draft.trim() && !atMax ? color : B.surfRaised,
          border: 'none', cursor: draft.trim() && !atMax ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="plus" size={16} color={draft.trim() && !atMax ? B.navy : B.textMute} stroke={2.4}/>
        </button>
      </div>

      {list.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
          {list.map(tag => (
            <span key={tag} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 8px 7px 12px', borderRadius: 999,
              background: `${color}1c`, border: `1.5px solid ${color}66`,
              color, fontSize: 12.5, fontWeight: 600,
            }}>
              {tag}
              <button onClick={() => remove(tag)} style={{
                width: 18, height: 18, borderRadius: '50%', padding: 0,
                background: `${color}22`, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><Icon name="x" size={11} color={color} stroke={2.6}/></button>
            </span>
          ))}
        </div>
      )}

      {suggestions && suggestions.length > 0 && !atMax && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 10.5, color: B.textMute, fontFamily: FF_MONO, letterSpacing: '.08em', marginBottom: 6, textTransform: 'uppercase' }}>Sugestões</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {suggestions.filter(s => !list.some(x => x.toLowerCase() === s.toLowerCase())).map(s => (
              <button key={s} onClick={() => add(s)} style={{
                padding: '7px 12px', borderRadius: 999,
                background: 'transparent', border: `1.5px dashed ${B.borderSoft}`,
                color: B.textSec, fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
              }}>
                <Icon name="plus" size={11} stroke={2.4}/>{s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 10, fontSize: 10.5, color: B.textMute, fontFamily: FF_MONO, letterSpacing: '.04em' }}>
        {list.length}/{max} selecionados
      </div>
    </div>
  );
}

// expose globally
Object.assign(window, {
  B, FF_DISPLAY, FF_MONO,
  Icon, Chip, ChoiceCard, Field, TextArea, PrivacyNote, Hint,
  StepHeader, FieldLabel, Slider, ToggleRow, VoiceBar,
  PhotoSlot, LevelPicker, FocusBars, StructureSorter, TagPicker,
});
