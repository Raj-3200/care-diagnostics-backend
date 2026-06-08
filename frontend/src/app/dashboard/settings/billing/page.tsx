'use client';

import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Mail } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { PageTransition } from '@/components/shared/page-transition';
import { FadeIn } from '@/components/shared/animations';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getBillingSettings } from '@/services/settings';
import type { PlanTier } from '@/types';

const plans: Array<{ tier: PlanTier; price: string; features: string[] }> = [
  { tier: 'FREE', price: 'Starter', features: ['Single lab workspace', 'Core LIMS flow', 'Basic reports'] },
  { tier: 'BASIC', price: 'Growth', features: ['Client portal', 'Public report lookup', 'Audit logs'] },
  { tier: 'PRO', price: 'Scale', features: ['Advanced automation', 'Priority support', 'Custom branding'] },
];

export default function BillingSettingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['billing-settings'],
    queryFn: getBillingSettings,
  });

  const currentPlan = data?.data.planTier ?? 'FREE';

  return (
    <PageTransition>
      <PageHeader title="Billing" description="Review subscription plan and upgrade options" />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : (
        <FadeIn delay={0.05}>
          <div className="mb-5 rounded-xl border border-border/50 bg-card p-5">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
              Current Plan
            </p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-3xl font-bold tracking-tight text-foreground">{currentPlan}</p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {data?.data.name} is active on the {currentPlan} plan.
                </p>
              </div>
              <Button asChild className="h-9 gap-2 rounded-lg">
                <a href="mailto:sales@carediagnostics.in">
                  <Mail className="h-4 w-4" />
                  Contact Sales
                </a>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => {
              const active = plan.tier === currentPlan;
              return (
                <div
                  key={plan.tier}
                  className={`rounded-xl border bg-card p-5 ${
                    active ? 'border-primary/50 shadow-lg shadow-primary/10' : 'border-border/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-foreground">{plan.tier}</p>
                      <p className="mt-0.5 text-[13px] text-muted-foreground">{plan.price}</p>
                    </div>
                    {active && (
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="mt-5 space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2 text-[13px] text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </FadeIn>
      )}
    </PageTransition>
  );
}
