import { createClient } from '@supabase/supabase-js';

// Read runtime (non-inlined) vars first. The Vercel↔Supabase integration sets
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY; NEXT_PUBLIC_* are build-time inlined
// and unreliable if the build predates the env vars, so they're only fallbacks.
export function createServerClient() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    '';
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    '';
  return createClient(url, serviceKey);
}
