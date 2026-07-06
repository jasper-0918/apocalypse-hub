-- ============================================================
-- 016: Automatic key lifecycle
--   * Keys are minted on demand, per user, the moment the key system is
--     completed (see app/api/keys) — no daily pool / admin generation needed.
--   * Expired keys are deleted automatically:
--       - the API purges them on every claim and on the admin keys view
--       - a best-effort pg_cron job purges them every 15 minutes server-side
--   * A one-time sweep clears the existing backlog of expired keys.
-- Idempotent: safe to re-run.
-- ============================================================

-- Speeds up the "delete where expired" sweeps.
CREATE INDEX IF NOT EXISTS idx_keys_expires_at ON public.keys (expires_at);

-- Reusable purge function (also invoked by the cron job below).
CREATE OR REPLACE FUNCTION public.delete_expired_keys()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted integer;
BEGIN
  DELETE FROM public.keys WHERE expires_at < now();
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;

-- Not something anon/authenticated PostgREST callers should be able to invoke.
REVOKE ALL ON FUNCTION public.delete_expired_keys() FROM PUBLIC;

-- Best-effort server-side schedule so keys are purged even with zero traffic.
-- Fully guarded: if pg_cron isn't available or can't be enabled, the migration
-- still succeeds and the API-side purge keeps things clean on its own.
DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'delete-expired-keys') THEN
      PERFORM cron.unschedule('delete-expired-keys');
    END IF;
    PERFORM cron.schedule(
      'delete-expired-keys',
      '*/15 * * * *',
      $cron$SELECT public.delete_expired_keys();$cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Clear the existing backlog of expired keys right now.
DELETE FROM public.keys WHERE expires_at < now();

NOTIFY pgrst, 'reload schema';
