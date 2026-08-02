// Session structure — the single vocabulary for how a training session is
// composed. Canonical block keys come from the Coach DNA wizard
// (src/coach-dna/constants.ts STRUCTURE_BLOCKS, persisted as
// coach_dna.structure.order), which is what the trainer actually configures.
//
// This module exists so the AI pipeline, the plan editor and the fitting logic
// all speak that same vocabulary instead of each inventing one (directive §4.5,
// "one capability, one contract"). api/* files duplicate these values rather
// than importing them — Vercel's function builder does not trace relative
// imports outside each handler.

export const SESSION_BLOCKS = [
  'mobility',
  'warmup',
  'technique',
  'strength',
  'conditioning',
  'cooldown',
] as const;

export type SessionBlock = typeof SESSION_BLOCKS[number];

/**
 * Fallback sequence for a trainer with no Coach DNA on record.
 * Deliberately narrower than COACH_DNA_DEFAULTS.structure (which seeds the
 * wizard with all six blocks): without a declared methodology we prescribe a
 * conventional session rather than assuming mobility and technique work.
 */
export const DEFAULT_SESSION_ORDER: SessionBlock[] = ['warmup', 'strength', 'conditioning', 'cooldown'];

/**
 * Blocks that absorb time fitting. Warm-up, mobility, technique and cool-down
 * are prescriptive: trimming them to save time or padding them to consume it
 * would change the trainer's intent, so the fitting logic leaves them alone.
 */
export const ADJUSTABLE_BLOCKS: readonly SessionBlock[] = ['strength', 'conditioning'];

const KNOWN = new Set<string>(SESSION_BLOCKS);

/**
 * Maps a phase value onto the canonical vocabulary.
 * `main` is the pre-2026-07-31 value (schema v1) and survives here so plans and
 * in-flight AI responses from that era degrade into the working block instead
 * of failing (directive §6.3, resilient parsing with explicit fallbacks).
 */
export function normalizeBlock(phase: string | null | undefined): SessionBlock {
  if (!phase) return 'strength';
  const key = phase.toLowerCase().trim();
  if (key === 'main') return 'strength';
  return KNOWN.has(key) ? (key as SessionBlock) : 'strength';
}

export const isAdjustableBlock = (phase: string | null | undefined): boolean =>
  ADJUSTABLE_BLOCKS.includes(normalizeBlock(phase));

/** Keeps only known blocks, preserving the trainer's declared order. */
export function sanitizeSessionOrder(order: readonly string[] | null | undefined): SessionBlock[] {
  if (!order?.length) return DEFAULT_SESSION_ORDER;
  const seen = new Set<string>();
  const cleaned = order
    .map(k => k?.toLowerCase?.().trim())
    .filter((k): k is SessionBlock => !!k && KNOWN.has(k) && !seen.has(k) && !!seen.add(k));
  return cleaned.length ? cleaned : DEFAULT_SESSION_ORDER;
}

const RANK = new Map<string, number>(SESSION_BLOCKS.map((b, i) => [b, i]));

/**
 * Orders a list by its declared session block, in canonical
 * mobility → warmup → technique → strength → conditioning → cooldown
 * sequence — the same grouping the trainer's plan editor already renders
 * (WorkoutPlanEditorScreen), extended to the client-facing screens
 * (docs/SESSION_STRUCTURE_IMPLEMENTATION_PLAN.md, follow-up to Decision #3).
 * Items with no/unrecognised phase sort after every named block;
 * ties keep their original relative order (Array.sort is spec-stable).
 */
export function sortBySessionBlock<T extends { phase?: string | null | undefined }>(items: readonly T[]): T[] {
  const rank = (phase?: string | null) => phase ? RANK.get(phase) ?? SESSION_BLOCKS.length : SESSION_BLOCKS.length;
  return [...items].sort((a, b) => rank(a.phase) - rank(b.phase));
}
