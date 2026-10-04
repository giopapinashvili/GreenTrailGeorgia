-- GreenTrail Georgia — functions, storage, realtime

create or replace function public.try_uuid(t text) returns uuid
language plpgsql immutable set search_path = '' as $$
begin
  return t::uuid;
exception when others then
  return null;
end; $$;

-- ───────────────────────── messaging ─────────────────────────
create or replace function public.get_or_create_dm(other uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  conv uuid;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  if other is null or other = me then raise exception 'invalid_user'; end if;
  if not exists (select 1 from public.profiles where id = other) then raise exception 'user_not_found'; end if;
  if not public.is_active_user() then raise exception 'account_restricted'; end if;
  if exists (select 1 from public.blocks
             where (blocker_id = me and blocked_id = other) or (blocker_id = other and blocked_id = me)) then
    raise exception 'blocked';
  end if;

  select a.conversation_id into conv
  from public.conversation_members a
  join public.conversation_members b on b.conversation_id = a.conversation_id and b.user_id = other
  where a.user_id = me
    and (select count(*) from public.conversation_members x where x.conversation_id = a.conversation_id) = 2
  limit 1;

  if conv is null then
    insert into public.conversations default values returning id into conv;
    insert into public.conversation_members (conversation_id, user_id) values (conv, me), (conv, other);
  end if;
  return conv;
end; $$;

create or replace function public.mark_conversation_read(conv uuid) returns void
language sql security definer set search_path = '' as $$
  update public.conversation_members set last_read_at = now()
  where conversation_id = conv and user_id = (select auth.uid());
$$;

create or replace function public.my_conversations()
returns table (
  conversation_id uuid,
  other_id uuid,
  other_username text,
  other_display_name text,
  other_avatar_url text,
  last_message_at timestamptz,
  last_message_preview text,
  unread_count bigint
)
language sql stable security definer set search_path = '' as $$
  select c.id, p.id, p.username, p.display_name, p.avatar_url,
         c.last_message_at, c.last_message_preview,
         (select count(*) from public.messages m
           where m.conversation_id = c.id
             and m.sender_id <> me.user_id
             and m.created_at > me.last_read_at)
  from public.conversation_members me
  join public.conversations c on c.id = me.conversation_id
  join public.conversation_members other on other.conversation_id = c.id and other.user_id <> me.user_id
  join public.profiles p on p.id = other.user_id
  where me.user_id = (select auth.uid())
    and c.last_message_preview is not null
  order by c.last_message_at desc;
$$;

create or replace function public.unread_total() returns bigint
language sql stable security definer set search_path = '' as $$
  select count(*)
  from public.conversation_members me
  join public.messages m on m.conversation_id = me.conversation_id
  where me.user_id = (select auth.uid())
    and m.sender_id <> me.user_id
    and m.created_at > me.last_read_at;
$$;

-- ───────────────────────── statistics ─────────────────────────
create or replace function public.route_stats(rid bigint default null)
returns table (
  route_id bigint,
  posts_count bigint,
  photos_count bigint,
  hikers_count bigint,
  avg_rating numeric,
  ratings_count bigint,
  saves_count bigint,
  tips_count bigint,
  views bigint
)
language sql stable security definer set search_path = '' as $$
  select r.id,
    (select count(*) from public.posts p where p.route_id = r.id and not p.is_hidden),
    (select count(*) from public.post_photos ph join public.posts p on p.id = ph.post_id
      where ph.route_id = r.id and not p.is_hidden),
    (select count(*) from public.route_completions c where c.route_id = r.id),
    (select round(avg(p.rating)::numeric, 1) from public.posts p
      where p.route_id = r.id and p.rating is not null and not p.is_hidden),
    (select count(*) from public.posts p
      where p.route_id = r.id and p.rating is not null and not p.is_hidden),
    (select count(*) from public.saved_routes s where s.route_id = r.id),
    (select count(*) from public.route_tips t where t.route_id = r.id and not t.is_hidden),
    coalesce((select v.views from public.route_view_counts v where v.route_id = r.id), 0)
  from public.routes r
  where r.status = 'published' and (rid is null or r.id = rid);
$$;

create or replace function public.route_monthly(rid bigint)
returns table (month int, hikes bigint)
language sql stable security definer set search_path = '' as $$
  select m.month, coalesce(x.cnt, 0)
  from generate_series(1, 12) as m(month)
  left join (
    select extract(month from c.completed_on)::int as month, count(*) as cnt
    from public.route_completions c
    where c.route_id = rid and c.completed_on is not null
    group by 1
  ) x on x.month = m.month
  order by m.month;
$$;

create or replace function public.profile_stats(uid uuid) returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'posts', (select count(*) from public.posts where author_id = uid and not is_hidden),
    'photos', (select count(*) from public.post_photos ph join public.posts p on p.id = ph.post_id
                where ph.author_id = uid and not p.is_hidden),
    'completed', (select count(*) from public.route_completions where user_id = uid),
    'km', (select coalesce(sum(r.distance_km), 0) from public.route_completions c
            join public.routes r on r.id = c.route_id where c.user_id = uid),
    'likes', (select count(*) from public.post_likes l join public.posts p on p.id = l.post_id
               where p.author_id = uid),
    'tips', (select count(*) from public.route_tips where author_id = uid and not is_hidden)
  );
$$;

create or replace function public.bump_route_view(rid bigint) returns void
language sql security definer set search_path = '' as $$
  insert into public.route_view_counts (route_id, views)
  select r.id, 1 from public.routes r where r.id = rid and r.status = 'published'
  on conflict (route_id) do update set views = public.route_view_counts.views + 1;
$$;

create or replace function public.site_counts() returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'routes', (select count(*) from public.routes where status = 'published'),
    'regions', (select count(distinct region_id) from public.routes where status = 'published'),
    'hikers', (select count(*) from public.profiles),
    'posts', (select count(*) from public.posts where not is_hidden),
    'photos', (select count(*) from public.post_photos),
    'tours', (select count(*) from public.tours t where t.is_active and public.is_approved_guide(t.guide_id))
  );
$$;

create or replace function public.admin_overview() returns json
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return json_build_object(
    'users', (select count(*) from public.profiles),
    'users_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'routes', (select count(*) from public.routes where status = 'published'),
    'drafts', (select count(*) from public.routes where status = 'draft'),
    'posts', (select count(*) from public.posts),
    'posts_7d', (select count(*) from public.posts where created_at > now() - interval '7 days'),
    'photos', (select count(*) from public.post_photos),
    'messages', (select count(*) from public.messages),
    'tours', (select count(*) from public.tours where is_active),
    'guides_pending', (select count(*) from public.guide_profiles where status = 'pending'),
    'reports_open', (select count(*) from public.reports where status = 'open'),
    'routes_missing_line', (select count(*) from public.routes where geometry is null),
    'routes_missing_cover', (select count(*) from public.routes where cover_url is null),
    'top_routes', (select coalesce(json_agg(t), '[]'::json) from (
        select r.id, r.name, r.slug, count(p.id) as posts
        from public.routes r join public.posts p on p.route_id = r.id
        where p.created_at > now() - interval '30 days'
        group by r.id order by posts desc limit 8) t),
    'top_viewed', (select coalesce(json_agg(t), '[]'::json) from (
        select r.id, r.name, r.slug, v.views
        from public.route_view_counts v join public.routes r on r.id = v.route_id
        order by v.views desc limit 8) t),
    'activity', (select coalesce(json_agg(d order by d.day), '[]'::json) from (
        select gs::date as day,
          (select count(*) from public.posts p where p.created_at::date = gs::date) as posts,
          (select count(*) from public.profiles u where u.created_at::date = gs::date) as users
        from generate_series(current_date - 29, current_date, interval '1 day') gs) d)
  );
end; $$;

-- ───────────────────────── AI settings (admin only, key never readable) ─────────────────────────
create or replace function public.set_ai_settings(p_provider text, p_model text, p_key text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_provider not in ('anthropic', 'openai', 'gemini', 'none') then raise exception 'bad_provider'; end if;
  insert into public.app_secrets (key, value) values ('ai_provider', p_provider)
    on conflict (key) do update set value = excluded.value, updated_at = now();
  insert into public.app_secrets (key, value) values ('ai_model', coalesce(trim(p_model), ''))
    on conflict (key) do update set value = excluded.value, updated_at = now();
  if p_key is not null and length(trim(p_key)) > 0 then
    insert into public.app_secrets (key, value) values ('ai_key', trim(p_key))
      on conflict (key) do update set value = excluded.value, updated_at = now();
  end if;
end; $$;

create or replace function public.clear_ai_key() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.app_secrets set value = '', updated_at = now() where key = 'ai_key';
end; $$;

create or replace function public.get_ai_settings() returns json
language plpgsql stable security definer set search_path = '' as $$
declare k text;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select nullif(value, '') into k from public.app_secrets where key = 'ai_key';
  return json_build_object(
    'provider', (select value from public.app_secrets where key = 'ai_provider'),
    'model', (select value from public.app_secrets where key = 'ai_model'),
    'key_set', k is not null,
    'key_hint', case when k is null then null else '...' || right(k, 4) end
  );
end; $$;

-- ───────────────────────── privileges ─────────────────────────
revoke execute on function public.get_or_create_dm(uuid) from public, anon;
revoke execute on function public.mark_conversation_read(uuid) from public, anon;
revoke execute on function public.my_conversations() from public, anon;
revoke execute on function public.unread_total() from public, anon;
revoke execute on function public.admin_overview() from public, anon;
revoke execute on function public.set_ai_settings(text, text, text) from public, anon;
revoke execute on function public.clear_ai_key() from public, anon;
revoke execute on function public.get_ai_settings() from public, anon;
grant execute on function public.get_or_create_dm(uuid) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.my_conversations() to authenticated;
grant execute on function public.unread_total() to authenticated;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.set_ai_settings(text, text, text) to authenticated;
grant execute on function public.clear_ai_key() to authenticated;
grant execute on function public.get_ai_settings() to authenticated;

-- trigger-only functions should not be callable over the API
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_profile_columns() from public, anon, authenticated;
revoke execute on function public.post_photo_fill_route() from public, anon, authenticated;
revoke execute on function public.post_route_changed() from public, anon, authenticated;
revoke execute on function public.protect_hidden_flag() from public, anon, authenticated;
revoke execute on function public.post_marks_completion() from public, anon, authenticated;
revoke execute on function public.message_after_insert() from public, anon, authenticated;
revoke execute on function public.guide_status_guard() from public, anon, authenticated;
revoke execute on function public.guide_status_sync_role() from public, anon, authenticated;

-- ───────────────────────── realtime ─────────────────────────
alter publication supabase_realtime add table public.messages;

-- ───────────────────────── storage ─────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 3145728, array['image/jpeg','image/png','image/webp']),
  ('post-photos', 'post-photos', true, 6291456, array['image/jpeg','image/png','image/webp']),
  ('message-images', 'message-images', false, 6291456, array['image/jpeg','image/png','image/webp']),
  ('covers', 'covers', true, 6291456, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- avatars & post photos: each user writes only inside a folder named after their id
create policy "own folder read" on storage.objects for select to authenticated using (
  bucket_id in ('avatars', 'post-photos') and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy "own folder upload" on storage.objects for insert to authenticated with check (
  bucket_id in ('avatars', 'post-photos') and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy "own folder update" on storage.objects for update to authenticated using (
  bucket_id in ('avatars', 'post-photos') and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy "own folder remove" on storage.objects for delete to authenticated using (
  bucket_id in ('avatars', 'post-photos') and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- chat images: only members of the conversation (folder = conversation id)
create policy "chat images read" on storage.objects for select to authenticated using (
  bucket_id = 'message-images' and public.is_member(public.try_uuid((storage.foldername(name))[1]))
);
create policy "chat images upload" on storage.objects for insert to authenticated with check (
  bucket_id = 'message-images' and public.is_member(public.try_uuid((storage.foldername(name))[1]))
);

-- covers: admin anywhere; approved guides under tours/<their id>/
create policy "covers read" on storage.objects for select to authenticated using (
  bucket_id = 'covers' and (
    (select public.is_admin())
    or ((storage.foldername(name))[1] = 'tours' and (storage.foldername(name))[2] = (select auth.uid())::text)
  )
);
create policy "covers upload" on storage.objects for insert to authenticated with check (
  bucket_id = 'covers' and (
    (select public.is_admin())
    or ((storage.foldername(name))[1] = 'tours'
        and (storage.foldername(name))[2] = (select auth.uid())::text
        and public.is_approved_guide((select auth.uid())))
  )
);
create policy "covers remove" on storage.objects for delete to authenticated using (
  bucket_id = 'covers' and (
    (select public.is_admin())
    or ((storage.foldername(name))[1] = 'tours' and (storage.foldername(name))[2] = (select auth.uid())::text)
  )
);
