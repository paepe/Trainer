import { describe, expect, it } from 'vitest';
import { REQUIRED_LEGAL_DOCUMENTS, getLegalDocumentBySlug } from './legalDocuments';

describe('public legal documents', () => {
  it('publishes each required acceptance document with a stable version and public slug', () => {
    expect(REQUIRED_LEGAL_DOCUMENTS.map(document => document.slug)).toEqual(['terms', 'fair-use']);
    for (const document of REQUIRED_LEGAL_DOCUMENTS) {
      expect(document.version).toMatch(/^\d+\.\d+$/);
      expect(document.sections.length).toBeGreaterThan(0);
    }
  });

  it('falls back to the terms document for an invalid public route', () => {
    expect(getLegalDocumentBySlug('unexpected').key).toBe('terms_of_use_ai');
  });
});
