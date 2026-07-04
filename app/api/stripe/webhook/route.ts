export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const Stripe = (await import('stripe')).default;
  const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: any;

  try {
    event = stripeClient.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createServerClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const { userId, plan, type } = session.metadata || {};

      if (userId && type === 'slots') {
        // One-time +50 slot pack: increment the user's purchased packs.
        const { data: u } = await supabase
          .from('users')
          .select('extra_slot_packs')
          .eq('id', userId)
          .single();
        await supabase
          .from('users')
          .update({ extra_slot_packs: (u?.extra_slot_packs ?? 0) + 1 })
          .eq('id', userId);
      } else if (userId && plan) {
        await supabase
          .from('users')
          .update({
            plan,
            stripe_subscription_id: session.subscription,
          })
          .eq('id', userId);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      await supabase
        .from('users')
        .update({ plan: 'FREE', stripe_subscription_id: null })
        .eq('stripe_subscription_id', subscription.id);
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const priceId = subscription.items.data[0]?.price?.id;

      const planEntry = Object.entries({
        SCRIPTER: process.env.STRIPE_SCRIPTER_PRICE_ID,
      }).find(([, id]) => id === priceId);

      if (planEntry) {
        await supabase
          .from('users')
          .update({ plan: planEntry[0] })
          .eq('stripe_subscription_id', subscription.id);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
