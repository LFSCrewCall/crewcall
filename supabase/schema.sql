-- Crew Call database (Supabase / Postgres)
-- Paste all of this into Supabase: SQL Editor, New query, Run. Running it twice is safe.
--
-- How data is kept: every project, profile, request and setting is one row in `records`
-- (kind + id + its details as JSON). Private email addresses are kept apart in `emails`.
-- Row level security decides who can see and change each row, so the rules hold even
-- if someone pokes at the website code. Nothing is stored on anyone's computer.

-- ---------- 1. Settings for this school ----------
create table if not exists app_meta (
  id int primary key default 1 check (id = 1),
  first_owner_email text not null,                       -- becomes owner on first sign-in
  lfs_domains text[] not null default '{student.lfs.org.uk,lfs.org.uk}'
);
insert into app_meta (first_owner_email) values ('chanchrisna.lee@student.lfs.org.uk') on conflict (id) do nothing;

-- ---------- 2. Tables ----------
create table if not exists records (
  kind text not null,          -- student, project, request, script, release, gig, notification, report, invite, config ...
  id text not null,
  data jsonb not null default '{}'::jsonb,
  owner uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (kind, id)
);
create index if not exists records_kind on records (kind);

create table if not exists emails (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  share boolean not null default false   -- true when the person ticks "Show my email to signed-in members"
);

create or replace function touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists records_touch on records;
create trigger records_touch before update on records for each row execute function touch();

-- ---------- 3. Who is who ----------
create or replace function my_email() returns text language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

create or replace function cfg(k text) returns jsonb language sql stable security definer set search_path = public as $$
  select data -> 'v' from records where kind = 'config' and id = k
$$;

create or replace function is_owner() returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and coalesce(cfg('owner') #>> '{}', '') = auth.uid()::text
$$;

create or replace function is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select is_owner() or coalesce(cfg('admins') ? auth.uid()::text, false)
$$;

create or replace function has_perm(p text) returns boolean language sql stable security definer set search_path = public as $$
  select is_owner() or (is_admin() and coalesce(cfg('adminPerms') -> auth.uid()::text ? p, false))
$$;

-- Who may join: anyone with an LFS email, the first owner, or a guest an LFS member invited.
create or replace function join_ok(e text) returns boolean language sql stable security definer set search_path = public as $$
  select lower(e) = lower((select first_owner_email from app_meta where id = 1))
    or split_part(lower(e), '@', 2) = any ((select lfs_domains from app_meta where id = 1)::text[])
    or exists (select 1 from records where kind = 'invite' and id = lower(e))
$$;

-- A member is anyone signed in who may join (see above), plus admins.
create or replace function is_member() returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (join_ok(my_email()) or is_admin())
$$;

-- Directors and producers of a project (by email on the project, or by holding the role)
create or replace function runs_project(pid text) returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from records p where p.kind = 'project' and p.id = pid and (
      p.owner = auth.uid()
      or lower(nullif(p.data ->> 'email', '')) = my_email()
      or lower(nullif(p.data #>> '{producer,email}', '')) = my_email()
      or p.data ->> 'dsid' = auth.uid()::text
      or exists (select 1 from jsonb_array_elements(case when jsonb_typeof(p.data -> 'producers') = 'array' then p.data -> 'producers' else '[]'::jsonb end) x
                 where x ->> 'sid' = auth.uid()::text or lower(nullif(x ->> 'email', '')) = my_email())
      or exists (select 1 from jsonb_array_elements(coalesce(p.data -> 'roles', '[]'::jsonb)) r
                 where r ->> 'role' in ('Director', 'Producer') and r ->> 'filledBy' = auth.uid()::text)))
$$;

-- Whoever posted a script, release or paid job
create or replace function posted(k text, rid text) returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (select 1 from records r where r.kind = k and r.id = rid
    and (r.owner = auth.uid() or r.data ->> 'by' = auth.uid()::text))
$$;

-- Which permission edits each setting
create or replace function config_perm(k text) returns boolean language sql stable security definer set search_path = public as $$
  select case
    when k in ('COURSES', 'TERM_DATES', 'ROLE_GROUPS', 'TERMS', 'PATHWAYS', 'TYPES', 'KIT_CATS', 'customWords') then has_perm('setup')
    when k = 'settings' then has_perm('email') or is_owner()
    when k = 'nlAuto' then has_perm('news') or has_perm('send')
    when k in ('admins', 'adminPerms', 'adminVia', 'reps') then has_perm('people')
    when k = 'owner' then is_owner() or (has_perm('people') and coalesce((cfg('settings') ->> 'repsTransfer')::boolean, true))
    when k in ('ownerProposal', 'handover', 'adminLog') then is_admin()
    else is_owner() end
$$;

-- Settings that visitors who aren't signed in may read (term dates, courses and lists)
create or replace function public_config(k text) returns boolean language sql immutable as $$
  select k in ('COURSES', 'TERM_DATES', 'ROLE_GROUPS', 'TERMS', 'PATHWAYS', 'TYPES', 'KIT_CATS', 'customWords')
$$;

-- Who may read a row
create or replace function can_read(k text, rid text, d jsonb, own uuid) returns boolean language sql stable security definer set search_path = public as $$
  select case
    when k = 'config' then public_config(rid) or is_member()
    when not is_member() then false
    when k = 'notification' then d ->> 'to' = auth.uid()::text
    when k = 'report' then has_perm('safety') or d ->> 'by' = auth.uid()::text
    when k = 'request' then d ->> 'sid' = auth.uid()::text or runs_project(d ->> 'pid') or has_perm('projects')
    when k = 'gigApp' then d ->> 'sid' = auth.uid()::text or posted('gig', d ->> 'gig')
    when k = 'scriptInterest' then d ->> 'sid' = auth.uid()::text or posted('script', d ->> 'scr')
    when k = 'releaseInterest' then d ->> 'sid' = auth.uid()::text or posted('release', d ->> 'rel')
    else true end
$$;

-- Who may change or delete a row
create or replace function can_write(k text, rid text, d jsonb, own uuid) returns boolean language sql stable security definer set search_path = public as $$
  select case
    when k = 'config' then config_perm(rid)
    when not is_member() then false
    when k = 'student' then rid = auth.uid()::text or has_perm('people') or has_perm('setup') or has_perm('safety')
    when k = 'project' then runs_project(rid) or has_perm('projects') or (own = auth.uid())
    when k in ('script', 'release', 'gig') then own = auth.uid() or d ->> 'by' = auth.uid()::text or has_perm('projects')
    when k = 'request' then d ->> 'sid' = auth.uid()::text or runs_project(d ->> 'pid') or has_perm('projects')
    when k = 'gigApp' then d ->> 'sid' = auth.uid()::text or posted('gig', d ->> 'gig')
    when k = 'scriptInterest' then d ->> 'sid' = auth.uid()::text or posted('script', d ->> 'scr')
    when k = 'releaseInterest' then d ->> 'sid' = auth.uid()::text or posted('release', d ->> 'rel')
    when k = 'notification' then d ->> 'to' = auth.uid()::text or own = auth.uid() or has_perm('people')
    when k = 'report' then has_perm('safety')
    when k = 'newsletter' then has_perm('news') or has_perm('send')
    when k = 'invite' then own = auth.uid() or d ->> 'by' = auth.uid()::text or rid = my_email() or has_perm('people')
    when k = 'transFix' then own = auth.uid() or has_perm('setup')
    else own = auth.uid() or is_admin() end
$$;

-- ---------- 4. Row level security ----------
alter table records enable row level security;
alter table emails enable row level security;
alter table app_meta enable row level security;

drop policy if exists "read" on records;
drop policy if exists "add" on records;
drop policy if exists "change" on records;
drop policy if exists "remove" on records;
create policy "read" on records for select using (can_read(kind, id, data, owner));
-- Members can add things. Reports and notifications can be added by any member; settings need the right permission.
create policy "add" on records for insert with check (
  case when kind = 'config' then config_perm(id)
       when kind = 'student' then is_member() and can_write(kind, id, data, owner)
       else is_member() end);
create policy "change" on records for update using (can_write(kind, id, data, owner)) with check (can_write(kind, id, data, owner));
create policy "remove" on records for delete using (can_write(kind, id, data, owner));

drop policy if exists "read emails" on emails;
drop policy if exists "own email" on emails;
drop policy if exists "fix email" on emails;
create policy "read emails" on emails for select using (id = auth.uid() or (share and is_member()) or has_perm('people'));
create policy "own email" on emails for insert with check (id = auth.uid() or has_perm('people'));
create policy "fix email" on emails for update using (id = auth.uid() or has_perm('people'));

-- ---------- 5. What visitors see without signing in ----------
-- This view deliberately runs with the database's own rights (Supabase may flag it as
-- "security definer"): it shows live projects only, with no emails, producer details, crew hub links or role briefs.
create or replace view public_projects as
  select kind, id,
    jsonb_set(data - 'email' - 'producer' - 'producers' - 'hub' - 'crew', '{roles}',
      coalesce((select jsonb_agg(r - 'brief' order by i) from jsonb_array_elements(case when jsonb_typeof(data -> 'roles') = 'array' then data -> 'roles' else '[]'::jsonb end) with ordinality t(r, i)), '[]'::jsonb)) as data
  from records
  where kind = 'project' and not coalesce((data ->> 'archived')::boolean, false);
grant select on public_projects to anon, authenticated;
grant select, insert, update, delete on records, emails to authenticated;
grant select on records to anon;

-- ---------- 6. Helpers the app calls ----------
-- Can this email join? Used before sending a sign-in code, so nobody gets a code they can't use.
create or replace function can_join(e text) returns boolean language sql stable security definer set search_path = public as $$
  select join_ok(e)
$$;
grant execute on function can_join(text) to anon, authenticated;

-- The first owner becomes owner the first time they sign in, and nobody else can.
create or replace function claim_owner() returns boolean language plpgsql security definer set search_path = public as $$
declare uid text := auth.uid()::text;
begin
  if uid is null or exists (select 1 from records where kind = 'config' and id = 'owner') then return false; end if;
  if my_email() <> lower((select first_owner_email from app_meta where id = 1)) then return false; end if;
  insert into records (kind, id, data, owner) values
    ('config', 'owner', jsonb_build_object('v', uid), auth.uid()),
    ('config', 'admins', jsonb_build_object('v', jsonb_build_array(uid)), auth.uid()),
    ('config', 'adminPerms', jsonb_build_object('v', jsonb_build_object(uid, '["people","projects","setup","email","safety","news","send"]'::jsonb)), auth.uid())
  on conflict do nothing;
  return true;
end $$;
grant execute on function claim_owner() to authenticated;

-- ---------- 7. Tidying up ----------
-- When someone deletes their sign-in account, their profile goes too.
create or replace function forget_user() returns trigger language plpgsql security definer set search_path = public as $$
begin delete from records where kind = 'student' and id = old.id::text; return old; end $$;
drop trigger if exists on_user_deleted on auth.users;
create trigger on_user_deleted after delete on auth.users for each row execute function forget_user();

-- Pilot mode was removed: clear anything an earlier version left behind.
delete from records where kind = 'tester' or (kind = 'config' and id = 'access');

-- ---------- 8. Stepping down and handing over ----------
-- Anyone put down for a role (or as a shadow) can take themselves off, even though they can't edit the project.
-- rid is the role's id, or "__shadow:<role>" for a shadow place.
create or replace function leave_project(pid text, rid text) returns boolean language plpgsql security definer set search_path = public as $$
declare me text := auth.uid()::text; d jsonb;
begin
  if me is null then return false; end if;
  select data into d from records where kind = 'project' and id = pid for update;
  if d is null then return false; end if;
  if left(rid, 9) = '__shadow:' then
    d := jsonb_set(d, '{shadows}', coalesce((select jsonb_agg(x order by i) from jsonb_array_elements(case when jsonb_typeof(d -> 'shadows') = 'array' then d -> 'shadows' else '[]'::jsonb end) with ordinality t(x, i)
      where not (x ->> 'sid' = me and x ->> 'role' = substr(rid, 10))), '[]'::jsonb));
  else
    if not exists (select 1 from jsonb_array_elements(case when jsonb_typeof(d -> 'roles') = 'array' then d -> 'roles' else '[]'::jsonb end) x where x ->> 'rid' = rid and x ->> 'filledBy' = me) then return false; end if;
    d := jsonb_set(d, '{roles}', (select jsonb_agg(case when x ->> 'rid' = rid and x ->> 'filledBy' = me then jsonb_set(x, '{filledBy}', 'null'::jsonb) else x end order by i)
      from jsonb_array_elements(d -> 'roles') with ordinality t(x, i)));
  end if;
  update records set data = d where kind = 'project' and id = pid;
  return true;
end $$;

-- Hand a project to another member, so it stays theirs after the old producer or director leaves it.
create or replace function hand_over_project(pid text, to_id uuid) returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not (runs_project(pid) or has_perm('projects')) then raise exception 'Only the people running this project can hand it over'; end if;
  if not exists (select 1 from auth.users where id = to_id) then raise exception 'That person has not signed in to Crew Call yet'; end if;
  update records set owner = to_id where kind = 'project' and id = pid;
  return found;
end $$;

-- ---------- 9. Calendar links and the email server ----------
-- Each person's private calendar link (read by the crewcall Edge Function). Nobody can read this table directly.
create table if not exists cal_tokens (
  uid uuid primary key references auth.users (id) on delete cascade,
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  made timestamptz not null default now()
);
alter table cal_tokens enable row level security;

create or replace function my_cal_token() returns text language plpgsql security definer set search_path = public as $$
declare t text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  insert into cal_tokens (uid) values (auth.uid()) on conflict (uid) do nothing;
  select token into t from cal_tokens where uid = auth.uid();
  return t;
end $$;

create or replace function reset_cal_token() returns text language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  delete from cal_tokens where uid = auth.uid();
  return my_cal_token();
end $$;

-- What the email server has already sent, so nothing goes twice. Only the server reads it.
create table if not exists email_log (
  key text primary key,
  at timestamptz not null default now()
);
alter table email_log enable row level security;

revoke execute on function leave_project(text, text), hand_over_project(text, uuid), my_cal_token(), reset_cal_token() from public, anon;
grant execute on function leave_project(text, text), hand_over_project(text, uuid), my_cal_token(), reset_cal_token() to authenticated;
