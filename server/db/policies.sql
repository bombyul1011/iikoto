-- iikoto Supabase 행 수준 보안(RLS) 정책 — 2026-11-16 배포 상태 그대로(감사 P0-1 전환 전).
-- 3단계 접근 통제를 되돌릴 때 이 파일이 "원래대로" 복구본이다.
-- 모든 표에 RLS가 켜져 있고, trip_items를 뺀 전부가 "누구나 허용"(true) 정책이다.

alter table public.ai_cache enable row level security;
alter table public.alerts enable row level security;
alter table public.briefing_fire_log enable row level security;
alter table public.briefing_wake_log enable row level security;
alter table public.calendar_diffs enable row level security;
alter table public.calendar_links enable row level security;
alter table public.calendar_sync_meta enable row level security;
alter table public.calendar_sync_rules enable row level security;
alter table public.content_daily_log enable row level security;
alter table public.contents enable row level security;
alter table public.goal_notes enable row level security;
alter table public.habit_checks enable row level security;
alter table public.habits enable row level security;
alter table public.meals enable row level security;
alter table public.meal_entries enable row level security;
alter table public.memos enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.reading_quotes enable row level security;
alter table public.recurring_exceptions enable row level security;
alter table public.recurring_items enable row level security;
alter table public.rhythm_blocks enable row level security;
alter table public.sleep enable row level security;
alter table public.todos enable row level security;
alter table public.trip_items enable row level security;
alter table public.user_settings enable row level security;

-- roles = public
create policy "public access" on public.ai_cache for all to public using (true) with check (true);
create policy "allow_all" on public.alerts for all to public using (true) with check (true);
create policy "allow_all" on public.calendar_diffs for all to public using (true) with check (true);
create policy "allow_all" on public.calendar_links for all to public using (true) with check (true);
create policy "allow_all" on public.calendar_sync_meta for all to public using (true) with check (true);
create policy "allow_all" on public.calendar_sync_rules for all to public using (true) with check (true);
create policy "Allow all access to reading_daily_log" on public.content_daily_log for all to public using (true) with check (true);
create policy "allow_all" on public.push_subscriptions for all to public using (true) with check (true);
create policy "allow_all" on public.recurring_exceptions for all to public using (true) with check (true);
create policy "allow_all" on public.recurring_items for all to public using (true) with check (true);
create policy "allow_all" on public.user_settings for all to public using (true) with check (true);

-- roles = anon, authenticated
create policy "allow_all" on public.contents for all to anon, authenticated using (true) with check (true);
create policy "allow_all" on public.goal_notes for all to anon, authenticated using (true) with check (true);
create policy "allow_all" on public.habit_checks for all to anon, authenticated using (true) with check (true);
create policy "allow_all" on public.habits for all to anon, authenticated using (true) with check (true);
create policy "allow_all" on public.meals for all to anon, authenticated using (true) with check (true);
create policy "allow_all" on public.meal_entries for all to anon, authenticated using (true) with check (true);
create policy "allow_all" on public.memos for all to anon, authenticated using (true) with check (true);
create policy "allow_all" on public.reading_quotes for all to anon, authenticated using (true) with check (true);
create policy "allow_all" on public.rhythm_blocks for all to anon, authenticated using (true) with check (true);
create policy "allow_all" on public.sleep for all to anon, authenticated using (true) with check (true);
create policy "allow_all" on public.todos for all to anon, authenticated using (true) with check (true);

-- briefing_fire_log, briefing_wake_log: 정책 없음(RLS만 켜져 있어 API로는 접근 불가, DB 함수만 씀)

-- trip_items: 이이타비 접근키 검사. 요청 헤더 x-triplog-key(또는 x-client-info의 '|' 뒤 값)의 md5가 아래 해시와 같아야 함.
-- 공개 저장소라 실제 해시 값은 가림 — 복원할 때는 '<IITABI_KEY_MD5>'를 실제 해시로 바꿀 것
-- (해시는 현재 서버의 pg_policies에서 조회하거나, 이이타비 접근키로 md5를 계산해 얻음).
create policy "trip_items_key_only" on public.trip_items for all to anon, authenticated
  using (md5(coalesce(((current_setting('request.headers', true))::json ->> 'x-triplog-key'), nullif(split_part(coalesce(((current_setting('request.headers', true))::json ->> 'x-client-info'), ''), '|', 2), ''), '')) = '<IITABI_KEY_MD5>')
  with check (md5(coalesce(((current_setting('request.headers', true))::json ->> 'x-triplog-key'), nullif(split_part(coalesce(((current_setting('request.headers', true))::json ->> 'x-client-info'), ''), '|', 2), ''), '')) = '<IITABI_KEY_MD5>');
