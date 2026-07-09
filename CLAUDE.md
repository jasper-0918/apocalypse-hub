# Apocalypse Blox Hub — Project Guide

Canonical guide for anyone (human or AI agent) picking up this project. Read this
first, then dip into the referenced files. Keep it up to date when you change a
system.

---

## 1. What it is

**Apocalypse Blox Hub** is a Roblox script hub — a ScriptBlox-style marketplace
combined with a Luarmor-style key system and script obfuscation:

- Visitors **browse** scripts, **complete a key system** (Work.ink / Linkvertise /
  Lootlabs) to get a free key, and **copy a loadstring** into their executor.
- Creators **upload** Lua scripts that get **obfuscated + key-gated**, and **earn**
  per unique key-system completion.
- There's an admin panel, an owner panel, a help **chatbot**, and a **ScriptBlox
  importer** that populates the catalog.

- **Live:** `https://apocalypsebloxhub.vercel.app` (Vercel, auto-deploys from
  GitHub `main`).
- **Backend:** Supabase (Postgres) project `xyqcsysefyqawdpeqtwd`.

---

## 2. Tech stack

| Area        | Choice |
|-------------|--------|
| Framework   | Next.js **13.5.1** (App Router), React 18, TypeScript |
| Styling     | Tailwind + shadcn/ui (`components/ui/*`), lucide-react icons |
| Auth        | Custom JWT sessions (jose HS256) + bcrypt; **not** NextAuth |
| DB          | Supabase Postgres via `@supabase/supabase-js` (service role) |
| Email       | Nodemailer + Gmail SMTP |
| Hosting     | Vercel (+ Vercel Web Analytics, `@vercel/og`, Vercel Cron) |
| LLM chatbot | Groq / Cerebras / OpenRouter (OpenAI-compatible) + Tavily web search |

> **TS target is < ES2015.** Do **not** spread/`for…of` over `Map`/`Set` — use
> `Array.from()` / `.forEach()`. (Array spread in calls is fine.)

---

## 3. Repo layout

```
app/                     Next.js App Router
  (auth)/                login, register, verify, forgot/reset password
  (dashboard)/dashboard/ creator dashboard: scripts, keys, earnings, billing, support, settings
  admin/                 admin panel: overview, users, scripts, keys, support, analytics
  owner/                 owner panel: games, subscribers, orders, support
  script/[slug]/         public script detail (SSR + metadata)
  game/[slug]/           per-game landing pages
  trending/  discover/   browse pages
  get-key/  pricing/  rules/
  api/                   all backend routes (see §4)
  sitemap.ts robots.ts icon.svg   SEO surfaces
components/              shared UI (chat-widget, site-header, dashboard-sidebar, cards, panels, ui/*)
hooks/                   use-toast, use-list-search
lib/                     all business logic (see §4)
supabase/migrations/     numbered SQL migrations (applied MANUALLY — see §5)
scripts/                 one-off node tooling (sync-scriptblox.mjs bulk importer)
```

---

## 4. Core systems (main categories → key files)

### 4.1 Auth & sessions
- `lib/auth.ts` — `createSessionToken`, `getUserFromRequest`, `bumpTokenVersion`,
  password hashing. JWTs signed with `NEXTAUTH_SECRET`; embed `token_version` for
  "log out everywhere". `getUserFromRequest` re-checks `token_version` per request
  (fail-open on DB error, by design).
- `lib/session.ts` — client token storage (localStorage).
- `components/auth-provider.tsx` — React context (`useAuth`), mounted app-wide.
- Roles: `USER`, `ADMIN`, `OWNER`. Helpers in `lib/plans.ts` (`isStaff`,
  `hasUnlimitedPerks`). Owner/admin get unlimited scripts + non-expiring keys.

### 4.2 Key system (unlock + anti-bypass)
- `lib/keygen.ts`, `lib/keys.ts`, `lib/keyproviders.ts` — mint/validate keys,
  provider gate config, expiry, auto-purge.
- `app/api/keys/route.ts` — **claim** a key (mints one, links it to every
  published script, and **credits creator earnings** for the unlocked script).
- `app/api/keys/{start,verify,callback/[provider]}/route.ts` — provider gate flow.
- `components/key-system-gate.tsx`, `app/get-key/`.
- Keys are **account-bound via `uid`** (HWID locking was declined). Paid keys set
  `is_paid_key` and require `?uid=`.

### 4.3 Scripts (upload → serve → obfuscate)
- `app/api/scripts/route.ts` — create (`POST`) + list own (`GET`, paginated).
- `app/api/scripts/serve/[id]/route.ts` — the **loadstring endpoint**: validates
  the key, then returns `obfuscateLua(original_content)`.
- `lib/obfuscator.ts` — payload-agnostic: encrypts the whole script and
  `loadstring`s it at runtime (so it runs any Lua, incl. an imported loadstring,
  without leaking the source URL).
- `lib/scripts-server.ts` — cached SSR reads (script detail, game catalog).
- `app/api/scripts/catalog/route.ts` — public catalog; `components/script-hub-card.tsx`
  + `components/script-card.tsx` render cards.
- Interactivity: `app/api/scripts/[id]/{react,report,comments}/route.ts`.

### 4.4 Creator earnings & payouts
- `lib/earnings.ts` — tiers, commission, per-completion value.
- `app/api/earnings/route.ts` (summary, paginated), `app/api/payouts/route.ts`.
- A completion is credited in `app/api/keys/route.ts` to the unlocked script's
  `owner_id` (self-completions don't earn; unique per (script, viewer) / 24h).

### 4.5 ScriptBlox import → Discover  ← **added this phase**
- `lib/scriptblox.ts` — thin client for the public ScriptBlox API (popular =
  `sortBy=views`, latest = default, plus search).
- `lib/import-scripts.ts` — `importScriptblox()`: maps each free script to an
  **owned, published, key-gated** row in `scripts` (loadstring stored as
  `original_content`, views seeded, tagged `external_source`/`external_id` for
  dedup), links active keys, and **pings IndexNow**.
- Entry points: admin button (`app/api/admin/scriptblox/sync` +
  `components/scriptblox-sync-panel.tsx`), daily cron (§4.8), and the bulk
  seeder `scripts/sync-scriptblox.mjs` (no time limit; mirrors the lib logic
  because it's a standalone node script).
- `app/api/discover/route.ts` + `app/discover/page.tsx` = the imported catalog,
  filtered by `external_source='scriptblox'`, rendered with the normal card.

### 4.6 Chatbot assistant  ← **added this phase**
- `components/chat-widget.tsx` — floating widget mounted in `app/layout.tsx`
  (every page). Text-only; script/link results come from server logic, not the model.
- `app/api/assistant/route.ts` — rule-based knowledge base + live catalog search;
  on a KB miss it can **web-search** (Tavily) and cite sources.
- `lib/assistant.ts` — KB, intent matching, `SYSTEM_PROMPT` / `WEB_SYSTEM_PROMPT`
  (jailbreak/off-topic/malware/secret-leak guardrails), shared `ScriptHit` type.
- `lib/llm.ts` — multi-provider LLM client (Groq/Cerebras/OpenRouter/Anthropic),
  provider fallback + key rotation. `lib/tavily.ts` — web search. Both use
  `lib/provider-keys.ts` (`readEnvKeys`, `shuffle`).

### 4.7 SEO / traffic
- `app/sitemap.ts` (paginated — lists **all** scripts), `app/robots.ts`,
  `app/api/og/route.tsx` (dynamic OG images), root metadata + JSON-LD in
  `app/layout.tsx`, `lib/seo.ts` (`SITE_URL`, `SITE_NAME`, …).
- `lib/indexnow.ts` — `pingIndexNow()`; key file at
  `public/apocd879a9e5cadf4f4984b64663d5bc507c2bc05373.txt`.

### 4.8 Cron jobs
- `vercel.json` schedules `app/api/cron/import-scriptblox` daily (06:00 UTC).
  Protected by `CRON_SECRET` (Vercel sends it as `Authorization: Bearer`).
- Expired-key cleanup is a DB-side pg_cron (migration 016) plus on-demand purge.

### 4.9 Admin / Owner panels & list UX
- `app/admin/*` (staff), `app/owner/*` (owner).
- **Long lists** (My Scripts, admin Users/Keys/Scripts, Earnings traffic) use
  `hooks/use-list-search.ts` (client-side search + **pagination**: one page at a
  time, resets to page 1 on search) rendered with `components/list-pager.tsx`
  (Prev · Page N/M · Next, "Showing X–Y of Z"). Pattern: `const list =
  useListSearch(items, matcher, { pageSize }); … {list.shown.map(...)}
  <ListPager {...list} noun="…" />`.
- `/discover` paginates **server-side** (the API's `page`/`limit` params) with its
  own Prev/Next, since the imported catalog is too big to load fully client-side.

---

## 5. Data model & migrations

- Schema lives in `supabase/migrations/NNN_*.sql`, applied **MANUALLY by the
  owner** in the Supabase SQL editor — there is **no CLI/auto-apply**. When you
  add a migration, hand over the full SQL and wait for confirmation.
- Applied through **025** as of this writing. Notables:
  - `023` created `external_scripts` (now **unused/legacy**).
  - `024` added `scripts.external_source` / `external_id` (import dedup).
  - `025` (optional) drops the dead `external_scripts` table.
- **Big tables use `lib/paginate.ts` `selectAll()`** — PostgREST caps a single
  SELECT at ~1000 rows, so sitemap / My Scripts / earnings / catalog page through.

---

## 6. Environment variables

Full list with placeholders lives in **`.env.example`**. Groups:

- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server-only secret).
- **Auth/app:** `NEXTAUTH_SECRET` (must be set in Vercel!), `NEXT_PUBLIC_BASE_URL`.
- **Key providers:** `WORKINK_*`, `LINKVERTISE_*`, `LOOTLABS_*`, `KEY_GATE_ENFORCED`.
- **Payments/email:** `NEXT_PUBLIC_PAY_*`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`.
- **Chatbot LLM:** `LLM_PROVIDER_ORDER`, `GROQ_API_KEYS`/`GROQ_MODEL`,
  `CEREBRAS_API_KEYS`/`CEREBRAS_MODEL`, `OPENROUTER_API_KEYS`/`OPENROUTER_MODEL`
  (comma-separated keys, rotated). Optional `ANTHROPIC_API_KEY(S)`.
- **Web search:** `TAVILY_API_KEYS`.
- **Cron:** `CRON_SECRET`, `IMPORT_OWNER_EMAIL`, `CRON_IMPORT_MODE`, `CRON_IMPORT_PAGES`.

> `.env` is **gitignored — never commit it.** Values set locally must **also** be
> added in the Vercel dashboard (the local `.env` is not deployed). `NEXT_PUBLIC_*`
> are inlined at build time (need a redeploy to change).

---

## 7. Local dev & verification

```bash
npm install
npm run dev         # local dev server (port 3000)
npm run typecheck   # tsc --noEmit  — run before committing
npm run build       # full production build — run before committing
npm run lint
```

Verify user-facing changes in a browser (the app talks to the **production**
Supabase via `.env`). Bulk-import ScriptBlox scripts with
`node scripts/sync-scriptblox.mjs [popularPages] [latestPages] [ownerEmail]`.

---

## 8. Deployment

- Push to **`main`** → Vercel builds & deploys to production automatically.
- After changing/adding env vars in Vercel, redeploy for them to take effect.

---

## 9. Conventions & gotchas

- **Manual migrations** (§5) — never assume a migration is applied; degrade
  gracefully if a column is missing.
- **Service role bypasses RLS.** Server routes use `createServerClient()` (service
  key) and enforce auth/authorization in code (`getUserFromRequest` + role checks).
- **1000-row PostgREST cap** — use `selectAll()` when you truly need every row.
- **TS < ES2015** — `Array.from()`, not spread, over Map/Set.
- **Don't commit `.env`.** Keep secrets in env only; the assistant/LLM keys are
  read server-side and never sent to the browser.
- **Pushing to `main` deploys to prod** — confirm before pushing.
- **The chatbot is text-only** — it has no DB/tool access; keep it that way so a
  jailbreak can't affect the site.

---

## 10. Related docs

- `.env.example` — every env var.
- `supabase/migrations/` — the schema, in order.
- Product/user docs are served at `/docs` (see `public/docs`).
