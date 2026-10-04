-- lighter line for the overview map (computed by the admin route editor)
alter table public.routes add column if not exists geometry_lite jsonb;

-- helper functions used only by signed-in policies
revoke execute on function public.is_active_user() from public, anon;
revoke execute on function public.is_member(uuid) from public, anon;
revoke execute on function public.is_blocked_in(uuid) from public, anon;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.is_blocked_in(uuid) to authenticated;

-- stops: one row per position within a route (lets seeds/upserts be re-run safely)
alter table public.route_stops add constraint route_stops_route_position_key unique (route_id, position);
