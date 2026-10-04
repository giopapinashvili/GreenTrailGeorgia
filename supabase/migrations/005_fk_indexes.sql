-- covering indexes for foreign keys (fast cascades when a user is removed, faster lookups)
create index if not exists comments_author_idx on public.comments(author_id);
create index if not exists messages_sender_idx on public.messages(sender_id);
create index if not exists post_likes_user_idx on public.post_likes(user_id);
create index if not exists reports_reporter_idx on public.reports(reporter_id);
create index if not exists route_tip_votes_user_idx on public.route_tip_votes(user_id);
create index if not exists route_tips_author_idx on public.route_tips(author_id);
create index if not exists saved_routes_route_idx on public.saved_routes(route_id);
create index if not exists blocks_blocked_idx on public.blocks(blocked_id);
create index if not exists articles_author_idx on public.articles(author_id);
create index if not exists routes_created_by_idx on public.routes(created_by);
