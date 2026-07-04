// ============================================================
// Creator earnings model
// Earnings basis: per key-system completion (a free user completing the
// Work.ink / Linkvertise gate to unlock a specific script).
// Payouts: USD or Robux. Seller fee: tiered 5–10% by rank (ZeusX-style).
// All monetary values are USD unless noted. Tune the constants below freely.
// ============================================================

// ---- Gross revenue share per UNIQUE completion (before commission) ----
// Link-shortener payouts are small, so creators earn per *unique* completion.
// Default: $1.00 / 1,000 unique completions = $0.001 each.
export const GROSS_USD_PER_COMPLETION = 0.001;

// A completion only earns once per (script, viewer) inside this window, so the
// same person re-running the gate can't farm a creator's balance.
export const UNIQUE_COMPLETION_WINDOW_HOURS = 24;

// ---- Robux conversion (used only when paying out in Robux) ----
// Platform-set rate. Roblox taxes ~30% on gamepass/group payouts, so a lower
// rate than DevEx is normal. Default: 1 USD => 80 Robux paid to the creator.
export const ROBUX_PER_USD = 80;

// ---- Withdrawal (payout) fees ----
export const USD_WITHDRAWAL_PERCENT = 0.015; // 1.5%
export const USD_WITHDRAWAL_FIXED = 3;       // + $3 flat (ZeusX bank-transfer style)
export const ROBUX_WITHDRAWAL_PERCENT = 0.03; // 3% flat, no fixed fee
export const MIN_PAYOUT_USD = 5;             // minimum withdrawable balance

// ---- Seller tiers: commission drops as lifetime earnings grow ----
export interface SellerTier {
  name: string;
  minLifetimeUsd: number;
  commissionPercent: number; // platform's cut on each completion
}

// Ordered high threshold → low so we can find the first match by scanning down.
export const SELLER_TIERS: SellerTier[] = [
  { name: 'Elite',   minLifetimeUsd: 200, commissionPercent: 0.05 },
  { name: 'Pro',     minLifetimeUsd: 50,  commissionPercent: 0.065 },
  { name: 'Rising',  minLifetimeUsd: 10,  commissionPercent: 0.08 },
  { name: 'Rookie',  minLifetimeUsd: 0,   commissionPercent: 0.10 },
];

export function getSellerTier(lifetimeUsd: number): SellerTier {
  return (
    SELLER_TIERS.find((t) => lifetimeUsd >= t.minLifetimeUsd) ??
    SELLER_TIERS[SELLER_TIERS.length - 1]
  );
}

/** Value of a single completion for a creator, after their tier commission. */
export function earningsForCompletion(lifetimeUsd: number): {
  gross: number;
  commission: number;
  net: number;
  commissionPercent: number;
} {
  const tier = getSellerTier(lifetimeUsd);
  const gross = GROSS_USD_PER_COMPLETION;
  const commission = +(gross * tier.commissionPercent).toFixed(6);
  const net = +(gross - commission).toFixed(6);
  return { gross, commission, net, commissionPercent: tier.commissionPercent };
}

/** Fee + net for a withdrawal of `amountUsd` from the balance. */
export function computeWithdrawal(
  amountUsd: number,
  currency: 'USD' | 'ROBUX'
): { feeUsd: number; netUsd: number; robuxAmount: number | null } {
  if (currency === 'ROBUX') {
    const feeUsd = +(amountUsd * ROBUX_WITHDRAWAL_PERCENT).toFixed(4);
    const netUsd = +(amountUsd - feeUsd).toFixed(4);
    return { feeUsd, netUsd, robuxAmount: Math.floor(netUsd * ROBUX_PER_USD) };
  }
  const feeUsd = +(amountUsd * USD_WITHDRAWAL_PERCENT + USD_WITHDRAWAL_FIXED).toFixed(4);
  const netUsd = +Math.max(0, amountUsd - feeUsd).toFixed(4);
  return { feeUsd, netUsd, robuxAmount: null };
}
