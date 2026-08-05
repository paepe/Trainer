import React from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../components/Icon';
import { TRAINER_ROLES, type NavFn, type UserRole, type PlanKey, type Subscription } from '../../types';
import { TRAINER_BRAND } from '../../theme/tokens';
import { C } from './performance/perf-engines';
import { T, FF_DISPLAY, FF_MONO, ScreenWrap, ScreenTitle } from './performance/perf-atoms';
import { usePlanPrices } from '../../hooks/usePlanPrices';
import { useEffectivePlanKey } from '../../hooks/useFeatureAccess';

interface Theme { primary: string; accent: string }
interface AppUser { id: string | null; role?: UserRole; plan_key?: PlanKey; subscription?: Subscription | null }

interface Props {
  nav:    NavFn;
  t:      Theme;
  dark:   boolean;
  user:   AppUser;
  source?: string | undefined;
  upsertSubscription: (planKey: PlanKey, billingCycle: 'monthly' | 'annual') => Promise<{ error: unknown }>;
  updateProfile: (updates: { role: UserRole }) => Promise<{ error: unknown }>;
}

type BillingCycle = 'monthly' | 'annual';
type AudienceMode = 'client' | 'trainer';
type ProBand = 'pro_5' | 'pro_15' | 'pro_30';
const PRO_BANDS: ProBand[] = ['pro_5', 'pro_15', 'pro_30'];
const isProBand = (id: string): id is ProBand => (PRO_BANDS as string[]).includes(id);

const TRAINER_PRIMARY = TRAINER_BRAND.primary;
const TRAINER_DEEP    = TRAINER_BRAND.primaryDeep;

function fmtCents(cents: number, cycle: BillingCycle): string {
  if (cents === 0) return '';
  const monthly = cycle === 'annual' ? Math.round((cents / 12) * 10) / 10 : cents;
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(monthly / 100);
}

export function PlansScreen({ nav, user, source, upsertSubscription, updateProfile }: Props) {
  const { t: tr } = useTranslation();
  const isTrainer = !!user.role && (TRAINER_ROLES as readonly string[]).includes(user.role);
  const isManage    = source === 'manage';
  const isOnboarding = source === 'onboarding';

  const [audienceMode, setAudienceMode] = React.useState<AudienceMode>(isTrainer ? 'trainer' : 'client');
  const showingTrainer = audienceMode === 'trainer';

  const { plans, loading } = usePlanPrices(audienceMode);
  const accent = showingTrainer ? TRAINER_PRIMARY : C.cyan;

  // The plan actually billed/subscribed — drives "current plan" badge, CTA
  // label, and the confirm gate. Must never be the welcome/trial-elevated
  // tier: a free client mid welcome-window sampling ai_fitness features is
  // not "already on" ai_fitness, and flagging it as current silently
  // disabled the confirm button for the exact plan this screen exists to
  // sell them (bug found 2026-08-01 — see docs/EXERCISE_NAME_LANGUAGE_PREFERENCE_PLAN.md
  // conversation log for the report that led here).
  const currentPlanKey = user.plan_key;
  // Effective (welcome/trial-elevated) plan key — used only to recommend the
  // tier matching what the user is currently tasting, never for "current".
  const effectivePlanKey = useEffectivePlanKey(user.subscription ?? null);

  const [billing, setBilling] = React.useState<BillingCycle>('monthly');
  const [selected, setSelected] = React.useState<string | null>(
    isManage && currentPlanKey ? currentPlanKey : null
  );
  const [confirming, setConfirming] = React.useState(false);
  const [confirmErr, setConfirmErr] = React.useState('');
  // The 3 PRO client-count tiers (Fase 6) render as one card with a segmented
  // selector instead of 3 near-identical cards — the repetition itself was
  // the problem flagged, not the tiers. Defaults to whichever band the
  // trainer is actually on, else the middle tier.
  const [proBand, setProBand] = React.useState<ProBand>(
    currentPlanKey && isProBand(currentPlanKey) ? currentPlanKey : 'pro_15'
  );

  React.useEffect(() => { setSelected(null); setConfirmErr(''); }, [audienceMode]);

  const canConfirm = !!selected && selected !== currentPlanKey && !confirming;

  const handleConfirm = async () => {
    if (!selected || confirming) return;
    setConfirming(true);
    setConfirmErr('');
    const { error } = await upsertSubscription(selected as PlanKey, billing);
    if (error) {
      setConfirming(false);
      setConfirmErr(tr('plans.confirmError'));
      return;
    }

    // Picking the "trainer" audience during onboarding must promote the
    // account — the plan/subscription row alone doesn't grant trainer
    // access anywhere else in the app, which otherwise strands the user
    // on a client-only screen after they've just confirmed a trainer plan.
    let becameTrainer = isTrainer;
    if (isOnboarding && audienceMode === 'trainer' && !isTrainer) {
      const { error: roleErr } = await updateProfile({ role: 'trainer' });
      if (roleErr) {
        setConfirming(false);
        setConfirmErr(tr('plans.confirmError'));
        return;
      }
      becameTrainer = true;
    }

    setConfirming(false);
    if (isOnboarding) {
      nav(becameTrainer ? 'trainerDashboard' : 'profile');
    } else {
      nav('planConfirm', { planKey: selected, isTrainer: becameTrainer });
    }
  };

  return (
    <ScreenWrap>
      {isManage && (
        <button
          onClick={() => nav(isTrainer ? 'trainerDashboard' : 'checkin')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 4px', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, color: T.textSec, fontSize: 13 }}
        >
          <Icon name="chevL" size={16} color={T.textSec} stroke={2}/> {tr('common.back')}
        </button>
      )}

      {/* Onboarding must never be a dead end — always leave an escape hatch
          into the app, even before a plan is confirmed (a free plan already
          exists from signup, so skipping loses nothing). */}
      {isOnboarding && (
        <button
          onClick={() => nav(isTrainer ? 'trainerDashboard' : 'checkin')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 4px', alignSelf: 'flex-start', color: T.textSec, fontSize: 13, textDecoration: 'underline' }}
        >
          {tr('common.notNow')}
        </button>
      )}

      {source === 'onboarding' && !isTrainer && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ display: 'inline-flex', padding: 4, borderRadius: 999, background: T.navy, border: `1px solid ${T.border}`, gap: 2 }}>
            {(['client', 'trainer'] as AudienceMode[]).map(mode => {
              const on = audienceMode === mode;
              const modeAccent = mode === 'trainer' ? TRAINER_PRIMARY : C.cyan;
              return (
                <button key={mode} onClick={() => setAudienceMode(mode)} style={{
                  padding: '7px 16px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  background: on ? modeAccent : 'transparent',
                  color: on ? T.navy : T.textSec,
                  fontFamily: FF_DISPLAY, fontWeight: 700, fontSize: 12, transition: 'all .14s ease',
                }}>
                  {tr(mode === 'client' ? 'plans.tabClient' : 'plans.tabTrainer')}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <ScreenTitle
        kicker={isManage ? tr('plans.manageKicker') : showingTrainer ? tr('plans.kickerTrainer') : tr('plans.kicker')}
        title={isManage ? tr('plans.manageHeading') : tr('plans.headingNoRec')}
        sub={isManage ? tr('plans.manageSub') : tr('plans.sub')}
      />

      {/* Billing toggle */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'inline-flex', padding: 4, borderRadius: 999, background: T.navy, border: `1px solid ${T.border}`, gap: 2 }}>
          {(['monthly', 'annual'] as BillingCycle[]).map(v => {
            const on = billing === v;
            return (
              <button key={v} onClick={() => setBilling(v)} style={{
                padding: '7px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
                background: on ? accent : 'transparent', color: on ? T.navy : T.textSec,
                fontFamily: FF_DISPLAY, fontWeight: 700, fontSize: 12, transition: 'all .14s ease',
              }}>
                {tr(v === 'monthly' ? 'plans.monthly' : 'plans.annual')}
              </button>
            );
          })}
        </div>
      </div>

      {/* Plan cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: T.textMute, fontSize: 13 }}>
          {tr('common.loading', { defaultValue: '…' })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {plans.map((plan, i) => {
            // The 3 PRO bands render once, as a single card anchored at
            // pro_5's position (its sort_order puts it right after Trial) —
            // pro_15/pro_30 are absorbed into it, not rendered separately.
            if (plan.id === 'pro_15' || plan.id === 'pro_30') return null;
            const isMergedPro = plan.id === 'pro_5';
            const displayPlan = isMergedPro ? (plans.find(p => p.id === proBand) ?? plan) : plan;
            const effectiveId = isMergedPro ? proBand : plan.id;

            const cents     = billing === 'annual' ? displayPlan.annual_cents  : displayPlan.monthly_cents;
            const free      = cents === 0;
            const isSel     = selected === effectiveId;
            const isCurrent = currentPlanKey === effectiveId;
            // Onboarding recommendation may point at the welcome/trial-elevated
            // tier (nudge toward what they're already tasting) — deliberately
            // independent of isCurrent so the two badges can land on different
            // cards (e.g. "Current" on Free, "Best fit" on AI Fitness).
            const recommended = isManage
              ? isCurrent
              : effectivePlanKey ? effectivePlanKey === effectiveId : i === 1;

            // Merged PRO card keeps a stable name/tag/blurb (reused from the
            // legacy 'pro' i18n entry — generic across bands, not duplicated)
            // while it's being reconfigured; only the client-count feature
            // line and price move as the segmented selector changes.
            const name     = isMergedPro ? tr('plans.text.pro.name') : tr(`plans.text.${plan.id}.name`);
            const tag      = isMergedPro ? tr('plans.text.pro.tag')  : tr(`plans.text.${plan.id}.tag`);
            const blurb    = isMergedPro ? tr('plans.text.pro.blurb') : tr(`plans.text.${plan.id}.blurb`);
            const features    = tr(`plans.text.${displayPlan.id}.features`, { returnObjects: true }) as string[];
            const comingSoon  = tr(`plans.text.${displayPlan.id}.comingSoon`, { returnObjects: true, defaultValue: [] }) as string[];
            const note        = tr(`plans.text.${displayPlan.id}.note`, { defaultValue: '' });

            const priceLabel = billing === 'annual' ? displayPlan.annual_label : displayPlan.monthly_label;

            const ctaLabel = isCurrent
              ? tr('plans.alreadyOnPlan')
              : isManage
                ? tr('plans.changePlanCta')
                : tr('plans.selectCta');

            return (
              <button
                key={plan.id}
                onClick={() => setSelected(effectiveId)}
                style={{
                  position: 'relative', width: '100%', textAlign: 'left',
                  padding: '16px 16px 15px', borderRadius: 16,
                  background: isSel ? `${accent}14` : T.surf,
                  border: `1.5px solid ${isSel ? accent : recommended ? `${accent}66` : T.border}`,
                  cursor: 'pointer', color: T.text, fontFamily: 'inherit',
                  boxShadow: isSel ? `0 14px 36px ${accent}22` : 'none', transition: 'all .15s ease',
                }}
              >
                {recommended && (
                  <div style={{
                    position: 'absolute', top: -10, left: 16, padding: '3px 9px', borderRadius: 999,
                    background: accent, color: T.navy, fontSize: 9.5, fontWeight: 800, letterSpacing: '.06em',
                    textTransform: 'uppercase', fontFamily: FF_MONO, display: 'inline-flex', alignItems: 'center', gap: 4,
                    boxShadow: `0 6px 16px ${accent}55`,
                  }}>
                    <Icon name="sparkle" size={10} color={T.navy} stroke={2.4}/> {tr('plans.bestFit')}
                  </div>
                )}

                {isCurrent && (
                  <div style={{
                    position: 'absolute', top: -10, right: 16, padding: '3px 9px', borderRadius: 999,
                    background: T.surf2, color: T.textSec, fontSize: 9.5, fontWeight: 800, letterSpacing: '.06em',
                    textTransform: 'uppercase', fontFamily: FF_MONO, border: `1px solid ${T.border}`,
                  }}>
                    {tr('plans.currentPlan')}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                    background: isSel ? accent : `${accent}1f`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isSel ? T.navy : accent,
                  }}>
                    <Icon name={plan.icon} size={19} stroke={2}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: FF_DISPLAY, fontWeight: 800, fontSize: 16.5 }}>
                        {name}
                      </span>
                      {plan.id === 'trial' && (
                        <span style={{ fontSize: 10, fontFamily: FF_MONO, color: accent, padding: '1px 6px', borderRadius: 5, background: `${accent}1f` }}>
                          {tr('plans.text.trial.sub')}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11.5, color: T.textSec, marginTop: 1 }}>{tag}</div>
                  </div>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                    border: `1.5px solid ${isSel ? accent : T.borderSoft}`,
                    background: isSel ? accent : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isSel && <Icon name="check" size={12} color={T.navy} stroke={2.6}/>}
                  </div>
                </div>

                {isMergedPro && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11, color: T.textSec, marginBottom: 6 }}>
                      {tr('plans.proBandLabel')}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {PRO_BANDS.map(band => {
                        const on = proBand === band;
                        const n = band === 'pro_5' ? 5 : band === 'pro_15' ? 15 : 30;
                        return (
                          <button
                            key={band}
                            onClick={e => { e.stopPropagation(); setProBand(band); setSelected(band); }}
                            style={{
                              flex: 1, padding: '8px 0', borderRadius: 10, border: `1.5px solid ${on ? accent : T.border}`,
                              background: on ? accent : 'transparent', color: on ? T.navy : T.textSec,
                              fontFamily: FF_DISPLAY, fontWeight: 800, fontSize: 13, cursor: 'pointer',
                              transition: 'all .14s ease',
                            }}
                          >
                            {n}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '13px 0 11px', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: FF_DISPLAY, fontWeight: 800, fontSize: 26, letterSpacing: '-0.02em' }}>
                    {free ? tr('plans.peek.free') : fmtCents(cents, billing)}
                  </span>
                  {!free && (
                    <span style={{ fontSize: 11.5, color: T.textMute, fontFamily: FF_MONO }}>
                      {tr('plans.perMo')}{billing === 'annual' ? tr('plans.billedAnnually') : ''}
                    </span>
                  )}
                  {!free && billing === 'annual' && priceLabel && (
                    <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: C.green, padding: '2px 7px', borderRadius: 5, background: `${C.green}1f`, fontFamily: FF_MONO }}>
                      {priceLabel}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: 12.5, color: T.textSec, marginBottom: 10 }}>{blurb}</div>

                <div style={{ display: 'grid', gap: 7 }}>
                  {features.map((f, fi) => (
                    <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5 }}>
                      <Icon name="check" size={13} color={accent} stroke={2.6}/>
                      <span style={{ color: T.text }}>{f}</span>
                    </div>
                  ))}
                  {comingSoon.map((f, fi) => (
                    <div key={`cs-${fi}`} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5 }}>
                      <Icon name="check" size={13} color={T.textMute} stroke={2.6}/>
                      <span style={{ color: T.textMute }}>{f}</span>
                      <span style={{
                        marginLeft: 'auto', flexShrink: 0,
                        fontSize: 9, fontWeight: 700, letterSpacing: '.05em',
                        color: accent, background: `${accent}18`,
                        border: `1px solid ${accent}44`,
                        padding: '1px 6px', borderRadius: 4,
                        fontFamily: FF_MONO,
                      }}>
                        {tr('plans.comingSoon')}
                      </span>
                    </div>
                  ))}
                </div>

                {note && (
                  <div style={{ marginTop: 12, paddingTop: 11, borderTop: `1px solid ${T.border}`, fontSize: 11, color: accent, fontFamily: FF_MONO, lineHeight: 1.4 }}>
                    {note}
                  </div>
                )}

                {isSel && (
                  <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      disabled={!canConfirm}
                      onClick={e => { e.stopPropagation(); void handleConfirm(); }}
                      style={{
                        padding: '9px 18px', borderRadius: 10, border: 'none',
                        background: isCurrent
                          ? T.surf2
                          : showingTrainer
                            ? `linear-gradient(135deg, ${TRAINER_PRIMARY} 0%, ${TRAINER_DEEP} 100%)`
                            : C.green,
                        color: isCurrent ? T.textMute : T.navy,
                        fontFamily: FF_DISPLAY, fontWeight: 800, fontSize: 13,
                        cursor: canConfirm ? 'pointer' : 'not-allowed',
                        opacity: canConfirm ? 1 : 0.45,
                        transition: 'all .15s ease',
                        boxShadow: canConfirm
                          ? showingTrainer
                            ? `0 6px 18px ${TRAINER_PRIMARY}55`
                            : `0 6px 18px ${C.green}55`
                          : 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {confirming ? tr('plans.confirming') : ctaLabel}
                    </button>
                    {confirmErr && (
                      <div style={{ marginTop: 8, fontSize: 12, color: C.coral, textAlign: 'right' }}>
                        {confirmErr}
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ textAlign: 'center', fontSize: 11, color: T.textMute, fontFamily: FF_MONO }}>
        {tr('plans.footPre')}{tr(billing === 'monthly' ? 'plans.footMonthly' : 'plans.footAnnual')}{tr('plans.footPost')}
      </div>
    </ScreenWrap>
  );
}
