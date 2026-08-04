#!/usr/bin/env node
// Guarda anti-regressão — Fase 3 de docs/LICENSING_AUTHORITY_AND_COMMERCIAL_MODEL_PLAN.md.
//
// Lê plan_definitions + feature_permissions REAIS do Supabase e usa o mesmo
// verificador puro e testado (src/licensing/completeness.ts) para acusar
// qualquer combinação feature_key × plan_key aplicável sem linha. Sai com
// código 1 se encontrar lacunas — usar como `npm run check:feature-permissions`.
//
// Nota honesta: este repositório não tem workflow de CI (.github/workflows
// inexistente) — isto substitui "integrar no CI" do checklist da Fase 3 até
// existir um pipeline real para o chamar automaticamente.

import { findMissingPermissions } from '../src/licensing/completeness.ts';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('[check-feature-permissions] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (ou VITE_SUPABASE_ANON_KEY) em falta no ambiente.');
  process.exit(2);
}

const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

async function fetchAll(path) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, { headers });
  if (!res.ok) {
    throw new Error(`Fetch ${path} falhou: ${res.status} ${await res.text().catch(() => '')}`);
  }
  return res.json();
}

const [planDefinitions, permissionRows] = await Promise.all([
  fetchAll('plan_definitions?select=plan_key,audience,is_active'),
  fetchAll('feature_permissions?select=feature_key,plan_key'),
]);

const missing = findMissingPermissions(planDefinitions, permissionRows);

if (missing.length === 0) {
  console.log(`[check-feature-permissions] OK — ${planDefinitions.length} planos, ${permissionRows.length} linhas, nenhuma lacuna.`);
  process.exit(0);
}

console.error(`[check-feature-permissions] ${missing.length} combinação(ões) feature_key × plan_key aplicável(eis) sem linha:`);
for (const m of missing) console.error(`  - ${m.feature_key} × ${m.plan_key}`);
process.exit(1);
