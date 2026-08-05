import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import type { ExerciseCategory } from '../types/workout';
import { resolveWorkoutApiBase } from '../lib/workoutGeneration';
import { authHeaders } from '../lib/authHeaders';

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
 * Strategy (Opção A + optional persistent cache):
 * 1. Exercises with exercise_category already set → use DB value directly
 * 2. Exercises with exercise_category === null → batch to classify-exercises endpoint
 * 3. On response → if persistCache=true, write back to exercises table (IDs must be exercises.id)
 * 4. If endpoint fails → return null for unclassified (graceful degradation, show without filter)
 *
 * IMPORTANT: persistCache must only be true when exercise IDs come from the `exercises` catalog
 * table. When IDs come from `plan_exercises` (e.g. StartWorkoutScreen), set persistCache=false —
 * plan_exercises.id ≠ exercises.id, so the update would silently affect zero rows.
 */
export function useExerciseClassification(
  exercises: ExerciseInput[],
  { persistCache = false }: { persistCache?: boolean } = {},
): {
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
            headers: await authHeaders(),
            body:    JSON.stringify({ exercises: chunk }),
          });

          if (!response.ok || cancelled) continue;

          const data = await response.json() as {
            classifications?: Array<{ id: string; category: ExerciseCategory }>;
          };

          const classifications = data.classifications ?? [];

          for (const c of classifications) {
            allClassified[c.id] = c.category;
          }

          // Only persist when IDs belong to the exercises catalog table.
          // plan_exercises.id ≠ exercises.id — persisting with plan_exercises IDs
          // would silently update zero rows in the exercises table.
          if (persistCache && classifications.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const db = supabase as any;
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
  }, [exercises.map(e => e.id).join(','), persistCache]);

  return { classificationMap, loading };
}
