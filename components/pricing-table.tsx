'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Check, Loader2, Zap, Crown, Code2 } from 'lucide-react';

const plans = [
  {
    id: 'PRO',
    name: 'Pro',
    price: '$5',
    period: '/month',
    icon: Zap,
    scriptLimit: 5,
    features: ['5 protected scripts', 'Key system protection', '12-hour key expiry', 'Basic support'],
    color: 'border-sky-500/30',
    iconColor: 'text-sky-400',
    buttonColor: 'bg-sky-600 hover:bg-sky-700',
    glowColor: 'hover:shadow-sky-500/10',
  },
  {
    id: 'SCRIPTER',
    name: 'Scripter',
    price: '$10',
    period: '/month',
    icon: Code2,
    scriptLimit: 20,
    features: ['20 protected scripts', 'Key system protection', 'Custom key expiry (6–48h)', 'Priority key assignment', 'Email support'],
    color: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
    buttonColor: 'bg-emerald-600 hover:bg-emerald-700',
    glowColor: 'hover:shadow-emerald-500/10',
    popular: true,
  },
  {
    id: 'DEVELOPER',
    name: 'Developer',
    price: '$15',
    period: '/month',
    icon: Crown,
    scriptLimit: 30,
    features: ['30 protected scripts', 'Key system protection', 'Custom key expiry (6–168h)', 'Priority key assignment', 'Analytics access', 'Priority support'],
    color: 'border-red-500/30',
    iconColor: 'text-red-400',
    buttonColor: 'bg-red-600 hover:bg-red-700',
    glowColor: 'hover:shadow-red-500/10',
  },
];

export function PricingTable() {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  const handleSubscribe = async (planId: string) => {
    const token = localStorage.getItem('ah_session');
    if (!token) {
      router.push('/login');
      return;
    }
    setLoading(planId);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: planId }),
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Silently fail
    }
    setLoading(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
      {plans.map((plan) => {
        const Icon = plan.icon;
        return (
          <Card
            key={plan.id}
            className={`relative bg-card border-2 ${plan.color} transition-shadow ${plan.glowColor} hover:shadow-lg`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-emerald-600 text-white border-0 px-3 py-0.5 text-xs font-bold">
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
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading === plan.id}
                className={`w-full ${plan.buttonColor} text-white font-semibold h-11`}
              >
                {loading === plan.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  `Get ${plan.name}`
                )}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
