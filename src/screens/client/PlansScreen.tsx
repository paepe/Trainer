import React from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../components/Icon';
import { TRAINER_ROLES, type NavFn, type UserRole, type PlanKey } from '../../types';
import { TRAINER_BRAND } from '../../theme/tokens';
import { C } from './performance/perf-engines';
import { T, FF_DISPLAY, FF_MONO, ScreenWrap, ScreenTitle } from './performance/perf-atoms';

interface Theme { primary: string; accent: string }
interface AppUser { id: string | null; role?: UserRole; plan_key?: PlanKey }

interface Props {
  nav:    NavFn;
  t:      Theme;
  dark:   boolean;
  user:   AppUser;
  source?: string | undefined;
  upsertSubscription: (planKey: PlanKey, billingCycle: 'monthly' | 'annual') => Promise<{ error: unknown }>;
}

type BillingCycle = 'monthly' | 'annual';
type AudienceMode = 'client' | 'trainer';

interface PlanDef {
  id:    string;
  icon:  string;
  price: number;
}

const STUDENT_PLANS: PlanDef[] = [
  { id: 'free',           icon: 'activity', price: 0 },
  { id: 'ai_fitness',     icon: 'sparkle',  price: 9.99 },
  { id: 'ai_performance', icon: 'zap',      price: 24.99 },
];

const TRAINER_PLANS: PlanDef[] = [
  { id: 'trial', icon: 'target', price: 0 },
  { id: 'pro',   icon: 'user',   price: 49 },
  { id: 'elite', icon: 'brain',  price: 99 },
];

const TRAINER_PRIMARY = TRAINER_BRAND.primary;
const TRAINER_DEEP    = TRAINER_BRAND.primaryDeep;

function fmtPrice(p: number): string {
  if (p === 0) return '€0';
  return '€' + p.toFixed(2).replace(/\.00$/, '');
}

function annualMonthly(p: number): number {
  return p === 0 ? 0 : (p * 10) / 12;
}

export function PlansScreen({ nav, user, source, upsertSubscription }: Props) {
  const { t: tr } = useTranslation();
  const isTrainer = !!user.role && (TRAINER_ROLES as readonly string[]).includes(user.role);
  const isManage  = source === 'manage';

  // Logged-in trainers always see trainer plans; clients start on client tab.
  // On the public/onboarding version, anonymous visitors can toggle.
  const [audienceMode, setAudienceMode] = React.useState<AudienceMode>(isTrainer ? 'trainer' : 'client');
  const showingTrainer = audienceMode === 'trainer';

  const plans  = showingTrainer ? TRAINER_PLANS : STUDENT_PLANS;
  const accent = showingTrainer ? TRAINER_PRIMARY : C.cyan;

  const [billing, setBilling] = React.useState<BillingCycle>('monthly');
  const [selected, setSelected] = React.useState<string | null>(null);
  const [confirming, setConfirming] = React.useState(false);

  // Reset selection when audience tab changes
  React.useEffect(() => { setSelected(null); }, [audienceMode]);

  const canConfirm = !!selected && selected !== user.plan_key && !confirming;

  const handleConfirm = async () => {
    if (!selected || confirming) return;
    setConfirming(true);
    const { error } = await upsertSubscription(selected as PlanKey, billing);
    setConfirming(false);
    if (error) return;
    if (source === 'onboarding') {
      nav(isTrainer ? 'trainerDashboard' : 'profile');
    } else {
      nav('planConfirm', { planKey: selected, isTrainer });
    }
  };

  return (
    <ScreenWrap>
      {/* Back — only in manage mode */}
      {isManage && (
        <button
          onClick={() => nav(isTrainer ? 'trainerDashboard' : 'checkin')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 4px', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, color: T.textSec, fontSize: 13 }}
        >
          <Icon name="chevL" size={16} color={T.textSec} stroke={2}/> {tr('common.back')}
        </button>
      )}

      {/* Audience toggle — hidden for logged-in trainers (always show trainer plans) */}
      {!isTrainer && (
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {plans.map((plan, i) => {
          const isAnnual  = billing === 'annual';
          const monthly   = isAnnual ? annualMonthly(plan.price) : plan.price;
          const free      = plan.price === 0;
          const isSel     = selected === plan.id;
          const isCurrent = user.plan_key === plan.id;
          const recommended = i === 1;

          const name     = tr(`plans.text.${plan.id}.name`);
          const tag      = tr(`plans.text.${plan.id}.tag`);
          const blurb    = tr(`plans.text.${plan.id}.blurb`);
          const features = tr(`plans.text.${plan.id}.features`, { returnObjects: true }) as string[];
          const note     = tr(`plans.text.${plan.id}.note`, { defaultValue: '' });

          // CTA label inside the card
          const ctaLabel = isCurrent
            ? tr('plans.alreadyOnPlan')
            : isManage
              ? tr('plans.changePlanCta')
              : tr('plans.selectCta');

          return (
            <button
              key={plan.id}
              onClick={() => setSelected(plan.id)}
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

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '13px 0 11px', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: FF_DISPLAY, fontWeight: 800, fontSize: 26, letterSpacing: '-0.02em' }}>
                  {free ? tr('plans.peek.free') : fmtPrice(monthly)}
                </span>
                {!free && (
                  <span style={{ fontSize: 11.5, color: T.textMute, fontFamily: FF_MONO }}>
                    {tr('plans.perMo')}{isAnnual ? tr('plans.billedAnnually') : ''}
                  </span>
                )}
                {!free && isAnnual && (
                  <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: C.green, padding: '2px 7px', borderRadius: 5, background: `${C.green}1f`, fontFamily: FF_MONO }}>
                    {tr('plans.monthsFree')}
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
              </div>

              {note && (
                <div style={{ marginTop: 12, paddingTop: 11, borderTop: `1px solid ${T.border}`, fontSize: 11, color: accent, fontFamily: FF_MONO, lineHeight: 1.4 }}>
                  {note}
                </div>
              )}

              {/* In-card CTA — only on selected card */}
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
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer note */}
      <div style={{ textAlign: 'center', fontSize: 11, color: T.textMute, fontFamily: FF_MONO }}>
        {tr('plans.footPre')}{tr(billing === 'monthly' ? 'plans.footMonthly' : 'plans.footAnnual')}{tr('plans.footPost')}
      </div>
    </ScreenWrap>
  );
}
