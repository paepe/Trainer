import React, { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon';
import { ScreenTitle } from '../../components/ScreenTitle';
import { SectionLabel } from '../../components/SectionLabel';
import { useData } from '../../hooks/useData';
import { surfRaised, borderSubtle, textPri, textSec, textMute } from '../../theme';
import type { NavFn, ExerciseCatalogItem } from '../../types';
import { TRAINER_ROLES } from '../../types/auth';

interface Theme {
  primary:     string;
  primaryDeep: string;
  primarySoft: string;
  accent:      string;
}

interface TrainerLibraryExercisesScreenProps {
  nav: NavFn;
  t: Theme;
  dark: boolean;
  user: {
    id: string;
    role: string;
    name: string;
  };
}

export function TrainerLibraryExercisesScreen({ nav, t, dark, user }: TrainerLibraryExercisesScreenProps) {
  const { fetchExercises, saveExercise, fetchProtocolsList, simulateVoiceAssistant } = useData(user.id);

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
      console.error(e);
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
      setFormError('Name is required.');
      return;
    }
    if (!selectedExercise?.muscle_group?.trim()) {
      setFormError('Muscle Group is required.');
      return;
    }
    setFormError('');

    try {
      const res = await saveExercise(selectedExercise);
      if (res.error) {
        setFormError((res.error as any).message || 'Error saving exercise');
      } else {
        setSelectedExercise(null);
        setIsEditing(false);
        await loadData();
      }
    } catch (err: any) {
      setFormError(err.message || 'Unknown error occurred');
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
      console.error(e);
    } finally {
      setVoiceLoading(false);
    }
  };

  const handleConfirmGovernance = (actionName: string) => {
    const time = new Date().toLocaleTimeString();
    setAuditLogs(prev => [`[${time}] Human confirmed voice action: "${actionName}"`, ...prev]);
    alert(`Ação de governança confirmada e registrada no log de auditoria: "${actionName}"`);
    setVoiceResponse(null);
  };

  // Helper styles
  const badgeColor = (status: string) => {
    switch (status) {
      case 'active': return { bg: 'rgba(39, 174, 96, 0.15)', text: '#27ae60' };
      case 'blocked': return { bg: 'rgba(235, 87, 87, 0.15)', text: '#eb5757' };
      case 'restricted': return { bg: 'rgba(242, 201, 76, 0.15)', text: '#f2c94c' };
      case 'draft': return { bg: 'rgba(155, 81, 224, 0.15)', text: '#9b51e0' };
      default: return { bg: 'rgba(120, 120, 120, 0.15)', text: '#828282' };
    }
  };

  return (
    <>
      <ScreenTitle dark={dark} sub="Manage exercises catalog, accessibility variants, and workout protocols.">
        Exercise Library
      </ScreenTitle>

      {/* Tabs Switcher */}
      <div style={{ display: 'flex', padding: '0 22px 16px', gap: 12 }}>
        <button
          onClick={() => setActiveTab('exercises')}
          style={{
            flex: 1, padding: '12px', borderRadius: 12, border: 'none',
            background: activeTab === 'exercises' ? t.primary : surfRaised(dark),
            color: activeTab === 'exercises' ? '#0E1A2B' : textPri(dark),
            fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}
        >
          <Icon name="dumbbell" size={16} color={activeTab === 'exercises' ? '#0E1A2B' : textPri(dark)} />
          Exercises Catalog
        </button>
        <button
          onClick={() => setActiveTab('protocols')}
          style={{
            flex: 1, padding: '12px', borderRadius: 12, border: 'none',
            background: activeTab === 'protocols' ? t.primary : surfRaised(dark),
            color: activeTab === 'protocols' ? '#0E1A2B' : textPri(dark),
            fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}
        >
          <Icon name="history" size={16} color={activeTab === 'protocols' ? '#0E1A2B' : textPri(dark)} />
          Workout Protocols
        </button>
      </div>

      {/* AI Voice Assistant Simulator Section */}
      {showVoicePanel && (
        <div style={{ padding: '0 22px 18px' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(110, 68, 255, 0.12) 0%, rgba(14, 26, 43, 0.4) 100%)',
            border: `1px solid rgba(110, 68, 255, 0.3)`,
            borderRadius: 16, padding: 16, boxShadow: '0 8px 32px rgba(110, 68, 255, 0.08)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="sparkle" size={18} color="#6e44ff" />
                <span style={{ fontWeight: 700, fontSize: 14, color: '#9b51e0' }}>AI Voice Assistant (Módulo 8)</span>
              </div>
              <button 
                onClick={() => setShowVoicePanel(false)}
                style={{ background: 'transparent', border: 'none', color: textMute(dark), cursor: 'pointer' }}
              >
                <Icon name="close" size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                type="text"
                placeholder='E.g., "Tem alternativa sem impacto para burpee?"'
                value={voiceQuery}
                onChange={(e) => setVoiceQuery(e.target.value)}
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 10,
                  border: `1px solid ${borderSubtle(dark)}`,
                  background: dark ? '#0A111E' : '#f5f7fa',
                  color: textPri(dark), fontFamily: 'inherit', fontSize: 13
                }}
              />
              <button
                onClick={() => handleVoiceSimulate(voiceQuery)}
                disabled={voiceLoading}
                style={{
                  padding: '10px 16px', borderRadius: 10, border: 'none',
                  background: '#6e44ff', color: '#fff', fontWeight: 600, cursor: 'pointer'
                }}
              >
                {voiceLoading ? 'Analyzing...' : 'Simulate'}
              </button>
            </div>

            {/* Quick Templates */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              <button 
                onClick={() => { setVoiceQuery('Tem alternativa sem impacto para burpee?'); handleVoiceSimulate('Tem alternativa sem impacto para burpee?'); }}
                style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: dark ? '#1C293E' : '#eef2f6', color: textSec(dark), fontSize: 11, cursor: 'pointer' }}
              >
                "Alternative sem impacto para burpee"
              </button>
              <button 
                onClick={() => { setVoiceQuery('Buscar posterior de coxa com halteres'); handleVoiceSimulate('Buscar posterior de coxa com halteres'); }}
                style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: dark ? '#1C293E' : '#eef2f6', color: textSec(dark), fontSize: 11, cursor: 'pointer' }}
              >
                "Posterior de coxa com halteres"
              </button>
              <button 
                onClick={() => { setVoiceQuery('Marcar burpee como restrito para iniciantes'); handleVoiceSimulate('Marcar burpee como restrito para iniciantes'); }}
                style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: dark ? '#1C293E' : '#eef2f6', color: textSec(dark), fontSize: 11, cursor: 'pointer' }}
              >
                "Restringir burpee para iniciantes"
              </button>
            </div>

            {/* Voice Response Output */}
            {voiceResponse && (
              <div style={{
                background: dark ? '#09101C' : '#fafafa',
                border: `1px solid ${borderSubtle(dark)}`,
                borderRadius: 12, padding: 12, marginTop: 10
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: '#9b51e0', fontWeight: 600 }}>Parsed Intent: {voiceResponse.intent}</span>
                </div>
                <p style={{ fontSize: 13, margin: '4px 0 10px 0', lineHeight: 1.4, color: textPri(dark) }}>
                  "{voiceResponse.reply}"
                </p>

                {/* Recommended matching list */}
                {voiceResponse.exercises && voiceResponse.exercises.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: textMute(dark), marginBottom: 4 }}>Matching exercises:</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {voiceResponse.exercises.map((e: any) => (
                        <div
                          key={e.id}
                          onClick={() => { setSelectedExercise(e); setIsEditing(false); }}
                          style={{
                            padding: '4px 10px', borderRadius: 6, background: 'rgba(110, 68, 255, 0.1)',
                            border: '1px solid rgba(110, 68, 255, 0.3)', color: '#9b51e0',
                            fontSize: 11, fontWeight: 600, cursor: 'pointer'
                          }}
                        >
                          {e.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Governance preview & Human confirmation (RV-8.3) */}
                {voiceResponse.intent.includes('restrict') || voiceResponse.intent.includes('block') || voiceResponse.intent.includes('create') ? (
                  <div style={{
                    marginTop: 10, padding: 10, borderRadius: 8,
                    background: 'rgba(242, 201, 76, 0.08)',
                    border: '1px dashed rgba(242, 201, 76, 0.4)'
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#f2c94c', marginBottom: 6 }}>
                      ⚠️ Governance Action Pre-authorized (RV-8.3)
                    </div>
                    <button
                      onClick={() => handleConfirmGovernance(`${voiceResponse.intent} for query: ${voiceQuery}`)}
                      style={{
                        padding: '6px 12px', background: '#f2c94c', color: '#0E1A2B',
                        border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: 'pointer'
                      }}
                    >
                      Confirm and Log Action
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            {/* Audit Logs */}
            {auditLogs.length > 0 && (
              <div style={{ marginTop: 10, fontSize: 11, color: textMute(dark) }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Governance Audit Log:</div>
                <div style={{ maxHeight: 60, overflowY: 'auto' }}>
                  {auditLogs.map((log, index) => (
                    <div key={index} style={{ marginBottom: 2, fontFamily: 'monospace' }}>{log}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Exercises View */}
      {activeTab === 'exercises' && (
        <div style={{ padding: '0 22px 80px' }}>
          {/* Search and Filter Row */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                placeholder="Search exercises..."
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
                background: showFilters ? t.primary : surfRaised(dark),
                color: showFilters ? '#0E1A2B' : textPri(dark),
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <Icon name="settings" size={18} color={showFilters ? '#0E1A2B' : textPri(dark)} />
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
                Add
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
                  <label style={{ fontSize: 11, color: textMute(dark), fontWeight: 600 }}>Muscle Group</label>
                  <select
                    value={filterMuscle}
                    onChange={(e) => setFilterMuscle(e.target.value)}
                    style={{
                      width: '100%', marginTop: 4, padding: 8, borderRadius: 8,
                      background: dark ? '#0A111E' : '#fff', color: textPri(dark),
                      border: `1px solid ${borderSubtle(dark)}`
                    }}
                  >
                    <option value="All">All Muscles</option>
                    <option value="Chest">Chest</option>
                    <option value="Back">Back</option>
                    <option value="Shoulders">Shoulders</option>
                    <option value="Legs">Legs</option>
                    <option value="Arms">Arms</option>
                    <option value="Core">Core</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 11, color: textMute(dark), fontWeight: 600 }}>Equipment</label>
                  <select
                    value={filterEquipment}
                    onChange={(e) => setFilterEquipment(e.target.value)}
                    style={{
                      width: '100%', marginTop: 4, padding: 8, borderRadius: 8,
                      background: dark ? '#0A111E' : '#fff', color: textPri(dark),
                      border: `1px solid ${borderSubtle(dark)}`
                    }}
                  >
                    <option value="All">All Equipment</option>
                    <option value="dumbbells">Dumbbells</option>
                    <option value="barbell">Barbell</option>
                    <option value="cables">Cables</option>
                    <option value="machine">Machine</option>
                    <option value="bodyweight">Bodyweight</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 11, color: textMute(dark), fontWeight: 600 }}>Level</label>
                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value)}
                    style={{
                      width: '100%', marginTop: 4, padding: 8, borderRadius: 8,
                      background: dark ? '#0A111E' : '#fff', color: textPri(dark),
                      border: `1px solid ${borderSubtle(dark)}`
                    }}
                  >
                    <option value="All">All Levels</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 11, color: textMute(dark), fontWeight: 600 }}>Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{
                      width: '100%', marginTop: 4, padding: 8, borderRadius: 8,
                      background: dark ? '#0A111E' : '#fff', color: textPri(dark),
                      border: `1px solid ${borderSubtle(dark)}`
                    }}
                  >
                    <option value="All">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="blocked">Blocked</option>
                    <option value="restricted">Restricted</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              {/* Accessibility tags checkbox */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: textSec(dark) }}>
                  <input type="checkbox" checked={filterLowImpact} onChange={(e) => setFilterLowImpact(e.target.checked)} />
                  Low Impact
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: textSec(dark) }}>
                  <input type="checkbox" checked={filterNoFloor} onChange={(e) => setFilterNoFloor(e.target.checked)} />
                  No Floor
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: textSec(dark) }}>
                  <input type="checkbox" checked={filterSeated} onChange={(e) => setFilterSeated(e.target.checked)} />
                  Seated
                </label>
              </div>
            </div>
          )}

          {/* List */}
          {loading ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: textMute(dark) }}>Loading exercise catalog...</div>
          ) : filteredExercises.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: textMute(dark) }}>No exercises found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredExercises.map(ex => {
                const badge = badgeColor(ex.status);
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
                        <span>💪 {ex.muscle_group}</span>
                        {ex.equipment && <span>🔧 {ex.equipment}</span>}
                        {ex.level && <span>⚡ {ex.level}</span>}
                      </div>
                      {ex.accessibility_tags && ex.accessibility_tags.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                          {ex.accessibility_tags.map(t => (
                            <span key={t} style={{
                              fontSize: 9, padding: '2px 6px', borderRadius: 4,
                              background: dark ? '#162235' : '#eef2f6', color: textSec(dark)
                            }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                        padding: '4px 8px', borderRadius: 6, background: badge.bg, color: badge.text
                      }}>
                        {ex.status}
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
            <div style={{ padding: '20px 0', textAlign: 'center', color: textMute(dark) }}>Loading protocols...</div>
          ) : protocols.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: textMute(dark) }}>No protocols found.</div>
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
                      <div style={{ fontSize: 12, color: textMute(dark), marginTop: 2 }}>{p.description || 'No description provided.'}</div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                      padding: '4px 8px', borderRadius: 6, background: 'rgba(110,68,255,0.15)', color: '#9b51e0'
                    }}>
                      {p.level}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: textSec(dark), borderBottom: `1px solid ${borderSubtle(dark)}`, paddingBottom: 10, marginBottom: 10 }}>
                    <span>🎯 Objective: <b>{p.objective}</b></span>
                    <span>⏱️ Duration: <b>{p.duration_minutes}m</b></span>
                    {p.is_public && <span style={{ color: t.primary }}>🌐 Public</span>}
                  </div>

                  {/* Exercises inside protocol */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: textMute(dark) }}>Protocol Exercises:</div>
                    {p.protocol_exercises && p.protocol_exercises.length > 0 ? (
                      p.protocol_exercises.map((pe: any, idx: number) => (
                        <div
                          key={pe.id || idx}
                          style={{
                            padding: 10, borderRadius: 10, background: dark ? '#0A111E' : '#f8f9fa',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: textPri(dark) }}>{pe.exercise_name}</div>
                            <div style={{ fontSize: 11, color: textMute(dark), marginTop: 2 }}>
                              {pe.sets} sets x {pe.reps} reps | Load: {pe.load_kg || 0}kg | Rest: {pe.rest_seconds || 0}s
                            </div>
                            {pe.alternative_exercise && (
                              <div style={{ fontSize: 10, color: '#f2c94c', marginTop: 4 }}>
                                🔄 Alternative: {pe.alternative_exercise}
                              </div>
                            )}
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: textMute(dark) }}>#{pe.order_index + 1}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: 11, color: textMute(dark), fontStyle: 'italic' }}>No exercises in this protocol.</div>
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
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100, display: 'flex',
          alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)'
        }}>
          <div style={{
            background: dark ? '#0E1A2B' : '#fff', border: `1px solid ${borderSubtle(dark)}`,
            borderRadius: 20, padding: 22, width: '90%', maxWidth: 500, maxHeight: '90vh',
            overflowY: 'auto', position: 'relative', boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
          }}>
            <button
              onClick={() => { setSelectedExercise(null); setIsEditing(false); }}
              style={{
                position: 'absolute', top: 16, right: 16, background: 'transparent',
                border: 'none', color: textPri(dark), cursor: 'pointer'
              }}
            >
              <Icon name="close" size={20} />
            </button>

            <h3 style={{ margin: '0 0 16px 0', fontSize: 18, color: textPri(dark), display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="dumbbell" size={20} color={t.primary} />
              {isEditing ? (selectedExercise.id ? 'Edit Exercise' : 'New Exercise') : 'Exercise Details'}
            </h3>

            {/* Blocked / Restricted Banner */}
            {selectedExercise.status === 'blocked' && (
              <div style={{
                background: 'rgba(235, 87, 87, 0.12)', border: '1px solid #eb5757',
                borderRadius: 10, padding: 10, marginBottom: 16, fontSize: 12, color: '#eb5757',
                lineHeight: 1.4
              }}>
                <b>⚠️ Blocked Exercise:</b> This exercise has been blocked due to severe safety risks or client contraindications. Postgres constraints actively prevent loading it onto any new workout plans.
              </div>
            )}

            {selectedExercise.status === 'restricted' && (
              <div style={{
                background: 'rgba(242, 201, 76, 0.12)', border: '1px solid #f2c94c',
                borderRadius: 10, padding: 10, marginBottom: 16, fontSize: 12, color: '#f2c94c',
                lineHeight: 1.4
              }}>
                <b>⚠️ Restricted Exercise:</b> This exercise contains relative constraints. Ensure proper supervision and form correction.
              </div>
            )}

            {/* Form / Detail */}
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {formError && <div style={{ color: '#eb5757', fontSize: 12, fontWeight: 600 }}>{formError}</div>}

                <div>
                  <label style={{ fontSize: 11, color: textMute(dark), fontWeight: 600 }}>Exercise Name</label>
                  <input
                    type="text"
                    value={selectedExercise.name || ''}
                    onChange={(e) => setSelectedExercise({ ...selectedExercise, name: e.target.value })}
                    style={{
                      width: '100%', marginTop: 4, padding: 10, borderRadius: 8,
                      border: `1px solid ${borderSubtle(dark)}`,
                      background: dark ? '#0A111E' : '#f5f7fa', color: textPri(dark)
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: textMute(dark), fontWeight: 600 }}>Muscle Group</label>
                    <select
                      value={selectedExercise.muscle_group || 'Legs'}
                      onChange={(e) => setSelectedExercise({ ...selectedExercise, muscle_group: e.target.value })}
                      style={{
                        width: '100%', marginTop: 4, padding: 10, borderRadius: 8,
                        border: `1px solid ${borderSubtle(dark)}`,
                        background: dark ? '#0A111E' : '#f5f7fa', color: textPri(dark)
                      }}
                    >
                      <option value="Chest">Chest</option>
                      <option value="Back">Back</option>
                      <option value="Shoulders">Shoulders</option>
                      <option value="Legs">Legs</option>
                      <option value="Arms">Arms</option>
                      <option value="Core">Core</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: textMute(dark), fontWeight: 600 }}>Status</label>
                    <select
                      value={selectedExercise.status || 'draft'}
                      onChange={(e) => setSelectedExercise({ ...selectedExercise, status: e.target.value as any })}
                      style={{
                        width: '100%', marginTop: 4, padding: 10, borderRadius: 8,
                        border: `1px solid ${borderSubtle(dark)}`,
                        background: dark ? '#0A111E' : '#f5f7fa', color: textPri(dark)
                      }}
                    >
                      <option value="active">Active</option>
                      <option value="blocked">Blocked</option>
                      <option value="restricted">Restricted</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: textMute(dark), fontWeight: 600 }}>Equipment</label>
                    <input
                      type="text"
                      value={selectedExercise.equipment ? (Array.isArray(selectedExercise.equipment) ? selectedExercise.equipment.join(', ') : selectedExercise.equipment) : ''}
                      onChange={(e) => setSelectedExercise({ ...selectedExercise, equipment: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                      style={{
                        width: '100%', marginTop: 4, padding: 10, borderRadius: 8,
                        border: `1px solid ${borderSubtle(dark)}`,
                        background: dark ? '#0A111E' : '#f5f7fa', color: textPri(dark)
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: textMute(dark), fontWeight: 600 }}>Level</label>
                    <select
                      value={selectedExercise.level || 'beginner'}
                      onChange={(e) => setSelectedExercise({ ...selectedExercise, level: e.target.value as any })}
                      style={{
                        width: '100%', marginTop: 4, padding: 10, borderRadius: 8,
                        border: `1px solid ${borderSubtle(dark)}`,
                        background: dark ? '#0A111E' : '#f5f7fa', color: textPri(dark)
                      }}
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11, color: textMute(dark), fontWeight: 600 }}>Description & Instructions</label>
                  <textarea
                    rows={3}
                    value={selectedExercise.short_instruction || ''}
                    onChange={(e) => setSelectedExercise({ ...selectedExercise, short_instruction: e.target.value })}
                    style={{
                      width: '100%', marginTop: 4, padding: 10, borderRadius: 8,
                      border: `1px solid ${borderSubtle(dark)}`,
                      background: dark ? '#0A111E' : '#f5f7fa', color: textPri(dark),
                      fontFamily: 'inherit', fontSize: 13
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, color: textMute(dark), fontWeight: 600 }}>Video URL</label>
                  <input
                    type="text"
                    value={selectedExercise.video_url || ''}
                    onChange={(e) => setSelectedExercise({ ...selectedExercise, video_url: e.target.value })}
                    style={{
                      width: '100%', marginTop: 4, padding: 10, borderRadius: 8,
                      border: `1px solid ${borderSubtle(dark)}`,
                      background: dark ? '#0A111E' : '#f5f7fa', color: textPri(dark)
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, color: textMute(dark), fontWeight: 600 }}>Accessibility Tags (comma separated)</label>
                  <input
                    type="text"
                    placeholder="low_impact, no_floor, seated"
                    value={selectedExercise.accessibility_tags?.join(', ') || ''}
                    onChange={(e) => setSelectedExercise({
                      ...selectedExercise,
                      accessibility_tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                    style={{
                      width: '100%', marginTop: 4, padding: 10, borderRadius: 8,
                      border: `1px solid ${borderSubtle(dark)}`,
                      background: dark ? '#0A111E' : '#f5f7fa', color: textPri(dark)
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, color: textMute(dark), fontWeight: 600 }}>Alternative Exercises (comma separated)</label>
                  <input
                    type="text"
                    placeholder="Step Jack, Marcha no Lugar"
                    value={selectedExercise.alternatives?.join(', ') || ''}
                    onChange={(e) => setSelectedExercise({
                      ...selectedExercise,
                      alternatives: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                    style={{
                      width: '100%', marginTop: 4, padding: 10, borderRadius: 8,
                      border: `1px solid ${borderSubtle(dark)}`,
                      background: dark ? '#0A111E' : '#f5f7fa', color: textPri(dark)
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                  <button
                    onClick={() => setIsEditing(false)}
                    style={{
                      flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${borderSubtle(dark)}`,
                      background: 'transparent', color: textPri(dark), cursor: 'pointer', fontWeight: 600
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    style={{
                      flex: 1, padding: 12, borderRadius: 10, border: 'none',
                      background: t.primary, color: '#0E1A2B', cursor: 'pointer', fontWeight: 700
                    }}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: dark ? '#1F2E45' : '#eef2f6', color: textSec(dark) }}>
                    💪 {selectedExercise.muscle_group}
                  </span>
                  {selectedExercise.equipment && (
                    <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: dark ? '#1F2E45' : '#eef2f6', color: textSec(dark) }}>
                      🔧 {Array.isArray(selectedExercise.equipment) ? selectedExercise.equipment.join(', ') : selectedExercise.equipment}
                    </span>
                  )}
                  {selectedExercise.level && (
                    <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: dark ? '#1F2E45' : '#eef2f6', color: textSec(dark) }}>
                      ⚡ {selectedExercise.level}
                    </span>
                  )}
                </div>

                {selectedExercise.short_instruction && (
                  <div>
                    <div style={{ fontSize: 11, color: textMute(dark), fontWeight: 600 }}>Instructions:</div>
                    <div style={{ fontSize: 13, color: textPri(dark), marginTop: 4, lineHeight: 1.5 }}>
                      {selectedExercise.short_instruction}
                    </div>
                  </div>
                )}

                {selectedExercise.video_url && (
                  <div>
                    <div style={{ fontSize: 11, color: textMute(dark), fontWeight: 600 }}>Video Reference:</div>
                    <a href={selectedExercise.video_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: t.primary, marginTop: 4, display: 'inline-block' }}>
                      📹 View execution video
                    </a>
                  </div>
                )}

                {selectedExercise.accessibility_tags && selectedExercise.accessibility_tags.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: textMute(dark), fontWeight: 600 }}>Accessibility Tags:</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      {selectedExercise.accessibility_tags.map(tag => (
                        <span key={tag} style={{
                          fontSize: 10, padding: '3px 8px', borderRadius: 6,
                          background: 'rgba(39, 174, 96, 0.1)', color: '#27ae60', fontWeight: 600
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedExercise.alternatives && selectedExercise.alternatives.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: textMute(dark), fontWeight: 600 }}>Alternative Exercises:</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      {selectedExercise.alternatives.map(alt => (
                        <span key={alt} style={{
                          fontSize: 10, padding: '3px 8px', borderRadius: 6,
                          background: 'rgba(110, 68, 255, 0.1)', color: '#9b51e0', fontWeight: 600
                        }}>
                          {alt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {isTrainerOrAdmin && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                    <button
                      onClick={() => setIsEditing(true)}
                      style={{
                        flex: 1, padding: 12, borderRadius: 10, border: 'none',
                        background: t.primary, color: '#0E1A2B', cursor: 'pointer', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                      }}
                    >
                      <Icon name="edit" size={16} color="#0E1A2B" />
                      Edit exercise
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
