import React from 'react';
import { supabase } from '../../supabase';
import { Icon } from '../../components/Icon';
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
import { DARK } from '../../theme/tokens';
import { useTrainerTheme }  from '../../hooks/useTrainerTheme';
import { autoExpirePlans } from '../../lib/autoExpirePlans';

interface ClientProfile {
  id:    string;
  name:  string;
  email: string;
}

interface WorkoutSession {
  id:                 string;
  started_at?:        string | null;
  created_at?:        string | null;
  completed_at?:      string | null;
  duration_minutes?:  number | null;
  performance_score?: number | null;
  status?:            string | null;
}

interface PlanExercise {
  id:            string;
  exercise_name: string;
  muscle_group?: string | null;
  sets?:         number | null;
  reps?:         number | null;
  load_kg?:      number | null;
  rest_seconds?: number | null;
  notes?:        string | null;
  order_index?:  number | null;
}

interface WorkoutPlan {
  id:              string;
  status:          string | null;
  scheduled_date?: string | null;
  created_at:      string | null;
  trainer_notes?:  string | null;
  plan_exercises?: PlanExercise[];
}

interface ProfileV2Row {
  basic_data:          Record<string, unknown> | null;
  objectives:          Record<string, unknown> | null;
  movement_history:    Record<string, unknown> | null;
  functional_capacity: Record<string, unknown> | null;
  environment:         Record<string, unknown> | null;
  availability:        Record<string, unknown> | null;
  preferences:         Record<string, unknown> | null;
  habits:              Record<string, unknown> | null;
  comorbidities:       Record<string, unknown> | null;
  declared_health:     Record<string, unknown> | null;
  sensitive_factors:   Record<string, unknown> | null;
  body_rhythm:         Record<string, unknown> | null;
  completed_at:        string | null;
}

interface CheckInReadiness {
  id:                string;
  occurred_at:       string | null;
  readiness_score:   number | null;
  energy_level:      number | null;
  fatigue_level:     number | null;
  pain_present:      boolean | null;
  sleep_quality:     string | null;
  available_minutes: number | null;
  training_location: string | null;
  input_source:      string | null;
  variant:           string;
}

interface TrainerDashboardUser {
  id:    string;
  name?: string;
  email?: string;
}

interface TrainerClientDetailScreenProps {
  nav:             NavFn;
  user:            TrainerDashboardUser | null;
  selectedClient?: ClientProfile | null;
}

export function TrainerClientDetailScreen({
  nav,
  selectedClient,
}: TrainerClientDetailScreenProps) {
  const { t, dark } = useTrainerTheme();
  const [sessions, setSessions]     = React.useState<WorkoutSession[]>([]);
  const [plans, setPlans]           = React.useState<WorkoutPlan[]>([]);
  const [profileV2, setProfileV2]   = React.useState<ProfileV2Row | null>(null);
  const [readiness, setReadiness]   = React.useState<CheckInReadiness[]>([]);
  const [loading, setLoading]       = React.useState(true);
  const [expandedPlan, setExpandedPlan] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!selectedClient?.id) return;
    setLoading(true);
    // Auto-cancel stale plans (>10 days) for this client; notify client
    void autoExpirePlans(selectedClient.id, 'trainer');
    Promise.all([
      supabase.from('workout_sessions').select('id,started_at,completed_at,duration_minutes,performance_score,status').eq('user_id', selectedClient.id).order('started_at', { ascending: false }).limit(5),
      supabase.from('workout_plans').select('id,status,scheduled_date,created_at,trainer_notes,plan_exercises(id,exercise_name,muscle_group,sets,reps,load_kg,rest_seconds,notes,order_index)').eq('assigned_to', selectedClient.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('profile_v2').select('basic_data,objectives,movement_history,functional_capacity,environment,availability,preferences,habits,comorbidities,declared_health,sensitive_factors,body_rhythm,completed_at').eq('user_id', selectedClient.id).maybeSingle(),
      supabase.from('checkin_prontidao').select('id,occurred_at,readiness_score,energy_level,fatigue_level,pain_present,sleep_quality,available_minutes,training_location,input_source,variant').eq('user_id', selectedClient.id).order('occurred_at', { ascending: false }).limit(7),
    ]).then(([sessionsRes, plansRes, profV2Res, readinessRes]) => {
      setSessions(sessionsRes.data || []);
      setPlans(plansRes.data || []);
      setProfileV2(profV2Res.data as unknown as ProfileV2Row | null);
      setReadiness((readinessRes.data || []) as CheckInReadiness[]);
      setLoading(false);
    });
  }, [selectedClient?.id]);

  if (!selectedClient) {
    return (
      <div style={{ padding: '60px 32px', textAlign: 'center', color: textSec(dark), fontSize: 13 }}>
        No client selected.
        <button
          onClick={() => nav('trainerDashboard')}
          style={{ ...ghostBtn(dark), display: 'block', margin: '16px auto 0' }}
        >
          ← Back
        </button>
      </div>
    );
  }

  const PLAN_STATUS_COLOR: Record<string, string> = {
    sent:       t.primary,
    active:     '#10B981',
    completed:  '#7B5CFF',
    draft:      textMute(dark),
    cancelled:  '#FF4D4D',
    postponed:  '#F5B45A',
  };

  const fmtKey = (k: string) =>
    k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const fmtVal = (v: unknown): string | null => {
    if (v == null || v === '') return null;
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (Array.isArray(v)) {
      const items = v.filter(x => x != null && x !== '');
      return items.length > 0 ? items.join(', ') : null;
    }
    if (typeof v === 'object') return null;
    return String(v);
  };

  const renderFields = (data: Record<string, unknown> | null) => {
    if (!data) return null;
    const entries = Object.entries(data)
      .map(([k, v]): [string, string | null] => [k, fmtVal(v)])
      .filter((e): e is [string, string] => e[1] != null);
    if (entries.length === 0) return null;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
        {entries.map(([k, v]) => (
          <div key={k}>
            <div style={{ fontSize: 9, color: textMute(dark), marginBottom: 1 }}>{fmtKey(k)}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: textPri(dark) }}>{v}</div>
          </div>
        ))}
      </div>
    );
  };

  const T1_SECTIONS: [string, Record<string, unknown> | null][] = [
    ['Basic Data',         profileV2?.basic_data          ?? null],
    ['Objectives',             profileV2?.objectives          ?? null],
    ['Movement History',profileV2?.movement_history    ?? null],
    ['Functional Capacity',  profileV2?.functional_capacity ?? null],
    ['Environment',              profileV2?.environment         ?? null],
    ['Availability',       profileV2?.availability        ?? null],
  ];

  const T2_SECTIONS: [string, Record<string, unknown> | null][] = [
    ['Preferences',   profileV2?.preferences    ?? null],
    ['Habits',        profileV2?.habits         ?? null],
    ['Comorbidities', profileV2?.comorbidities  ?? null],
    ['Declared Health',profileV2?.declared_health ?? null],
  ];

  const t3Count = [profileV2?.sensitive_factors, profileV2?.body_rhythm]
    .filter(d => d != null && Object.keys(d).length > 0).length;

  return (
    <>
      <div style={{ padding: '20px 22px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={() => nav('trainerDashboard')} style={{ ...iconBtn(dark), marginLeft: -4 }}>
          <Icon name="chevL" size={22} color={textPri(dark)} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: t.primary }}>
            Client Profile
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: textPri(dark), fontFamily: '"Plus Jakarta Sans",sans-serif' }}>
            {selectedClient.name || 'Client'}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: textMute(dark), fontSize: 13 }}>Loading…</div>
      ) : (
        <div style={{ padding: '16px 22px 100px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Identity */}
          <div style={{
            padding: 16, borderRadius: 16,
            background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}`,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16, flexShrink: 0,
              background: `${t.primary}22`, color: t.primary,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 20, fontFamily: '"Plus Jakarta Sans",sans-serif',
            }}>
              {(selectedClient.name || '?').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: textPri(dark) }}>{selectedClient.name}</div>
              <div style={{
                fontSize: 12, color: textSec(dark), marginTop: 2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>{selectedClient.email}</div>
            </div>
          </div>

          {/* Profile v2 */}
          {profileV2 && (
            <div style={{ padding: 16, borderRadius: 16, background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textMute(dark) }}>
                  Smart Profile v2
                </div>
                {profileV2.completed_at && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                    background: `${t.accent}20`, color: t.accent, letterSpacing: '.04em',
                  }}>
                    COMPLETE
                  </span>
                )}
              </div>

              {/* T1 — visible */}
              {T1_SECTIONS.map(([label, data]) => {
                const rendered = renderFields(data);
                if (!rendered) return null;
                return (
                  <div key={label} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: t.primary, marginBottom: 6, letterSpacing: '.04em' }}>
                      {label}
                    </div>
                    {rendered}
                  </div>
                );
              })}

              {/* T2 — conditional */}
              {T2_SECTIONS.some(([, d]) => d != null) && (
                <div style={{ padding: '10px 12px', borderRadius: 10, background: `${t.accent}08`, border: `1px solid ${t.accent}22` }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', color: t.accent, marginBottom: 10 }}>
                    T2 · CONDITIONAL
                  </div>
                  {T2_SECTIONS.map(([label, data]) => {
                    const rendered = renderFields(data);
                    if (!rendered) return null;
                    return (
                      <div key={label} style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 9.5, fontWeight: 600, color: textSec(dark), marginBottom: 5 }}>
                          {label}
                        </div>
                        {rendered}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* T3 — masked */}
              {t3Count > 0 && (
                <div style={{
                  marginTop: 10, padding: '8px 12px', borderRadius: 10,
                  background: DARK.surface,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 13 }}>🔒</span>
                  <span style={{ fontSize: 11, color: textMute(dark) }}>
                    {t3Count} confidential section{t3Count > 1 ? 's' : ''} (T3 — not shared)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Readiness trend */}
          {readiness.length > 0 && (
            <div style={{ padding: 16, borderRadius: 16, background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 12 }}>
                Readiness · Last {readiness.length}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                {[...readiness].reverse().map((r) => {
                  const score     = r.readiness_score ?? 0;
                  const barColor  = score >= 70 ? '#4ade80' : score >= 40 ? '#F5A623' : '#EF5B3C';
                  const energyColor = r.energy_level != null
                    ? (r.energy_level >= 7 ? '#4ade80' : r.energy_level >= 4 ? '#F5A623' : '#EF5B3C')
                    : null;
                  return (
                    <div key={r.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      {/* Pain indicator */}
                      <div style={{ height: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {r.pain_present && (
                          <span style={{ fontSize: 8, color: '#EF5B3C' }}>●</span>
                        )}
                      </div>
                      {/* Readiness score */}
                      <div style={{ fontSize: 9, fontWeight: 700, color: barColor }}>{score}</div>
                      {/* Bar */}
                      <div style={{
                        width: '100%', borderRadius: 4,
                        height: `${Math.max(6, (score / 100) * 44)}px`,
                        background: barColor, opacity: 0.85,
                      }} />
                      {/* Energy dot */}
                      {energyColor && (
                        <div style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: energyColor, marginTop: 1,
                        }} />
                      )}
                      {/* Date */}
                      <div style={{ fontSize: 8, color: textMute(dark), textAlign: 'center' }}>
                        {r.occurred_at
                          ? new Date(r.occurred_at).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' })
                          : '—'}
                      </div>
                      {/* Voice badge */}
                      {r.input_source === 'voice' && (
                        <div style={{ fontSize: 7, color: t.primary, fontWeight: 700 }}>VOZ</div>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Legend */}
              <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
                {[
                  { color: '#EF5B3C', dot: true, label: 'Pain reported' },
                  { color: '#4ade80', label: 'High energy' },
                  { color: '#F5A623', label: 'Moderate energy' },
                  { color: '#EF5B3C', label: 'Low energy' },
                ].map(({ color, dot, label }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {dot
                      ? <span style={{ fontSize: 9, color }}>●</span>
                      : <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }}/>
                    }
                    <span style={{ fontSize: 9, color: textMute(dark) }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Check-ins (checkin_prontidao) */}
          <div style={{ padding: 16, borderRadius: 16, background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 10 }}>
              Recent Check-ins
            </div>
            {readiness.length === 0 ? (
              <div style={{ color: textMute(dark), fontSize: 12 }}>No check-ins yet.</div>
            ) : readiness.map((r, i) => (
              <div key={r.id} style={{
                padding: '10px 0',
                borderBottom: i < readiness.length - 1 ? `1px solid ${borderSubtle(dark)}` : 'none',
                display: 'flex', gap: 12,
              }}>
                <div style={{ fontSize: 10, color: textMute(dark), minWidth: 72, paddingTop: 2 }}>
                  {r.occurred_at ? new Date(r.occurred_at).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' }) : '—'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {r.energy_level != null && (
                      <span style={{ fontSize: 12, color: textSec(dark) }}>
                        Energy <span style={{ fontWeight: 700, color: t.primary }}>{r.energy_level}/10</span>
                      </span>
                    )}
                    {r.readiness_score != null && (
                      <span style={{ fontSize: 12, color: textSec(dark) }}>
                        Readiness <span style={{ fontWeight: 700, color: r.readiness_score >= 70 ? '#4ade80' : r.readiness_score >= 40 ? '#F5A623' : t.accent }}>{r.readiness_score}</span>
                      </span>
                    )}
                    {r.pain_present && (
                      <span style={{ fontSize: 12, color: t.accent, fontWeight: 600 }}>⚠ Pain reported</span>
                    )}
                    {r.available_minutes != null && (
                      <span style={{ fontSize: 12, color: textSec(dark) }}>{r.available_minutes} min</span>
                    )}
                    {r.training_location && (
                      <span style={{ fontSize: 12, color: textSec(dark) }}>{r.training_location}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: textMute(dark), marginTop: 2, display: 'flex', gap: 8 }}>
                    {r.sleep_quality && <span>Sleep: {r.sleep_quality}</span>}
                    {r.input_source === 'voice' && <span style={{ color: t.primary, fontWeight: 700 }}>VOZ</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Plans Sent — expandable cards */}
          <div style={{ borderRadius: 16, background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}`, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textMute(dark) }}>
              Plans Sent
            </div>
            {plans.length === 0 ? (
              <div style={{ padding: '0 16px 14px', color: textMute(dark), fontSize: 12 }}>No plans sent yet.</div>
            ) : plans.map((p, i) => {
              const sc   = (p.status ? PLAN_STATUS_COLOR[p.status] : null) || textMute(dark);
              const open = expandedPlan === p.id;
              const exs  = [...(p.plan_exercises ?? [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
              const dateLabel = p.scheduled_date
                ? new Date(p.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : p.created_at ? new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
              return (
                <div key={p.id} style={{ borderTop: i > 0 ? `1px solid ${borderSubtle(dark)}` : undefined }}>
                  {/* Card header — always visible */}
                  <button
                    onClick={() => setExpandedPlan(open ? null : p.id)}
                    style={{
                      width: '100%', padding: '11px 16px', display: 'flex', alignItems: 'center',
                      gap: 10, background: 'transparent', border: 'none', cursor: 'pointer',
                      textAlign: 'left', fontFamily: 'inherit',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: textPri(dark) }}>{dateLabel}</div>
                      <div style={{ fontSize: 11, color: textSec(dark), marginTop: 1 }}>
                        {exs.length} exercise{exs.length !== 1 ? 's' : ''}
                        {p.trainer_notes ? ` · ${p.trainer_notes.slice(0, 30)}${p.trainer_notes.length > 30 ? '…' : ''}` : ''}
                      </div>
                    </div>
                    <span style={{
                      padding: '3px 9px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                      background: `${sc}22`, color: sc, letterSpacing: '.04em', textTransform: 'uppercase',
                      flexShrink: 0,
                    }}>
                      {p.status}
                    </span>
                    <span style={{ fontSize: 11, color: textMute(dark), flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
                  </button>

                  {/* Exercise detail drawer */}
                  {open && (
                    <div style={{ padding: '0 16px 14px', background: dark ? '#0E1A2B' : '#f4f8fd' }}>
                      {exs.length === 0 ? (
                        <div style={{ fontSize: 11, color: textMute(dark) }}>No exercises recorded.</div>
                      ) : exs.map((ex, ei) => (
                        <div key={ex.id} style={{
                          padding: '8px 12px', borderRadius: 10, marginBottom: 6,
                          background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}`,
                          display: 'flex', alignItems: 'center', gap: 10,
                        }}>
                          <div style={{
                            width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                            background: `${t.primary}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 700, color: t.primary,
                          }}>{ei + 1}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 700, color: textPri(dark) }}>{ex.exercise_name}</div>
                            <div style={{ fontSize: 11, color: textSec(dark), marginTop: 1 }}>
                              {[
                                ex.sets  ? `${ex.sets} sets`          : null,
                                ex.reps  ? `${ex.reps} reps`          : null,
                                ex.load_kg ? `${ex.load_kg} kg`       : null,
                                ex.rest_seconds ? `${ex.rest_seconds}s rest` : null,
                              ].filter(Boolean).join(' · ')}
                              {ex.muscle_group ? ` — ${ex.muscle_group}` : ''}
                            </div>
                            {ex.notes && (
                              <div style={{ fontSize: 10.5, color: textMute(dark), marginTop: 2, fontStyle: 'italic' }}>
                                {ex.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Workout sessions */}
          {sessions.length > 0 && (
            <div style={{ padding: 16, borderRadius: 16, background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 10 }}>
                Workout Sessions
              </div>
              {sessions.map((s, i) => (
                <div key={s.id} style={{
                  padding: '10px 0',
                  borderBottom: i < sessions.length - 1 ? `1px solid ${borderSubtle(dark)}` : 'none',
                  display: 'flex', alignItems: 'center', gap: 12
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: textPri(dark) }}>
                      {new Date(s.started_at || s.created_at || '').toLocaleDateString()}
                    </div>
                    {s.duration_minutes && (
                      <div style={{ fontSize: 11, color: textSec(dark), marginTop: 2 }}>
                        {s.duration_minutes} min{s.performance_score != null ? ` · score ${s.performance_score}%` : ''}
                      </div>
                    )}
                  </div>
                  {(s.status === 'completed' || s.completed_at) ? (
                    <span style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>Done ✓</span>
                  ) : s.status === 'active' ? (
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: t.primary,
                      background: `${t.primary}18`, borderRadius: 999, padding: '2px 8px',
                    }}>Active</span>
                  ) : s.status === 'paused' ? (
                    <span style={{ fontSize: 11, color: '#F5A623', fontWeight: 600 }}>Paused</span>
                  ) : s.status === 'abandoned' ? (
                    <span style={{ fontSize: 11, color: t.accent, fontWeight: 600 }}>Abandoned</span>
                  ) : (
                    <span style={{ fontSize: 11, color: textMute(dark), fontWeight: 600 }}>—</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sticky create-plan CTA */}
      <div style={{
        position: 'sticky', bottom: 0,
        padding: '12px 22px calc(12px + env(safe-area-inset-bottom, 0px))',
        background: 'rgba(14,26,43,.95)',
        backdropFilter: 'blur(12px)',
        borderTop: `1px solid ${borderSubtle(dark)}`,
      }}>
        {/* Check-in CTA */}
      {selectedClient && (
        <button onClick={() => nav('checkin', { clientUserId: selectedClient.id, clientName: selectedClient.name })} style={{
          width: '100%', padding: '12px 0', borderRadius: 14, marginBottom: 8,
          background: 'transparent', border: `1.5px solid ${t.accent}55`, color: t.accent,
          fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Icon name="sparkle" size={14} color={t.accent}/> Readiness Check-in for {selectedClient.name?.split(' ')[0] || 'client'}
        </button>
      )}
      <button onClick={() => nav('workoutPlanEditor')} style={{
          width: '100%', padding: '14px 0', borderRadius: 14,
          background: t.accent, color: '#FFFFFF',
          border: 'none', fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 14, fontWeight: 700, cursor: 'pointer',
        }}>
        + Create Plan for {selectedClient.name?.split(' ')[0] || 'Client'}
      </button>
      </div>
    </>
  );
}
