# Apocalypse Blox Hub

A Roblox script hub: a ScriptBlox-style marketplace + a free key system with
script obfuscation and creator earnings. Built with Next.js 13 (App Router) +
Supabase, deployed on Vercel.

- **Live:** https://apocalypsebloxhub.vercel.app
- **Full docs / architecture / handoff guide:** [`CLAUDE.md`](./CLAUDE.md)

## Quickstart

```bash
npm install
cp .env.example .env      # then fill in the values (see CLAUDE.md §6)
npm run dev               # http://localhost:3000
```

Before committing: `npm run typecheck && npm run build`.

## What's inside

- **Browse & unlock** — visitors complete a key system (Work.ink / Linkvertise /
  Lootlabs) to get a free key, then copy a loadstring into their executor.
- **Creators** — upload Lua scripts (auto obfuscated + key-gated) and earn per
  unique key-system completion; request payouts.
- **Chatbot** — a site-wide help assistant (LLM-backed, with web search).
- **Discover** — imports popular/newest ScriptBlox scripts into the owned,
  key-gated catalog (manual button + daily cron).
- **Admin / Owner panels**, **SEO** (sitemap, OG images, IndexNow), and more.

## Repo map, systems, env vars, migrations, deploy, gotchas

All documented in [`CLAUDE.md`](./CLAUDE.md). Migrations live in
`supabase/migrations/` and are applied **manually** in the Supabase SQL editor.

## Notes

- `.env` is gitignored — never commit secrets; mirror them in Vercel.
- Pushing to `main` auto-deploys to production.
