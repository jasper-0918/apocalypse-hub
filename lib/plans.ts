// Plan limits and the one-time slot add-on.
// Payments are handled manually (GCash / PayPal / Wise / bank) via /api/orders —
// there is no Stripe integration.

export const SLOT_ADDON = {
  name: '+50 Script Slots',
  price: 1000, // $10 one-time
  slotsPerPack: 50,
};

// Plans that get a renewable 30-day key and skip the free key system.
export const PAID_PLANS = ['SCRIPTER'];

// Base script limits per plan (before purchased +50 packs).
export const PLAN_BASE_LIMITS: Record<string, number> = {
  FREE: 10,
  SCRIPTER: 50,
  ADMIN: 9999,
  OWNER: 9999,
};

/** Effective upload limit = plan base + (purchased +50 packs). */
export function effectiveScriptLimit(plan: string, extraSlotPacks = 0): number {
  const base = PLAN_BASE_LIMITS[plan] ?? PLAN_BASE_LIMITS.FREE;
  if (base >= 9999) return base;
  return base + extraSlotPacks * SLOT_ADDON.slotsPerPack;
}

/**
 * Staff (owner/admin) accounts get unlimited perks: no script cap and keys that
 * never expire. Keyed on role, not plan.
 */
export function hasUnlimitedPerks(role?: string): boolean {
  return role === 'ADMIN' || role === 'OWNER';
}
