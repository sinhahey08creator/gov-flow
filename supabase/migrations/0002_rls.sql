-- GovFlow AI — RLS policies
-- Demo-mode posture: synthetic data only, no real citizen PII, so we allow
-- broad read access and route all writes through server-side code using
-- the service role key (which bypasses RLS). This is intentionally simple
-- for a hackathon demo — tighten before any real deployment.

alter table cases enable row level security;
alter table documents enable row level security;
alter table officers enable row level security;
alter table workflow_steps enable row level security;
alter table actions_log enable row level security;

-- Public read access (anon key) for demo dashboards.
create policy "public read cases" on cases for select using (true);
create policy "public read documents" on documents for select using (true);
create policy "public read officers" on officers for select using (true);
create policy "public read workflow_steps" on workflow_steps for select using (true);
create policy "public read actions_log" on actions_log for select using (true);

-- No public insert/update/delete policies are defined on purpose.
-- All writes must go through Next.js Server Actions / Route Handlers
-- using SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS entirely.
-- Never expose the service role key to the browser.
