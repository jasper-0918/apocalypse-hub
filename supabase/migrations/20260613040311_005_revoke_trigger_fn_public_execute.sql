-- Revoke the default PUBLIC execute grant on the trigger function.
-- PostgreSQL grants EXECUTE to PUBLIC for all new functions, which means
-- anon and authenticated can call it via /rest/v1/rpc even after per-role
-- revokes. Revoking from PUBLIC closes that gap entirely.
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM authenticated;
