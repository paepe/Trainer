import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../components/Icon';
import { ScreenTitle } from '../../components/ScreenTitle';
import { SectionLabel } from '../../components/SectionLabel';
import { useExerciseData } from '../../hooks/useExerciseData';
import { surfRaised, borderSubtle, textPri, textSec, textMute } from '../../theme';
import { THEME_VARS as DARK } from '../../theme/tokens';
import type { NavFn, ExerciseCatalogItem } from '../../types';
import { TRAINER_ROLES } from '../../types/auth';

import { useTrainerTheme } from '../../hooks/useTrainerTheme';

interface TrainerLibraryExercisesScreenProps {
  nav: NavFn;
  user: {
    id: string;
    role: string;
    name: string;
  };
}

// Brand "ink" — text/icon colour over a brand-coloured surface (active tabs,
// selected toggles, badges on amber/accent backgrounds). Same hex as
// `primaryBtn`'s text colour and `DARK.bg` in theme/tokens — kept local since
// it's a contrast-pairing rule specific to this screen's badges/tabs, not a
// general-purpose brand token.
const INK = '#0E1A2B';

// Exercise lifecycle / voice-assistant status palette — shared between this
// screen and ExerciseDetailModal (which can't see local closures). Each tone
// pairs a solid text/icon colour with its translucent background variant,
// converging the ~16 inline rgba/hex duplicates that previously existed.
type StatusTone = 'active' | 'blocked' | 'restricted' | 'draft' | 'neutral';
const STATUS_TONES: Record<StatusTone, { text: string; bg: (alpha: number) => string; border: string }> = {
  active:     { text: '#27ae60', bg: a => `rgba(39, 174, 96, ${a})`,  border: '#27ae60' },
  blocked:    { text: '#eb5757', bg: a => `rgba(235, 87, 87, ${a})`,  border: '#eb5757' },
  restricted: { text: '#f2c94c', bg: a => `rgba(242, 201, 76, ${a})`, border: '#f2c94c' },
  draft:      { text: '#9b51e0', bg: a => `rgba(155, 81, 224, ${a})`, border: '#9b51e0' },
  neutral:    { text: '#828282', bg: a => `rgba(120, 120, 120, ${a})`, border: '#828282' },
};
const statusTone = (status: string): StatusTone =>
  status === 'active' || status === 'blocked' || status === 'restricted' || status === 'draft' ? status : 'neutral';

export function TrainerLibraryExercisesScreen({ nav, user }: TrainerLibraryExercisesScreenProps) {
  const { fetchExercises, saveExercise, fetchProtocolsList, simulateVoiceAssistant } = useExerciseData();
  const { t, dark } = useTrainerTheme();
  const { t: tr } = useTranslation();

  const trMuscle = (v: string) => {
    const arr = tr('trainer.planner.muscleGroups', { returnObjects: true }) as string[];
    const idx = arr.findIndex((g: string) => g.toLowerCase() === v.toLowerCase());
    return idx >= 0 ? arr[idx] : v;
  };
  const trLvl = (v: string) => tr(`trainer.library.levelOpts.${v}` as any);
  const trSts = (v: string) => tr(`trainer.library.statusOpts.${v}` as any);
  const trEq   = (v: string) => tr(`trainer.library.equipmentOpts.${v}` as any);
  const trAcc  = (v: string) => tr(`trainer.library.accessibilityTags.${v}` as any);

  // State
  const [activeTab, setActiveTab] = useState<'exercises' | 'protocols'>('exercises');
  const [exercises, setExercises] = useState<ExerciseCatalogItem[]>([]);
  const [protocols, setProtocols] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterMuscle, setFilterMuscle] = useState('All');
  const [filterEquipment, setFilterEquipment] = useState('All');
  const [filterLevel, setFilterLevel] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterLowImpact, setFilterLowImpact] = useState(false);
  const [filterNoFloor, setFilterNoFloor] = useState(false);
  const [filterSeated, setFilterSeated] = useState(false);

  // Selected Detail Modal / Editor
  const [selectedExercise, setSelectedExercise] = useState<Partial<ExerciseCatalogItem> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formError, setFormError] = useState('');

  // Voice Assistant simulator
  const [voiceQuery, setVoiceQuery] = useState('');
  const [voiceResponse, setVoiceResponse] = useState<any | null>(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<string[]>([]);
  const [showVoicePanel, setShowVoicePanel] = useState(true);

  const isTrainerOrAdmin = (TRAINER_ROLES as readonly string[]).includes(user.role);

  // Fetch Data
  const loadData = async () => {
    setLoading(true);
    try {
      const exRes = await fetchExercises();
      if (exRes.data) setExercises(exRes.data);

      const ptRes = await fetchProtocolsList();
      if (ptRes.data) setProtocols(ptRes.data);
    } catch (e) {
      console.error('[TrainerLibraryExercises] load failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter Logic
  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (ex.short_instruction && ex.short_instruction.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesMuscle = filterMuscle === 'All' || ex.muscle_group.toLowerCase() === filterMuscle.toLowerCase();
    
    const matchesEquipment = filterEquipment === 'All' || 
      (ex.equipment && ex.equipment.some(eq => eq.toLowerCase().includes(filterEquipment.toLowerCase())));
    
    const matchesLevel = filterLevel === 'All' || 
      (ex.level && ex.level.toLowerCase() === filterLevel.toLowerCase());
    
    const matchesStatus = filterStatus === 'All' || ex.status === filterStatus;
    
    const matchesLowImpact = !filterLowImpact || (ex.accessibility_tags && ex.accessibility_tags.includes('low_impact'));
    const matchesNoFloor = !filterNoFloor || (ex.accessibility_tags && ex.accessibility_tags.includes('no_floor'));
    const matchesSeated = !filterSeated || (ex.accessibility_tags && ex.accessibility_tags.includes('seated'));

    return matchesSearch && matchesMuscle && matchesEquipment && matchesLevel && matchesStatus && matchesLowImpact && matchesNoFloor && matchesSeated;
  });

  // Save/Edit Action
  const handleSave = async () => {
    if (!selectedExercise?.name?.trim()) {
      setFormError(tr('trainer.library.errNameRequired'));
      return;
    }
    if (!selectedExercise?.muscle_group?.trim()) {
      setFormError(tr('trainer.library.errMuscleRequired'));
      return;
    }
    setFormError('');

    try {
      const res = await saveExercise(selectedExercise);
      if (res.error) {
        setFormError((res.error as any).message || tr('trainer.library.errSave'));
      } else {
        setSelectedExercise(null);
        setIsEditing(false);
        await loadData();
      }
    } catch (err: any) {
      setFormError(err.message || tr('trainer.library.errUnknown'));
    }
  };

  // Voice Simulation
  const handleVoiceSimulate = async (queryText: string) => {
    if (!queryText.trim()) return;
    setVoiceLoading(true);
    try {
      const response = await simulateVoiceAssistant(queryText, user.role);
      setVoiceResponse(response);
    } catch (e) {
      console.error('[TrainerLibraryExercises] voice assistant failed:', e);
    } finally {
      setVoiceLoading(false);
    }
  };

  const handleConfirmGovernance = (actionName: string) => {
    const time = new Date().toLocaleTimeString();
    setAuditLogs(prev => [`[${time}] Human confirmed voice action: "${actionName}"`, ...prev]);
    alert(`Governance action confirmed and logged in audit trail: "${actionName}"`);
    setVoiceResponse(null);
  };

  return (
    <>
      <ScreenTitle dark={dark} sub={tr('trainer.library.sub')}>
        {tr('trainer.library.title')}
      </ScreenTitle>

      {/* Tabs Switcher */}
      <div style={{ display: 'flex', padding: '0 22px 16px', gap: 12 }}>
        <button
          onClick={() => setActiveTab('exercises')}
          style={{
            flex: 1, padding: '12px', borderRadius: 12, border: 'none',
            background: activeTab === 'exercises' ? t.accent : surfRaised(dark),
            color: activeTab === 'exercises' ? INK : textPri(dark),
            fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}
        >
          <Icon name="dumbbell" size={16} color={activeTab === 'exercises' ? INK : textPri(dark)} />
          {tr('trainer.library.tabExercises')}
        </button>
        <button
          onClick={() => setActiveTab('protocols')}
          style={{
            flex: 1, padding: '12px', borderRadius: 12, border: 'none',
            background: activeTab === 'protocols' ? t.accent : surfRaised(dark),
            color: activeTab === 'protocols' ? INK : textPri(dark),
            fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}
        >
          <Icon name="history" size={16} color={activeTab === 'protocols' ? INK : textPri(dark)} />
          {tr('trainer.library.tabProtocols')}
        </button>
      </div>

      {/* AI Voice Assistant Simulator Section */}
      {showVoicePanel && (
        <VoiceAssistantPanel
          voiceQuery={voiceQuery}
          voiceResponse={voiceResponse}
          voiceLoading={voiceLoading}
          auditLogs={auditLogs}
          dark={dark}
          onClose={() => setShowVoicePanel(false)}
          onQueryChange={setVoiceQuery}
          onSimulate={handleVoiceSimulate}
          onGovernance={handleConfirmGovernance}
          onSelectExercise={(ex) => { setSelectedExercise(ex); setIsEditing(false); }}
        />
      )}

      {/* Exercises View */}
      {activeTab === 'exercises' && (
        <div style={{ padding: '0 22px 80px' }}>
          {/* Search and Filter Row */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                placeholder={tr('trainer.library.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 12,
                  border: `1px solid ${borderSubtle(dark)}`,
                  background: surfRaised(dark), color: textPri(dark),
                  fontFamily: 'inherit', fontSize: 14
                }}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                padding: '12px', borderRadius: 12, border: `1px solid ${borderSubtle(dark)}`,
                background: showFilters ? t.accent : surfRaised(dark),
                color: showFilters ? INK : textPri(dark),
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <Icon name="settings" size={18} color={showFilters ? INK : textPri(dark)} />
            </button>

            {isTrainerOrAdmin && (
              <button
                onClick={() => {
                  setSelectedExercise({
                    name: '',
                    muscle_group: 'Legs',
                    level: 'beginner',
                    status: 'draft',
                    equipment: ['bodyweight'],
                    accessibility_tags: [],
                    alternatives: [],
                    short_instruction: '',
                    video_url: ''
                  });
                  setIsEditing(true);
                }}
                style={{
                  padding: '12px 16px', borderRadius: 12, border: 'none',
                  background: t.accent, color: '#fff', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit'
                }}
              >
                <Icon name="plus" size={16} color="#fff" />
                {tr('trainer.library.addExercise')}
              </button>
            )}
          </div>

          {/* Filters Expanded */}
          {showFilters && (
            <div style={{
              background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}`,
              borderRadius: 14, padding: 14, marginBottom: 16
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: textMute(dark), fontWeight: 600 }}>{tr('trainer.library.muscleGroupLabel')}</label>
                  <select
                    value={filterMuscle}
                    onChange={(e) => setFilterMuscle(e.target.value)}
                    style={{
                      width: '100%', marginTop: 4, padding: 8, borderRadius: 8,
                      background: DARK.bg, color: textPri(dark),
                      border: `1px solid ${borderSubtle(dark)}`
                    }}
                  >
                    <option value="All">{tr('trainer.library.allMuscles')}</option>
                    {(tr('trainer.planner.muscleGroups', { returnObjects: true }) as string[]).map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 11, color: textMute(dark), fontWeight: 600 }}>{tr('trainer.library.equipmentLabel')}</label>
                  <select
                    value={filterEquipment}
                    onChange={(e) => setFilterEquipment(e.target.value)}
                    style={{
                      width: '100%', marginTop: 4, padding: 8, borderRadius: 8,
                      background: DARK.bg, color: textPri(dark),
                      border: `1px solid ${borderSubtle(dark)}`
                    }}
                  >
                    <option value="All">{tr('trainer.library.allEquipment')}</option>
                    {Object.entries(tr('trainer.library.equipmentOpts', { returnObjects: true }) as Record<string, string>).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 11, color: textMute(dark), fontWeight: 600 }}>{tr('trainer.library.levelLabel')}</label>
                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value)}
                    style={{
                      width: '100%', marginTop: 4, padding: 8, borderRadius: 8,
                      background: DARK.bg, color: textPri(dark),
                      border: `1px solid ${borderSubtle(dark)}`
                    }}
                  >
                    <option value="All">{tr('trainer.library.allLevels')}</option>
                    {Object.entries(tr('trainer.library.levelOpts', { returnObjects: true }) as Record<string, string>).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 11, color: textMute(dark), fontWeight: 600 }}>{tr('trainer.library.statusLabel')}</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{
                      width: '100%', marginTop: 4, padding: 8, borderRadius: 8,
                      background: DARK.bg, color: textPri(dark),
                      border: `1px solid ${borderSubtle(dark)}`
                    }}
                  >
                    <option value="All">{tr('trainer.library.allStatuses')}</option>
                    <option value="active">{tr('trainer.library.statusOpts.active')}</option>
                    <option value="blocked">{tr('trainer.library.statusOpts.blocked')}</option>
                    <option value="restricted">{tr('trainer.library.statusOpts.restricted')}</option>
                    <option value="draft">{tr('trainer.library.statusOpts.draft')}</option>
                  </select>
                </div>
              </div>

              {/* Accessibility tags checkbox */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: textSec(dark) }}>
                  <input type="checkbox" checked={filterLowImpact} onChange={(e) => setFilterLowImpact(e.target.checked)} />
                   {tr('trainer.library.accessibilityTags.lowImpact')}
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: textSec(dark) }}>
                  <input type="checkbox" checked={filterNoFloor} onChange={(e) => setFilterNoFloor(e.target.checked)} />
                  {tr('trainer.library.accessibilityTags.noFloor')}
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: textSec(dark) }}>
                  <input type="checkbox" checked={filterSeated} onChange={(e) => setFilterSeated(e.target.checked)} />
                  {tr('trainer.library.accessibilityTags.seated')}
                </label>
              </div>
            </div>
          )}

          {/* List */}
          {loading ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: textMute(dark) }}>{tr('trainer.library.loadingExercises')}</div>
          ) : filteredExercises.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: textMute(dark) }}>{tr('trainer.library.noExercises')}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredExercises.map(ex => {
                const badge = STATUS_TONES[statusTone(ex.status)];
                return (
                  <div
                    key={ex.id}
                    onClick={() => { setSelectedExercise(ex); setIsEditing(false); }}
                    style={{
                      background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}`,
                      borderRadius: 14, padding: 14, cursor: 'pointer', display: 'flex',
                      justifyContent: 'space-between', alignItems: 'center', transition: 'transform 0.15s'
                    }}
                  >
                    <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: textPri(dark) }}>{ex.name}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 11, color: textMute(dark) }}>
                    <span>💪 {trMuscle(ex.muscle_group)}</span>
                    {ex.equipment && <span>🔧 {ex.equipment.map((eq: string) => trEq(eq)).join(', ')}</span>}
                    {ex.level && <span>⚡ {trLvl(ex.level)}</span>}
                  </div>
                  {ex.accessibility_tags && ex.accessibility_tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                      {ex.accessibility_tags.map(t => (
                        <span key={t} style={{
                          fontSize: 9, padding: '2px 6px', borderRadius: 4,
                          background: DARK.surface2, color: textSec(dark)
                        }}>
                          {trAcc(t)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    padding: '4px 8px', borderRadius: 6, background: badge.bg(0.15), color: badge.text
                  }}>
                    {trSts(ex.status)}
                  </span>
                      <Icon name="chev" size={16} color={textMute(dark)} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Protocols View */}
      {activeTab === 'protocols' && (
        <div style={{ padding: '0 22px 80px' }}>
          {loading ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: textMute(dark) }}>{tr('trainer.library.loadingProtocols')}</div>
          ) : protocols.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: textMute(dark) }}>{tr('trainer.library.noProtocols')}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {protocols.map(p => (
                <div
                  key={p.id}
                  style={{
                    background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}`,
                    borderRadius: 16, padding: 16
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: textPri(dark) }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: textMute(dark), marginTop: 2 }}>{p.description || tr('trainer.library.noDescription')}</div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                      padding: '4px 8px', borderRadius: 6, background: 'rgba(110,68,255,0.15)', color: '#9b51e0'
                    }}>
                      {p.level}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: textSec(dark), borderBottom: `1px solid ${borderSubtle(dark)}`, paddingBottom: 10, marginBottom: 10 }}>
                    <span>🎯 {tr('trainer.library.objective')}: <b>{p.objective}</b></span>
                    <span>⏱️ {tr('trainer.library.duration')}: <b>{p.duration_minutes}m</b></span>
                    {p.is_public && <span style={{ color: t.primary }}>🌐 {tr('trainer.library.public')}</span>}
                  </div>

                  {/* Exercises inside protocol */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: textMute(dark) }}>{tr('trainer.library.protocolExercises')}</div>
                    {p.protocol_exercises && p.protocol_exercises.length > 0 ? (
                      p.protocol_exercises.map((pe: any, idx: number) => (
                        <div
                          key={pe.id || idx}
                          style={{
                            padding: 10, borderRadius: 10, background: DARK.bg,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                          }}
                        >
                          <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: textPri(dark) }}>{pe.exercise_name}</div>
                          <div style={{ fontSize: 11, color: textMute(dark), marginTop: 2 }}>
                            {tr('trainer.library.setsInfo', { sets: pe.sets, reps: pe.reps, load: pe.load_kg || 0, rest: pe.rest_seconds || 0 })}
                          </div>
                          {pe.alternative_exercise && (
                            <div style={{ fontSize: 10, color: '#f2c94c', marginTop: 4 }}>
                              🔄 {tr('trainer.library.alternative')}: {pe.alternative_exercise}
                            </div>
                          )}
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: textMute(dark) }}>#{pe.order_index + 1}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: 11, color: textMute(dark), fontStyle: 'italic' }}>{tr('trainer.library.noExercisesInProtocol')}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected Exercise Drawer / Modal */}
      {selectedExercise && (
        <ExerciseDetailModal
          exercise={selectedExercise}
          isEditing={isEditing}
          formError={formError}
          isTrainerOrAdmin={isTrainerOrAdmin}
          dark={dark}
          t={t}
          onClose={() => { setSelectedExercise(null); setIsEditing(false); }}
          onStartEdit={() => setIsEditing(true)}
          onCancelEdit={() => setIsEditing(false)}
          onChange={setSelectedExercise}
          onSave={handleSave}
        />
      )}
    </>
  );
}

// ── VoiceAssistantPanel ───────────────────────────────────────────────────────

interface VoiceAssistantPanelProps {
  voiceQuery:       string;
  voiceResponse:    any | null;
  voiceLoading:     boolean;
  auditLogs:        string[];
  dark:             boolean;
  onClose:          () => void;
  onQueryChange:    (q: string) => void;
  onSimulate:       (q: string) => void;
  onGovernance:     (action: string) => void;
  onSelectExercise: (ex: any) => void;
}

function VoiceAssistantPanel({
  voiceQuery, voiceResponse, voiceLoading, auditLogs, dark,
  onClose, onQueryChange, onSimulate, onGovernance, onSelectExercise,
}: VoiceAssistantPanelProps) {
  const { t: tr } = useTranslation();
  return (
    <div style={{ padding: '0 22px 18px' }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(110, 68, 255, 0.12) 0%, rgba(14, 26, 43, 0.4) 100%)',
        border: '1px solid rgba(110, 68, 255, 0.3)',
        borderRadius: 16, padding: 16, boxShadow: '0 8px 32px rgba(110, 68, 255, 0.08)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="sparkle" size={18} color="#6e44ff" />
            <span style={{ fontWeight: 700, fontSize: 14, color: '#9b51e0' }}>{tr('trainer.library.voiceAssistant.title')}</span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: textMute(dark), cursor: 'pointer' }}>
            <Icon name="close" size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            type="text"
            placeholder={tr('trainer.library.voiceAssistant.placeholder')}
            value={voiceQuery}
            onChange={e => onQueryChange(e.target.value)}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 10,
              border: `1px solid ${borderSubtle(dark)}`, background: DARK.bg,
              color: textPri(dark), fontFamily: 'inherit', fontSize: 13,
            }}
          />
          <button
            onClick={() => onSimulate(voiceQuery)}
            disabled={voiceLoading}
            style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#6e44ff', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
          >
            {voiceLoading ? tr('trainer.library.voiceAssistant.analyzing') : tr('trainer.library.voiceAssistant.simulate')}
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {[
            { key: 'lowImpactBurpees', text: tr('trainer.library.voiceAssistant.quickPrompts.lowImpactBurpees') },
            { key: 'searchHamstring',  text: tr('trainer.library.voiceAssistant.quickPrompts.searchHamstring') },
            { key: 'restrictBurpee',   text: tr('trainer.library.voiceAssistant.quickPrompts.restrictBurpee') },
          ].map(tpl => (
            <button
              key={tpl.key}
              onClick={() => { onQueryChange(tpl.text); onSimulate(tpl.text); }}
              style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: DARK.surface3, color: textSec(dark), fontSize: 11, cursor: 'pointer' }}
            >
              "{tpl.text}"
            </button>
          ))}
        </div>

        {voiceResponse && (
          <div style={{ background: DARK.bg, border: `1px solid ${borderSubtle(dark)}`, borderRadius: 12, padding: 12, marginTop: 10 }}>
            <span style={{ fontSize: 11, color: '#9b51e0', fontWeight: 600 }}>{tr('trainer.library.voiceAssistant.parsedIntent')}{voiceResponse.intent}</span>
            <p style={{ fontSize: 13, margin: '4px 0 10px 0', lineHeight: 1.4, color: textPri(dark) }}>"{voiceResponse.reply}"</p>

            {voiceResponse.exercises?.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: textMute(dark), marginBottom: 4 }}>{tr('trainer.library.voiceAssistant.matchingExercises')}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {voiceResponse.exercises.map((e: any) => (
                    <div key={e.id} onClick={() => onSelectExercise(e)} style={{
                      padding: '4px 10px', borderRadius: 6, background: 'rgba(110, 68, 255, 0.1)',
                      border: '1px solid rgba(110, 68, 255, 0.3)', color: '#9b51e0',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    }}>{e.name}</div>
                  ))}
                </div>
              </div>
            )}

            {(voiceResponse.intent.includes('restrict') || voiceResponse.intent.includes('block') || voiceResponse.intent.includes('create')) && (
              <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(242, 201, 76, 0.08)', border: '1px dashed rgba(242, 201, 76, 0.4)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#f2c94c', marginBottom: 6 }}>⚠️ {tr('trainer.library.voiceAssistant.governanceLabel')}</div>
                <button
                  onClick={() => onGovernance(`${voiceResponse.intent} for query: ${voiceQuery}`)}
                  style={{ padding: '6px 12px', background: '#f2c94c', color: INK, border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}
                >
                  {tr('trainer.library.voiceAssistant.confirmLog')}
                </button>
              </div>
            )}
          </div>
        )}

        {auditLogs.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 11, color: textMute(dark) }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{tr('trainer.library.voiceAssistant.auditLog')}</div>
            <div style={{ maxHeight: 60, overflowY: 'auto' }}>
              {auditLogs.map((log, i) => <div key={i} style={{ marginBottom: 2, fontFamily: 'monospace' }}>{log}</div>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── ExerciseDetailModal ───────────────────────────────────────────────────────

interface ExerciseDetailModalProps {
  exercise:         Partial<ExerciseCatalogItem>;
  isEditing:        boolean;
  formError:        string;
  isTrainerOrAdmin: boolean;
  dark:             boolean;
  t:                { primary: string; accent: string };
  onClose:          () => void;
  onStartEdit:      () => void;
  onCancelEdit:     () => void;
  onChange:         (ex: Partial<ExerciseCatalogItem>) => void;
  onSave:           () => void;
}

function ExerciseDetailModal({
  exercise, isEditing, formError, isTrainerOrAdmin, dark, t,
  onClose, onStartEdit, onCancelEdit, onChange, onSave,
}: ExerciseDetailModalProps) {
  const { t: tr } = useTranslation();
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)',
    }}>
      <div style={{
        background: DARK.bg, border: `1px solid ${borderSubtle(dark)}`,
        borderRadius: 20, padding: 22, width: '90%', maxWidth: 500, maxHeight: '90vh',
        overflowY: 'auto', position: 'relative', boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: textPri(dark), cursor: 'pointer' }}>
          <Icon name="close" size={20} />
        </button>

        <h3 style={{ margin: '0 0 16px 0', fontSize: 18, color: textPri(dark), display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="dumbbell" size={20} color={t.primary} />
          {isEditing ? (exercise.id ? tr('trainer.library.modal.editExercise') : tr('trainer.library.modal.newExercise')) : tr('trainer.library.modal.exerciseDetails')}
        </h3>

        {exercise.status === 'blocked' && (
          <div style={{ background: STATUS_TONES.blocked.bg(0.12), border: `1px solid ${STATUS_TONES.blocked.border}`, borderRadius: 10, padding: 10, marginBottom: 16, fontSize: 12, color: STATUS_TONES.blocked.text, lineHeight: 1.4 }}>
            <b>⚠️ {tr('trainer.library.modal.blockedWarning')}</b>
          </div>
        )}
        {exercise.status === 'restricted' && (
          <div style={{ background: STATUS_TONES.restricted.bg(0.12), border: `1px solid ${STATUS_TONES.restricted.border}`, borderRadius: 10, padding: 10, marginBottom: 16, fontSize: 12, color: STATUS_TONES.restricted.text, lineHeight: 1.4 }}>
            ⚠️ {tr('trainer.library.modal.restrictedWarning')}
          </div>
        )}

        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {formError && <div style={{ color: STATUS_TONES.blocked.text, fontSize: 12, fontWeight: 600 }}>{formError}</div>}
            <div>
              <label style={{ fontSize: 11, color: textMute(dark), fontWeight: 600 }}>{tr('trainer.library.modal.exerciseName')}</label>
              <input type="text" value={exercise.name || ''} onChange={e => onChange({ ...exercise, name: e.target.value })}
                style={{ width: '100%', marginTop: 4, padding: 10, borderRadius: 8, border: `1px solid ${borderSubtle(dark)}`, background: DARK.bg, color: textPri(dark) }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: textMute(dark), fontWeight: 600 }}>{tr('trainer.library.modal.muscleGroup')}</label>
                <select value={exercise.muscle_group || 'Legs'} onChange={e => onChange({ ...exercise, muscle_group: e.target.value })}
                  style={{ width: '100%', marginTop: 4, padding: 10, borderRadius: 8, border: `1px solid ${borderSubtle(dark)}`, background: DARK.bg, color: textPri(dark) }}
                >
                  {['Chest','Back','Shoulders','Legs','Arms','Core'].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: textMute(dark), fontWeight: 600 }}>{tr('trainer.library.modal.status')}</label>
                <select value={exercise.status || 'draft'} onChange={e => onChange({ ...exercise, status: e.target.value as any })}
                  style={{ width: '100%', marginTop: 4, padding: 10, borderRadius: 8, border: `1px solid ${borderSubtle(dark)}`, background: DARK.bg, color: textPri(dark) }}
                >
                  {['active','blocked','restricted','draft'].map(s => <option key={s} value={s}>{tr(`trainer.library.statusOpts.${s}` as any)}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: textMute(dark), fontWeight: 600 }}>{tr('trainer.library.modal.equipment')}</label>
                <input type="text"
                  value={exercise.equipment ? (Array.isArray(exercise.equipment) ? exercise.equipment.join(', ') : exercise.equipment) : ''}
                  onChange={e => onChange({ ...exercise, equipment: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  style={{ width: '100%', marginTop: 4, padding: 10, borderRadius: 8, border: `1px solid ${borderSubtle(dark)}`, background: DARK.bg, color: textPri(dark) }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: textMute(dark), fontWeight: 600 }}>{tr('trainer.library.modal.level')}</label>
                <select value={exercise.level || 'beginner'} onChange={e => onChange({ ...exercise, level: e.target.value as any })}
                  style={{ width: '100%', marginTop: 4, padding: 10, borderRadius: 8, border: `1px solid ${borderSubtle(dark)}`, background: DARK.bg, color: textPri(dark) }}
                >
                  {['beginner','intermediate','advanced'].map(l => <option key={l} value={l}>{tr(`trainer.library.levelOpts.${l}` as any)}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: textMute(dark), fontWeight: 600 }}>{tr('trainer.library.modal.descriptionInstructions')}</label>
              <textarea rows={3} value={exercise.short_instruction || ''} onChange={e => onChange({ ...exercise, short_instruction: e.target.value })}
                style={{ width: '100%', marginTop: 4, padding: 10, borderRadius: 8, border: `1px solid ${borderSubtle(dark)}`, background: DARK.bg, color: textPri(dark), fontFamily: 'inherit', fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: textMute(dark), fontWeight: 600 }}>{tr('trainer.library.modal.videoUrl')}</label>
              <input type="text" value={exercise.video_url || ''} onChange={e => onChange({ ...exercise, video_url: e.target.value })}
                style={{ width: '100%', marginTop: 4, padding: 10, borderRadius: 8, border: `1px solid ${borderSubtle(dark)}`, background: DARK.bg, color: textPri(dark) }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: textMute(dark), fontWeight: 600 }}>{tr('trainer.library.modal.accessibilityTags')}</label>
              <input type="text" placeholder={tr('trainer.library.modal.accessibilityPlaceholder')}
                value={exercise.accessibility_tags?.join(', ') || ''}
                onChange={e => onChange({ ...exercise, accessibility_tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                style={{ width: '100%', marginTop: 4, padding: 10, borderRadius: 8, border: `1px solid ${borderSubtle(dark)}`, background: DARK.bg, color: textPri(dark) }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: textMute(dark), fontWeight: 600 }}>{tr('trainer.library.modal.alternativeExercises')}</label>
              <input type="text" placeholder={tr('trainer.library.modal.alternativePlaceholder')}
                value={exercise.alternatives?.join(', ') || ''}
                onChange={e => onChange({ ...exercise, alternatives: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                style={{ width: '100%', marginTop: 4, padding: 10, borderRadius: 8, border: `1px solid ${borderSubtle(dark)}`, background: DARK.bg, color: textPri(dark) }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button onClick={onCancelEdit} style={{ flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${borderSubtle(dark)}`, background: 'transparent', color: textPri(dark), cursor: 'pointer', fontWeight: 600 }}>{tr('trainer.library.modal.cancel')}</button>
              <button onClick={onSave} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: t.accent, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>{tr('trainer.library.modal.saveChanges')}</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: DARK.surface, color: textSec(dark) }}>💪 {exercise.muscle_group}</span>
              {exercise.equipment && <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: DARK.surface, color: textSec(dark) }}>🔧 {Array.isArray(exercise.equipment) ? (exercise.equipment as string[]).map(e => tr(`trainer.library.equipmentOpts.${e}` as any)).join(', ') : exercise.equipment}</span>}
              {exercise.level && <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: DARK.surface, color: textSec(dark) }}>⚡ {tr(`trainer.library.levelOpts.${exercise.level}` as any)}</span>}
            </div>
            {exercise.short_instruction && (
              <div>
                <div style={{ fontSize: 11, color: textMute(dark), fontWeight: 600 }}>{tr('trainer.library.modal.instructions')}</div>
                <div style={{ fontSize: 13, color: textPri(dark), marginTop: 4, lineHeight: 1.5 }}>{exercise.short_instruction}</div>
              </div>
            )}
            {exercise.video_url && (
              <div>
                <div style={{ fontSize: 11, color: textMute(dark), fontWeight: 600 }}>{tr('trainer.library.modal.videoReference')}</div>
                <a href={exercise.video_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: t.primary, marginTop: 4, display: 'inline-block' }}>📹 {tr('trainer.library.modal.viewExecutionVideo')}</a>
              </div>
            )}
            {exercise.accessibility_tags && exercise.accessibility_tags.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: textMute(dark), fontWeight: 600 }}>{tr('trainer.library.modal.accessibilityTagsLabel')}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  {exercise.accessibility_tags.map(tag => (
                    <span key={tag} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: STATUS_TONES.active.bg(0.1), color: STATUS_TONES.active.text, fontWeight: 600 }}>{tr(`trainer.library.accessibilityTags.${tag}` as any)}</span>
                  ))}
                </div>
              </div>
            )}
            {exercise.alternatives && exercise.alternatives.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: textMute(dark), fontWeight: 600 }}>{tr('trainer.library.modal.alternativeExercisesLabel')}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  {exercise.alternatives.map(alt => (
                    <span key={alt} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: 'rgba(110, 68, 255, 0.1)', color: '#9b51e0', fontWeight: 600 }}>{alt}</span>
                  ))}
                </div>
              </div>
            )}
            {isTrainerOrAdmin && (
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button onClick={onStartEdit} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: t.accent, color: '#fff', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Icon name="edit" size={16} color={INK} /> {tr('trainer.library.modal.editExerciseBtn')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
