import React, { createContext, useContext, useState, useRef, useCallback, useMemo } from 'react';
import { HStack } from '../ui';

import { vibrate } from '../lib/haptics';
import type { BrandTheme } from '../theme';

interface NotificationContextValue {
  showNotification: (title: string, body: string) => void;
  hideNotification: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

interface NotificationProviderProps {
  children: React.ReactNode;
  t: BrandTheme;
}

export function NotificationProvider({ children, t }: NotificationProviderProps) {
  const [notif, setNotif] = useState<{ title: string; body: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotification = useCallback((title: string, body: string) => {
    setNotif({ title, body });
    vibrate('notification');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setNotif(null), 5000);
  }, []);

  const hideNotification = useCallback(() => {
    setNotif(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const notifBg = 'var(--surface-3)';
  const notifColor = 'var(--text-pri)';
  const notifSubColor = 'var(--text-sec)';
  const closeBtnColor = 'var(--text-mute)';

  const value = useMemo(() => ({ showNotification, hideNotification }), [showNotification, hideNotification]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {notif && (
        <HStack
          alignItems="flex-start"
          gap={12}
          style={{
            position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
            zIndex: 9999, maxWidth: 380, width: 'calc(100% - 32px)',
            background: notifBg,
            border: `1px solid ${t.primary}`,
            borderRadius: 14, padding: '14px 16px',
            boxShadow: '0 8px 32px rgba(0,0,0,.35)',
            animation: 'slideDown .25s ease',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3, color: notifColor }}>
              {notif.title}
            </div>
            <div style={{ fontSize: 12, color: notifSubColor, lineHeight: 1.4 }}>
              {notif.body}
            </div>
          </div>
          <button
            onClick={hideNotification}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: closeBtnColor, fontSize: 20, lineHeight: 1, padding: 0, marginTop: -2 }}
          >×</button>
        </HStack>
      )}
      <style>{`@keyframes slideDown { from { opacity:0; transform:translateX(-50%) translateY(-12px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within NotificationProvider');
  return context;
}
