-- GovFlow AI — initial schema
-- Run via Supabase SQL editor, or `supabase db push` if using the CLI.

create extension if not exists "pgcrypto";

-- 1. cases
create table if not exists cases (
  id uuid primary key default gen_random_uuid(),
  case_number text unique not null,
  case_type text not null check (case_type in ('land_compensation', 'birth_certificate_correction', 'citizen_grievance')),
  applicant_name text,
  district text,
  priority text check (priority in ('low', 'medium', 'high')),
  sla_hours integer not null,
  status text default 'pending',
  current_step integer default 1,
  summary text,
  extracted_data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 2. documents
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references cases(id) on delete cascade,
  doc_type text not null,
  file_url text,
  status text check (status in ('present', 'missing')),
  confidence numeric,
  created_at timestamptz default now()
);

-- 3. officers
create table if not exists officers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  department text not null,
  skills text[] default '{}',
  authority text[] default '{}',
  current_load integer default 0,
  max_load integer default 50,
  avg_processing_days numeric default 2,
  available boolean default true,
  created_at timestamptz default now()
);

-- 4. workflow_steps
create table if not exists workflow_steps (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references cases(id) on delete cascade,
  step_name text not null,
  department text,
  step_order integer not null,
  status text default 'pending',
  assigned_officer_id uuid references officers(id),
  estimated_processing_days numeric,
  required_skill text,
  required_authority text,
  created_at timestamptz default now()
);

-- 5. actions_log
create table if not exists actions_log (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references cases(id) on delete cascade,
  action_type text not null,
  reason text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz default now()
);

-- Helpful indexes
create index if not exists idx_documents_case_id on documents(case_id);
create index if not exists idx_workflow_steps_case_id on workflow_steps(case_id);
create index if not exists idx_workflow_steps_officer_id on workflow_steps(assigned_officer_id);
create index if not exists idx_actions_log_case_id on actions_log(case_id);
create index if not exists idx_officers_department on officers(department);
