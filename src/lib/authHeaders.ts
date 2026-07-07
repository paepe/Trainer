// Builds request headers carrying the Supabase session JWT for api/* calls.
// Every api/* endpoint that touches user data derives caller identity from
// this token server-side (see api/_lib/auth.ts) — body identity is ignored.

import { supabase } from '../supabase';

export async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  return headers;
}
