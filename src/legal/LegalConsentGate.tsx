import React from 'react';
import { useTranslation } from 'react-i18next';
import { getLegalUi } from './legalDocuments';

interface Props { onAccept: () => Promise<string | null>; }

export function LegalConsentGate({ onAccept }: Props) {
  const { i18n } = useTranslation();
  const copy = getLegalUi(i18n.language);
  const [checked, setChecked] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const accept = async () => {
    if (!checked || busy) return;
    setBusy(true);
    const result = await onAccept();
    setBusy(false);
    setError(result);
  };
  return (
    <main style={{ minHeight: '100%', display: 'grid', placeItems: 'center', padding: 24, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      <section style={{ width: 'min(100%, 520px)', padding: 24, borderRadius: 18, background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, letterSpacing: '.1em', fontWeight: 800, color: 'var(--accent, #2DD4E0)' }}>{copy.legalUpdate}</div>
        <h1 style={{ margin: '8px 0', fontSize: 24, color: 'var(--text-pri)' }}>{copy.consentTitle}</h1>
        <p style={{ color: 'var(--text-sec)', lineHeight: 1.55 }}>{copy.consentBody}</p>
        <p style={{ color: 'var(--text-sec)', fontSize: 13, lineHeight: 1.55 }}>
          <a href="/legal/terms" target="_blank" rel="noreferrer" style={legalLinkStyle}>{copy.readTerms}</a>{' · '}
          <a href="/legal/fair-use" target="_blank" rel="noreferrer" style={legalLinkStyle}>{copy.readFairUse}</a>
        </p>
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', color: 'var(--text-pri)', fontSize: 13, lineHeight: 1.45, margin: '20px 0' }}>
          <input type="checkbox" checked={checked} onChange={event => setChecked(event.target.checked)} style={{ marginTop: 3 }}/>{copy.consentLabel}
        </label>
        {error && <p role="alert" style={{ color: '#EF5B3C', fontSize: 12 }}>{error}</p>}
        <button disabled={!checked || busy} onClick={() => void accept()} style={{ width: '100%', padding: '12px 16px', border: 0, borderRadius: 12, cursor: checked && !busy ? 'pointer' : 'not-allowed', background: 'var(--accent, #2DD4E0)', color: '#0E1A2B', fontWeight: 800, opacity: checked && !busy ? 1 : .5 }}>
          {busy ? copy.accepting : copy.acceptAndContinue}
        </button>
      </section>
    </main>
  );
}

const legalLinkStyle: React.CSSProperties = { color: '#77E7F2', fontWeight: 700, textDecorationThickness: 2, textUnderlineOffset: 3 };
