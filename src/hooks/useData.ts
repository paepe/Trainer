import { useProfileData }  from './useProfileData';
import { useCheckinData }  from './useCheckinData';
import { useWorkoutData }  from './useWorkoutData';
import { useExerciseData } from './useExerciseData';

export function useData(userId: string | undefined) {
  return {
    ...useProfileData(userId),
    ...useCheckinData(userId),
    ...useWorkoutData(userId),
    ...useExerciseData(),
  };
}
