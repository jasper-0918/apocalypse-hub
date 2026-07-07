import { randomBytes } from 'crypto';

// ---------------------------------------------------------------------------
// Apocalypse Blox Hub — Lua protector
//
// Strategy: treat the WHOLE pasted script (loader or full source) as opaque
// bytes, encrypt them with a per-request rolling cipher, and emit a small
// bootstrap that decrypts + loadstring()s them at runtime. Nothing readable —
// not even a loader's remote URL — appears in the served text.
//
// This is intentionally payload-agnostic: because the original code is carried
// as encrypted data and only ever `loadstring`-ed, we never rewrite its syntax,
// so it can't be broken by the protector (unlike naive variable renaming).
//
// Honest limits: this is a runtime-decrypt packer, not a bytecode VM. Someone
// who hooks `loadstring`/`HttpGet` in their executor can still recover the
// payload. It stops casual inspection, network sniffing of the served text,
// and trivial URL scraping — which is what gating-for-attribution needs.
// ---------------------------------------------------------------------------

function rint(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Produces short, confusing, but valid & unique Lua identifiers (_lI1O0…). */
function makeNamer() {
  const chars = 'lI1O0';
  let n = 0;
  const used = new Set<string>();
  return () => {
    let name: string;
    do {
      let x = n++;
      name = '_';
      do {
        name += chars[x % chars.length];
        x = Math.floor(x / chars.length);
      } while (x > 0);
    } while (used.has(name));
    used.add(name);
    return name;
  };
}

/**
 * Obfuscate/protect a Lua script for serving. Output is fresh on every call
 * (random names, cipher key and junk) so it never fingerprints to a constant.
 */
export function obfuscateLua(lua: string, scriptId: string): string {
  const name = makeNamer();
  const DATA = name();
  const OUT = name();
  const KEY = name();
  const STEP = name();
  const I = name();
  const SRC = name();
  const FN = name();
  const J1 = name();
  const J2 = name();

  // Rolling cipher: enc[i] = (src[i] + key + i*step) mod 256.
  const key = rint(1, 255);
  const step = rint(1, 9);

  const bytes = Buffer.from(lua, 'utf8');
  let data = '';
  for (let idx = 0; idx < bytes.length; idx++) {
    const i = idx + 1; // Lua strings are 1-indexed
    const enc = (((bytes[idx] + key + i * step) % 256) + 256) % 256;
    data += '\\' + String(enc).padStart(3, '0'); // unambiguous \ddd escape
  }

  // Disguise the two constants as trivial arithmetic instead of bare literals.
  const kb = rint(1, 9999);
  const ka = kb + key; // key = ka - kb
  const sb = rint(1, 99);
  const sa = sb + step; // step = sa - sb

  const token = randomBytes(4).toString('hex').toUpperCase();

  // Everything lives in an IIFE so no locals leak into the payload's globals.
  return `
-- Apocalypse Blox Hub | Protected Script [${scriptId}] #${token}
-- Gated by the Apocalypse Blox Hub key system. Do not redistribute.
return (function()
  local ${J1} = ${rint(1000, 9999)}
  for ${J2} = 1, ${rint(2, 6)} do ${J1} = (${J1} * 31 + 7) % ${rint(101, 997)} end
  local ${DATA} = "${data}"
  local ${KEY} = ${ka} - ${kb}
  local ${STEP} = ${sa} - ${sb}
  local ${OUT} = {}
  for ${I} = 1, #${DATA} do
    ${OUT}[${I}] = string.char((string.byte(${DATA}, ${I}) - ${KEY} - ${I} * ${STEP}) % 256)
  end
  local ${SRC} = table.concat(${OUT})
  local ${FN} = (loadstring or load)(${SRC})
  if type(${FN}) == "function" then return ${FN}() end
end)()
`.trim();
}

export function generateLoadstringSnippet(scriptId: string, baseUrl: string): string {
  return `loadstring(game:HttpGet("${baseUrl}/api/scripts/serve/${scriptId}?key=YOUR_KEY_HERE"))()`;
}
