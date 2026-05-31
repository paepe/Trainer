// perfil-atoms.jsx — shared atoms for Módulo 1: Perfil Inteligente do Aluno

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
  mic: 'M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  shield: 'M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z',
  eyeOff: 'M3 3l18 18M10.6 6.1A10 10 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.3 4M6.1 6.1C3.4 7.9 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.3-1',
  check: 'M5 12l5 5 9-11',
  x: 'M6 6l12 12M18 6L6 18',
  chevron: 'M9 6l6 6-6 6',
  chevronDown: 'M6 9l6 6 6-6',
  plus: 'M12 5v14M5 12h14',
  heart: 'M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.5-7 10-7 10z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c.6-4 4-7 8-7s7.4 3 8 7',
  target: 'M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0M12 12m-4 0a4 4 0 1 0 8 0 4 4 0 1 0-8 0M12 12v0',
  activity: 'M3 12h4l3-9 4 18 3-9h4',
  home: 'M3 12L12 4l9 8M5 10v10h14V10',
  calendar: 'M3 8h18M3 4h18v18H3zM8 2v4M16 2v4',
  brain: 'M12 4a4 4 0 0 0-4 4v1a3 3 0 0 0-3 3 3 3 0 0 0 3 3v1a4 4 0 0 0 4 4 4 4 0 0 0 4-4v-1a3 3 0 0 0 3-3 3 3 0 0 0-3-3V8a4 4 0 0 0-4-4z',
  accessibility: 'M12 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM4 9h16M12 9v6m-4 5l4-5 4 5',
  sparkles: 'M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5zM19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z',
  voice: 'M3 12c2-3 5-5 9-5s7 2 9 5-2 5-9 5-7-2-9-5z M12 9v6',
  pill: 'M9 4l11 11a5 5 0 0 1-7 7L2 11a5 5 0 0 1 7-7zM6 8l10 10',
  ruler: 'M3 8l5-5 13 13-5 5L3 8zM7 11l1 1M10 8l1 1M13 11l1 1M16 8l1 1',
  zap: 'M13 2L4 14h7l-1 8 9-12h-7l1-8z',
  shieldCheck: 'M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3zM9 12l2 2 4-4',
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
function Field({ label, value, onChange, placeholder, type = 'text', suffix, mono = false, sensitive = false, helper }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{
        fontSize: 11.5, fontWeight: 600, color: B.textSec,
        textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {label}
        {sensitive && <span style={{
          fontSize: 9, color: B.coral, fontWeight: 700,
          padding: '2px 5px', borderRadius: 4, background: `${B.coral}22`,
          letterSpacing: '.04em',
        }}><Icon name="lock" size={9} stroke={2.4}/> SENSÍVEL</span>}
      </div>
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

// ─────────── PRIVACY EYEBROW ───────────
function PrivacyNote({ children, tone = 'default' }) {
  const tones = {
    default: { bg: `${B.cyan}10`, border: `${B.cyan}40`, color: B.cyan, icon: 'shield' },
    sensitive: { bg: `${B.coral}10`, border: `${B.coral}40`, color: B.coral, icon: 'lock' },
    optional: { bg: `${B.lavender}10`, border: `${B.lavender}40`, color: B.lavender, icon: 'eyeOff' },
  };
  const c = tones[tone];
  return (
    <div style={{
      display: 'flex', gap: 10, padding: '10px 12px', marginTop: 6,
      background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10,
      fontSize: 11.5, lineHeight: 1.4, color: B.text,
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
          position: 'absolute', inset: -4,
          borderRadius: '50%', border: `2px solid ${B.coral}`,
          animation: 'pulse-ring 1.6s ease-out infinite',
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
        <div style={{ fontSize: 12.5, fontWeight: 700 }}>{active ? 'Gravando…' : 'Falar com o app'}</div>
        <div style={{ fontSize: 10.5, color: B.textMute, marginTop: 1 }}>
          {active ? 'Solte para confirmar. A IA vai estruturar para você.' : (hint || 'Entrada por voz disponível neste bloco')}
        </div>
      </div>
      {active && (
        <div style={{ display: 'flex', gap: 2, alignItems: 'center', height: 22 }}>
          {[0.6, 1, 0.7, 1.2, 0.8].map((d, i) => (
            <div key={i} style={{
              width: 3, height: '100%', background: B.coral, borderRadius: 2,
              animation: `wave ${d}s ease-in-out infinite`, animationDelay: `${i * 0.1}s`,
              transformOrigin: 'center',
            }}/>
          ))}
        </div>
      )}
    </button>
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
        style={{
          width: '100%', accentColor: color, cursor: 'pointer',
        }}/>
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
function ToggleRow({ on, onChange, title, sub, sensitive }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: '100%', padding: 14, borderRadius: 12,
      background: B.surfRaised, border: `1px solid ${on ? B.cyan : B.border}`,
      cursor: 'pointer', textAlign: 'left',
      display: 'flex', alignItems: 'center', gap: 12,
      color: B.text, fontFamily: 'inherit',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}>
          {title}
          {sensitive && <Icon name="lock" size={11} color={B.coral} stroke={2.2}/>}
        </div>
        {sub && <div style={{ fontSize: 11.5, color: B.textSec, marginTop: 3, lineHeight: 1.4 }}>{sub}</div>}
      </div>
      <div style={{
        width: 38, height: 22, borderRadius: 999,
        background: on ? B.cyan : B.border,
        position: 'relative', flexShrink: 0,
        transition: 'background .15s',
      }}>
        <div style={{
          position: 'absolute', top: 2, left: on ? 18 : 2,
          width: 18, height: 18, borderRadius: '50%',
          background: B.navy,
          transition: 'left .15s',
        }}/>
      </div>
    </button>
  );
}

// expose globally
Object.assign(window, {
  B, FF_DISPLAY, FF_MONO,
  Icon, Chip, ChoiceCard, Field, PrivacyNote, Hint, VoiceBar, StepHeader, Slider, ToggleRow,
});
