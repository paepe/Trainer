import React from 'react';
import { SideMenu, BottomTabs } from '../components';
import { HStack, VStack } from '../ui';

export interface AppLayoutProps {
  role: 'client' | 'trainer';
  children: React.ReactNode;
  contentRef: React.RefObject<HTMLDivElement | null>;
  surfaceBg: string;
  dark: boolean;
  showTabs: boolean;
  tabs: [string, string, string][];
  screen: string;
  nav: (target: string, payload?: any) => void;
  t: any;
  user: any;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  handleSetUser: (data: any) => Promise<{ error: unknown }>;
  profile: any;
  tabBadges?: Record<string, number>;
}

export function AppLayout({
  role,
  children,
  contentRef,
  surfaceBg,
  dark,
  showTabs,
  tabs,
  screen,
  nav,
  t,
  user,
  menuOpen,
  setMenuOpen,
  handleSetUser,
  profile,
  tabBadges = {},
}: AppLayoutProps) {
  const isTrainer = role === 'trainer';
  const fontFamily = isTrainer
    ? '"Plus Jakarta Sans", "Inter", system-ui, sans-serif'
    : '"Inter","Plus Jakarta Sans",system-ui,-apple-system,sans-serif';
  const color = isTrainer ? '#FFFFFF' : (dark ? '#fff' : '#102236');

  return (
    <VStack
      style={{
        height: '100dvh',
        width: '100%',
        background: surfaceBg,
        overflow: 'hidden',
        position: 'relative',
        fontFamily,
        color,
      }}
    >
      <div
        ref={contentRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {children}
      </div>

      {showTabs && (
        <BottomTabs tabs={tabs} active={screen} onTap={nav} primary={t.primary} dark={dark} badges={tabBadges} />
      )}

      <SideMenu
        open={menuOpen}
        nav={(s) => { setMenuOpen(false); if (s && s !== 'menu') nav(s); }}
        t={t} user={user} current={screen} setUser={handleSetUser} role={profile?.role}
      />
    </VStack>
  );
}
