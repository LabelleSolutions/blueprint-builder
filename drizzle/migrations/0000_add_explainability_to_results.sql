ALTER TABLE public.results
  ADD COLUMN IF NOT EXISTS explainability jsonb NOT NULL DEFAULT '[]'::jsonb;