DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('admin','moderator','user'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.competencies (
  id text PRIMARY KEY,
  label text NOT NULL,
  description text NOT NULL DEFAULT '',
  weight numeric NOT NULL CHECK (weight >= 0 AND weight <= 1),
  signals text[] NOT NULL DEFAULT '{}',
  templates jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.competencies TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.competencies TO authenticated;
GRANT ALL ON public.competencies TO service_role;
ALTER TABLE public.competencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "competencies readable" ON public.competencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins update competencies" ON public.competencies FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.role_profiles (
  id public.leadership_role PRIMARY KEY,
  label text NOT NULL,
  tagline text NOT NULL DEFAULT '',
  target_competencies text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.role_profiles TO authenticated;
GRANT ALL ON public.role_profiles TO service_role;
ALTER TABLE public.role_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role profiles readable" ON public.role_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins update role profiles" ON public.role_profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.config_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor uuid NOT NULL,
  entity text NOT NULL,
  entity_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.config_audit TO authenticated;
GRANT ALL ON public.config_audit TO service_role;
ALTER TABLE public.config_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read audit" ON public.config_audit FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins write audit" ON public.config_audit FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') AND actor = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scenarios TO authenticated;
CREATE POLICY "admins insert scenarios" ON public.scenarios FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update scenarios" ON public.scenarios FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete scenarios" ON public.scenarios FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));