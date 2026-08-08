import React from 'react';
import { supabase } from '../supabase';
import { useStudioData } from './hooks/useStudioData';
import { Loader, AccessDenied, LoginView, C } from './components/SharedAtoms';
import { Sidebar } from './components/Sidebar';
import CreateStudioView from './components/CreateStudioView';
import DashboardView from './components/DashboardView';
import TeamView from './components/TeamView';
import ClientsView from './components/ClientsView';
import { ProtocolsView } from './components/ProtocolsView';
import type { Session } from '@supabase/supabase-js';
import type { Profile } from '../types';

export default function StudioApp() {
  const [session, setSession] = React.useState<Session | null | undefined>(undefined);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [view, setView] = React.useState('dashboard');

  React.useEffect(() => {
    // The function is declared below so it can remain a single local data mapper.
    // eslint-disable-next-line react-hooks/immutability
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) void fetchProfile(s.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) void fetchProfile(s.user.id);
      else { setProfile(null); setSession(null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(uid: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
    if (!data) return;
    setProfile({
      id:         data.id,
      name:       data.name       ?? '',
      email:      data.email      ?? '',
      phone:      data.phone      ?? '',
      dob:        data.dob        ?? '',
      location:   data.location   ?? '',
      gender:     (data.gender    ?? '') as Profile['gender'],
      role:       (data.role      ?? 'client') as Profile['role'],
      avatar_url: data.avatar_url ?? null,
      created_at: data.created_at ?? '',
    });
  }

  if (session === undefined) return <Loader />;
  if (!session) return <LoginView />;
  if (!profile) return <Loader />;
  if (profile.role !== 'studio_admin') {
    return <AccessDenied onSignOut={() => supabase.auth.signOut()} />;
  }

  return <Dashboard session={session} profile={profile} view={view} setView={setView} />;
}

interface DashboardProps {
  session: Session;
  profile: Profile;
  view: string;
  setView: (view: string) => void;
}

function Dashboard({ session, profile, view, setView }: DashboardProps) {
  const data = useStudioData(session.user.id);

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, color: C.textPri }}>
      <Sidebar data={data} profile={profile} view={view} setView={setView} />
      <main style={{ flex: 1, overflow: 'auto', padding: '36px 44px' }}>
        {data.loading ? (
          <Loader inline />
        ) : !data.studio ? (
          <CreateStudioView onCreate={data.createStudio} />
        ) : view === 'dashboard' ? (
          <DashboardView data={data} />
        ) : view === 'team' ? (
          <TeamView data={data} />
        ) : view === 'clients' ? (
          <ClientsView data={data} />
        ) : (
          <ProtocolsView data={data} />
        )}
      </main>
    </div>
  );
}
