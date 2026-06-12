import React from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput, Spinner } from '@/ui';
import { supabase } from '../../supabase';
import { Icon } from '../../components/Icon';
import { notify } from '../../lib/notify';
import { requestWorkoutPlan } from '../../lib/workoutGeneration';
import type { GeneratedWorkoutExercise, ExistingExerciseSummary } from '../../lib/workoutGeneration';
import {
  surfRaised,
  borderSubtle,
  textPri,
  textSec,
  textMute,
  ghostBtn,
  iconBtn,
  primaryBtn,
  outlineBtn,
} from '../../theme';
import type { NavFn } from '../../types';
import type { ProtocolExerciseItem } from '../../types/workout';
import { THEME_VARS as DARK } from '../../theme/tokens';
import { useTrainerTheme } from '../../hooks/useTrainerTheme';
import { friendlyError } from '../../lib/friendlyError';
import type { ConsentMatrix } from '../../types/profile-v2';
import { applyConsentToProfile } from '../../profile/consentVisibility';

interface ClientProfile {
  id:         string;
  name:       string;
  email:      string;
  avatar_url: string | null;
}

interface PhysicalProfile {
  primary_goal?:     string | null;
  fitness_level?:    string | null;
  equipment?:        string[] | null;
  session_min?:      number | null;
  restrictions?:     string[] | null;
}

interface CheckIn {
  energy?:           number | null;
  pain_region?:      string | null;
  pain_present?:     boolean | null;
  minutes?:          number | null;
  sleep_quality?:    string | null;
  training_location?: string | null;
  occurred_at?:      string | null;
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

  user:            TrainerDashboardUser | null;
  selectedClient?: ClientProfile | null;
  freeSession?:    boolean; // Free Training Session: hide "send to client", relabel live CTA
}

export function WorkoutPlanEditorScreen({
  nav,
  user,
  selectedClient,
  freeSession = false,
}: WorkoutPlanEditorScreenProps) {
  const { t, dark } = useTrainerTheme();
  const { t: tr } = useTranslation();
  const [context, setContext] = React.useState<WorkoutPlanEditorContext | null>(null);
  const [personalConsent, setPersonalConsent] = React.useState<ConsentMatrix | null>(null);
  const [exercises, setExercises] = React.useState<WorkoutExercise[]>([]);
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [nameError,   setNameError]   = React.useState(false);
  const [draft, setDraft] = React.useState<WorkoutExercise>({
    exercise_name: '',
    muscle_group:  '',
    sets:          3,
    reps:          10,
    load_kg:       '',
    rest_seconds:  60,
    notes:         '',
  });
  const [editingIndex,       setEditingIndex]       = React.useState<number | null>(null);
  const [catalogSuggestions, setCatalogSuggestions] = React.useState<ProtocolExerciseItem[]>([]);
  const [catalogLoading,     setCatalogLoading]     = React.useState(false);
  const catalogSearchRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [trainerNotes, setTrainerNotes] = React.useState('');
  const [saving, setSaving]             = React.useState(false);
  const [saved, setSaved]               = React.useState(false);
  const [aiLoading, setAiLoading]       = React.useState(false);
  const [aiError, setAiError]           = React.useState('');

  // EN values are the canonical DB keys; labels are localised for display only
  const MUSCLE_GROUPS_EN     = ['Chest','Back','Shoulders','Arms','Core','Legs','Full body','Cardio'] as const;
  const MUSCLE_GROUPS_LABELS = tr('trainer.planner.muscleGroups', { returnObjects: true }) as string[];

  const searchCatalog = (query: string) => {
    if (catalogSearchRef.current) clearTimeout(catalogSearchRef.current);
    if (query.trim().length < 2) { setCatalogSuggestions([]); return; }
    catalogSearchRef.current = setTimeout(async () => {
      setCatalogLoading(true);
      const { data } = await supabase
        .from('protocol_exercises')
        .select('id,protocol_id,exercise_name,muscle_group,sets,reps,load_kg,rest_seconds,notes,alternative_exercise,order_index')
        .ilike('exercise_name', `%${query.trim()}%`)
        .order('exercise_name', { ascending: true })
        .limit(30);
      // Deduplicate by exercise_name — keep first occurrence (best prescriptive defaults)
      const seen = new Set<string>();
      const deduped = ((data as ProtocolExerciseItem[] | null) ?? []).filter(row => {
        const key = row.exercise_name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 6);
      setCatalogSuggestions(deduped);
      setCatalogLoading(false);
    }, 280);
  };

  const applyFromCatalog = (item: ProtocolExerciseItem) => {
    setDraft(prev => ({
      ...prev,
      exercise_name: item.exercise_name,
      muscle_group:  item.muscle_group ?? prev.muscle_group,
      sets:          item.sets         ?? prev.sets,
      reps:          item.reps         ?? prev.reps,
      load_kg:       item.load_kg != null ? item.load_kg : prev.load_kg,
      rest_seconds:  item.rest_seconds ?? prev.rest_seconds,
      notes:         item.notes        ?? prev.notes ?? '',
    }));
    setCatalogSuggestions([]);
    setNameError(false);
  };

  async function askAI() {
    setAiLoading(true);
    setAiError('');
    try {
      const pp  = context?.physicalProfile;
      const ci  = context?.latestCheckin;

      // Estimate time consumed by existing exercises: sets × ~3 min/set
      const existingSummary: ExistingExerciseSummary[] = exercises.map(ex => ({
        exercise_name: ex.exercise_name,
        muscle_group:  ex.muscle_group,
        sets:          ex.sets,
        reps:          ex.reps,
      }));
      const usedMinutes   = exercises.reduce((acc, ex) => acc + ex.sets * 3, 0);
      const totalMinutes  = ci?.minutes ?? pp?.session_min ?? 45;
      const remaining     = Math.max(0, totalMinutes - usedMinutes);

      const generatedExercises = await requestWorkoutPlan({
        checkin: ci ? {
          energy:        ci.energy        ?? 7,
          soreness:      ci.pain_present && ci.pain_region ? [ci.pain_region] : [],
          minutes:       remaining > 0 ? remaining : (ci.minutes ?? 45),
          goal:          pp?.primary_goal ?? 'general',
          location:      (ci.training_location ?? 'gym') as never,
          sleep_quality: (ci.sleep_quality     ?? 'good') as never,
          equipment:     (pp?.equipment ?? []) as never,
        } : null,
        physicalProfile: pp ? {
          primary_goal:      pp.primary_goal      ?? undefined,
          fitness_level:     pp.fitness_level     ?? undefined,
          available_minutes: pp.session_min        ?? undefined,
          equipment:         pp.equipment          ?? undefined,
          restrictions:      pp.restrictions       ?? undefined,
        } as never : null,
        locale: 'en',
        ...(existingSummary.length ? { existingExercises: existingSummary, remainingMinutes: remaining } : {}),
      });

      const mapped = generatedExercises.map(ex => ({
        exercise_name: ex.exercise_name,
        muscle_group:  ex.muscle_group || '',
        sets:          ex.sets || 3,
        reps:          ex.reps || 10,
        load_kg:       ex.load_kg ?? '',
        rest_seconds:  ex.rest_seconds || 60,
        notes:         ex.notes || '',
      }));

      // Append to existing — never replace
      setExercises(prev => prev.length ? [...prev, ...mapped] : mapped);
    } catch (err: unknown) {
      setAiError(friendlyError(err, tr));
    } finally {
      setAiLoading(false);
    }
  }

  React.useEffect(() => {
    if (!selectedClient?.id) return;
    Promise.all([
      supabase
        .from('profile_v2')
        .select('objectives, movement_history, environment, availability, consent')
        .eq('user_id', selectedClient.id)
        .maybeSingle(),
      supabase
        .from('checkin_prontidao')
        .select('energy_level, sleep_quality, available_minutes, training_location, pain_present, quick_data, occurred_at')
        .eq('user_id', selectedClient.id)
        .order('occurred_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]).then(([profileRes, checkinRes]) => {
      const pv2 = profileRes.data as {
        objectives?:       { primary_goal?: string } | null;
        movement_history?: { fitness_level?: string } | null;
        environment?:      { equipment?: string[] }   | null;
        availability?:     { session_duration_min?: number } | null;
        consent?:          ConsentMatrix | null;
      } | null;

      const ci = checkinRes.data;
      const qd = ci?.quick_data as { pain?: { region?: string } } | null | undefined;

      setPersonalConsent(pv2?.consent ?? null);
      setContext({
        physicalProfile: pv2 ? {
          primary_goal:  pv2.objectives?.primary_goal  ?? null,
          fitness_level: pv2.movement_history?.fitness_level ?? null,
          equipment:     (pv2.environment?.equipment   ?? null) as string[] | null,
          session_min:   pv2.availability?.session_duration_min ?? null,
          restrictions:  null,
        } : null,
        latestCheckin: ci ? {
          energy:            ci.energy_level,
          sleep_quality:     ci.sleep_quality,
          minutes:           ci.available_minutes,
          training_location: ci.training_location,
          pain_present:      ci.pain_present,
          pain_region:       qd?.pain?.region ?? null,
          occurred_at:       ci.occurred_at,
        } : null,
      });
    });
  }, [selectedClient?.id]);

  function startEdit(index: number) {
    setEditingIndex(index);
    setDraft({ ...exercises[index] } as WorkoutExercise);
    setShowAddForm(true);
    setCatalogSuggestions([]);
  }

  function addExercise() {
    if (!draft.exercise_name.trim()) { setNameError(true); return; }
    setNameError(false);
    if (editingIndex !== null) {
      setExercises(exercises.map((ex, i) => i === editingIndex ? { ...draft } : ex));
      setEditingIndex(null);
    } else {
      setExercises([...exercises, { ...draft }]);
    }
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

    // Send push notification to client
    if (status === 'sent' && selectedClient?.id) {
      const trainer = user.name?.split(' ')[0] || tr('inbox.yourTrainerFallback');
      void notify(selectedClient.id, 'New workout plan', `${trainer} sent you a workout plan`,
        undefined, { type: 'plan_sent', templateKey: 'new_plan', params: { trainerName: trainer } });
    }

    setTimeout(() => {
      setSaved(false);
      nav('trainerDashboard');
    }, 1200);
  }

  const startSessionNow = () => {
    if (!selectedClient?.id || exercises.length === 0) return;
    const converted: GeneratedWorkoutExercise[] = exercises.map(ex => ({
      exercise_name: ex.exercise_name,
      muscle_group:  ex.muscle_group,
      sets:          ex.sets,
      reps:          ex.reps,
      load_kg:       ex.load_kg !== '' ? Number(ex.load_kg) : null,
      rest_seconds:  ex.rest_seconds,
      notes:         ex.notes || null,
    }));
    // freeSession is driven by App state (not payload) — router injects it into WorkoutModeScreen.
    nav('workoutMode', {
      planId:       null,
      exercises:    converted,
      clientUserId: selectedClient.id,
      clientName:   selectedClient.name ?? tr('trainer.planner.clientFallback'),
    });
  };

  if (!selectedClient) {
    return (
      <div style={{ padding: '60px 32px', textAlign: 'center', color: textSec(dark), fontSize: 13 }}>
        {tr('trainer.planner.noClientSelected')}
        <button
          onClick={() => nav('trainerDashboard')}
          style={{ ...ghostBtn(dark), display: 'block', margin: '16px auto 0' }}
        >
          {tr('trainer.planner.backToClients')}
        </button>
      </div>
    );
  }

  const hasPain = !!(context?.latestCheckin?.pain_present && context?.latestCheckin?.pain_region);

  // Visual consent matrix (personal) — gates the "today's context" card only.
  // Does not affect what's sent to the AI in askAI() (context.physicalProfile is untouched).
  const consentView = applyConsentToProfile({
    objectives:       context?.physicalProfile?.primary_goal  != null ? { primary_goal:  context.physicalProfile.primary_goal }  : undefined,
    movement_history: context?.physicalProfile?.fitness_level != null ? { fitness_level: context.physicalProfile.fitness_level } : undefined,
    consent:          personalConsent,
  }, 'personal');
  const showGoal  = consentView.training_objective.mode === 'full' || consentView.training_objective.mode === 'summary';
  const showLevel = consentView.training_history.mode   === 'full' || consentView.training_history.mode   === 'summary';

  return (
    <>

      {/* Header */}
      <div style={{ padding: '20px 22px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={() => nav('trainerDashboard')} style={{ ...iconBtn(dark), marginLeft: -4 }}>
          <Icon name="chevL" size={22} color={textPri(dark)} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: t.primary }}>
            {tr('trainer.planner.headerKicker')}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: textPri(dark), fontFamily: '"Plus Jakarta Sans",sans-serif' }}>
            {selectedClient.name || tr('trainer.planner.clientFallback')}
          </div>
        </div>
        {saved && (
          <div style={{ padding: '6px 14px', borderRadius: 999, background: `${t.primary}22`, color: t.primary, fontSize: 12, fontWeight: 700 }}>
            {tr('trainer.planner.sent')}
          </div>
        )}
      </div>

      {/* Client context card */}
      {context && (
        <div style={{ margin: '14px 22px 0', padding: '14px 16px', borderRadius: 14, background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 8 }}>
            {tr('trainer.planner.todaysContext')}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {context.latestCheckin ? (
              <>
                <span style={{ fontSize: 12, color: textSec(dark) }}>
                  Energy <span style={{ fontWeight: 700, color: t.primary }}>{context.latestCheckin.energy ?? '—'}/10</span>
                </span>
                {hasPain && (
                  <span style={{ fontSize: 12, color: t.accent, fontWeight: 600 }}>
                    ⚠ {context.latestCheckin.pain_region}
                  </span>
                )}
                {context.latestCheckin.minutes != null && (
                  <span style={{ fontSize: 12, color: textSec(dark) }}>
                    <span style={{ fontWeight: 700, color: textPri(dark) }}>{context.latestCheckin.minutes}min</span> {tr('trainer.planner.available')}
                  </span>
                )}
                {context.latestCheckin.training_location && (
                  <span style={{ fontSize: 12, color: textSec(dark) }}>{context.latestCheckin.training_location}</span>
                )}
              </>
            ) : (
              <span style={{ fontSize: 12, color: textMute(dark) }}>{tr('trainer.planner.noCheckin')}</span>
            )}
            {showGoal && context.physicalProfile?.primary_goal && (
              <span style={{ fontSize: 12, color: textSec(dark) }}>
                {tr('trainer.planner.goal')}<span style={{ fontWeight: 700, color: textPri(dark) }}>{context.physicalProfile.primary_goal}</span>
              </span>
            )}
            {showLevel && context.physicalProfile?.fitness_level && (
              <span style={{ fontSize: 12, color: textSec(dark) }}>
                {tr('trainer.planner.level')}<span style={{ fontWeight: 700, color: textPri(dark) }}>{context.physicalProfile.fitness_level}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Exercise list */}
      <div style={{ padding: '16px 22px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textMute(dark) }}>
            {tr('trainer.planner.exercisesHeader', { count: exercises.length })}
          </div>
          <button onClick={() => setShowAddForm(v => !v)} style={{
            padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
            background: `${t.accent}22`, color: t.accent, border: 'none',
            fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <Icon name="plus" size={12} color={t.primary} /> {tr('trainer.planner.addBtn')}
          </button>
        </div>

        {exercises.length === 0 && !showAddForm && (
          <div style={{ padding: '18px 0', textAlign: 'center', color: textMute(dark), fontSize: 13 }}>
            {tr('trainer.planner.emptyHint')}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {exercises.map((ex, i) => (
            <div
              key={i}
              onClick={() => { if (editingIndex !== i) startEdit(i); }}
              style={{
                padding: '12px 14px', borderRadius: 12,
                background: editingIndex === i ? `${t.primary}18` : surfRaised(dark),
                border: `1px solid ${editingIndex === i ? t.primary : borderSubtle(dark)}`,
                display: 'flex', alignItems: 'center', gap: 12,
                cursor: 'pointer',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: textPri(dark) }}>{ex.exercise_name}</div>
                <div style={{ fontSize: 11, color: textSec(dark), marginTop: 3 }}>
                  {ex.muscle_group && `${ex.muscle_group} · `}{ex.sets}×{ex.reps}
                  {ex.load_kg ? ` · ${ex.load_kg}kg` : ''}{ex.rest_seconds ? ` · ${ex.rest_seconds}s` : ''}
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); setExercises(exercises.filter((_, idx) => idx !== i)); if (editingIndex === i) { setShowAddForm(false); setEditingIndex(null); } }}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: textMute(dark), fontSize: 18, lineHeight: 1, padding: '2px 6px', fontFamily: 'inherit',
                }}
              >×</button>
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
            <div style={{ fontSize: 12, fontWeight: 700, color: textPri(dark) }}>
              {editingIndex !== null ? tr('trainer.planner.editExercise') : tr('trainer.planner.newExercise')}
            </div>
            <div style={{ position: 'relative' }}>
              <TextInput
                icon="dumbbell"
                placeholder={tr('trainer.planner.exerciseName')}
                value={draft.exercise_name}
                onChange={v => {
                  setDraft({ ...draft, exercise_name: v });
                  setNameError(false);
                  searchCatalog(v);
                }}
              />
              {nameError && (
                <div style={{ fontSize: 11.5, color: t.accent, marginTop: 4, paddingLeft: 4, fontWeight: 600 }}>
                  {tr('trainer.planner.nameRequired')}
                </div>
              )}
              {/* Catalog search dropdown */}
              {(catalogLoading || catalogSuggestions.length > 0) && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                  background: DARK.surface, border: `1px solid ${borderSubtle(dark)}`,
                  borderRadius: 12, marginTop: 4,
                  boxShadow: '0 8px 24px rgba(0,0,0,.35)',
                  overflow: 'hidden',
                }}>
                  {catalogLoading && (
                    <div style={{ padding: '10px 14px', fontSize: 12, color: textMute(dark), display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Spinner size={12} color={textMute(dark)}/> {tr('trainer.planner.catalogSearching')}
                    </div>
                  )}
                  {!catalogLoading && catalogSuggestions.map(item => {
                    const prescription = [
                      item.sets && item.reps ? `${item.sets}×${item.reps}` : null,
                      item.load_kg != null   ? `${item.load_kg}kg`         : null,
                      item.rest_seconds      ? `${item.rest_seconds}s`     : null,
                    ].filter(Boolean).join(' · ');
                    return (
                      <button
                        key={item.id}
                        onMouseDown={e => { e.preventDefault(); applyFromCatalog(item); }}
                        style={{
                          width: '100%', textAlign: 'left', padding: '10px 14px',
                          background: 'transparent', border: 'none',
                          borderBottom: `1px solid ${borderSubtle(dark)}`,
                          cursor: 'pointer', fontFamily: 'inherit',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: textPri(dark) }}>{item.exercise_name}</div>
                          {prescription && (
                            <div style={{ fontSize: 11, color: textMute(dark), marginTop: 1 }}>
                              {prescription}
                            </div>
                          )}
                        </div>
                        {item.muscle_group && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                            background: `${t.accent}22`, color: t.accent, flexShrink: 0,
                          }}>
                            {item.muscle_group}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {!catalogLoading && catalogSuggestions.length === 0 && draft.exercise_name.trim().length >= 2 && (
                    <div style={{ padding: '10px 14px', fontSize: 12, color: textMute(dark) }}>
                      {tr('trainer.planner.catalogNoResults')}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {MUSCLE_GROUPS_EN.map((mgEn, idx) => {
                const on    = draft.muscle_group === mgEn;
                const label = MUSCLE_GROUPS_LABELS[idx] ?? mgEn;
                return (
                  <button key={mgEn} onClick={() => setDraft({ ...draft, muscle_group: on ? '' : mgEn })} style={{
                    padding: '5px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                    background: on ? t.accent : DARK.surface,
                    color: on ? '#fff' : textSec(dark),
                    border: 'none', fontFamily: 'inherit', cursor: 'pointer',
                  }}>{label}</button>
                );
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {(['sets', 'reps'] as const).map(key => {
                const label = key === 'sets' ? tr('trainer.planner.sets') : tr('trainer.planner.reps');
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
              <TextInput icon="bolt"  placeholder={tr('trainer.planner.loadPlaceholder')} value={String(draft.load_kg || '')}
                onChange={v => setDraft({ ...draft, load_kg: v })}/>
              <TextInput icon="clock" placeholder={tr('trainer.planner.restPlaceholder')}  value={String(draft.rest_seconds || '')}
                onChange={v => setDraft({ ...draft, rest_seconds: Number(v) || 60 })}/>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowAddForm(false); setEditingIndex(null); }} style={{ ...ghostBtn(dark), flex: 1, padding: '11px 0', textAlign: 'center', borderRadius: 10 }}>
                {tr('trainer.planner.cancelBtn')}
              </button>
              <button onClick={addExercise} style={{ flex: 2, padding: '12px 0', borderRadius: 14, background: t.accent, color: '#fff', border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {editingIndex !== null ? tr('trainer.planner.updateExerciseBtn') : tr('trainer.planner.addExerciseBtn')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Trainer notes */}
      <div style={{ padding: '14px 22px 0' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 6 }}>
          {tr('trainer.planner.trainerNotes')}
        </div>
        <textarea
          value={trainerNotes}
          onChange={e => setTrainerNotes(e.target.value)}
          placeholder={tr('trainer.planner.notesPlaceholder')}
          rows={2}
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 12, boxSizing: 'border-box',
            background: 'var(--surface)',
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
      <div style={{ padding: '14px 22px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={askAI} disabled={aiLoading} style={{
          ...outlineBtn(aiLoading ? borderSubtle(dark) : t.primary),
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          opacity: aiLoading ? 0.6 : 1,
          transition: 'all .15s',
        }}>
          {aiLoading ? (
            <>
              <Spinner size={12} thickness={2} color={t.primary} />
              {tr('trainer.planner.generating')}
            </>
          ) : tr('trainer.planner.askAI')}
        </button>
        {!freeSession && (
          <button
            onClick={() => sendPlan('sent')}
            disabled={saving || exercises.length === 0}
            style={{ ...primaryBtn(t.primary, saving), marginBottom: 0, opacity: exercises.length === 0 ? 0.4 : saving ? 0.7 : 1 }}
          >
            {saving ? tr('trainer.planner.sending') : tr('trainer.planner.sendToClient')}
          </button>
        )}
      </div>

      {/* In-Person Trainer CTA */}
      <div style={{ padding: '12px 22px 32px' }}>
        <button onClick={startSessionNow} disabled={saving || exercises.length === 0} style={{
          width: '100%', padding: '15px 0', borderRadius: 14,
          background: `${t.liveAction}18`,
          color: exercises.length === 0 ? 'var(--text-mute)' : t.liveAction,
          border: `1.5px solid ${exercises.length === 0 ? 'transparent' : `${t.liveAction}55`}`,
          fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          opacity: saving ? 0.7 : 1,
        }}>
          <Icon name="play" size={16} color={exercises.length === 0 ? 'rgba(255,255,255,.3)' : t.liveAction}/> {freeSession ? tr('trainer.planner.startFreeSession') : tr('trainer.planner.startLiveSession')}
        </button>
        {!freeSession && (
          <div style={{ marginTop: 8, textAlign: 'center', fontSize: 11, color: textSec(dark) }}>
            {tr('trainer.planner.startLiveSessionHint', { name: selectedClient?.name?.split(' ')[0] || 'client' })}
          </div>
        )}
      </div>
    </>
  );
}
