import { randomBytes } from 'crypto';

// ============================================================
// Key-system providers (anti-bypass), wired to each provider's real scheme.
//
//   Work.ink  -> Link Override injects our token; completion proven by calling
//                work.ink /token/isValid/{TOKEN}.
//   Linkvertise -> Anti-Bypass appends ?hash to the return URL; proven by
//                validating hash against the anti-bypass token.
//   Lootlabs  -> we append &puid=<token>; provider POSTs a server-side postback
//                (click_id=<token>, ip, unique_id) to our callback.
//
// Common flow:
//   /api/keys/start   -> create single-use token + provider gate URL
//   provider gate     -> user completes ads
//   verification      -> /api/keys/verify (workink/linkvertise) OR
//                        /api/keys/callback/lootlabs (server postback)
//   /api/keys         -> issues a key only for a `verified`, unclaimed token
// ============================================================

export type ProviderId = 'linkvertise' | 'workink' | 'lootlabs';

export const PROVIDERS: Record<ProviderId, { label: string; linkEnv: string }> = {
  linkvertise: { label: 'Linkvertise', linkEnv: 'LINKVERTISE_LINK' },
  workink: { label: 'Work.ink', linkEnv: 'WORKINK_LINK' },
  lootlabs: { label: 'Lootlabs', linkEnv: 'LOOTLABS_LINK' },
};

export function isProvider(v: string | null | undefined): v is ProviderId {
  return !!v && v in PROVIDERS;
}

/** Which providers are configured (have a gate link set). */
export function configuredProviders(): ProviderId[] {
  return (Object.keys(PROVIDERS) as ProviderId[]).filter((p) => !!process.env[PROVIDERS[p].linkEnv]);
}

/** Gate enforced once any provider is configured, or forced via env flag. */
export function isGateEnforced(): boolean {
  const flag = process.env.KEY_GATE_ENFORCED;
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return configuredProviders().length > 0;
}

export function generateUnlockToken(): string {
  return randomBytes(24).toString('hex');
}

function withParam(url: string, key: string, value: string): string {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}${key}=${encodeURIComponent(value)}`;
}

/**
 * Build the provider gate URL the user must complete for this token.
 * Async because Work.ink requires a Link Override round-trip.
 */
export async function buildGateUrl(
  provider: ProviderId,
  token: string,
  baseUrl: string
): Promise<string | null> {
  const link = process.env[PROVIDERS[provider].linkEnv];
  if (!link) return null;

  if (provider === 'lootlabs') {
    // puid is echoed back as click_id in the postback.
    return withParam(link, 'puid', token);
  }

  if (provider === 'linkvertise') {
    // Static link; the Linkvertise dashboard destination is our return page.
    // Attribution is carried client-side (the token from /start).
    return link;
  }

  // Work.ink: override the destination to our return page carrying our token.
  // {TOKEN} is Work.ink's own macro (the key), left literal.
  const dest = `${baseUrl}/get-key/return?provider=workink&u=${encodeURIComponent(token)}&wtoken={TOKEN}`;
  try {
    const res = await fetch(`https://work.ink/_api/v2/override?destination=${encodeURIComponent(dest)}`);
    if (!res.ok) return link;
    const { sr } = await res.json();
    return sr ? withParam(link, 'sr', sr) : link;
  } catch {
    return link;
  }
}

/** Verify a Work.ink token really completed the gate (single-use). */
export async function verifyWorkink(
  wtoken: string
): Promise<{ valid: boolean; ip?: string }> {
  try {
    const res = await fetch(
      `https://work.ink/_api/v2/token/isValid/${encodeURIComponent(wtoken)}?deleteToken=1`
    );
    const data = await res.json();
    return { valid: !!data?.valid, ip: data?.info?.byIp };
  } catch {
    return { valid: false };
  }
}

/** Validate a Linkvertise anti-bypass hash against the anti-bypass token.
 *  NOTE: confirm the exact endpoint/response from Linkvertise → Anti-Bypass →
 *  Documentation for your account; this follows their documented token+hash check. */
export async function verifyLinkvertise(hash: string): Promise<boolean> {
  const token = process.env.LINKVERTISE_ANTIBYPASS_TOKEN;
  if (!token || !hash) return false;
  try {
    const res = await fetch(
      `https://publisher.linkvertise.com/api/v1/anti_bypassing?token=${encodeURIComponent(
        token
      )}&hash=${encodeURIComponent(hash)}`
    );
    const text = (await res.text()).trim().toLowerCase();
    return text === 'true' || text.includes('"status":"success"') || text.includes('"valid":true');
  } catch {
    return false;
  }
}

/** Optional shared secret you append to the Lootlabs postback URL. */
export function verifyLootlabsSecret(provided: string | null): boolean {
  const expected = process.env.LOOTLABS_POSTBACK_SECRET;
  if (!expected) return true; // no secret configured -> rely on click_id + IP
  return provided === expected;
}
