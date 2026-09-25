ALTER TABLE public.scenarios
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS reviewed_by text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

DROP POLICY IF EXISTS "scenarios readable" ON public.scenarios;
CREATE POLICY "approved or own scenarios readable" ON public.scenarios
  FOR SELECT TO authenticated
  USING (status = 'approved' OR created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "leaders submit own scenarios" ON public.scenarios
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND status = 'pending');

CREATE TABLE public.human_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  rater_id uuid NOT NULL,
  rater_name text NOT NULL DEFAULT '',
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.human_ratings TO authenticated;
GRANT ALL ON public.human_ratings TO service_role;
ALTER TABLE public.human_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read ratings" ON public.human_ratings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins add ratings" ON public.human_ratings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND rater_id = auth.uid());
CREATE POLICY "admins delete ratings" ON public.human_ratings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));