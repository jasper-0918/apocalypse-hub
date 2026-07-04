import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
  }
  return _stripe;
}

// ---- Plans: FREE + SCRIPTER only ----
export const PLANS = {
  SCRIPTER: {
    name: 'Scripter',
    price: 500, // $5 / month
    priceId: process.env.STRIPE_SCRIPTER_PRICE_ID || '',
    scriptLimit: 50,
    features: [
      '50 protected scripts',
      'Universal key (1 account)',
      'Skip the key system',
      'Earn from your scripts',
      'Priority support',
    ],
  },
} as const;

// ---- One-time add-on: +50 script slots for $10 ----
export const SLOT_ADDON = {
  name: '+50 Script Slots',
  price: 1000, // $10 one-time
  priceId: process.env.STRIPE_SLOTS_PRICE_ID || '',
  slotsPerPack: 50,
};

// ---- Base script limits per plan (before purchased add-on packs) ----
export const PLAN_BASE_LIMITS: Record<string, number> = {
  FREE: 10,
  SCRIPTER: 50,
  ADMIN: 9999,
  OWNER: 9999,
};

/** Effective upload limit = plan base + (purchased +50 packs). */
export function effectiveScriptLimit(plan: string, extraSlotPacks = 0): number {
  const base = PLAN_BASE_LIMITS[plan] ?? PLAN_BASE_LIMITS.FREE;
  if (base >= 9999) return base; // admin/owner: don't add packs
  return base + extraSlotPacks * SLOT_ADDON.slotsPerPack;
}

// Backwards-compatible flat map (FREE now allows uploads).
export const PLAN_LIMITS: Record<string, number> = PLAN_BASE_LIMITS;
