import React from 'react';
import { Icon } from './Icon';

interface RefreshChipProps {
  onRefresh:    () => void;
  loading:      boolean;
  lastUpdated:  Date | null;
  /** When true, shows a "Live" dot instead of the timestamp (Realtime screens) */
  live?:        boolean;
  color:        string;
  dark:         boolean;
}

function fmtAgo(date: Date | null): string {
  if (!date) return '';
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 5)   return 'just now';
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// Small "Updated Xs ago ↻" chip — re-runs the screen's fetch on tap.
// Used on sensitive screens that are not Realtime-live.
export function RefreshChip({ onRefresh, loading, lastUpdated, live, color, dark }: RefreshChipProps) {
  // Tick every 15s so the "Xs ago" label stays current while the screen is open
  const [, force] = React.useState(0);
  React.useEffect(() => {
    if (live) return;
    const id = setInterval(() => force(n => n + 1), 15_000);
    return () => clearInterval(id);
  }, [live]);

  const muted = dark ? 'rgba(255,255,255,.45)' : '#7a8694';

  return (
    <button
      onClick={onRefresh}
      disabled={loading}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 10px', borderRadius: 999,
        background: `${color}14`, border: `1px solid ${color}33`,
        cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit',
        opacity: loading ? 0.6 : 1,
      }}
    >
      {live ? (
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
      ) : (
        <span style={{
          display: 'inline-flex',
          animation: loading ? 'spin 0.7s linear infinite' : 'none',
        }}>
          <Icon name="refresh" size={12} color={color} stroke={2.4} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </span>
      )}
      <span style={{ fontSize: 10.5, fontWeight: 600, color: live ? '#4ade80' : muted }}>
        {live ? 'Live' : loading ? 'Updating…' : fmtAgo(lastUpdated) || 'Refresh'}
      </span>
    </button>
  );
}
