export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { isKeyValid } from '@/lib/keygen';
import { obfuscateLua } from '@/lib/obfuscator';
import { PAID_PLANS } from '@/lib/plans';

// This endpoint is called by Roblox via:
// loadstring(game:HttpGet("https://apocalypsehub.com/api/scripts/serve/SCRIPT_ID?key=APOC-XXXX-XXXX-XXXX-XXXX"))()
//
// It validates the key server-side, then returns the obfuscated Lua script.
// If the key is invalid/expired, it returns a Lua error that the executor will display.

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const keyValue = req.nextUrl.searchParams.get('key');
  const uid = req.nextUrl.searchParams.get('uid');

  if (!keyValue) {
    return new NextResponse(
      `-- [Apocalypse Blox Hub] ACCESS DENIED\n-- No key provided. Get your key at apocalypsehub.com/get-key\nerror("APOCALYPSE_HUB: Key required. Visit apocalypsehub.com/get-key to claim your free key.")`,
      { status: 403, headers: { 'Content-Type': 'text/plain' } }
    );
  }

  const supabase = createServerClient();

  // Validate key
  const { data: key } = await supabase
    .from('keys')
    .select('*')
    .eq('value', keyValue)
    .maybeSingle();

  if (!key || !isKeyValid(key)) {
    const reason = !key ? 'not found' : (new Date() > new Date(key.expires_at) ? 'expired' : 'inactive');
    return new NextResponse(
      `-- [Apocalypse Blox Hub] ACCESS DENIED\n-- Key ${reason}.\n-- Get a new key at apocalypsehub.com/get-key\nerror("APOCALYPSE_HUB: Key ${reason}. Visit apocalypsehub.com/get-key")`,
      { status: 403, headers: { 'Content-Type': 'text/plain' } }
    );
  }

  // Paid keys require ?uid=ACCOUNT_ID binding — the key only works for the account it was issued to
  if (key.is_paid_key) {
    if (!uid || uid !== key.assigned_to) {
      return new NextResponse(
        `-- [Apocalypse Blox Hub] ACCESS DENIED\n-- This key is account-bound and cannot be used by other accounts.\nerror("APOCALYPSE_HUB: Account-bound key — use the loadstring from your dashboard.")`,
        { status: 403, headers: { 'Content-Type': 'text/plain' } }
      );
    }
    // Verify the account still has an active paid plan
    const { data: keyOwner } = await supabase
      .from('users')
      .select('plan, role')
      .eq('id', key.assigned_to)
      .maybeSingle();
    if (!keyOwner || (!PAID_PLANS.includes(keyOwner.plan) && keyOwner.role !== 'OWNER')) {
      return new NextResponse(
        `-- [Apocalypse Blox Hub] ACCESS DENIED\n-- The account associated with this key no longer has an active plan.\nerror("APOCALYPSE_HUB: Plan inactive. Renew your subscription at apocalypsehub.com")`,
        { status: 403, headers: { 'Content-Type': 'text/plain' } }
      );
    }
  }

  // Fetch script
  const { data: script } = await supabase
    .from('scripts')
    .select('*')
    .eq('id', params.id)
    .eq('is_published', true)
    .maybeSingle();

  if (!script) {
    return new NextResponse(
      `error("APOCALYPSE_HUB: Script not found or not published.")`,
      { status: 404, headers: { 'Content-Type': 'text/plain' } }
    );
  }

  // For paid keys: already authorized above. For free keys: check script_keys table.
  if (!key.is_paid_key) {
    const { data: scriptKey } = await supabase
      .from('script_keys')
      .select('id')
      .eq('script_id', script.id)
      .eq('key_id', key.id)
      .maybeSingle();
    if (!scriptKey) {
      return new NextResponse(
        `-- [Apocalypse Blox Hub] ACCESS DENIED\n-- This key is not authorized for this script.\nerror("APOCALYPSE_HUB: Key not authorized for this script.")`,
        { status: 403, headers: { 'Content-Type': 'text/plain' } }
      );
    }
  }

  // Mark key as used (one-time use per script execution for tracking)
  // Key remains valid for 12 hours regardless

  // Serve obfuscated script
  const obfuscated = obfuscateLua(script.original_content, script.id);

  return new NextResponse(obfuscated, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'X-Script-ID': script.id,
      'X-Key-Valid': 'true',
      'X-Expires-At': key.expires_at,
    },
  });
}
