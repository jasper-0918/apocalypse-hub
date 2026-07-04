export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { isKeyValid } from '@/lib/keygen';
import { keyValidateSchema } from '@/lib/validators';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = keyValidateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { valid: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { keyValue } = parsed.data;
    const supabase = createServerClient();

    const { data: key } = await supabase
      .from('keys')
      .select('*')
      .eq('value', keyValue)
      .single();

    if (!key || !isKeyValid(key)) {
      return NextResponse.json({
        valid: false,
        error: 'Key is invalid or has expired',
        expired: key ? new Date() > new Date(key.expires_at) : false,
      });
    }

    return NextResponse.json({
      valid: true,
      expiresAt: key.expires_at,
      timeRemaining: Math.max(0, new Date(key.expires_at).getTime() - Date.now()),
    });
  } catch {
    return NextResponse.json(
      { valid: false, error: 'Validation failed' },
      { status: 500 }
    );
  }
}
