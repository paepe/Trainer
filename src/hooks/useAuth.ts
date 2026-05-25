import { useState, useEffect } from 'react';
import type { Session, AuthError, PostgrestError } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import type { Profile } from '../types';

interface SignInResult  { error: AuthError | null }
interface SignUpResult  { data: unknown; error: AuthError | null }
interface UpdateResult { error: AuthError | PostgrestError | null }

interface UseAuthReturn {
  session:       Session | null;
  profile:       Profile | null;
  loading:       boolean;
  signIn:        (email: string, password: string) => Promise<SignInResult>;
  signUp:        (email: string, password: string, name: string, role?: string) => Promise<SignUpResult>;
  signOut:       () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<UpdateResult>;
}

function normalizeProfileUpdates(updates: Partial<Profile>, userId: string): Partial<Profile> & { id: string } {
  return {
    id: userId,
    ...updates,
    name:       updates.name?.trim() ?? '',
    email:      updates.email?.trim() ?? '',
    phone:      updates.phone?.trim() || null,
    dob:        updates.dob || null,
    location:   updates.location?.trim() || null,
    gender:     updates.gender || null,
    avatar_url: updates.avatar_url ?? null,
  };
}

export function useAuth(): UseAuthReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) void fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) void fetchProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string): Promise<void> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) console.error('[useAuth] fetchProfile error:', error);
    setProfile(data as Profile | null);
    setLoading(false);
  }

  async function signIn(email: string, password: string): Promise<SignInResult> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) console.error('[useAuth] signIn error:', error);
    return { error };
  }

  async function signUp(email: string, password: string, name: string, role = 'client'): Promise<SignUpResult> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role } },
    });
    if (error) console.error('[useAuth] signUp error:', error);
    return { data, error };
  }

  async function signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('[useAuth] signOut error:', error);
  }

  async function updateProfile(updates: Partial<Profile>): Promise<UpdateResult> {
    if (!session) return { error: null };
    const payload = normalizeProfileUpdates(updates, session.user.id);
    const { error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' });
    if (error) console.error('[useAuth] updateProfile error:', error);
    else setProfile(prev => prev ? { ...prev, ...updates } : prev);
    return { error };
  }

  return { session, profile, loading, signIn, signUp, signOut, updateProfile };
}
