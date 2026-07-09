#!/usr/bin/env node
// Bulk importer: scrape ScriptBlox (popular + latest) and insert the results as
// PUBLISHED, KEY-GATED scripts OWNED by your account — so key-system completions
// on them credit you. De-dupes on (external_source, external_id).
//
//   node scripts/sync-scriptblox.mjs [popularPages] [latestPages] [ownerEmail]
//   node scripts/sync-scriptblox.mjs 40 15
//
// Requires migration 024 (scripts.external_source/external_id) to be applied.

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dirname, '..', '.env'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* rely on ambient env */
  }
}
loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const OWNER_EMAIL = process.argv[4] || process.env.IMPORT_OWNER_EMAIL || 'jasper.paitan0918@gmail.com';
const POPULAR_PAGES = Number(process.argv[2]) || 40;
const LATEST_PAGES = Number(process.argv[3]) || 15;

const BASE = 'https://scriptblox.com';
const UA = 'Mozilla/5.0 (compatible; ApocalypseBloxHub/1.0)';

const slugify = (s) =>
  (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'script';
const buildSlug = (name, suffix) => `${slugify(name)}-${String(suffix).replace(/-/g, '').slice(0, 6)}`;
const toAbs = (u) => (typeof u === 'string' && u ? (u.startsWith('http') ? u : `${BASE}${u.startsWith('/') ? '' : '/'}${u}`) : null);

function mapScript(raw, ownerId) {
  const externalId = raw?._id ? String(raw._id) : '';
  const title = typeof raw?.title === 'string' ? raw.title.trim() : '';
  const content = typeof raw?.script === 'string' ? raw.script.trim() : '';
  if (!externalId || !title || !content || raw?.scriptType === 'paid') return null;
  const gameName = (raw?.game?.name && String(raw.game.name).trim()) || 'Universal';
  return {
    name: title.slice(0, 200),
    description: `${gameName} script.`,
    original_content: content,
    obfuscated_hash: createHash('sha256').update(content).digest('hex'),
    is_protected: true,
    is_published: true,
    game: gameName,
    games: [gameName],
    slug: buildSlug(title, externalId),
    thumbnail_url: toAbs(raw?.image ?? raw?.game?.imageUrl),
    view_count: Number(raw?.views) || 0,
    external_source: 'scriptblox',
    external_id: externalId,
    owner_id: ownerId,
  };
}

async function fetchPage(mode, page) {
  const params = mode === 'popular' ? `?sortBy=views&order=desc&page=${page}` : `?page=${page}`;
  const res = await fetch(`${BASE}/api/script/fetch${params}`, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const scripts = Array.isArray(json?.result?.scripts) ? json.result.scripts : [];
  return { scripts, totalPages: Number(json?.result?.totalPages) || 1, nextPage: json?.result?.nextPage ?? null };
}

async function collect(mode, pages, byId, ownerId) {
  for (let page = 1; page <= pages; page++) {
    try {
      const r = await fetchPage(mode, page);
      for (const raw of r.scripts) {
        const row = mapScript(raw, ownerId);
        if (row) byId.set(row.external_id, row);
      }
      process.stdout.write(`\r  ${mode}: page ${page}/${pages} — ${byId.size} unique usable   `);
      if (r.nextPage == null || page >= r.totalPages) break;
      await new Promise((res) => setTimeout(res, 150));
    } catch (e) {
      console.log(`\n  ${mode} page ${page} failed (${e.message}); stopping this mode.`);
      break;
    }
  }
  console.log('');
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const { data: owner, error: ownerErr } = await supabase
    .from('users')
    .select('id, username, role')
    .eq('email', OWNER_EMAIL)
    .maybeSingle();
  if (ownerErr || !owner) {
    console.error(`Owner account not found for ${OWNER_EMAIL}: ${ownerErr?.message || 'no such user'}`);
    process.exit(1);
  }
  console.log(`Importing as owner: ${owner.username} (${owner.role}) <${OWNER_EMAIL}>`);
  console.log(`Scraping ScriptBlox (popular ${POPULAR_PAGES}p, latest ${LATEST_PAGES}p)`);

  const byId = new Map();
  await collect('popular', POPULAR_PAGES, byId, owner.id);
  await collect('latest', LATEST_PAGES, byId, owner.id);

  const rows = Array.from(byId.values());
  console.log(`Upserting ${rows.length} scripts as owned + published + key-gated...`);
  const importedIds = [];
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { data, error } = await supabase
      .from('scripts')
      .upsert(chunk, { onConflict: 'external_source,external_id' })
      .select('id');
    if (error) {
      console.error(`\nUpsert failed: ${error.message}`);
      console.error('Did you run migration 024 (scripts.external_source/external_id)?');
      process.exit(1);
    }
    for (const r of data || []) importedIds.push(r.id);
    process.stdout.write(`\r  upserted ${importedIds.length}/${rows.length}   `);
  }
  console.log('');

  // Link active keys so existing key holders can run the new scripts immediately.
  const { data: keys } = await supabase
    .from('keys')
    .select('id')
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .limit(200);
  if (keys && keys.length) {
    const pairs = [];
    for (const sid of importedIds) for (const k of keys) pairs.push({ script_id: sid, key_id: k.id });
    for (let i = 0; i < pairs.length; i += 500) {
      await supabase.from('script_keys').upsert(pairs.slice(i, i + 500), { onConflict: 'script_id,key_id' });
    }
    console.log(`Linked ${keys.length} active key(s) to imported scripts.`);
  }

  console.log(`\nDone. ${importedIds.length} scripts imported to ${owner.username}'s account.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
