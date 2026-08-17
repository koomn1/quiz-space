-- Centralized 7/14/30-day trial offer configuration.
-- Reads are available only to authenticated members; writes are restricted to
-- administrators through the SECURITY DEFINER RPC below.
CREATE TABLE IF NOT EXISTS public.trial_offers (
  duration_days smallint PRIMARY KEY CHECK (duration_days IN (7, 14, 30)),
  is_active boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);

INSERT INTO public.trial_offers (duration_days, is_active)
VALUES (7, false), (14, false), (30, false)
ON CONFLICT (duration_days) DO NOTHING;

ALTER TABLE public.trial_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trial_offers_authenticated_read ON public.trial_offers;
CREATE POLICY trial_offers_authenticated_read
  ON public.trial_offers
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

REVOKE ALL ON TABLE public.trial_offers FROM anon, authenticated;
GRANT SELECT ON TABLE public.trial_offers TO authenticated;

CREATE OR REPLACE FUNCTION public.set_trial_offer_state(
  p_duration_days smallint,
  p_is_active boolean
)
RETURNS TABLE (
  duration_days smallint,
  is_active boolean,
  updated_at timestamptz,
  updated_by text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE uid = auth.uid()::text
      AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Administrator permission is required to update trial offers.'
      USING ERRCODE = '42501';
  END IF;

  IF p_duration_days NOT IN (7, 14, 30) THEN
    RAISE EXCEPTION 'Unsupported trial duration.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.trial_offers
  SET is_active = p_is_active,
      updated_at = now(),
      updated_by = auth.uid()::text
  WHERE trial_offers.duration_days = p_duration_days;

  RETURN QUERY
  SELECT offer.duration_days, offer.is_active, offer.updated_at, offer.updated_by
  FROM public.trial_offers AS offer
  WHERE offer.duration_days = p_duration_days;
END;
$$;

REVOKE ALL ON FUNCTION public.set_trial_offer_state(smallint, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_trial_offer_state(smallint, boolean) TO authenticated;
