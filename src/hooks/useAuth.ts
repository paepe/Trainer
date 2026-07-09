import { useState, useEffect } from 'react';
import type { Session, AuthError, PostgrestError } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import type { Profile, PlanKey, Subscription } from '../types';
import { TRAINER_ROLES } from '../types/auth';
import { clearFeaturePermissionCache } from './useFeatureAccess';

const TRIAL_DAYS          = 21;
const WELCOME_WINDOW_DAYS = 21;

function addDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

interface SignInResult  { error: AuthError | null }
interface SignUpResult  { data: unknown; error: AuthError | null }
interface UpdateResult { error: AuthError | PostgrestError | null }
interface ResetResult  { error: AuthError | null }

interface UseAuthReturn {
  session:           Session | null;
  profile:           Profile | null;
  subscription:      Subscription | null;
  hasSubscription:   boolean;
  loading:           boolean;
  passwordRecovery:  boolean;
  signIn:            (email: string, password: string) => Promise<SignInResult>;
  signUp:            (email: string, password: string, name: string, role?: string) => Promise<SignUpResult>;
  signOut:           () => Promise<void>;
  updateProfile:     (updates: Partial<Profile>) => Promise<UpdateResult>;
  upsertSubscription:   (planKey: PlanKey, billingCycle: 'monthly' | 'annual') => Promise<UpdateResult>;
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
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) void fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      setSession(session);
      if (session) void fetchProfile(session.user.id);
      else { setProfile(null); setSubscription(null); setHasSubscription(false); setLoading(false); }
    });

    return () => authListener.unsubscribe();
  }, []);

  async function fetchProfile(userId: string): Promise<void> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) console.error('[useAuth] fetchProfile error:', error);
    setProfile(data as Profile | null);

    const { data: sub, error: subError } = await supabase
      .from('subscriptions')
      .select('plan_key, status, billing_cycle, current_period_end')
      .eq('user_id', userId)
      .maybeSingle();
    if (subError) console.error('[useAuth] fetchSubscription error:', subError);

    if (!sub) {
      // Provision subscription based on role:
      //   - trainer roles → 'trial' with 14-day expiry (enforces conversion pressure)
      //   - client        → 'free' with 21-day welcome window at ai_fitness level
      const profile = data as Profile | null;
      const isTrainer = profile?.role && TRAINER_ROLES.includes(profile.role);
      const planKey: PlanKey          = isTrainer ? 'trial' : 'free';
      const current_period_end: string = isTrainer
        ? addDays(TRIAL_DAYS)
        : addDays(WELCOME_WINDOW_DAYS);

      await supabase.from('subscriptions').upsert({
        user_id: userId,
        plan_key: planKey,
        status: 'active',
        billing_cycle: null,
        current_period_end,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      setHasSubscription(true);
      setSubscription({ plan_key: planKey, status: 'active', billing_cycle: null, current_period_end });
      setLoading(false);
      return;
    }

    setHasSubscription(true);
    setSubscription(sub as Subscription);

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
    clearFeaturePermissionCache();
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

  async function upsertSubscription(planKey: PlanKey, billingCycle: 'monthly' | 'annual'): Promise<UpdateResult> {
    if (!session) return { error: null };
    const billing_cycle = planKey === 'free' ? null : billingCycle;

    // Resolve price and event_type before writing
    const [priceRes, prevSub] = await Promise.all([
      supabase
        .from('plan_prices')
        .select('id, amount_cents')
        .eq('plan_key', planKey)
        .eq('billing_cycle', billing_cycle ?? 'monthly')
        .eq('currency', 'EUR')
        .eq('is_active', true)
        .is('valid_until', null)
        .maybeSingle(),
      Promise.resolve(subscription),
    ]);

    const priceRow = priceRes.data;
    const prevKey  = prevSub?.plan_key ?? null;

    type EventType = 'activated' | 'upgraded' | 'downgraded' | 'renewed';
    let event_type: EventType = 'activated';
    if (prevKey) {
      if (prevKey === planKey)  event_type = 'renewed';
      else {
        // Compare by amount_cents for up/down determination
        const { data: prevPrice } = await supabase
          .from('plan_prices')
          .select('amount_cents')
          .eq('plan_key', prevKey)
          .eq('billing_cycle', prevSub?.billing_cycle ?? 'monthly')
          .eq('currency', 'EUR')
          .eq('is_active', true)
          .is('valid_until', null)
          .maybeSingle();
        const prevCents = prevPrice?.amount_cents ?? 0;
        const newCents  = priceRow?.amount_cents   ?? 0;
        event_type = newCents >= prevCents ? 'upgraded' : 'downgraded';
      }
    }

    const { error } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: session.user.id,
        plan_key: planKey,
        status: 'active',
        billing_cycle,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('[useAuth] upsertSubscription error:', error);
    } else {
      // Append immutable event to ledger (fire-and-forget; non-blocking)
      void supabase.from('subscription_events').insert({
        user_id:       session.user.id,
        event_type,
        plan_key:      planKey,
        billing_cycle: billing_cycle ?? null,
        currency:      'EUR',
        amount_cents:  priceRow?.amount_cents ?? 0,
        price_id:      priceRow?.id ?? null,
      }).then(({ error: ledgerErr }) => {
        if (ledgerErr) console.error('[useAuth] subscription_events insert failed:', ledgerErr);
      });
      clearFeaturePermissionCache();
      setSubscription({ plan_key: planKey, status: 'active', billing_cycle, current_period_end: null });
      setHasSubscription(true);
    }
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
    session, profile, subscription, hasSubscription, loading, passwordRecovery,
    signIn, signUp, signOut, updateProfile, upsertSubscription,
    requestPasswordReset, updatePassword, clearPasswordRecovery, resendConfirmation,
  };
}
