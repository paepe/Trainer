import React from 'react';
import { Spinner } from '../ui';

// Lazy-loaded screen chunks can fail to fetch — typically right after a new
// deploy, when the cached `index.html` still references chunk hashes that no
// longer exist on the server (stale Capacitor webview cache, flaky mobile
// network). React.lazy/Suspense cannot catch render-phase errors, so without
// a boundary the failure unmounts the whole tree to a blank screen, and only
// a manual reload (which re-fetches a fresh index.html + matching chunks)
// recovers it. This boundary catches that specific failure and reloads
// automatically — once — so the user never sees the blank screen at all.

const RELOAD_FLAG_KEY = 'trainer:chunk-reload-attempted';

function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /loading chunk|failed to fetch dynamically imported module|importing a module script failed/i.test(message);
}

interface Props {
  primary: string;
  children: React.ReactNode;
}

interface State {
  failed: boolean;
  chunkError: boolean;
}

export class ChunkErrorBoundary extends React.Component<Props, State> {
  state: State = { failed: false, chunkError: false };

  static getDerivedStateFromError(error: unknown): State {
    return { failed: true, chunkError: isChunkLoadError(error) };
  }

  componentDidCatch(error: unknown) {
    if (isChunkLoadError(error)) {
      const alreadyTried = sessionStorage.getItem(RELOAD_FLAG_KEY) === '1';
      if (!alreadyTried) {
        sessionStorage.setItem(RELOAD_FLAG_KEY, '1');
        window.location.reload();
      }
    }
  }

  componentDidUpdate(_prevProps: Props, _prevState: State, _snapshot?: unknown) {
    // Successful render after a caught error — clear the retry flag so a
    // future failure (e.g. after the next deploy) gets its own auto-reload.
    if (!this.state.failed) {
      sessionStorage.removeItem(RELOAD_FLAG_KEY);
    }
  }

  render() {
    if (this.state.failed) {
      const alreadyTried = sessionStorage.getItem(RELOAD_FLAG_KEY) === '1';
      if (this.state.chunkError && !alreadyTried) {
        // Reload is in flight (triggered in componentDidCatch) — show the
        // normal loading state instead of an error flash.
        return (
          <div style={{
            height: '100dvh', width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg)',
          }}>
            <Spinner color={this.props.primary} size={36} thickness={3} />
          </div>
        );
      }
      return (
        <div style={{
          height: '100dvh', width: '100%',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 16, padding: 24, textAlign: 'center', background: 'var(--bg)', color: 'var(--text-pri)',
        }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>
            Something went wrong loading this screen.
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-mute)', maxWidth: 320 }}>
            Please reload the app. If the problem persists, check your connection.
          </div>
          <button
            onClick={() => { sessionStorage.removeItem(RELOAD_FLAG_KEY); window.location.reload(); }}
            style={{
              padding: '10px 24px', borderRadius: 999, border: 'none',
              background: this.props.primary, color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
