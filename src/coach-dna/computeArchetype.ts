import type { CoachDNAData, CoachArchetype } from '../types/coach-dna';

export function computeArchetype(data: CoachDNAData): CoachArchetype {
  const s: Record<CoachArchetype, number> = {
    performance: 0, technician: 0, motivator: 0, guide: 0, drill: 0, movement: 0,
  };

  // Coaching style signals
  const styles = data.dna.style;
  if (styles.includes('perf'))   s.performance += 3;
  if (styles.includes('tech'))   s.technician  += 3;
  if (styles.includes('motiv'))  s.motivator   += 3;
  if (styles.includes('emp'))    s.guide       += 3;
  if (styles.includes('disc'))   s.drill       += 2;
  if (styles.includes('direct')) s.drill       += 1;
  if (styles.includes('humor'))  s.motivator   += 2;
  if (styles.includes('prof'))   s.technician  += 1;

  // Core principles
  const p = data.dna.principles;
  if (p.includes('intensity')) s.performance += 2;
  if (p.includes('quality'))   s.technician  += 2;
  if (p.includes('health'))    s.guide       += 2;
  if (p.includes('fun'))       s.motivator   += 2;
  if (p.includes('strength'))  s.drill       += 2;
  if (p.includes('mobility'))  s.movement    += 2;
  if (p.includes('athletics')) s.performance += 1;
  if (p.includes('function'))  s.movement    += 1;
  if (p.includes('progress'))  s.guide       += 1;

  // Focus bars (0–10 scale, fractional contribution)
  s.performance += Math.round(data.focus.athletic  * 0.30);
  s.drill       += Math.round(data.focus.strength  * 0.30);
  s.movement    += Math.round(data.focus.mobility  * 0.30);
  s.guide       += Math.round(data.focus.balance   * 0.20);
  s.motivator   += Math.round(data.focus.endurance * 0.15);
  s.technician  += Math.round(data.focus.coord     * 0.20);

  // Training methods
  const m = data.training.methods;
  if (m.includes('CrossFit'))                    s.performance += 2;
  if (m.includes('HIIT'))                        s.performance += 1;
  if (m.includes('Mobility'))                    s.movement    += 2;
  if (m.includes('Athletic Performance'))        s.performance += 2;
  if (m.includes('Strength Training'))           s.drill       += 2;
  if (m.includes('Weightlifting / Bodybuilding')){ s.drill += 1; s.technician += 1; }
  if (m.includes('Calisthenics'))                s.movement    += 1;
  if (m.includes('Functional Training'))         { s.movement += 1; s.guide += 1; }

  // Intensity
  if (data.training.intensity === 'High intensity') { s.performance += 2; s.drill += 1; }
  if (data.training.intensity === 'Moderate')       { s.guide += 1; s.movement += 1; }

  // Audience tone
  const t = data.audience.tone;
  if (t.includes('Motivational'))  s.motivator   += 2;
  if (t.includes('Technical'))     s.technician  += 2;
  if (t.includes('Athletic'))      s.performance += 1;
  if (t.includes('Direct'))        s.drill       += 1;
  if (t.includes('Casual'))        s.motivator   += 1;
  if (t.includes('Professional'))  s.technician  += 1;

  // Audience clients
  const c = data.audience.clients;
  if (c.includes('Advanced athletes'))  s.performance += 1;
  if (c.includes('CrossFit athletes')) s.performance += 1;
  if (c.includes('Rehabilitation'))    s.guide       += 2;
  if (c.includes('Beginners'))         s.guide       += 1;

  const sorted = (Object.entries(s) as [CoachArchetype, number][])
    .sort(([, a], [, b]) => b - a);
  return sorted[0]?.[0] ?? 'performance';
}
