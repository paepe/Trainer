import React from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../components/Icon';
import { TRAINER_ROLES, type NavFn, type UserRole, type PlanKey } from '../../types';
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
  const plans = isTrainer ? TRAINER_PLANS : STUDENT_PLANS;
  const accent = C.cyan;

  const [billing, setBilling] = React.useState<BillingCycle>('monthly');
  const [selected, setSelected] = React.useState<string | null>(null);

  const handleConfirm = async () => {
    if (!selected) return;
    const { error } = await upsertSubscription(selected as PlanKey, billing);
    if (!error) nav(source === 'onboarding' ? 'profile' : 'settings');
  };

  return (
    <ScreenWrap>
      <ScreenTitle
        kicker={tr('plans.kicker')}
        title={tr('plans.headingNoRec')}
        sub={tr('plans.sub')}
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
          const isAnnual = billing === 'annual';
          const monthly  = isAnnual ? annualMonthly(plan.price) : plan.price;
          const free     = plan.price === 0;
          const isSel    = selected === plan.id;
          const isCurrent = user.plan_key === plan.id;
          const recommended = i === 1; // middle tier as default highlight

          const tag      = tr(`plans.text.${plan.id}.tag`);
          const blurb    = tr(`plans.text.${plan.id}.blurb`);
          const features = tr(`plans.text.${plan.id}.features`, { returnObjects: true }) as string[];
          const note     = tr(`plans.text.${plan.id}.note`, { defaultValue: '' });

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
                      {plan.id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
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
            </button>
          );
        })}
      </div>

      {/* Footer note */}
      <div style={{ textAlign: 'center', fontSize: 11, color: T.textMute, fontFamily: FF_MONO }}>
        {tr('plans.footPre')}{tr(billing === 'monthly' ? 'plans.footMonthly' : 'plans.footAnnual')}{tr('plans.footPost')}
      </div>

      {/* Confirm CTA */}
      <button
        disabled={!selected}
        onClick={handleConfirm}
        style={{
          padding: '14px 20px', borderRadius: 14, border: 'none', cursor: selected ? 'pointer' : 'not-allowed',
          background: selected ? accent : T.surf2, color: selected ? T.navy : T.textMute,
          fontFamily: FF_DISPLAY, fontWeight: 800, fontSize: 14, opacity: selected ? 1 : 0.6,
          transition: 'all .15s ease',
        }}
      >
        {tr('plans.selectCta')}
      </button>
    </ScreenWrap>
  );
}
