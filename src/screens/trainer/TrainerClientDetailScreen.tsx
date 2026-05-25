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

interface WorkoutSession {
  id:                 string;
  started_at?:        string | null;
  created_at?:        string | null;
  completed_at?:      string | null;
  duration_minutes?:  number | null;
  performance_score?: number | null;
}

interface WorkoutPlan {
  id:              string;
  status:          string | null;
  scheduled_date?: string | null;
  created_at:      string | null;
  trainer_notes?:  string | null;
  plan_exercises?: { id: string }[];
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
  id:              string;
  occurred_at:     string | null;
  readiness_score: number | null;
  variant:         string;
}

interface TrainerDashboardUser {
  id:    string;
  name?: string;
  email?: string;
}

interface TrainerClientDetailScreenProps {
  nav:             NavFn;
  t:               Theme;
  dark:            boolean;
  user:            TrainerDashboardUser | null;
  selectedClient?: ClientProfile | null;
}

export function TrainerClientDetailScreen({
  nav,
  t,
  dark,
  selectedClient,
}: TrainerClientDetailScreenProps) {
  const [physical, setPhysical]     = React.useState<PhysicalProfile | null>(null);
  const [checkins, setCheckins]     = React.useState<CheckIn[]>([]);
  const [sessions, setSessions]     = React.useState<WorkoutSession[]>([]);
  const [plans, setPlans]           = React.useState<WorkoutPlan[]>([]);
  const [profileV2, setProfileV2]   = React.useState<ProfileV2Row | null>(null);
  const [readiness, setReadiness]   = React.useState<CheckInReadiness[]>([]);
  const [loading, setLoading]       = React.useState(true);

  React.useEffect(() => {
    if (!selectedClient?.id) return;
    setLoading(true);
    Promise.all([
      supabase.from('physical_profiles').select('*').eq('user_id', selectedClient.id).maybeSingle(),
      supabase.from('checkins').select('energy,soreness,minutes,goal,sleep_quality,date').eq('user_id', selectedClient.id).order('date', { ascending: false }).limit(5),
      supabase.from('workout_sessions').select('id,started_at,completed_at,duration_minutes,performance_score').eq('user_id', selectedClient.id).order('started_at', { ascending: false }).limit(5),
      supabase.from('workout_plans').select('id,status,scheduled_date,created_at,trainer_notes,plan_exercises(id)').eq('assigned_to', selectedClient.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('profile_v2').select('basic_data,objectives,movement_history,functional_capacity,environment,availability,preferences,habits,comorbidities,declared_health,sensitive_factors,body_rhythm,completed_at').eq('user_id', selectedClient.id).maybeSingle(),
      supabase.from('checkin_prontidao').select('id,occurred_at,readiness_score,variant').eq('user_id', selectedClient.id).not('readiness_score', 'is', null).order('occurred_at', { ascending: false }).limit(7),
    ]).then(([physRes, checkinsRes, sessionsRes, plansRes, profV2Res, readinessRes]) => {
      setPhysical(physRes.data);
      setCheckins(checkinsRes.data || []);
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
    sent: t.primary,
    active: '#10B981',
    completed: '#7B5CFF',
    draft: textMute(dark),
  };

  const fmtKey = (k: string) =>
    k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const fmtVal = (v: unknown): string | null => {
    if (v == null || v === '') return null;
    if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
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
    ['Dados Básicos',         profileV2?.basic_data          ?? null],
    ['Objetivos',             profileV2?.objectives          ?? null],
    ['Histórico de Movimento',profileV2?.movement_history    ?? null],
    ['Capacidade Funcional',  profileV2?.functional_capacity ?? null],
    ['Ambiente',              profileV2?.environment         ?? null],
    ['Disponibilidade',       profileV2?.availability        ?? null],
  ];

  const T2_SECTIONS: [string, Record<string, unknown> | null][] = [
    ['Preferências',   profileV2?.preferences    ?? null],
    ['Hábitos',        profileV2?.habits         ?? null],
    ['Comorbilidades', profileV2?.comorbidities  ?? null],
    ['Saúde Declarada',profileV2?.declared_health ?? null],
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

          {/* Physical profile */}
          {physical && (
            <div style={{ padding: 16, borderRadius: 16, background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 12 }}>
                Physical Profile
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  ['Goal',   physical.primary_goal],
                  ['Level',  physical.fitness_level],
                  ['Weight', physical.weight_kg  ? `${physical.weight_kg} kg`  : null],
                  ['Height', physical.height_cm  ? `${physical.height_cm} cm`  : null],
                ].filter((item): item is [string, string] => !!item[1]).map(([label, value]) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, color: textMute(dark), marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: textPri(dark), textTransform: 'capitalize' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Profile v2 */}
          {profileV2 && (
            <div style={{ padding: 16, borderRadius: 16, background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textMute(dark) }}>
                  Perfil Inteligente v2
                </div>
                {profileV2.completed_at && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                    background: `${t.primary}20`, color: t.primary, letterSpacing: '.04em',
                  }}>
                    COMPLETO
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
                    T2 · CONDICIONAL
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
                  background: dark ? '#1A2740' : '#F0F4F8',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 13 }}>🔒</span>
                  <span style={{ fontSize: 11, color: textMute(dark) }}>
                    {t3Count} secção{t3Count > 1 ? 'ões' : ''} confidencial{t3Count > 1 ? 'is' : ''} (T3 — não partilhado)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Readiness trend */}
          {readiness.length > 0 && (
            <div style={{ padding: 16, borderRadius: 16, background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 12 }}>
                Readiness · Últimas {readiness.length}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                {[...readiness].reverse().map((r) => {
                  const score = r.readiness_score ?? 0;
                  const color = score >= 70 ? '#4ade80' : score >= 40 ? '#F5A623' : '#EF5B3C';
                  return (
                    <div key={r.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color }}>{score}</div>
                      <div style={{
                        width: '100%', borderRadius: 4,
                        height: `${Math.max(6, (score / 100) * 44)}px`,
                        background: color, opacity: 0.8,
                      }} />
                      <div style={{ fontSize: 8, color: textMute(dark), textAlign: 'center' }}>
                        {r.occurred_at
                          ? new Date(r.occurred_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                          : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent check-ins */}
          <div style={{ padding: 16, borderRadius: 16, background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 10 }}>
              Recent Check-ins
            </div>
            {checkins.length === 0 ? (
              <div style={{ color: textMute(dark), fontSize: 12 }}>No check-ins yet.</div>
            ) : checkins.map((c, i) => {
              const sorenessArray = Array.isArray(c.soreness) ? c.soreness : [];
              const sore = sorenessArray.filter(s => s !== 'None');
              return (
                <div key={c.date || i} style={{
                  padding: '10px 0',
                  borderBottom: i < checkins.length - 1 ? `1px solid ${borderSubtle(dark)}` : 'none',
                  display: 'flex', gap: 12
                }}>
                  <div style={{ fontSize: 10, color: textMute(dark), minWidth: 72, paddingTop: 2 }}>{c.date}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: textSec(dark) }}>
                        Energy <span style={{ fontWeight: 700, color: t.primary }}>{c.energy}/10</span>
                      </span>
                      {sore.length > 0 && (
                        <span style={{ fontSize: 12, color: t.accent, fontWeight: 600 }}>⚠ {sore.join(', ')}</span>
                      )}
                      {c.minutes && <span style={{ fontSize: 12, color: textSec(dark) }}>{c.minutes} min</span>}
                      {c.goal && <span style={{ fontSize: 12, color: textSec(dark) }}>{c.goal}</span>}
                    </div>
                    {c.sleep_quality && (
                      <div style={{ fontSize: 11, color: textMute(dark), marginTop: 2 }}>Sleep: {c.sleep_quality}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent plans */}
          <div style={{ padding: 16, borderRadius: 16, background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 10 }}>
              Plans Sent
            </div>
            {plans.length === 0 ? (
              <div style={{ color: textMute(dark), fontSize: 12 }}>No plans sent yet.</div>
            ) : plans.map((p, i) => {
              const sc = (p.status ? PLAN_STATUS_COLOR[p.status] : null) || textMute(dark);
              return (
                <div key={p.id} style={{
                  padding: '10px 0',
                  borderBottom: i < plans.length - 1 ? `1px solid ${borderSubtle(dark)}` : 'none',
                  display: 'flex', alignItems: 'center', gap: 12
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: textPri(dark) }}>
                      {p.scheduled_date || (p.created_at ? new Date(p.created_at).toLocaleDateString() : '—')}
                    </div>
                    <div style={{ fontSize: 11, color: textSec(dark), marginTop: 2 }}>
                      {p.plan_exercises?.length || 0} exercises
                      {p.trainer_notes ? ` · "${p.trainer_notes.slice(0, 35)}…"` : ''}
                    </div>
                  </div>
                  <span style={{
                    padding: '3px 9px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                    background: `${sc}22`, color: sc, letterSpacing: '.04em', textTransform: 'uppercase'
                  }}>
                    {p.status}
                  </span>
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
                  {s.completed_at && (
                    <span style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>Done ✓</span>
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
        background: dark ? 'rgba(14,26,43,.95)' : 'rgba(255,255,255,.95)',
        backdropFilter: 'blur(12px)',
        borderTop: `1px solid ${borderSubtle(dark)}`,
      }}>
        <button onClick={() => nav('workoutPlanEditor')} style={{
          width: '100%', padding: '14px 0', borderRadius: 14,
          background: t.primary, color: '#0E1A2B',
          border: 'none', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer',
        }}>
          + Create Plan for {selectedClient.name?.split(' ')[0] || 'Client'}
        </button>
      </div>
    </>
  );
}
