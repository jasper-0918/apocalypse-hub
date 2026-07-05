// Curated themes for well-known Roblox games. When a script's game matches one
// of these, its card/preview uses the themed gradient as a "recommended" cover
// even without an uploaded image. Everything else falls back to a hashed
// gradient + the universal Roblox-style default.

export interface GameTheme {
  gradient: string; // tailwind gradient classes
  label: string;    // canonical display name
}

const THEMES: Record<string, GameTheme> = {
  'universal': { gradient: 'from-red-900/70 via-zinc-900 to-black', label: 'Universal' },
  'blox fruits': { gradient: 'from-sky-700/70 via-blue-950 to-black', label: 'Blox Fruits' },
  'pet simulator x': { gradient: 'from-fuchsia-700/60 via-purple-950 to-black', label: 'Pet Simulator X' },
  'pet simulator 99': { gradient: 'from-fuchsia-700/60 via-purple-950 to-black', label: 'Pet Simulator 99' },
  'murder mystery 2': { gradient: 'from-rose-900/70 via-zinc-950 to-black', label: 'Murder Mystery 2' },
  'da hood': { gradient: 'from-zinc-600/70 via-zinc-900 to-black', label: 'Da Hood' },
  'arsenal': { gradient: 'from-orange-800/70 via-zinc-950 to-black', label: 'Arsenal' },
  'adopt me!': { gradient: 'from-pink-600/60 via-rose-950 to-black', label: 'Adopt Me!' },
  'adopt me': { gradient: 'from-pink-600/60 via-rose-950 to-black', label: 'Adopt Me!' },
  'doors': { gradient: 'from-neutral-700/80 via-black to-black', label: 'Doors' },
  'brookhaven': { gradient: 'from-emerald-700/60 via-teal-950 to-black', label: 'Brookhaven' },
  'brookhaven 🏡rp': { gradient: 'from-emerald-700/60 via-teal-950 to-black', label: 'Brookhaven' },
  'jailbreak': { gradient: 'from-amber-700/70 via-zinc-950 to-black', label: 'Jailbreak' },
  'grow a garden': { gradient: 'from-lime-700/60 via-green-950 to-black', label: 'Grow a Garden' },
  'blade ball': { gradient: 'from-indigo-700/70 via-slate-950 to-black', label: 'Blade Ball' },
  'bee swarm simulator': { gradient: 'from-yellow-600/70 via-amber-950 to-black', label: 'Bee Swarm Simulator' },
  'forsaken': { gradient: 'from-red-950 via-black to-black', label: 'Forsaken' },
  'the strongest battlegrounds': { gradient: 'from-cyan-700/70 via-slate-950 to-black', label: 'The Strongest Battlegrounds' },
  'anime defenders': { gradient: 'from-violet-700/60 via-indigo-950 to-black', label: 'Anime Defenders' },
  'fisch': { gradient: 'from-teal-700/60 via-cyan-950 to-black', label: 'Fisch' },
  'steal a brainrot': { gradient: 'from-fuchsia-700/60 via-zinc-950 to-black', label: 'Steal a Brainrot' },
};

export function normalizeGame(game: string): string {
  return game.trim().toLowerCase();
}

/** Returns the curated theme for a famous game, or null. */
export function gameTheme(game?: string | null): GameTheme | null {
  if (!game) return null;
  return THEMES[normalizeGame(game)] ?? null;
}

export function isFamousGame(game?: string | null): boolean {
  return gameTheme(game) !== null;
}
