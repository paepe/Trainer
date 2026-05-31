export type {
  AITask,
  AIContext,
  TrainerContext,
  ClientContext,
  TodayContext,
  StatsContext,
  LibraryContext,
  TaskContext,
  SmartWorkout,
  SmartWorkoutRequest,
  SmartWorkoutResponse,
  ObjectiveSuggestions,
  DailyInsight,
} from './types';

export {
  buildTrainerContext,
  buildClientContext,
  buildTodayContext,
  buildStatsContext,
  buildLibraryContext,
  buildAIContext,
} from './buildAIContext';

export { buildPrompt } from './buildPrompt';
