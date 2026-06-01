import React from 'react';
import type { NavFn } from '../../types';
import type { CheckInQuick, CheckInDetailed, CheckInVoice, CheckInPostWorkout, SafetyGateResult } from '../../types/checkin-v2';
import type { RiskClassification } from '../../types/profile-v2';
import { computeSafetyGate } from './safetyGate';
import { useLatestCheckin, type LatestCheckinData } from '../../hooks/useLatestCheckin';
import { supabase } from '../../supabase';
import { notify }   from '../../lib/notify';
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
  nav:                   NavFn;
  t:                     Theme;
  dark:                  boolean;
  user:                  { id: string | null };
  userName?:             string | undefined;
  clientUserId?:         string;
  clientName?:           string;
  biologicalSex?:        string | undefined;
  linkedTrainerId?:      string; // '' = no trainer, non-empty = has trainer
  saveCheckinV2?:        SaveCheckinV2Fn;
  updatePainRecurrence?: (region: string) => Promise<{ error: unknown }>;
}

export function CheckInProntidaoScreen({ nav, t, dark, user, userName, clientUserId, clientName, biologicalSex, linkedTrainerId = '', saveCheckinV2, updatePainRecurrence }: CheckInProntidaoScreenProps) {
  const last = useLatestCheckin(clientUserId ?? user?.id);
  const [stage, setStage]         = React.useState<Stage>('hub');
  const [result, setResult]       = React.useState<SafetyGateResult | null>(null);
  const [risk,   setRisk]         = React.useState<RiskClassification | null>(null);

  const goHub = () => { setStage('hub'); setResult(null); };

  // Fetch profile risk classification once, just before showing the result screen
  const showResult = (gate: SafetyGateResult) => {
    setResult(gate);
    setStage('result');
    const uid = clientUserId ?? user?.id;
    if (uid && !risk) {
      void supabase.from('profile_v2').select('risk').eq('user_id', uid).maybeSingle()
        .then(({ data }) => {
          const r = (data as { risk: RiskClassification | null } | null)?.risk;
          if (r) setRisk(r);
        });
    }
  };

  const persist = (payload: Parameters<SaveCheckinV2Fn>[0]) => {
    if (saveCheckinV2) saveCheckinV2(clientUserId ? { ...payload, clientUserId } : payload).catch(console.error);
  };

  const handleQuickSubmit = (data: CheckInQuick) => {
    const gate = computeSafetyGate(data);
    persist({ variant: 'quick', quick_data: data, safety_gate: gate });
    showResult(gate);
  };

  const handleDetailedSubmit = (data: CheckInDetailed) => {
    const gate = computeSafetyGate(data);
    persist({ variant: 'detailed', detailed_data: data, safety_gate: gate });
    showResult(gate);
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
    showResult(gate);
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
          isClient={!!clientName}
          onSelect={v => setStage(v)}
          onBack={() => nav(clientUserId ? 'trainerDashboard' : 'profile')}
          streak={last.streak}
          lastCheckin={last.lastCheckin}
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
          lastCheckin={last}
          onSubmit={handleQuickSubmit}
          onBack={goHub}
        />
      );

    case 'detailed':
      return (
        <DetailedScreen
          dark={dark} primary={primary} accent={accent}
          userName={clientName}
          lastCheckin={last}
          biologicalSex={biologicalSex}
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
          {...(risk ? { risk } : {})}
          isTrainerContext={!!clientUserId}
          linkedTrainerId={linkedTrainerId}
          onDone={() => nav(clientUserId ? 'workoutPlanEditor' : linkedTrainerId ? 'checkin' : 'workout')}
          onAlert={() => {
            if (clientUserId) {
              // Trainer context — go back to dashboard
              nav('trainerDashboard');
            } else if (linkedTrainerId) {
              // Client notifies trainer they're ready (Model A — 30-min window)
              const score = result?.readiness_score ?? '?';
              const name  = userName ?? 'Your client';
              console.log('[CheckIn/onAlert] notifying trainer:', linkedTrainerId, 'from client:', user?.id, 'score:', score);
              notify(
                linkedTrainerId,
                `${name} is ready to train`,
                `Readiness ${score}/100 · Approve or reject their workout request.`,
                undefined,
                {
                  type:         'workout_ready',
                  expiresInMin: 30,
                  ...(user?.id ? { fromUserId: user.id } : {}),
                }
              );
              nav('checkin');
            }
          }}
        />
      ) : null;

    default:
      return null;
  }
}
