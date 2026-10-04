-- GreenTrail Georgia — core schema
-- Every table has row level security. Helper functions are SECURITY DEFINER with empty search_path.

create extension if not exists pg_trgm with schema extensions;

-- ───────────────────────── helpers ─────────────────────────
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end; $$;

-- ───────────────────────── profiles ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  avatar_url text,
  bio text check (char_length(bio) <= 500),
  home_region text,
  role text not null default 'user' check (role in ('user','guide','admin')),
  is_banned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and not is_banned
  );
$$;

create or replace function public.is_active_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and not is_banned
  );
$$;

-- users may edit their own profile, but never their role / ban flag
create or replace function public.protect_profile_columns() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    new.role := old.role;
    new.is_banned := old.is_banned;
  end if;
  new.id := old.id;
  return new;
end; $$;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- create a profile row for every new account
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  base text;
  candidate text;
  n int := 0;
  dname text;
begin
  base := lower(coalesce(new.raw_user_meta_data->>'username', ''));
  base := regexp_replace(base, '[^a-z0-9_]', '', 'g');
  if char_length(base) < 3 then
    base := 'user' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;
  base := substr(base, 1, 20);
  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    n := n + 1;
    candidate := base || n::text;
  end loop;
  dname := substr(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), candidate), 1, 60);
  insert into public.profiles (id, username, display_name) values (new.id, candidate, dname);
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── regions ─────────────────────────
create table public.regions (
  id text primary key,
  name text not null,
  description text,
  sort smallint not null default 0,
  lat double precision,
  lng double precision
);

-- ───────────────────────── routes ─────────────────────────
create table public.routes (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  name text not null,
  name_en text,
  region_id text not null references public.regions(id),
  difficulty text not null check (difficulty in ('easy','moderate','hard','expert')),
  days_min smallint not null default 1 check (days_min >= 1),
  days_max smallint not null default 1,
  duration_hours numeric(4,1),
  distance_km numeric(6,1),
  elevation_gain_m integer,
  elevation_loss_m integer,
  max_altitude_m integer,
  min_altitude_m integer,
  route_type text not null default 'one_way' check (route_type in ('one_way','loop','out_and_back')),
  season_months smallint[] not null default '{6,7,8,9}',
  tags text[] not null default '{}',
  summary text not null,
  description text,
  difficulty_notes text,
  getting_there text,
  accommodation text,
  water text,
  permits text,
  dangers text,
  mobile_coverage text,
  gear jsonb not null default '[]'::jsonb,
  tips text[] not null default '{}',
  start_name text,
  start_lat double precision,
  start_lng double precision,
  end_name text,
  end_lat double precision,
  end_lng double precision,
  geometry jsonb,
  elevation_profile jsonb,
  geometry_source text,
  cover_url text,
  cover_credit text,
  cover_source_url text,
  featured boolean not null default false,
  status text not null default 'published' check (status in ('draft','published')),
  sources text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (days_max >= days_min)
);
create index routes_region_idx on public.routes(region_id);
create index routes_status_idx on public.routes(status);
create trigger routes_updated before update on public.routes
  for each row execute function public.set_updated_at();

create table public.route_view_counts (
  route_id bigint primary key references public.routes(id) on delete cascade,
  views bigint not null default 0
);

create table public.route_stops (
  id bigint generated always as identity primary key,
  route_id bigint not null references public.routes(id) on delete cascade,
  position smallint not null,
  day smallint,
  name text not null,
  kind text not null default 'other' check (kind in (
    'start','finish','village','guesthouse','hut','camp','pass','lake','peak',
    'viewpoint','water','waterfall','glacier','church','fortress','bridge','other')),
  lat double precision not null,
  lng double precision not null,
  altitude_m integer,
  overnight boolean not null default false,
  description text
);
create index route_stops_route_idx on public.route_stops(route_id, position);

-- tips from hikers
create table public.route_tips (
  id bigint generated always as identity primary key,
  route_id bigint not null references public.routes(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  category text not null default 'general' check (category in ('general','gear','safety','transport','water','stay','season')),
  body text not null check (char_length(body) between 5 and 1000),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index route_tips_route_idx on public.route_tips(route_id);

create table public.route_tip_votes (
  tip_id bigint not null references public.route_tips(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tip_id, user_id)
);

-- ───────────────────────── posts (blog) ─────────────────────────
create table public.posts (
  id bigint generated always as identity primary key,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  route_id bigint not null references public.routes(id) on delete restrict,
  title text not null check (char_length(title) between 3 and 140),
  body text not null check (char_length(body) between 1 and 20000),
  hiked_on date,
  rating smallint check (rating between 1 and 5),
  cover_url text,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_route_idx on public.posts(route_id, created_at desc);
create index posts_author_idx on public.posts(author_id, created_at desc);
create index posts_created_idx on public.posts(created_at desc);
create trigger posts_updated before update on public.posts
  for each row execute function public.set_updated_at();

create table public.post_photos (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  route_id bigint not null references public.routes(id) on delete cascade,
  storage_path text not null,
  url text not null,
  width integer,
  height integer,
  caption text check (char_length(caption) <= 300),
  position smallint not null default 0,
  created_at timestamptz not null default now()
);
create index post_photos_post_idx on public.post_photos(post_id, position);
create index post_photos_route_idx on public.post_photos(route_id, created_at desc);
create index post_photos_author_idx on public.post_photos(author_id, created_at desc);

create table public.post_likes (
  post_id bigint not null references public.posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index comments_post_idx on public.comments(post_id, created_at);

-- photo rows always carry the post's route (statistics depend on it)
create or replace function public.post_photo_fill_route() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select p.route_id into new.route_id from public.posts p where p.id = new.post_id;
  return new;
end; $$;
create trigger post_photos_route before insert on public.post_photos
  for each row execute function public.post_photo_fill_route();

create or replace function public.post_route_changed() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.route_id is distinct from old.route_id then
    update public.post_photos set route_id = new.route_id where post_id = new.id;
  end if;
  return new;
end; $$;
create trigger posts_route_changed after update on public.posts
  for each row execute function public.post_route_changed();

-- non-admins cannot un-hide moderated content
create or replace function public.protect_hidden_flag() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    new.is_hidden := old.is_hidden;
  end if;
  return new;
end; $$;
create trigger posts_protect before update on public.posts
  for each row execute function public.protect_hidden_flag();
create trigger comments_protect before update on public.comments
  for each row execute function public.protect_hidden_flag();
create trigger tips_protect before update on public.route_tips
  for each row execute function public.protect_hidden_flag();

-- ───────────────────────── saved / completed ─────────────────────────
create table public.saved_routes (
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  route_id bigint not null references public.routes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, route_id)
);

create table public.route_completions (
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  route_id bigint not null references public.routes(id) on delete cascade,
  completed_on date,
  created_at timestamptz not null default now(),
  primary key (user_id, route_id)
);
create index route_completions_route_idx on public.route_completions(route_id);

-- a post with a hike date counts as "I walked this route"
create or replace function public.post_marks_completion() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.hiked_on is not null then
    insert into public.route_completions (user_id, route_id, completed_on)
    values (new.author_id, new.route_id, new.hiked_on)
    on conflict (user_id, route_id) do update
      set completed_on = greatest(excluded.completed_on, public.route_completions.completed_on);
  end if;
  return new;
end; $$;
create trigger posts_completion after insert or update of hiked_on, route_id on public.posts
  for each row execute function public.post_marks_completion();

-- ───────────────────────── messaging ─────────────────────────
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  last_message_preview text
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index conversation_members_user_idx on public.conversation_members(user_id);

create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text check (char_length(body) <= 4000),
  image_path text,
  created_at timestamptz not null default now(),
  check (coalesce(char_length(body), 0) > 0 or image_path is not null),
  check (image_path is null or image_path like conversation_id::text || '/%')
);
create index messages_conv_idx on public.messages(conversation_id, created_at desc);

create table public.blocks (
  blocker_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create or replace function public.is_member(conv uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = conv and user_id = (select auth.uid())
  );
$$;

create or replace function public.is_blocked_in(conv uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.conversation_members m
    join public.blocks b
      on (b.blocker_id = m.user_id and b.blocked_id = (select auth.uid()))
      or (b.blocked_id = m.user_id and b.blocker_id = (select auth.uid()))
    where m.conversation_id = conv and m.user_id <> (select auth.uid())
  );
$$;

create or replace function public.message_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations
     set last_message_at = new.created_at,
         last_message_preview = case
           when coalesce(char_length(new.body), 0) > 0 then left(new.body, 120)
           else 'ფოტო' end
   where id = new.conversation_id;
  update public.conversation_members
     set last_read_at = new.created_at
   where conversation_id = new.conversation_id and user_id = new.sender_id;
  return new;
end; $$;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.message_after_insert();

-- ───────────────────────── reports ─────────────────────────
create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post','comment','message','user','tip','tour')),
  target_id text not null,
  reason text not null check (char_length(reason) between 3 and 1000),
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at timestamptz not null default now()
);

-- ───────────────────────── guides & tours ─────────────────────────
create table public.guide_profiles (
  user_id uuid primary key default auth.uid() references public.profiles(id) on delete cascade,
  kind text not null default 'individual' check (kind in ('individual','company')),
  company_name text,
  about text not null check (char_length(about) between 20 and 3000),
  regions text[] not null default '{}',
  languages text[] not null default '{ka}',
  experience_years smallint,
  certifications text,
  phone text,
  email text,
  website text,
  facebook text,
  instagram text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger guide_profiles_updated before update on public.guide_profiles
  for each row execute function public.set_updated_at();

create or replace function public.guide_status_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if not public.is_admin() then
      new.status := 'pending';
      new.admin_note := null;
    end if;
  else
    if not public.is_admin() then
      new.admin_note := old.admin_note;
      new.status := case when old.status = 'rejected' then 'pending' else old.status end;
    end if;
  end if;
  return new;
end; $$;
create trigger guide_profiles_guard before insert or update on public.guide_profiles
  for each row execute function public.guide_status_guard();

-- approving a guide gives the "guide" role; revoking takes it back
create or replace function public.guide_status_sync_role() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'approved' then
    update public.profiles set role = 'guide' where id = new.user_id and role = 'user';
  elsif tg_op = 'UPDATE' and old.status = 'approved' and new.status <> 'approved' then
    update public.profiles set role = 'user' where id = new.user_id and role = 'guide';
  end if;
  return new;
end; $$;
create trigger guide_profiles_role after insert or update of status on public.guide_profiles
  for each row execute function public.guide_status_sync_role();

create or replace function public.is_approved_guide(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.guide_profiles where user_id = uid and status = 'approved')
     and exists (select 1 from public.profiles where id = uid and not is_banned);
$$;

create table public.tours (
  id bigint generated always as identity primary key,
  guide_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  route_id bigint references public.routes(id) on delete set null,
  title text not null check (char_length(title) between 3 and 140),
  description text not null check (char_length(description) between 10 and 6000),
  days smallint not null check (days between 1 and 30),
  difficulty text not null check (difficulty in ('easy','moderate','hard','expert')),
  price_gel numeric(9,2),
  price_note text,
  group_min smallint,
  group_max smallint,
  includes text[] not null default '{}',
  excludes text[] not null default '{}',
  start_dates date[] not null default '{}',
  meeting_point text,
  cover_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tours_route_idx on public.tours(route_id);
create index tours_guide_idx on public.tours(guide_id);
create trigger tours_updated before update on public.tours
  for each row execute function public.set_updated_at();

-- ───────────────────────── articles (tips & info) ─────────────────────────
create table public.articles (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  title text not null,
  excerpt text not null,
  body text not null,
  category text not null default 'tips' check (category in ('safety','gear','planning','transport','nature','tips')),
  cover_url text,
  cover_credit text,
  sort smallint not null default 0,
  status text not null default 'published' check (status in ('draft','published')),
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger articles_updated before update on public.articles
  for each row execute function public.set_updated_at();

-- ───────────────────────── private: AI settings & usage ─────────────────────────
create table public.app_secrets (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table public.ai_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null default current_date,
  count integer not null default 0,
  primary key (user_id, day)
);
