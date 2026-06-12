import { useState, useEffect } from 'react';
import type { Session, AuthError, PostgrestError } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import type { Profile } from '../types';

interface SignInResult  { error: AuthError | null }
interface SignUpResult  { data: unknown; error: AuthError | null }
interface UpdateResult { error: AuthError | PostgrestError | null }
interface ResetResult  { error: AuthError | null }

interface UseAuthReturn {
  session:           Session | null;
  profile:           Profile | null;
  loading:           boolean;
  passwordRecovery:  boolean;
  signIn:            (email: string, password: string) => Promise<SignInResult>;
  signUp:            (email: string, password: string, name: string, role?: string) => Promise<SignUpResult>;
  signOut:           () => Promise<void>;
  updateProfile:     (updates: Partial<Profile>) => Promise<UpdateResult>;
  requestPasswordReset: (email: string) => Promise<ResetResult>;
  updatePassword:       (password: string) => Promise<ResetResult>;
  clearPasswordRecovery: () => void;
  resendConfirmation:   (email: string) => Promise<ResetResult>;
}

// Partial PATCH: only trims/normalizes fields the caller actually included —
// fields not present in `updates` are left untouched in the database.
function normalizeProfileUpdates(updates: Partial<Profile>): Partial<Profile> {
  const normalized: Partial<Profile> = { ...updates };
  if (normalized.name     !== undefined) normalized.name     = normalized.name.trim();
  if (normalized.email    !== undefined) normalized.email    = normalized.email.trim();
  if (normalized.phone    !== undefined) normalized.phone    = normalized.phone.trim();
  if (normalized.location !== undefined) normalized.location = normalized.location.trim();
  return normalized;
}

export function useAuth(): UseAuthReturn {
  const [session, setSession]   = useState<Session | null>(null);
  const [profile, setProfile]   = useState<Profile | null>(null);
  const [loading, setLoading]   = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) void fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
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
    const payload = normalizeProfileUpdates(updates);
    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', session.user.id);
    if (error) console.error('[useAuth] updateProfile error:', error);
    else setProfile(prev => prev ? { ...prev, ...updates } : prev);
    return { error };
  }

  async function requestPasswordReset(email: string): Promise<ResetResult> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) console.error('[useAuth] requestPasswordReset error:', error);
    return { error };
  }

  async function updatePassword(password: string): Promise<ResetResult> {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) console.error('[useAuth] updatePassword error:', error);
    else setPasswordRecovery(false);
    return { error };
  }

  function clearPasswordRecovery(): void {
    setPasswordRecovery(false);
  }

  async function resendConfirmation(email: string): Promise<ResetResult> {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) console.error('[useAuth] resendConfirmation error:', error);
    return { error };
  }

  return {
    session, profile, loading, passwordRecovery,
    signIn, signUp, signOut, updateProfile,
    requestPasswordReset, updatePassword, clearPasswordRecovery, resendConfirmation,
  };
}
