import { NextRequest, NextResponse } from 'next/server';
import { obfuscateLua } from '@/lib/obfuscator';

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    const result = obfuscateLua(code, 'demo-preview');
    return NextResponse.json({ result });
  } catch {
    return NextResponse.json({ error: 'Obfuscation failed' }, { status: 500 });
  }
}
