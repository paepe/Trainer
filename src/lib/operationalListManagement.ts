export type OperationalListScope = 'active' | 'archived';
export type OperationalListSort = 'recent' | 'oldest' | 'nameAsc' | 'nameDesc';

export type InboxCategory =
  | 'actionRequired'
  | 'invitations'
  | 'plansAndWorkouts'
  | 'accessAndPrivacy'
  | 'alerts'
  | 'informational';

export interface InboxClassificationInput {
  type: string | null;
  response: string | null;
  expires_at: string | null;
}

export function normaliseOperationalSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
}

export function matchesOperationalSearch(value: string, query: string) {
  const haystack = normaliseOperationalSearch(value);
  const terms = normaliseOperationalSearch(query).trim().split(/\s+/).filter(Boolean);
  return terms.every(term => haystack.includes(term));
}

export function toggleOperationalSelection(current: ReadonlySet<string>, id: string) {
  const next = new Set(current);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function toggleAllOperationalSelection(current: ReadonlySet<string>, ids: readonly string[]) {
  const next = new Set(current);
  const allSelected = ids.length > 0 && ids.every(id => next.has(id));
  ids.forEach(id => allSelected ? next.delete(id) : next.add(id));
  return next;
}

export function isInboxActionable(item: InboxClassificationInput, now = new Date()) {
  if (item.response) return false;
  if (item.type === 'trainer_invitation_renewal_request') return true;
  if (!['workout_ready', 'access_request', 'trainer_invitation'].includes(item.type ?? '')) return false;
  return !item.expires_at || new Date(item.expires_at).getTime() > now.getTime();
}

export function inboxCategoryFor(item: InboxClassificationInput): InboxCategory {
  if (isInboxActionable(item)) return 'actionRequired';
  if (item.type === 'trainer_invitation' || item.type === 'trainer_invitation_renewal_request') return 'invitations';
  if (['access_request', 'access_granted', 'access_denied'].includes(item.type ?? '')) return 'accessAndPrivacy';
  if (['checkin_alert', 'safety_gate', 'low_readiness', 'high_pain'].includes(item.type ?? '')) return 'alerts';
  if (['plan_sent', 'plan_cancelled', 'plan_postponed', 'plan_expired', 'workout_ready', 'workout_approved', 'workout_rejected', 'workout_timeout', 'trainer_timeout_workout', 'workout_completed'].includes(item.type ?? '')) return 'plansAndWorkouts';
  return 'informational';
}

export function canArchiveInboxItem(item: InboxClassificationInput & { read_at: string | null }, now = new Date()) {
  return item.read_at !== null && !isInboxActionable(item, now);
}
