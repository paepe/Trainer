#!/usr/bin/env node
// Privacy-minimized Phase 2 observation report. Requires server-side Supabase
// credentials in the execution environment; never prints actor hashes or rows.
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(2);
}
const query = new URL(`${url}/rest/v1/rpc/ai_usage_observation_report`);
const res = await fetch(query, { method: 'POST', headers: { apikey:key, Authorization:`Bearer ${key}`, 'Content-Type':'application/json' }, body: '{}' });
if (!res.ok) throw new Error(`Observation report failed: ${res.status}`);
const rows = await res.json();
console.log(JSON.stringify({ generated_at: new Date().toISOString(), rows }, null, 2));
