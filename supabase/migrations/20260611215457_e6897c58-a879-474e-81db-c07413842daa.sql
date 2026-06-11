
-- Enum
create type public.leadership_role as enum (
  'engineering_manager','team_lead','project_manager',
  'hr_manager','operations_manager','teacher'
);

-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  industry text,
  role text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select using (auth.uid() = id);
create policy "own profile write" on public.profiles for update using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);

-- profile auto-create trigger
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- scenarios
create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  role public.leadership_role not null,
  title text not null,
  prompt text not null,
  created_at timestamptz not null default now()
);
grant select on public.scenarios to authenticated;
grant all on public.scenarios to service_role;
alter table public.scenarios enable row level security;
create policy "scenarios readable" on public.scenarios for select using (true);

-- assessments
create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.leadership_role not null,
  scenario_id uuid not null references public.scenarios(id),
  response text,
  status text not null default 'in_progress',
  created_at timestamptz not null default now()
);
create index assessments_user_idx on public.assessments(user_id, created_at desc);
grant select, insert, update on public.assessments to authenticated;
grant all on public.assessments to service_role;
alter table public.assessments enable row level security;
create policy "own assessments" on public.assessments for select using (auth.uid() = user_id);
create policy "insert own assessments" on public.assessments for insert with check (auth.uid() = user_id);
create policy "update own assessments" on public.assessments for update using (auth.uid() = user_id);

-- results
create table public.results (
  assessment_id uuid primary key references public.assessments(id) on delete cascade,
  empathy int not null check (empathy between 0 and 100),
  accountability int not null check (accountability between 0 and 100),
  coaching int not null check (coaching between 0 and 100),
  clarity int not null check (clarity between 0 and 100),
  psychological_safety int not null check (psychological_safety between 0 and 100),
  readiness_score numeric(5,2) not null,
  strengths text[] not null,
  missed text[] not null,
  suggestions text[] not null,
  coaching_feedback text not null,
  outcome_projection jsonb not null,
  created_at timestamptz not null default now()
);
grant select on public.results to authenticated;
grant all on public.results to service_role;
alter table public.results enable row level security;
create policy "read own results" on public.results for select using (
  exists (select 1 from public.assessments a where a.id = results.assessment_id and a.user_id = auth.uid())
);

-- Blueprint scaffolds (no UI yet)
create table public.digital_twins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  communication_score int, empathy_score int, coaching_score int,
  delegation_score int, strategic_score int, conflict_score int,
  resilience_score int, overall_score int,
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.digital_twins to authenticated;
grant all on public.digital_twins to service_role;
alter table public.digital_twins enable row level security;
create policy "own twin" on public.digital_twins for select using (auth.uid() = user_id);
create policy "insert own twin" on public.digital_twins for insert with check (auth.uid() = user_id);
create policy "update own twin" on public.digital_twins for update using (auth.uid() = user_id);

create table public.personality_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  openness numeric, conscientiousness numeric, extraversion numeric,
  agreeableness numeric, neuroticism numeric
);
grant select, insert, update on public.personality_profiles to authenticated;
grant all on public.personality_profiles to service_role;
alter table public.personality_profiles enable row level security;
create policy "own personality" on public.personality_profiles for select using (auth.uid() = user_id);
create policy "insert own personality" on public.personality_profiles for insert with check (auth.uid() = user_id);
create policy "update own personality" on public.personality_profiles for update using (auth.uid() = user_id);

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  name text, role text,
  trust int, motivation int, burnout int, influence int, loyalty int,
  personality_json jsonb
);
grant all on public.characters to service_role;
alter table public.characters enable row level security;

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  event_type text,
  severity int,
  payload jsonb,
  created_at timestamptz not null default now()
);
grant all on public.events to service_role;
alter table public.events enable row level security;

-- Seed scenarios (2 per role)
insert into public.scenarios (role, title, prompt) values
('engineering_manager','Underperforming senior engineer','A senior engineer on your team has missed two sprint commitments in a row. Their code reviews are still strong, but velocity is dropping and a junior is feeling unsupported. How do you address this in the next 1:1?'),
('engineering_manager','Production outage retro','A bad deploy caused a 4-hour outage. The engineer who shipped it is visibly anxious in the retro. Walk through how you lead the conversation and what you do after.'),
('team_lead','Conflict between two teammates','Two teammates are publicly disagreeing in standups about technical direction and it is starting to affect the team. How do you intervene?'),
('team_lead','New hire ramp-up','A new hire is three weeks in and seems hesitant to ask questions. Their first PR has obvious gaps. How do you respond?'),
('project_manager','Scope creep from stakeholder','A key stakeholder keeps adding "small" requests mid-sprint that are derailing the roadmap. How do you handle the next request?'),
('project_manager','Missed deadline','Your team is going to miss a committed launch date by two weeks. How do you communicate this to leadership and your team?'),
('hr_manager','Burnout report','A manager tells you in confidence that one of their reports is showing signs of burnout but does not want to take leave. How do you proceed?'),
('hr_manager','Bias complaint','An employee reports they were passed over for promotion and believes bias was a factor. Walk through your next steps.'),
('operations_manager','Sudden process failure','A core process broke overnight and three teams are blocked. Vendors are not responding. How do you lead the next two hours?'),
('operations_manager','Resistance to change','You are rolling out a new workflow and a long-tenured team member is openly resistant in meetings. How do you respond?'),
('teacher','Disengaged student','A previously engaged student has gone quiet, stopped turning in work, and avoids eye contact. How do you approach them?'),
('teacher','Parent conflict','A parent emails angrily about a grade and questions your professionalism. Draft how you respond and what you do next.');
