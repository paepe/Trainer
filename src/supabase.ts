import { createClient } from '@supabase/supabase-js';
import type { Database } from './types/supabase';

function fetchWithTimeout(timeoutMs: number, ...args: Parameters<typeof fetch>): ReturnType<typeof fetch> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const [url, init] = args;
  return fetch(url, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { global: { fetch: (...args: Parameters<typeof fetch>) => fetchWithTimeout(20_000, ...args) } },
);
