import React from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import type { NavFn } from '../../types';
import type { CheckInQuick, CheckInDetailed, CheckInVoice, CheckInPostWorkout, SafetyGateResult } from '../../types/checkin-v2';
import type { RiskClassification } from '../../types/profile-v2';
import { computeSafetyGate } from './safetyGate';
import { useLatestCheckin, type LatestCheckinData } from '../../hooks/useLatestCheckin';
import { supabase } from '../../supabase';
import { notify }   from '../../lib/notify';
import { Icon } from '../../components/Icon';
import { textPri, textSec, textMute, surfRaised, borderSubtle } from '../../theme';
import { CheckInHub }        from './CheckInHub';
import { CheckInVoice as VoiceScreen }   from './CheckInVoice';
import { CheckInQuick as QuickScreen }   from './CheckInQuick';
import { CheckInDetailed as DetailedScreen } from './CheckInDetailed';
import { CheckInPostWorkout as PostWorkoutScreen } from './CheckInPostWorkout';
import { CheckInResult }     from './CheckInResult';

type Stage = 'hub' | 'voice' | 'quick' | 'detailed' | 'session_picker' | 'post_workout' | 'result';
type SessionRef = { id: string; startedAt: string; durationMin: number | null };

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
  workoutReadyExpiryMin?: number; // how long the "I'm ready" alert stays live
  saveCheckinV2?:        SaveCheckinV2Fn;
  updatePainRecurrence?: (region: string) => Promise<{ error: unknown }>;
}

export function CheckInProntidaoScreen({ nav, t, dark, user, userName, clientUserId, clientName, biologicalSex, linkedTrainerId = '', workoutReadyExpiryMin = 30, saveCheckinV2, updatePainRecurrence }: CheckInProntidaoScreenProps) {
  const { t: tr } = useTranslation();
  const last = useLatestCheckin(clientUserId ?? user?.id);
  const [stage, setStage]         = React.useState<Stage>('hub');
  const [result, setResult]       = React.useState<SafetyGateResult | null>(null);
  const [risk,   setRisk]         = React.useState<RiskClassification | null>(null);

  const goHub = () => { setStage('hub'); setResult(null); setSessionsLoading(false); };
  const [sessionsLoading, setSessionsLoading] = React.useState(false);
  const [completedSessions, setCompletedSessions] = React.useState<SessionRef[]>([]);
  const [selectedSession, setSelectedSession] = React.useState<SessionRef | null>(null);

  const fetchTodaySessions = async () => {
    setSessionsLoading(true);
    const uid = clientUserId ?? user?.id;
    if (!uid) { setSessionsLoading(false); return; }
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from('workout_sessions')
      .select('id, started_at, duration_minutes')
      .eq('user_id', uid)
      .eq('status', 'completed')
      .gte('started_at', today)
      .order('started_at', { ascending: false });
    const sessions: SessionRef[] = (data ?? []).map((r: any) => ({
      id: r.id,
      startedAt: r.started_at,
      durationMin: r.duration_minutes,
    }));
    setCompletedSessions(sessions);
    setSessionsLoading(false);
    if (sessions.length === 1 && sessions[0]) {
      setSelectedSession(sessions[0]);
      setStage('post_workout');
    }
  };

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
          onSelect={v => { if (v === 'post_workout') { void fetchTodaySessions(); } else setStage(v); }}
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

    case 'session_picker':
      return (
        <div style={{ padding: '24px 20px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <button onClick={goHub} style={{ background: 'none', border: 'none', cursor: 'pointer', color: textMute(dark) }}>
              <Icon name="back" size={22} color={textMute(dark)}/>
            </button>
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: primary }}>TRAINER · MODULE 02</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: textPri(dark) }}>{tr('checkin.postWorkout.title')}</div>
            </div>
          </div>
          {sessionsLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: textMute(dark), fontSize: 13 }}>{tr('common.loading')}</div>
          ) : completedSessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏋️</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: textPri(dark), marginBottom: 4 }}>{tr('checkin.postWorkout.noCompletedSessions')}</div>
              <div style={{ fontSize: 12, color: textMute(dark) }}>{tr('checkin.postWorkout.noCompletedSessionsSub')}</div>
              <button onClick={goHub} style={{
                marginTop: 20, padding: '10px 24px', borderRadius: 10,
                background: primary, color: '#0E1A2B', border: 'none',
                fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>{tr('checkin.hub.back')}</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {completedSessions.map(s => {
                const time = s.startedAt ? new Date(s.startedAt).toLocaleTimeString(i18n.language || 'pt', { hour: '2-digit', minute: '2-digit' }) : '';
                const dur  = s.durationMin ? `${s.durationMin} min` : '';
                return (
                  <button key={s.id} onClick={() => { setSelectedSession(s); setStage('post_workout'); }} style={{
                    padding: '14px 16px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                    background: surfRaised(dark), border: `1.5px solid ${borderSubtle(dark)}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: textPri(dark) }}>{tr('checkin.postWorkout.sessionLabel', { time })}</span>
                      {dur ? <span style={{ fontSize: 11, color: textMute(dark) }}>{dur}</span> : null}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: primary }}>{tr('checkin.postWorkout.evaluate')}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );

    case 'post_workout':
      return (
        <PostWorkoutScreen
          dark={dark} primary={primary} accent={accent}
          sessionInfo={selectedSession}
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
              const name  = userName || tr('inbox.notification.yourClient');
              notify(
                linkedTrainerId,
                `${name} is ready to train`,
                `Readiness ${score}/100 \u00b7 Approve or reject their workout request.`,
                undefined,
                {
                  type: 'workout_ready',
                  templateKey: 'ready_to_train',
                  params: { name, score },
                  expiresInMin: workoutReadyExpiryMin,
                  ...(user?.id ? { fromUserId: user.id } : {}),
                }
              );
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
