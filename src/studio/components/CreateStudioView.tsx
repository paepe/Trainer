import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui';
import { C } from './SharedAtoms';

interface CreateStudioViewProps {
  onCreate: (name: string) => Promise<{ error: unknown }>;
}

export default function CreateStudioView({ onCreate }: CreateStudioViewProps) {
  const { t: tr } = useTranslation();
  const [name, setName] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState('');

  async function submit() {
    if (!name.trim()) return;
    setLoading(true);
    const { error } = await onCreate(name.trim());
    if (error) {
      setErr(error instanceof Error ? error.message : tr('studio.createStudio.errUnknown'));
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 20 }}>🏢</div>
      <h1 style={{ fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 28, fontWeight: 800, margin: '0 0 10px' }}>{tr('studio.createStudio.title')}</h1>
      <p style={{ color: C.textSec, marginBottom: 32 }}>{tr('studio.createStudio.note')}</p>
      <input value={name} onChange={e => setName(e.target.value)} placeholder={tr('studio.createStudio.namePlaceholder')}
        style={{ width: '100%', padding: '14px 16px', borderRadius: 12, background: C.surface2, border: `1.5px solid ${C.border}`, color: C.textPri, fontSize: 15, outline: 'none', marginBottom: 12 }} />
      {err && <div style={{ color: C.accent, fontSize: 13, marginBottom: 12 }}>{err}</div>}
      <Button onClick={submit} loading={loading} full>{tr('studio.createStudio.btnCreateStudio')}</Button>
    </div>
  );
}
