export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { PLANS } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { plan } = await req.json();
    const planConfig = PLANS[plan as keyof typeof PLANS];

    if (!planConfig) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Payments not configured' }, { status: 503 });
    }

    const Stripe = (await import('stripe')).default;
    const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!);

    const supabase = createServerClient();
    const { data: dbUser } = await supabase
      .from('users')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .single();

    let customerId = dbUser?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripeClient.customers.create({
        email: dbUser?.email || user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const checkoutSession = await stripeClient.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: planConfig.priceId, quantity: 1 }],
      success_url: `${baseUrl}/dashboard/billing?success=true`,
      cancel_url: `${baseUrl}/dashboard/billing?canceled=true`,
      metadata: { userId: user.id, plan },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Checkout failed' },
      { status: 500 }
    );
  }
}
