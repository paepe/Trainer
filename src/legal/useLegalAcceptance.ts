import React from 'react';
import { supabase } from '../supabase';
import { REQUIRED_LEGAL_DOCUMENTS } from './legalDocuments';

type AcceptanceStatus = 'loading' | 'accepted' | 'required' | 'error';
type AcceptanceRow = { document_key: string; document_version: string };

interface LegalDb {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => Promise<{ data: AcceptanceRow[] | null; error: { message: string } | null }>;
    };
  };
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
}

const legalDb = supabase as unknown as LegalDb;

export function useLegalAcceptance(userId: string | null, locale: string) {
  const [status, setStatus] = React.useState<AcceptanceStatus>(userId ? 'loading' : 'accepted');

  const refresh = React.useCallback(async () => {
    if (!userId) { setStatus('accepted'); return; }
    setStatus('loading');
    const { data, error } = await legalDb
      .from('legal_document_acceptances')
      .select('document_key, document_version')
      .eq('user_id', userId);
    if (error) { setStatus('error'); return; }
    const accepted = new Set((data ?? []).map(row => row.document_key + ':' + row.document_version));
    setStatus(REQUIRED_LEGAL_DOCUMENTS.every(document => accepted.has(document.key + ':' + document.version))
      ? 'accepted'
      : 'required');
  }, [userId]);

  React.useEffect(() => { void refresh(); }, [refresh]);

  const acceptCurrentDocuments = React.useCallback(async (): Promise<string | null> => {
    const { error } = await legalDb.rpc('accept_current_legal_documents', { p_locale: locale });
    if (error) return error.message;
    setStatus('accepted');
    return null;
  }, [locale]);

  return { status, refresh, acceptCurrentDocuments };
}
