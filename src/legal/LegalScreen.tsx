import React from 'react';
import { useTranslation } from 'react-i18next';
import { getLegalDocumentBySlug, getLegalUi, REQUIRED_LEGAL_DOCUMENTS, type LocalizedLegalDocument } from './legalDocuments';

interface Props {
  documentSlug?: string | undefined;
  onBack?: () => void;
}

function LegalDocumentView({ document, versionLabel, publishedOnLabel }: { document: LocalizedLegalDocument; versionLabel: string; publishedOnLabel: string }) {
  const publishedAt = new Intl.DateTimeFormat(document.locale, { dateStyle: 'long' }).format(new Date(`${document.publishedAt}T00:00:00Z`));
  return (
    <>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', color: 'var(--signature, #2DD4E0)', textTransform: 'uppercase' }}>
        {versionLabel} {document.version} · {publishedOnLabel} {publishedAt}
      </div>
      <h1 style={{ margin: '8px 0', color: 'var(--text-pri)', fontSize: 28, lineHeight: 1.15 }}>{document.title}</h1>
      <p style={{ margin: 0, color: 'var(--text-sec)', lineHeight: 1.55 }}>{document.subtitle}</p>
      {document.sections.map(section => (
        <section key={section.heading} style={{ marginTop: 28 }}>
          <h2 style={{ margin: '0 0 10px', color: 'var(--text-pri)', fontSize: 18 }}>{section.heading}</h2>
          {section.paragraphs.map(paragraph => <p key={paragraph} style={{ margin: '0 0 12px', color: 'var(--text-sec)', lineHeight: 1.6 }}>{paragraph}</p>)}
          {section.bullets && <ul style={{ margin: '0 0 12px', paddingLeft: 20, color: 'var(--text-sec)', lineHeight: 1.65 }}>{section.bullets.map(item => <li key={item}>{item}</li>)}</ul>}
        </section>
      ))}
    </>
  );
}

export function LegalScreen({ documentSlug, onBack }: Props) {
  const { i18n } = useTranslation();
  const locale = i18n.language;
  const copy = getLegalUi(locale);
  const [active, setActive] = React.useState(() => getLegalDocumentBySlug(documentSlug, locale));
  React.useEffect(() => setActive(getLegalDocumentBySlug(documentSlug, locale)), [documentSlug, locale]);

  const selectDocument = (slug: LocalizedLegalDocument['slug']) => {
    window.history.pushState(null, '', '/legal/' + slug);
    setActive(getLegalDocumentBySlug(slug, locale));
  };

  return (
    <main style={{ minHeight: '100%', padding: '28px 22px 48px', maxWidth: 760, margin: '0 auto', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      {onBack && <button onClick={onBack} style={{ border: 0, background: 'transparent', color: 'var(--text-sec)', cursor: 'pointer', padding: '0 0 20px', fontSize: 14 }}>← {copy.back}</button>}
      <nav aria-label={copy.navigationLabel} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
        {REQUIRED_LEGAL_DOCUMENTS.map(document => (
          <button key={document.key} onClick={() => selectDocument(document.slug)} style={{ border: '1px solid var(--border)', borderRadius: 999, padding: '8px 12px', background: active.key === document.key ? 'var(--surface-3)' : 'transparent', color: active.key === document.key ? 'var(--text-pri)' : 'var(--text-sec)', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
            {document.slug === 'terms' ? copy.termsTab : copy.fairUseTab}
          </button>
        ))}
      </nav>
      <LegalDocumentView document={active} versionLabel={copy.version} publishedOnLabel={copy.publishedOn}/>
      <p style={{ marginTop: 34, paddingTop: 18, borderTop: '1px solid var(--border)', color: 'var(--text-mute)', fontSize: 12, lineHeight: 1.5 }}>{copy.publicTextNotice}</p>
    </main>
  );
}
