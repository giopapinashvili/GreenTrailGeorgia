-- 006 — sign-up without a confirmation email, and Google sign-in.
--
-- * Email + password accounts are created by the `register` Edge Function, already confirmed,
--   with the name and username typed into the form.
-- * Google accounts get a temporary username; `profiles.onboarded = false` sends them once to
--   /welcome, where they pick their name and username (`complete_profile`).

-- ───────────────────────── profiles.onboarded ─────────────────────────
alter table public.profiles add column if not exists onboarded boolean not null default false;
update public.profiles set onboarded = true where not onboarded;

-- end users may not change their own role or ban; admins, the server key and direct SQL may
create or replace function public.protect_profile_columns() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') and not public.is_admin() then
    new.role := old.role;
    new.is_banned := old.is_banned;
  end if;
  new.id := old.id;
  return new;
end; $$;

-- a profile for every new account; Google sends full_name / avatar_url instead of our fields
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  base text;
  candidate text;
  n int := 0;
  dname text;
  avatar text;
begin
  base := regexp_replace(lower(coalesce(meta->>'username', '')), '[^a-z0-9_]', '', 'g');
  if char_length(base) < 3 then
    base := 'user' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;
  base := substr(base, 1, 20);
  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    n := n + 1;
    candidate := base || n::text;
  end loop;
  dname := nullif(trim(coalesce(meta->>'display_name', meta->>'full_name', meta->>'name', '')), '');
  dname := substr(coalesce(dname, candidate), 1, 60);
  avatar := nullif(coalesce(meta->>'avatar_url', meta->>'picture', ''), '');
  if avatar is not null and (avatar !~ '^https://' or char_length(avatar) > 500) then
    avatar := null;
  end if;
  insert into public.profiles (id, username, display_name, avatar_url, onboarded)
  values (new.id, candidate, dname, avatar, (meta ? 'username' and meta ? 'display_name'));
  return new;
end; $$;

-- ───────────────────────── one-time name + username (Google sign-ups) ─────────────────────────
create or replace function public.complete_profile(p_username text, p_display_name text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  u text := lower(trim(coalesce(p_username, '')));
  d text := regexp_replace(trim(coalesce(p_display_name, '')), '\s+', ' ', 'g');
begin
  if uid is null then return 'login'; end if;
  if u !~ '^[a-z0-9_]{3,20}$' then return 'bad_username'; end if;
  if u in ('admin', 'administrator', 'moderator', 'greentrail', 'support', 'system', 'root', 'help', 'info') then
    return 'reserved';
  end if;
  if char_length(d) < 2 or char_length(d) > 60 then return 'bad_name'; end if;
  if exists (select 1 from public.profiles where username = u and id <> uid) then return 'taken'; end if;
  update public.profiles set username = u, display_name = d, onboarded = true where id = uid;
  if not found then return 'no_profile'; end if;
  return 'ok';
exception when unique_violation then
  return 'taken';
end; $$;
revoke execute on function public.complete_profile(text, text) from public, anon;
grant execute on function public.complete_profile(text, text) to authenticated;

-- ───────────────────────── used only by the `register` Edge Function ─────────────────────────
-- sign-ups per address, for a simple rate limit
create table if not exists public.signup_attempts (
  id bigint generated always as identity primary key,
  ip text not null,
  created_at timestamptz not null default now()
);
create index if not exists signup_attempts_ip_created on public.signup_attempts (ip, created_at desc);
create index if not exists signup_attempts_created on public.signup_attempts (created_at);
alter table public.signup_attempts enable row level security;
revoke all on public.signup_attempts from anon, authenticated;

-- an account the old email flow left unconfirmed (never signed in, ordinary user) — the new
-- sign-up with the same email takes it over instead of failing with "already registered"
create or replace function public.pending_signup_user(p_email text) returns uuid
language sql stable security definer set search_path = '' as $$
  select u.id
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(u.email) = lower(trim(p_email))
    and u.email_confirmed_at is null
    and u.last_sign_in_at is null
    and p.role = 'user'
  limit 1;
$$;
revoke execute on function public.pending_signup_user(text) from public, anon, authenticated;
grant execute on function public.pending_signup_user(text) to service_role;
