import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export function useAuth() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data);
    setLoading(false);
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signUp(email, password, name, role = 'client') {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role } },
    });
    return { data, error };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function updateProfile(updates) {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', session.user.id);
    if (!error) setProfile(prev => ({ ...prev, ...updates }));
    return { error };
  }

  return { session, profile, loading, signIn, signUp, signOut, updateProfile };
}
