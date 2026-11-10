-- Crew Call: scheduled server jobs (emails, weekly digest, nightly term check and clean-up)
-- Run this once in Supabase, SQL Editor, AFTER deploying the "crewcall" Edge Function.
-- Safe to run again (it replaces the jobs). Before running, change the secret on the line marked CHANGE ME
-- to the same value you set as CRON_SECRET in Edge Functions, Secrets.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 1. Where the function lives and the shared secret (kept in Supabase Vault, not in this file once run)
do $$
declare
  fn_url text := 'https://dnvwdvdptulhbgzajvsi.supabase.co/functions/v1/crewcall';
  fn_secret text := 'CHANGE ME';  -- CHANGE ME: paste your CRON_SECRET here
begin
  if fn_secret = 'CHANGE ME' then raise exception 'Put your CRON_SECRET on the CHANGE ME line first'; end if;
  if exists (select 1 from vault.secrets where name = 'crewcall_url') then
    perform vault.update_secret((select id from vault.secrets where name = 'crewcall_url'), fn_url);
  else perform vault.create_secret(fn_url, 'crewcall_url'); end if;
  if exists (select 1 from vault.secrets where name = 'crewcall_secret') then
    perform vault.update_secret((select id from vault.secrets where name = 'crewcall_secret'), fn_secret);
  else perform vault.create_secret(fn_secret, 'crewcall_secret'); end if;
end $$;

-- 2. A helper that calls the function for one job
create or replace function public.crewcall_job(job text) returns bigint
language sql security definer set search_path = public as $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'crewcall_url') || '?job=' || job,
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'crewcall_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000);
$$;
revoke execute on function public.crewcall_job(text) from public, anon, authenticated;

-- 3. The schedule (times are UTC)
do $$
declare j text;
begin
  foreach j in array array['crewcall-mail', 'crewcall-digest', 'crewcall-nightly'] loop
    if exists (select 1 from cron.job where jobname = j) then perform cron.unschedule(j); end if;
  end loop;
end $$;
select cron.schedule('crewcall-mail',    '*/10 * * * *', $$select public.crewcall_job('mail')$$);     -- every 10 minutes
select cron.schedule('crewcall-digest',  '5 * * * *',    $$select public.crewcall_job('digest')$$);   -- hourly; each person gets theirs at their chosen time
select cron.schedule('crewcall-nightly', '0 2 * * *',    $$select public.crewcall_job('nightly')$$);  -- 2am

-- Check: select jobname, schedule, active from cron.job;
-- Recent runs: select * from cron.job_run_details order by start_time desc limit 10;
-- Replies from the function: select id, status_code, content from net._http_response order by id desc limit 10;
-- To stop everything: select cron.unschedule('crewcall-mail'); select cron.unschedule('crewcall-digest'); select cron.unschedule('crewcall-nightly');
