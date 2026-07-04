'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Check, Loader2, Code2, Gift, Plus } from 'lucide-react';

const plans = [
  {
    id: 'FREE',
    name: 'Free',
    price: '$0',
    period: 'forever',
    icon: Gift,
    features: [
      'Upload up to 10 scripts',
      'Earn from your scripts',
      'Key-system protected access',
      'Obfuscated delivery',
      'Community support',
    ],
    color: 'border-border',
    iconColor: 'text-muted-foreground',
    buttonColor: 'bg-secondary hover:bg-secondary/80',
    cta: 'Start Free',
  },
  {
    id: 'SCRIPTER',
    name: 'Scripter',
    price: '$5',
    period: '/month',
    icon: Code2,
    features: [
      'Upload up to 50 scripts',
      'Universal key (bound to 1 account)',
      'Skip the key system entirely',
      'Earn from your scripts',
      '+50 more slots anytime for $10',
      'Priority support',
    ],
    color: 'border-primary/40',
    iconColor: 'text-primary',
    buttonColor: 'bg-primary hover:bg-primary/90',
    cta: 'Get Scripter',
    popular: true,
  },
];

export function PricingTable() {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  const startCheckout = async (payload: Record<string, string>, loadingKey: string) => {
    const token = localStorage.getItem('ah_session');
    if (!token) {
      router.push('/login');
      return;
    }
    setLoading(loadingKey);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      // Silently fail
    }
    setLoading(null);
  };

  const handlePlan = (planId: string) => {
    if (planId === 'FREE') {
      router.push('/register');
      return;
    }
    startCheckout({ plan: planId }, planId);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plans.map((plan) => {
          const Icon = plan.icon;
          return (
            <Card
              key={plan.id}
              className={`relative bg-card border-2 ${plan.color} transition-shadow hover:shadow-lg`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-white border-0 px-3 py-0.5 text-xs font-bold">
                    MOST POPULAR
                  </Badge>
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3 mb-2">
                  <Icon className={`h-6 w-6 ${plan.iconColor}`} />
                  <CardTitle className="text-xl text-foreground">{plan.name}</CardTitle>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-green-400 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handlePlan(plan.id)}
                  disabled={loading === plan.id}
                  className={`w-full ${plan.buttonColor} text-white font-semibold h-11`}
                >
                  {loading === plan.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Redirecting...
                    </>
                  ) : (
                    plan.cta
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* One-time add-on for Scripter users */}
      <Card className="mt-6 bg-card border border-border">
        <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">+50 Script Slots</p>
              <p className="text-sm text-muted-foreground">
                One-time add-on for Scripter accounts. Stack as many as you need.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => startCheckout({ addon: 'SLOTS' }, 'SLOTS')}
            disabled={loading === 'SLOTS'}
            className="h-11 min-w-[140px]"
          >
            {loading === 'SLOTS' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Buy for $10'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
