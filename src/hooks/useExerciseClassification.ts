import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import type { ExerciseCategory } from '../types/workout';
import { resolveWorkoutApiBase } from '../lib/workoutGeneration';

export type ClassificationMap = Record<string, ExerciseCategory | null>;

interface ExerciseInput {
  id:           string;
  name:         string;
  muscle_group: string;
  exercise_category?: ExerciseCategory | null;
}

/**
 * Resolves exercise_category for a list of exercises.
 *
 * Strategy (Opção A + persistent cache):
 * 1. Exercises with exercise_category already set → use DB value directly
 * 2. Exercises with exercise_category === null → batch to classify-exercises endpoint
 * 3. On response → persist classification back to exercise_catalog (cache for future)
 * 4. If endpoint fails → return null for unclassified (graceful degradation, show without filter)
 *
 * This hook is intentionally side-effect-free beyond the DB persist — it never blocks
 * the UI and never throws. The caller decides what to do with null values.
 */
export function useExerciseClassification(exercises: ExerciseInput[]): {
  classificationMap: ClassificationMap;
  loading: boolean;
} {
  const [classificationMap, setClassificationMap] = useState<ClassificationMap>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (exercises.length === 0) return;

    // Partition: already classified vs needs AI
    const resolved: ClassificationMap = {};
    const needsClassification: ExerciseInput[] = [];

    for (const ex of exercises) {
      if (ex.exercise_category !== null && ex.exercise_category !== undefined) {
        resolved[ex.id] = ex.exercise_category;
      } else {
        resolved[ex.id] = null;
        needsClassification.push(ex);
      }
    }

    // If everything is already classified, return immediately
    if (needsClassification.length === 0) {
      setClassificationMap(resolved);
      return;
    }

    setClassificationMap(resolved);
    setLoading(true);

    let cancelled = false;

    (async () => {
      try {
        // Batch in chunks of 50 (endpoint limit)
        const CHUNK = 50;
        const allClassified: ClassificationMap = { ...resolved };

        for (let i = 0; i < needsClassification.length; i += CHUNK) {
          if (cancelled) break;

          const chunk = needsClassification.slice(i, i + CHUNK).map(ex => ({
            id:           ex.id,
            name:         ex.name,
            muscle_group: ex.muscle_group,
          }));

          const response = await fetch(`${resolveWorkoutApiBase()}/api/classify-exercises`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ exercises: chunk }),
          });

          if (!response.ok || cancelled) continue;

          const data = await response.json() as {
            classifications?: Array<{ id: string; category: ExerciseCategory }>;
          };

          const classifications = data.classifications ?? [];

          // Apply to local map
          for (const c of classifications) {
            allClassified[c.id] = c.category;
          }

          // Persist back to exercises table (cache for future calls)
          // Fire-and-forget — does not block UI.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const db = supabase as any;
          if (classifications.length > 0) {
            void Promise.all(
              classifications.map(c =>
                db.from('exercises')
                  .update({ exercise_category: c.category })
                  .eq('id', c.id),
              ),
            );
          }
        }

        if (!cancelled) setClassificationMap(allClassified);

      } catch {
        // Graceful degradation — unclassified exercises remain null, shown without filter
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercises.map(e => e.id).join(',')]);

  return { classificationMap, loading };
}
