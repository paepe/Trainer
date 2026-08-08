import { describe, expect, it } from 'vitest';
import { LEGAL_LOCALES, REQUIRED_LEGAL_DOCUMENTS, getLegalDocumentBySlug, getLegalUi, resolveLegalLocale } from './legalDocuments';

describe('public legal documents', () => {
  it('publishes each required acceptance document with a stable version and public slug', () => {
    expect(REQUIRED_LEGAL_DOCUMENTS.map(document => document.slug)).toEqual(['terms', 'fair-use']);
    for (const document of REQUIRED_LEGAL_DOCUMENTS) {
      expect(document.version).toMatch(/^\d+\.\d+$/);
      const canonical = getLegalDocumentBySlug(document.slug, 'pt');
      for (const locale of LEGAL_LOCALES) {
        const localized = getLegalDocumentBySlug(document.slug, locale);
        expect(localized.locale).toBe(locale);
        expect(localized.title).not.toHaveLength(0);
        expect(localized.sections).toHaveLength(canonical.sections.length);
        expect(localized.sections.map(section => section.bullets?.length ?? 0))
          .toEqual(canonical.sections.map(section => section.bullets?.length ?? 0));
      }
    }
  });

  it('falls back to the terms document for an invalid public route', () => {
    expect(getLegalDocumentBySlug('unexpected', 'pt').key).toBe('terms_of_use_ai');
  });

  it('normalizes browser locales and localizes the consent interface', () => {
    expect(resolveLegalLocale('de-DE')).toBe('de');
    expect(resolveLegalLocale('unsupported')).toBe('en');
    expect(getLegalUi('es-ES').acceptAndContinue).toBe('Aceptar y continuar');
  });
});
