# GreenTrail Georgia — code conventions

Read this before adding or changing pages. The site is **Georgian only**, works in **light and dark** mode, and must not look like a generic AI template (no neon, no glow, no gradients-on-everything, no emojis, no fake numbers, no invented reviews/testimonials/partners).

## Stack
- Vite 6 + React 18 + TypeScript (strict, `noUnusedLocals`), Tailwind 3, React Router 6, TanStack Query 5, lucide-react icons.
- Supabase (`src/lib/supabase.ts` → `supabase`, `errorText(err)` turns errors into Georgian text, `publicUrl(bucket, path)`).
- Map: MapLibre (`src/components/map/MapView.tsx`, lazy wrapper `LazyMap`). Always use `LazyMap` in pages.
- Check your work with `npx tsc --noEmit -p .` from the project root (no ESLint).

## Design tokens (Tailwind colours map to CSS variables that switch in dark mode)
`bg, surface, surface-2, surface-3, ink, ink-2, ink-3, line, line-2, forest, forest-2, on-forest, moss, blaze, sky, sand, easy, moderate, hard, expert`.
Never hard-code hex colours in pages (the map is the only exception). Use `text-ink-2` for secondary text, `text-ink-3` for meta text, `border-line`, `bg-surface` cards on a `bg-bg` page.

Component classes in `src/index.css`:
- Layout: `.page` (centered max-width container with side padding).
- Text: `.kicker` (small uppercase label), `.blaze` (small red trail-marker dash used before kickers), `.link`, `.prose-gt` (long text).
- Surfaces: `.card` (rounded bordered surface), `.topo-texture` (subtle contour background).
- Buttons: `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, add `.btn-sm` for small.
- Forms: `.input` (also for `<select>` and `<textarea>`), `.label`.
- Chips/filters: `.chip`, `.chip-on`.
- Fonts: headings use the serif (`font-serif`, h1–h3 already serif); body is sans.

Radius: `rounded-lg`/`rounded-xl`; shadows: `shadow-card`, `shadow-pop`.

## Shared components (reuse, do not duplicate)
- `components/ui`: `Modal` (`open,onClose,title,footer,size`), `Confirm`, `Avatar` (`url,name,size`), `Spinner`/`PageSpinner`, `Empty` (`title,text,action,icon,compact`), `Skeleton`/`CardSkeleton`, `Stars` (`value,onChange?`), `Tabs` (`tabs,value,onChange`), `Field` (`label,hint,error`), `useToast()` → `toast(text, 'ok'|'error')`.
- `components/common`: `PageHeader` (`kicker,title,text,actions`), `SectionTitle`, `RequireAuth` (`admin?`), `ReportButton` (`type,id`).
- `components/route`: `RouteCard`, `DifficultyBadge`/`DiffShape`, `TopoCover` (generated cover when no photo), `SeasonBar`, `ElevationProfile`, `StopsTimeline` (+`STOP_KIND_LABEL`), `GearChecklist`, `RoutePicker` (searchable route select).
- `components/post/PostCard`.
- `lib/queries.ts`: query hooks (`useRoutes`, `useRoute(slug)`, `useRegions`, `useRouteStats`, `usePosts(filters)`, `usePost`, `useComments`, `useTours`, `useTour`, `useGuides`, `useGuideProfile`, `useArticles`, `useArticle`, `useProfileByUsername`, `useProfileStats`, `useCompletions`, `useSaved`, `useSiteCounts`, `invalidateRoutes`). Embeds use explicit FK names, e.g. `profiles!posts_author_id_fkey(...)`.
- `lib/format.ts`: `formatDate, formatDateShort, timeAgo, clockTime, num, km, meters, daysLabel, durationLabel, seasonLabel, monthName, monthShort, excerpt`.
- `lib/difficulty.ts`: `DIFFICULTIES, DIFF_LABEL, DIFF_HINT, DIFF_LEVEL, difficultyFactors, effortScore`.
- `lib/geo.ts`: `haversineKm, lineLengthKm, bbox, simplify, elevationStats, nearestIndex, kmAlong, parseGpx, toGpx, downloadText`.
- `lib/brouter.ts`: `routeThrough(waypoints)` → real trail line `[lng,lat,ele][]` from OpenStreetMap paths.
- `lib/commons.ts`: `commonsNear(lat,lng)` → free-licensed photos near a point (with author/licence credit).
- `lib/storage.ts`: `uploadPhoto(bucket, folder, file)`, `removeFiles`, `uploadChatImage`, `signedChatImage`.
- `lib/auth.tsx`: `useAuth()` → `{ user, profile, loading, isAdmin, isGuide, refreshProfile, signOut }`.
- `components/account`: `AuthShell` (+ `AuthField`, `PasswordInput`, `AgreeRules`, `OrDivider`, `AuthNotice`), `GoogleButton` (+ `useGoogleEnabled` — hidden until Google is on in Supabase), `UsernameField`, `username.ts` (rules, suggestions, live availability). Email sign-up goes through the `register` Edge Function (account created already confirmed, no email). Google first-timers pick a name once on `/welcome` (`profiles.onboarded`, RPC `complete_profile`); the redirect lives in `Layout`.
- `lib/md.tsx`: `<Markdown text>` (safe, small subset) and `<PlainText text>` (linkified plain text). Never use `dangerouslySetInnerHTML` with user content.

## Data rules (enforced by row-level security — the UI should match them)
- Everyone can read published routes, stops, posts, comments, tips, approved guides, active tours, published articles, profiles.
- Signed-in, non-banned users can: write posts (route is **required**), add photos to their posts, comment, like, add tips and vote on tips, save routes, mark routes as walked, message other users, report content, apply as a guide.
- Approved guides (`profile.role` becomes `guide`) can create/edit their own tours.
- Admins (`profile.role = 'admin'`) can edit everything, hide content (`is_hidden`), approve guides, change roles/ban (`profiles.role`, `profiles.is_banned`).
- Storage: `avatars/<uid>/…` and `post-photos/<uid>/…` (public); `message-images/<conversation_id>/…` (private, signed URLs); `covers/…` admin only, guides may write `covers/tours/<uid>/…`.
- RPCs: `get_or_create_dm(other)`, `mark_conversation_read(conv)`, `my_conversations()`, `unread_total()`, `route_stats(rid?)`, `route_monthly(rid)`, `profile_stats(uid)`, `bump_route_view(rid)`, `site_counts()`, `admin_overview()`, `set_ai_settings(p_provider,p_model,p_key)`, `clear_ai_key()`, `get_ai_settings()`.
- Schema lives in `supabase/migrations/*.sql` — read it when unsure about a column.

## Copy (Georgian)
- Informal singular "შენ" voice, short plain sentences, practical. No marketing hype, no "AI magic", no exclamation marks in UI chrome.
- Units: `კმ`, `მ`, `სთ`, `დღე`. Dates via `formatDate`.
- Every empty state explains what to do next (use `Empty`).
- Errors: `toast(errorText(error), 'error')`.

## Page patterns
- Page wrapper: `<div className="page pb-16">` with a `PageHeader` for listing pages.
- Loading: skeletons for lists, `PageSpinner` for full pages. Not found: `Empty` with a link back.
- Mobile first: everything must work at 360px width; use `sm:`/`md:`/`lg:` for larger screens. There is a bottom tab bar on mobile (`pb-16` on the layout).
- Set the document title: `useEffect(() => { document.title = 'სათაური — GreenTrail Georgia' }, [])` (or via `usePageTitle` in `lib/title.ts`).
