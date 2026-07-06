// Central SEO constants. SITE_URL must be the absolute, canonical origin
// (no trailing slash) — used by metadata, sitemap, robots and JSON-LD.
// Set NEXT_PUBLIC_BASE_URL in Vercel to your real domain when you have one.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_BASE_URL || 'https://apocalypse-hub.vercel.app'
).replace(/\/+$/, '');

export const SITE_NAME = 'Apocalypse Hub';

export const SITE_DESCRIPTION =
  'Apocalypse Hub is a Roblox script hub — browse free scripts and loaders for popular games, unlock them with a quick key system, and copy the loadstring straight into your executor.';
