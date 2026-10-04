-- GreenTrail Georgia — row level security policies

alter table public.profiles            enable row level security;
alter table public.regions             enable row level security;
alter table public.routes              enable row level security;
alter table public.route_stops         enable row level security;
alter table public.route_tips          enable row level security;
alter table public.route_tip_votes     enable row level security;
alter table public.posts               enable row level security;
alter table public.post_photos         enable row level security;
alter table public.post_likes          enable row level security;
alter table public.comments            enable row level security;
alter table public.saved_routes        enable row level security;
alter table public.route_completions   enable row level security;
alter table public.conversations       enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages            enable row level security;
alter table public.blocks              enable row level security;
alter table public.reports             enable row level security;
alter table public.guide_profiles      enable row level security;
alter table public.tours               enable row level security;
alter table public.articles            enable row level security;
alter table public.app_secrets         enable row level security;
alter table public.ai_usage            enable row level security;
alter table public.route_view_counts   enable row level security;
-- app_secrets / ai_usage: no policies on purpose (server-only)

-- profiles
create policy "profiles are public" on public.profiles for select using (true);
create policy "update own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- regions
create policy "regions are public" on public.regions for select using (true);
create policy "admin manages regions" on public.regions for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- routes
create policy "published routes are public" on public.routes for select
  using (status = 'published' or (select public.is_admin()));
create policy "admin inserts routes" on public.routes for insert to authenticated
  with check ((select public.is_admin()));
create policy "admin updates routes" on public.routes for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin deletes routes" on public.routes for delete to authenticated
  using ((select public.is_admin()));

-- route stops
create policy "stops of visible routes" on public.route_stops for select using (
  exists (select 1 from public.routes r where r.id = route_id and (r.status = 'published' or (select public.is_admin())))
);
create policy "admin inserts stops" on public.route_stops for insert to authenticated
  with check ((select public.is_admin()));
create policy "admin updates stops" on public.route_stops for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin deletes stops" on public.route_stops for delete to authenticated
  using ((select public.is_admin()));

-- tips
create policy "visible tips" on public.route_tips for select
  using (not is_hidden or author_id = (select auth.uid()) or (select public.is_admin()));
create policy "members add tips" on public.route_tips for insert to authenticated
  with check (author_id = (select auth.uid()) and (select public.is_active_user()));
create policy "authors edit tips" on public.route_tips for update to authenticated
  using (author_id = (select auth.uid()) or (select public.is_admin()))
  with check (author_id = (select auth.uid()) or (select public.is_admin()));
create policy "authors delete tips" on public.route_tips for delete to authenticated
  using (author_id = (select auth.uid()) or (select public.is_admin()));

create policy "tip votes are public" on public.route_tip_votes for select using (true);
create policy "vote on tips" on public.route_tip_votes for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_active_user()));
create policy "remove own vote" on public.route_tip_votes for delete to authenticated
  using (user_id = (select auth.uid()));

-- posts
create policy "visible posts" on public.posts for select
  using (not is_hidden or author_id = (select auth.uid()) or (select public.is_admin()));
create policy "members write posts" on public.posts for insert to authenticated
  with check (
    author_id = (select auth.uid()) and (select public.is_active_user())
    and exists (select 1 from public.routes r where r.id = route_id and r.status = 'published')
  );
create policy "authors edit posts" on public.posts for update to authenticated
  using (author_id = (select auth.uid()) or (select public.is_admin()))
  with check (author_id = (select auth.uid()) or (select public.is_admin()));
create policy "authors delete posts" on public.posts for delete to authenticated
  using (author_id = (select auth.uid()) or (select public.is_admin()));

-- photos
create policy "photos of visible posts" on public.post_photos for select using (
  exists (select 1 from public.posts p where p.id = post_id
          and (not p.is_hidden or p.author_id = (select auth.uid()) or (select public.is_admin())))
);
create policy "authors add photos" on public.post_photos for insert to authenticated with check (
  author_id = (select auth.uid()) and (select public.is_active_user())
  and exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid()))
);
create policy "authors edit photos" on public.post_photos for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "authors delete photos" on public.post_photos for delete to authenticated
  using (author_id = (select auth.uid()) or (select public.is_admin()));

-- likes
create policy "likes are public" on public.post_likes for select using (true);
create policy "like posts" on public.post_likes for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_active_user()));
create policy "unlike posts" on public.post_likes for delete to authenticated
  using (user_id = (select auth.uid()));

-- comments
create policy "visible comments" on public.comments for select
  using (not is_hidden or author_id = (select auth.uid()) or (select public.is_admin()));
create policy "members comment" on public.comments for insert to authenticated with check (
  author_id = (select auth.uid()) and (select public.is_active_user())
  and exists (select 1 from public.posts p where p.id = post_id and not p.is_hidden)
);
create policy "authors edit comments" on public.comments for update to authenticated
  using (author_id = (select auth.uid()) or (select public.is_admin()))
  with check (author_id = (select auth.uid()) or (select public.is_admin()));
create policy "authors or post owners delete comments" on public.comments for delete to authenticated using (
  author_id = (select auth.uid()) or (select public.is_admin())
  or exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid()))
);

-- saved routes (private)
create policy "own saved routes" on public.saved_routes for select to authenticated
  using (user_id = (select auth.uid()));
create policy "save routes" on public.saved_routes for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "unsave routes" on public.saved_routes for delete to authenticated
  using (user_id = (select auth.uid()));

-- completions (public, like a hiking log)
create policy "completions are public" on public.route_completions for select using (true);
create policy "mark completion" on public.route_completions for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_active_user()));
create policy "edit own completion" on public.route_completions for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "remove own completion" on public.route_completions for delete to authenticated
  using (user_id = (select auth.uid()));

-- conversations & messages (members only)
create policy "members see conversation" on public.conversations for select to authenticated
  using (public.is_member(id));
create policy "members see members" on public.conversation_members for select to authenticated
  using (public.is_member(conversation_id));
create policy "update own read marker" on public.conversation_members for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "members read messages" on public.messages for select to authenticated
  using (public.is_member(conversation_id));
create policy "members send messages" on public.messages for insert to authenticated with check (
  sender_id = (select auth.uid()) and (select public.is_active_user())
  and public.is_member(conversation_id) and not public.is_blocked_in(conversation_id)
);
create policy "senders delete messages" on public.messages for delete to authenticated
  using (sender_id = (select auth.uid()));

-- blocks
create policy "own blocks" on public.blocks for select to authenticated
  using (blocker_id = (select auth.uid()));
create policy "block users" on public.blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()) and blocked_id <> (select auth.uid()));
create policy "unblock users" on public.blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));

-- reports
create policy "report content" on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and (select public.is_active_user()));
create policy "see own or all reports" on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select public.is_admin()));
create policy "admin handles reports" on public.reports for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin deletes reports" on public.reports for delete to authenticated
  using ((select public.is_admin()));

-- guide profiles
create policy "approved guides are public" on public.guide_profiles for select
  using (status = 'approved' or user_id = (select auth.uid()) or (select public.is_admin()));
create policy "apply as guide" on public.guide_profiles for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_active_user()));
create policy "edit own guide profile" on public.guide_profiles for update to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()))
  with check (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "delete own guide profile" on public.guide_profiles for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- tours
create policy "active tours are public" on public.tours for select using (
  (is_active and public.is_approved_guide(guide_id))
  or guide_id = (select auth.uid()) or (select public.is_admin())
);
create policy "guides create tours" on public.tours for insert to authenticated
  with check (guide_id = (select auth.uid()) and public.is_approved_guide((select auth.uid())));
create policy "guides edit tours" on public.tours for update to authenticated
  using (guide_id = (select auth.uid()) or (select public.is_admin()))
  with check (guide_id = (select auth.uid()) or (select public.is_admin()));
create policy "guides delete tours" on public.tours for delete to authenticated
  using (guide_id = (select auth.uid()) or (select public.is_admin()));

-- articles
create policy "published articles are public" on public.articles for select
  using (status = 'published' or (select public.is_admin()));
create policy "admin inserts articles" on public.articles for insert to authenticated
  with check ((select public.is_admin()));
create policy "admin updates articles" on public.articles for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin deletes articles" on public.articles for delete to authenticated
  using ((select public.is_admin()));

-- view counters (read-only for everyone; written by a function)
create policy "view counts are public" on public.route_view_counts for select using (true);
