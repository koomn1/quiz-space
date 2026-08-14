CREATE TABLE IF NOT EXISTS public.web_vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  metric_name TEXT NOT NULL CHECK (metric_name IN ('lcp', 'fcp', 'cls', 'ttfb')),
  metric_value NUMERIC(12, 3) NOT NULL CHECK (metric_value >= 0 AND metric_value <= 600000),
  path TEXT NOT NULL CHECK (char_length(path) BETWEEN 1 AND 200),
  device_class TEXT NOT NULL CHECK (device_class IN ('mobile', 'tablet', 'desktop')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS web_vitals_created_metric_idx ON public.web_vitals(created_at DESC, metric_name);
CREATE INDEX IF NOT EXISTS web_vitals_user_created_idx ON public.web_vitals(user_id, created_at DESC);

ALTER TABLE public.web_vitals ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.record_web_vital(
  p_metric_name TEXT,
  p_metric_value NUMERIC,
  p_path TEXT,
  p_device_class TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;
  IF p_metric_name NOT IN ('lcp', 'fcp', 'cls', 'ttfb')
    OR p_metric_value IS NULL OR p_metric_value < 0 OR p_metric_value > 600000
    OR p_path IS NULL OR char_length(trim(p_path)) NOT BETWEEN 1 AND 200
    OR p_device_class NOT IN ('mobile', 'tablet', 'desktop') THEN
    RAISE EXCEPTION 'Invalid performance metric';
  END IF;

  INSERT INTO public.web_vitals (user_id, metric_name, metric_value, path, device_class)
  VALUES (v_user_id, p_metric_name, p_metric_value, trim(p_path), p_device_class);
END;
$$;

REVOKE ALL ON FUNCTION public.record_web_vital(TEXT, NUMERIC, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_web_vital(TEXT, NUMERIC, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
