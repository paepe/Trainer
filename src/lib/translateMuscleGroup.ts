import i18n from '../i18n';

const EN_CANONICAL = ['Chest','Back','Shoulders','Arms','Core','Legs','Full body','Cardio'] as const;

export function translateMuscleGroup(enValue: string | null | undefined): string {
  if (!enValue) return '';
  const idx = EN_CANONICAL.findIndex(v => v.toLowerCase() === enValue.toLowerCase());
  if (idx < 0) return enValue;
  const labels = i18n.t('trainer.planner.muscleGroups', { returnObjects: true }) as string[];
  return Array.isArray(labels) && labels[idx] ? labels[idx] : enValue;
}
