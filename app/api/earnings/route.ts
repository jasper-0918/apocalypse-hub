export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { selectAll } from '@/lib/paginate';
import { getSellerTier, SELLER_TIERS, GROSS_USD_PER_COMPLETION } from '@/lib/earnings';

// GET: the signed-in creator's earnings summary.
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerClient();

  const { data: dbUser } = await supabase
    .from('users')
    .select('balance_usd, lifetime_earnings_usd')
    .eq('id', user.id)
    .single();

  const balance = Number(dbUser?.balance_usd ?? 0);
  const lifetime = Number(dbUser?.lifetime_earnings_usd ?? 0);
  const tier = getSellerTier(lifetime);

  // Next tier (for a progress hint), if any.
  const higher = SELLER_TIERS.filter((t) => t.minLifetimeUsd > tier.minLifetimeUsd)
    .sort((a, b) => a.minLifetimeUsd - b.minLifetimeUsd)[0];

  const { count: totalCompletions } = await supabase
    .from('script_completions')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', user.id);

  // Per-script traffic breakdown (paged so the full catalog is covered).
  const scripts = await selectAll((from, to) =>
    supabase
      .from('scripts')
      .select('id, name, completion_count, is_published')
      .eq('owner_id', user.id)
      .order('completion_count', { ascending: false })
      .range(from, to)
  );

  return NextResponse.json({
    balanceUsd: balance,
    lifetimeUsd: lifetime,
    tier: { name: tier.name, commissionPercent: tier.commissionPercent },
    nextTier: higher
      ? { name: higher.name, commissionPercent: higher.commissionPercent, atLifetimeUsd: higher.minLifetimeUsd }
      : null,
    grossPerCompletion: GROSS_USD_PER_COMPLETION,
    totalCompletions: totalCompletions ?? 0,
    scripts: scripts ?? [],
  });
}
