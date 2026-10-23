-- Close the open anon read on emergency_events; shared links now read one row
-- through a security definer function gated on the exact share token.
DROP POLICY IF EXISTS "public read by token" ON public.emergency_events;
REVOKE SELECT ON public.emergency_events FROM anon;

CREATE OR REPLACE FUNCTION public.get_shared_emergency_event(p_share_token text)
RETURNS TABLE (
  created_at timestamptz,
  trigger_type text,
  gesture text,
  latitude double precision,
  longitude double precision,
  accuracy_m double precision,
  location_error text,
  message text,
  resolved boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.created_at, e.trigger_type, e.gesture, e.latitude, e.longitude,
         e.accuracy_m, e.location_error, e.message, e.resolved
  FROM public.emergency_events e
  WHERE e.share_token = p_share_token
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_shared_emergency_event(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_shared_emergency_event(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_emergency_event(text) TO service_role;
