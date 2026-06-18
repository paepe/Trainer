import React from 'react';
import { useTranslation } from 'react-i18next';
import type { NavFn, Subscription } from '../../types';
import type { CheckInQuick, CheckInDetailed, CheckInVoice, SafetyGateResult } from '../../types/checkin-v2';
import type { RiskClassification } from '../../types/profile-v2';
import { computeSafetyGate } from './safetyGate';
import { useLatestCheckin } from '../../hooks/useLatestCheckin';
import { useFeatureAccess, useEffectivePlanKey } from '../../hooks/useFeatureAccess';
import { supabase } from '../../supabase';
import { notify }   from '../../lib/notify';

// Derived mode — keeps branching logic in one place
type CheckInMode = 'trainer-context' | 'client-with-trainer' | 'standalone';
function resolveMode(clientUserId?: string, linkedTrainerId?: string): CheckInMode {
  if (clientUserId)               return 'trainer-context';
  if (linkedTrainerId)            return 'client-with-trainer';
  return 'standalone';
}
import { CheckInHub }        from './CheckInHub';
import { CheckInVoice as VoiceScreen }   from './CheckInVoice';
import { CheckInQuick as QuickScreen }   from './CheckInQuick';
import { CheckInDetailed as DetailedScreen } from './CheckInDetailed';
import { CheckInResult }     from './CheckInResult';

type Stage = 'hub' | 'voice' | 'quick' | 'detailed' | 'result';

interface Theme { primary: string; accent: string }

type SaveCheckinV2Fn = (data: {
  variant:            'voice' | 'quick' | 'detailed';
  quick_data?:        CheckInQuick;
  detailed_data?:     CheckInDetailed;
  voice_data?:        CheckInVoice;
  safety_gate?:       SafetyGateResult;
  clientUserId?:      string;
}) => Promise<{ error: unknown }>;

interface CheckInProntidaoScreenProps {
  nav:                   NavFn;
  t:                     Theme;
  dark:                  boolean;
  user:                  { id: string | null; plan_key?: string; subscription?: Subscription | null };
  userName?:             string | undefined;
  clientUserId?:         string;
  clientName?:           string;
  biologicalSex?:        string | undefined;
  linkedTrainerId?:      string; // '' = no trainer, non-empty = has trainer
  workoutReadyExpiryMin?: number; // how long the "I'm ready" alert stays live
  saveCheckinV2?:        SaveCheckinV2Fn;
  freeSession?:          boolean; // Free Training Session: only Detailed allowed; blocked readiness halts plan
}

export function CheckInProntidaoScreen({ nav, t, dark, user, userName, clientUserId, clientName, biologicalSex, linkedTrainerId = '', workoutReadyExpiryMin = 30, saveCheckinV2, freeSession = false }: CheckInProntidaoScreenProps) {
  const { t: tr } = useTranslation();
  const mode = resolveMode(clientUserId, linkedTrainerId);
  const last = useLatestCheckin(clientUserId ?? user?.id);
  // Trainers viewing a client always get full check-in (override=true)
  const isTrainerContext   = !!clientUserId;
  const effectivePlanKey   = useEffectivePlanKey(user.subscription ?? null);
  const checkinFullAccess  = useFeatureAccess(effectivePlanKey, 'checkin.full', isTrainerContext);
  const fullCheckinAllowed = checkinFullAccess.allowed;
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
    if (saveCheckinV2) saveCheckinV2(clientUserId ? { ...payload, clientUserId } : payload)
      .catch(err => console.error('[CheckInProntidao] persist failed:', err));
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

  const { primary, accent } = t;

  switch (stage) {
    case 'hub':
      return (
        <CheckInHub
          dark={dark} primary={primary} accent={accent}
          userName={clientName ?? userName}
          isClient={!!clientName}
          onSelect={setStage}
          onBack={() => nav(clientUserId ? 'trainerDashboard' : 'profile')}
          onUpgrade={() => nav('plans', { source: 'manage' })}
          streak={last.streak}
          lastCheckin={last.lastCheckin}
          freeSession={freeSession}
          fullCheckinAllowed={fullCheckinAllowed}
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

    case 'result':
      return result ? (
        <CheckInResult
          dark={dark} primary={primary} accent={accent}
          result={result}
          {...(risk ? { risk } : {})}
          isTrainerContext={mode === 'trainer-context'}
          freeSession={freeSession}
          linkedTrainerId={linkedTrainerId}
          onDone={() => nav(
            mode === 'trainer-context'      ? 'workoutPlanEditor' :
            mode === 'client-with-trainer'  ? 'checkin' :
            'workout'
          )}
          onAlert={() => {
            if (mode === 'trainer-context') {
              nav('trainerDashboard');
            } else if (mode === 'client-with-trainer') {
              const score = result?.readiness_score ?? '?';
              const name  = userName || tr('inbox.notification.yourClient');
              notify(linkedTrainerId, tr('checkin.result.readyPushTitle', { name }), tr('checkin.result.readyPushBody', { score }), undefined, {
                type: 'workout_ready', templateKey: 'ready_to_train',
                params: { name, score }, expiresInMin: workoutReadyExpiryMin,
                ...(user?.id ? { fromUserId: user.id } : {}),
              });
              nav('checkin');
            }
          }}
          onBack={goHub}
        />
      ) : null;

    default:
      return null;
  }
}
