import React from 'react';
import type { NavFn } from '../../types';
import type { CheckInQuick, CheckInDetailed, CheckInVoice, CheckInPostWorkout, SafetyGateResult } from '../../types/checkin-v2';
import { computeSafetyGate } from './safetyGate';
import { CheckInHub }        from './CheckInHub';
import { CheckInVoice as VoiceScreen }   from './CheckInVoice';
import { CheckInQuick as QuickScreen }   from './CheckInQuick';
import { CheckInDetailed as DetailedScreen } from './CheckInDetailed';
import { CheckInPostWorkout as PostWorkoutScreen } from './CheckInPostWorkout';
import { CheckInResult }     from './CheckInResult';

type Stage = 'hub' | 'voice' | 'quick' | 'detailed' | 'post_workout' | 'result';

interface Theme { primary: string; accent: string }

type SaveCheckinV2Fn = (data: {
  variant:            'voice' | 'quick' | 'detailed' | 'post_workout';
  quick_data?:        CheckInQuick;
  detailed_data?:     CheckInDetailed;
  voice_data?:        CheckInVoice;
  post_workout_data?: CheckInPostWorkout;
  safety_gate?:       SafetyGateResult;
  clientUserId?:      string;
}) => Promise<{ error: unknown }>;

interface CheckInProntidaoScreenProps {
  nav:                  NavFn;
  t:                    Theme;
  dark:                 boolean;
  userName?:            string | undefined;
  clientUserId?:        string;
  clientName?:          string;
  saveCheckinV2?:       SaveCheckinV2Fn;
  updatePainRecurrence?: (region: string) => Promise<{ error: unknown }>;
}

export function CheckInProntidaoScreen({ nav, t, dark, userName, clientUserId, clientName, saveCheckinV2, updatePainRecurrence }: CheckInProntidaoScreenProps) {
  const [stage, setStage]         = React.useState<Stage>('hub');
  const [result, setResult]       = React.useState<SafetyGateResult | null>(null);

  const goHub = () => { setStage('hub'); setResult(null); };

  const persist = (payload: Parameters<SaveCheckinV2Fn>[0]) => {
    if (saveCheckinV2) saveCheckinV2(clientUserId ? { ...payload, clientUserId } : payload).catch(console.error);
  };

  const handleQuickSubmit = (data: CheckInQuick) => {
    const gate = computeSafetyGate(data);
    persist({ variant: 'quick', quick_data: data, safety_gate: gate });
    setResult(gate);
    setStage('result');
  };

  const handleDetailedSubmit = (data: CheckInDetailed) => {
    const gate = computeSafetyGate(data);
    persist({ variant: 'detailed', detailed_data: data, safety_gate: gate });
    setResult(gate);
    setStage('result');
  };

  const handleVoiceSubmit = (data: CheckInVoice) => {
    const fallback: CheckInQuick = {
      energy:            6,
      sleep_quality:     'regular',
      pain:              { present: false },
      fatigue:           4,
      available_minutes: 45,
    };
    const gate = computeSafetyGate({ ...fallback, ...(data.ai_extracted ?? {}) });
    persist({ variant: 'voice', voice_data: data, safety_gate: gate });
    setResult(gate);
    setStage('result');
  };

  const handlePostWorkoutSubmit = (data: CheckInPostWorkout) => {
    persist({ variant: 'post_workout', post_workout_data: data });
    if (data.pain_during_or_after && updatePainRecurrence) {
      const region = data.pain_detail?.region ?? 'other';
      updatePainRecurrence(region).catch(console.error);
    }
    setStage('hub');
  };

  const { primary, accent } = t;

  switch (stage) {
    case 'hub':
      return (
        <CheckInHub
          dark={dark} primary={primary} accent={accent}
          userName={clientName ?? userName}
          onSelect={v => setStage(v)}
          onBack={() => nav(clientUserId ? 'trainerDashboard' : 'profile')}
          streak={32}
          lastCheckin="hoje 06:42"
        />
      );

    case 'voice':
      return (
        <VoiceScreen
          dark={dark} primary={primary}
          userName={clientName}
          onSubmit={handleVoiceSubmit}
          onBack={goHub}
        />
      );

    case 'quick':
      return (
        <QuickScreen
          dark={dark} primary={primary} accent={accent}
          userName={clientName}
          onSubmit={handleQuickSubmit}
          onBack={goHub}
        />
      );

    case 'detailed':
      return (
        <DetailedScreen
          dark={dark} primary={primary} accent={accent}
          userName={clientName}
          onSubmit={handleDetailedSubmit}
          onBack={goHub}
        />
      );

    case 'post_workout':
      return (
        <PostWorkoutScreen
          dark={dark} primary={primary} accent={accent}
          onSubmit={handlePostWorkoutSubmit}
          onBack={goHub}
        />
      );

    case 'result':
      return result ? (
        <CheckInResult
          dark={dark} primary={primary} accent={accent}
          result={result}
          isTrainer={!!clientUserId}
          onDone={() => nav(clientUserId ? 'workoutPlanEditor' : 'profile')}
          onAlert={() => nav(clientUserId ? 'trainerDashboard' : 'profile')}
        />
      ) : null;

    default:
      return null;
  }
}
