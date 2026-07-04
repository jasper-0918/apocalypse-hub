import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
  }
  return _stripe;
}

export const PLANS = {
  PRO: {
    name: 'Pro',
    price: 500,
    priceId: process.env.STRIPE_PRO_PRICE_ID || '',
    scriptLimit: 5,
    features: ['5 scripts', 'Key protection', '30-day renewable key', 'Skip key system', 'Basic support'],
  },
  SCRIPTER: {
    name: 'Scripter',
    price: 1000,
    priceId: process.env.STRIPE_SCRIPTER_PRICE_ID || '',
    scriptLimit: 20,
    features: ['20 scripts', 'Key protection', '30-day renewable key', 'Skip key system', 'Email support'],
  },
  DEVELOPER: {
    name: 'Developer',
    price: 1500,
    priceId: process.env.STRIPE_DEVELOPER_PRICE_ID || '',
    scriptLimit: 30,
    features: ['30 scripts', 'Key protection', '30-day renewable key', 'Skip key system', 'Priority support'],
  },
};

export const PLAN_LIMITS: Record<string, number> = {
  FREE: 0,
  PRO: 5,
  SCRIPTER: 20,
  DEVELOPER: 30,
  OWNER: 9999,
};
