// Disabled-by-default administrative alert writer. Alert evaluation is added
// only after Phase 2 supplies an approved baseline; this module cannot create
// an alert unless an explicit server-side flag is enabled.
import { authServiceHeaders, authSupabaseUrl } from './auth.js';
export type AIAlertKind = 'volume_anomaly'|'cost_anomaly'|'error_rate_anomaly'|'automation_suspected'|'limiter_unavailable';
export async function recordAIUsageAlert(input: { actorHash?: string; endpoint?: string; planKey?: string; kind: AIAlertKind; severity: 'info'|'warning'|'critical'; evidence?: Record<string, number|string|boolean> }): Promise<void> {
  if (process.env.AI_ANOMALY_ALERTS_ENABLED !== 'true') return;
  try { await fetch(`${authSupabaseUrl()}/rest/v1/rpc/create_ai_usage_alert`, { method:'POST', headers:{...authServiceHeaders(),'Content-Type':'application/json'}, body:JSON.stringify({p_actor_hash:input.actorHash??null,p_endpoint:input.endpoint??null,p_plan_key:input.planKey??null,p_alert_kind:input.kind,p_severity:input.severity,p_evidence:input.evidence??{}}) }); } catch { /* alerts never alter request outcome */ }
}
