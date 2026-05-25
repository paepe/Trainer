import React from 'react';
import { supabase } from '../../supabase';
import { Icon } from '../../components/Icon';
import { PillInput } from '../../components/PillInput';
import { requestWorkoutPlan } from '../../lib/workoutGeneration';
import {
  surfRaised,
  borderSubtle,
  textPri,
  textSec,
  textMute,
  ghostBtn,
  iconBtn,
} from '../../theme';
import type { NavFn } from '../../types';

interface Theme {
  primary:     string;
  primaryDeep: string;
  primarySoft: string;
  accent:      string;
}

interface ClientProfile {
  id:    string;
  name:  string;
  email: string;
}

interface PhysicalProfile {
  primary_goal?:  string | null;
  fitness_level?: string | null;
  weight_kg?:     number | null;
  height_cm?:     number | null;
}

interface CheckIn {
  energy?:        number | null;
  soreness?:      string[] | null;
  minutes?:       number | null;
  goal?:          string | null;
  sleep_quality?: string | null;
  date?:          string | null;
}

interface WorkoutPlanEditorContext {
  physicalProfile: PhysicalProfile | null;
  latestCheckin:   CheckIn | null;
}

interface WorkoutExercise {
  exercise_name: string;
  muscle_group:  string;
  sets:          number;
  reps:          number;
  load_kg:       string | number;
  rest_seconds:  number;
  notes?:        string;
}

interface TrainerDashboardUser {
  id:    string;
  name?: string;
  email?: string;
}

interface WorkoutPlanEditorScreenProps {
  nav:             NavFn;
  t:               Theme;
  dark:            boolean;
  user:            TrainerDashboardUser | null;
  selectedClient?: ClientProfile | null;
}

export function WorkoutPlanEditorScreen({
  nav,
  t,
  dark,
  user,
  selectedClient,
}: WorkoutPlanEditorScreenProps) {
  const [context, setContext] = React.useState<WorkoutPlanEditorContext | null>(null);
  const [exercises, setExercises] = React.useState<WorkoutExercise[]>([]);
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [draft, setDraft] = React.useState<WorkoutExercise>({
    exercise_name: '',
    muscle_group:  '',
    sets:          3,
    reps:          10,
    load_kg:       '',
    rest_seconds:  60,
    notes:         '',
  });
  const [trainerNotes, setTrainerNotes] = React.useState('');
  const [saving, setSaving]             = React.useState(false);
  const [saved, setSaved]               = React.useState(false);
  const [aiLoading, setAiLoading]       = React.useState(false);
  const [aiError, setAiError]           = React.useState('');

  const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Core', 'Legs', 'Full body', 'Cardio'];

  async function askAI() {
    setAiLoading(true);
    setAiError('');
    try {
      const generatedExercises = await requestWorkoutPlan({
        checkin:         (context?.latestCheckin ?? null) as never,
        physicalProfile: (context?.physicalProfile ?? null) as never,
      });

      setExercises(generatedExercises.map(ex => ({
        exercise_name: ex.exercise_name,
        muscle_group:  ex.muscle_group || '',
        sets:          ex.sets || 3,
        reps:          ex.reps || 10,
        load_kg:       ex.load_kg ?? '',
        rest_seconds:  ex.rest_seconds || 60,
        notes:         ex.notes || '',
      })));
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setAiLoading(false);
    }
  }

  React.useEffect(() => {
    if (!selectedClient?.id) return;
    Promise.all([
      supabase.from('physical_profiles').select('*').eq('user_id', selectedClient.id).maybeSingle(),
      supabase.from('checkins').select('*').eq('user_id', selectedClient.id).order('date', { ascending: false }).limit(1).maybeSingle(),
    ]).then(([profileRes, checkinRes]) => {
      setContext({ physicalProfile: profileRes.data, latestCheckin: checkinRes.data });
    });
  }, [selectedClient?.id]);

  function addExercise() {
    if (!draft.exercise_name.trim()) return;
    setExercises([...exercises, { ...draft }]);
    setDraft({
      exercise_name: '',
      muscle_group:  '',
      sets:          3,
      reps:          10,
      load_kg:       '',
      rest_seconds:  60,
      notes:         '',
    });
    setShowAddForm(false);
  }

  async function sendPlan(status: string) {
    if (!selectedClient?.id || exercises.length === 0 || !user?.id) return;
    setSaving(true);
    const { data: plan, error } = await supabase
      .from('workout_plans')
      .insert({
        created_by:     user.id,
        assigned_to:    selectedClient.id,
        source:         'manual',
        status,
        trainer_notes:  trainerNotes || null,
        scheduled_date: new Date().toISOString().slice(0, 10),
      })
      .select()
      .single();

    if (error || !plan) {
      setSaving(false);
      return;
    }

    await supabase.from('plan_exercises').insert(
      exercises.map((ex, i) => ({
        plan_id:       plan.id,
        exercise_name: ex.exercise_name,
        muscle_group:  ex.muscle_group,
        sets:          ex.sets,
        reps:          ex.reps,
        load_kg:       ex.load_kg !== '' ? Number(ex.load_kg) : null,
        rest_seconds:  ex.rest_seconds,
        notes:         ex.notes || null,
        order_index:   i,
      }))
    );

    setSaving(false);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      nav('trainerDashboard');
    }, 1200);
  }

  if (!selectedClient) {
    return (
      <div style={{ padding: '60px 32px', textAlign: 'center', color: textSec(dark), fontSize: 13 }}>
        No client selected.
        <button
          onClick={() => nav('trainerDashboard')}
          style={{ ...ghostBtn(dark), display: 'block', margin: '16px auto 0' }}
        >
          ← Back to clients
        </button>
      </div>
    );
  }

  const latestCheckinSoreness = Array.isArray(context?.latestCheckin?.soreness) ? context.latestCheckin.soreness : [];
  const hasSoreness = latestCheckinSoreness.length > 0 && latestCheckinSoreness[0] !== 'None';

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      
      {/* Header */}
      <div style={{ padding: '20px 22px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={() => nav('trainerDashboard')} style={{ ...iconBtn(dark), marginLeft: -4 }}>
          <Icon name="chevL" size={22} color={textPri(dark)} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: t.primary }}>
            Workout Plan
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: textPri(dark), fontFamily: '"Plus Jakarta Sans",sans-serif' }}>
            {selectedClient.name || 'Client'}
          </div>
        </div>
        {saved && (
          <div style={{ padding: '6px 14px', borderRadius: 999, background: `${t.primary}22`, color: t.primary, fontSize: 12, fontWeight: 700 }}>
            Sent ✓
          </div>
        )}
      </div>

      {/* Client context card */}
      {context && (
        <div style={{ margin: '14px 22px 0', padding: '14px 16px', borderRadius: 14, background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 8 }}>
            Today's context
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {context.latestCheckin ? (
              <>
                <span style={{ fontSize: 12, color: textSec(dark) }}>
                  Energy <span style={{ fontWeight: 700, color: t.primary }}>{context.latestCheckin.energy}/10</span>
                </span>
                {hasSoreness && (
                  <span style={{ fontSize: 12, color: t.accent, fontWeight: 600 }}>
                    ⚠ {latestCheckinSoreness.join(', ')}
                  </span>
                )}
                <span style={{ fontSize: 12, color: textSec(dark) }}>
                  <span style={{ fontWeight: 700, color: textPri(dark) }}>{context.latestCheckin.minutes}min</span> available
                </span>
              </>
            ) : (
              <span style={{ fontSize: 12, color: textMute(dark) }}>No check-in today</span>
            )}
            {context.physicalProfile?.primary_goal && (
              <span style={{ fontSize: 12, color: textSec(dark) }}>
                Goal <span style={{ fontWeight: 700, color: textPri(dark) }}>{context.physicalProfile.primary_goal}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Exercise list */}
      <div style={{ padding: '16px 22px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textMute(dark) }}>
            Exercises ({exercises.length})
          </div>
          <button onClick={() => setShowAddForm(v => !v)} style={{
            padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
            background: `${t.primary}22`, color: t.primary, border: 'none',
            fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <Icon name="plus" size={12} color={t.primary} /> Add
          </button>
        </div>

        {exercises.length === 0 && !showAddForm && (
          <div style={{ padding: '18px 0', textAlign: 'center', color: textMute(dark), fontSize: 13 }}>
            Tap Add to build the plan.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {exercises.map((ex, i) => (
            <div key={i} style={{
              padding: '12px 14px', borderRadius: 12,
              background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}`,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: textPri(dark) }}>{ex.exercise_name}</div>
                <div style={{ fontSize: 11, color: textSec(dark), marginTop: 3 }}>
                  {ex.muscle_group && `${ex.muscle_group} · `}{ex.sets}×{ex.reps}
                  {ex.load_kg ? ` · ${ex.load_kg}kg` : ''}{ex.rest_seconds ? ` · ${ex.rest_seconds}s` : ''}
                </div>
              </div>
              <button onClick={() => setExercises(exercises.filter((_, idx) => idx !== i))} style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: textMute(dark), fontSize: 18, lineHeight: 1, padding: '2px 6px', fontFamily: 'inherit',
              }}>×</button>
            </div>
          ))}
        </div>

        {/* Add exercise form */}
        {showAddForm && (
          <div style={{
            marginTop: 10, padding: 16, borderRadius: 14,
            background: surfRaised(dark), border: `1.5px solid ${t.primary}`,
            display: 'flex', flexDirection: 'column', gap: 10
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: textPri(dark) }}>New exercise</div>
            <PillInput
              icon="dumbbell"
              placeholder="Exercise name"
              value={draft.exercise_name}
              onChange={v => setDraft({ ...draft, exercise_name: v })}
              primary={t.primary}
              dark={dark}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {MUSCLE_GROUPS.map(mg => {
                const on = draft.muscle_group === mg;
                return (
                  <button key={mg} onClick={() => setDraft({ ...draft, muscle_group: on ? '' : mg })} style={{
                    padding: '5px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                    background: on ? t.primary : (dark ? '#1F2E45' : '#EEF1F7'),
                    color: on ? '#0E1A2B' : textSec(dark),
                    border: 'none', fontFamily: 'inherit', cursor: 'pointer',
                  }}>{mg}</button>
                );
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {(['sets', 'reps'] as const).map(key => {
                const label = key === 'sets' ? 'Sets' : 'Reps';
                const min = 1;
                const max = key === 'sets' ? 10 : 50;
                return (
                  <div key={key}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: textMute(dark), marginBottom: 6, letterSpacing: '.06em', textTransform: 'uppercase' }}>
                      {label}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button
                        onClick={() => setDraft({ ...draft, [key]: Math.max(min, Number(draft[key]) - 1) })}
                        style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${borderSubtle(dark)}`, background: 'transparent', color: textPri(dark), fontFamily: 'inherit', fontSize: 16, cursor: 'pointer' }}
                      >
                        −
                      </button>
                      <span style={{ fontSize: 16, fontWeight: 700, color: textPri(dark), minWidth: 24, textAlign: 'center' }}>
                        {draft[key]}
                      </span>
                      <button
                        onClick={() => setDraft({ ...draft, [key]: Math.min(max, Number(draft[key]) + 1) })}
                        style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${borderSubtle(dark)}`, background: 'transparent', color: textPri(dark), fontFamily: 'inherit', fontSize: 16, cursor: 'pointer' }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <PillInput icon="bolt"  placeholder="Load (kg)" value={String(draft.load_kg || '')}
                onChange={v => setDraft({ ...draft, load_kg: v })} primary={t.primary} dark={dark}/>
              <PillInput icon="clock" placeholder="Rest (s)"  value={String(draft.rest_seconds || '')}
                onChange={v => setDraft({ ...draft, rest_seconds: Number(v) || 60 })} primary={t.primary} dark={dark}/>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowAddForm(false)} style={{ ...ghostBtn(dark), flex: 1, padding: '11px 0', textAlign: 'center', borderRadius: 10 }}>
                Cancel
              </button>
              <button onClick={addExercise} style={{ flex: 2, padding: '12px 0', borderRadius: 999, background: t.primary, color: '#0E1A2B', border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Add exercise
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Trainer notes */}
      <div style={{ padding: '14px 22px 0' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 6 }}>
          Trainer notes
        </div>
        <textarea
          value={trainerNotes}
          onChange={e => setTrainerNotes(e.target.value)}
          placeholder="Notes visible to the client…"
          rows={2}
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 12, boxSizing: 'border-box',
            background: dark ? '#142233' : '#F4F6FA',
            border: `1.5px solid ${borderSubtle(dark)}`,
            color: textPri(dark), fontFamily: 'inherit', fontSize: 13,
            resize: 'none', outline: 'none',
          }}
        />
      </div>

      {/* AI error */}
      {aiError && (
        <div style={{ margin: '0 22px', padding: '10px 14px', borderRadius: 10, background: `${t.accent}22`, color: t.accent, fontSize: 12 }}>
          {aiError}
        </div>
      )}

      {/* Actions */}
      <div style={{ padding: '14px 22px 32px', display: 'flex', gap: 10 }}>
        <button onClick={askAI} disabled={aiLoading} style={{
          flex: 1, padding: '13px 0', borderRadius: 14,
          border: `1.5px solid ${aiLoading ? borderSubtle(dark) : t.primary}`,
          background: aiLoading ? (dark ? '#142233' : '#F4F6FA') : `${t.primary}18`,
          color: aiLoading ? textMute(dark) : t.primary,
          fontFamily: 'inherit', fontSize: 11, fontWeight: 700, cursor: aiLoading ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          transition: 'all .15s',
        }}>
          {aiLoading ? (
            <>
              <div style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${t.primary}44`, borderTopColor: t.primary, animation: 'spin 0.7s linear infinite' }}/>
              Generating…
            </>
          ) : '✦ Ask AI'}
        </button>
        <button onClick={() => sendPlan('draft')} disabled={saving || exercises.length === 0} style={{
          flex: 1, padding: '13px 0', borderRadius: 14,
          border: `1.5px solid ${dark ? '#1F2E45' : '#D0D8E4'}`,
          background: 'transparent', color: textPri(dark),
          fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          opacity: exercises.length === 0 ? 0.4 : 1,
        }}>Save draft</button>
        <button onClick={() => sendPlan('sent')} disabled={saving || exercises.length === 0} style={{
          flex: 2, padding: '13px 0', borderRadius: 999,
          background: exercises.length === 0 ? (dark ? '#1F2E45' : '#D0D8E4') : t.primary,
          color: exercises.length === 0 ? textMute(dark) : '#0E1A2B',
          border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          opacity: saving ? 0.7 : 1,
        }}>{saving ? 'Sending…' : 'Send to client →'}</button>
      </div>
    </>
  );
}
