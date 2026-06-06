import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, TextInput } from '@/ui';
import type { Protocol, ProtocolExercise } from '../../types';
import { C } from './SharedAtoms';

interface ProtocolDetailProps {
  protocol: Protocol;
  onAddExercise: (ex: Omit<ProtocolExercise, 'id' | 'protocol_id'> & { order_index: number }) => Promise<{ error: unknown }>;
}

export function ProtocolDetail({ protocol, onAddExercise }: ProtocolDetailProps) {
  const { t: tr } = useTranslation();
  const [showAdd, setShowAdd] = React.useState(false);
  const [draft, setDraft] = React.useState({
    exercise_name: '', muscle_group: 'Chest', sets: '3', reps: '10', load_kg: '', rest_seconds: '60',
  });

  async function add() {
    if (!draft.exercise_name.trim()) return;
    const parsedLoad = draft.load_kg.trim() === '' ? null : Number(draft.load_kg);
    await onAddExercise({
      exercise_name: draft.exercise_name.trim(), muscle_group: draft.muscle_group,
      sets: Number(draft.sets) || 3, reps: Number(draft.reps) || 10,
      load_kg: parsedLoad, rest_seconds: Number(draft.rest_seconds) || 60,
      order_index: protocol.exercises?.length || 0,
    });
    setDraft({ exercise_name: '', muscle_group: 'Chest', sets: '3', reps: '10', load_kg: '', rest_seconds: '60' });
    setShowAdd(false);
  }

  return (
    <div style={{ borderTop: `1px solid ${C.border}`, padding: '16px 20px 20px' }}>
      {protocol.description && (
        <p style={{ fontSize: 13, color: C.textSec, marginBottom: 16 }}>{protocol.description}</p>
      )}
      <div style={{ fontSize: 11, fontWeight: 700, color: C.textMute, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>
        {tr('studio.protocolDetail.exercisesCount', { count: protocol.exercises?.length || 0 })}
      </div>
      {protocol.exercises?.length === 0 && !showAdd && (
        <div style={{ color: C.textMute, fontSize: 13, marginBottom: 12 }}>{tr('studio.protocolDetail.noExercises')}</div>
      )}
      {showAdd && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14, padding: 16, borderRadius: 12, background: C.surface2 }}>
          <TextInput label={tr('studio.protocolDetail.exercise')} value={draft.exercise_name} onChange={v => setDraft({ ...draft, exercise_name: v })} placeholder="e.g. Bench Press"/>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.textMute, textTransform: 'uppercase', letterSpacing: '.06em' }}>{tr('studio.protocolDetail.muscleGroup')}</span>
            <select value={draft.muscle_group} onChange={e => setDraft({ ...draft, muscle_group: e.target.value })}
              style={{ padding: '10px 12px', borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, color: C.textPri, fontSize: 13, outline: 'none' }}>
              {['Chest', 'Back', 'Shoulders', 'Arms', 'Core', 'Legs', 'Full body', 'Cardio'].map(g => <option key={g}>{g}</option>)}
            </select>
          </label>
          <TextInput label={tr('studio.protocolDetail.sets')} value={draft.sets} onChange={v => setDraft({ ...draft, sets: v })} placeholder="3"/>
          <TextInput label={tr('studio.protocolDetail.reps')} value={draft.reps} onChange={v => setDraft({ ...draft, reps: v })} placeholder="10"/>
          <TextInput label={tr('studio.protocolDetail.loadKg')} value={draft.load_kg} onChange={v => setDraft({ ...draft, load_kg: v })} placeholder={tr('studio.protocolDetail.loadOptional')}/>
          <TextInput label={tr('studio.protocolDetail.restS')} value={draft.rest_seconds} onChange={v => setDraft({ ...draft, rest_seconds: v })} placeholder="60"/>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
            <Button size="sm" onClick={add}>{tr('studio.protocolDetail.add')}</Button>
            <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>{tr('studio.protocolDetail.cancel')}</Button>
          </div>
        </div>
      )}
      {!showAdd && (
        <button onClick={() => setShowAdd(true)} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: `${C.primary}18`, color: C.primary, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          {tr('studio.protocolDetail.addExercise')}
        </button>
      )}
    </div>
  );
}
