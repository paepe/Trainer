import { useProfileData }  from './useProfileData';
import { useCheckinData }  from './useCheckinData';
import { useWorkoutData }  from './useWorkoutData';
import { useExerciseData } from './useExerciseData';

export function useData(userId: string | undefined, alertsEnabled = true) {
  return {
    ...useProfileData(userId),
    ...useCheckinData(userId, alertsEnabled),
    ...useWorkoutData(userId),
    ...useExerciseData(),
  };
}
