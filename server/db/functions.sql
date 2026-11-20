-- iikoto Supabase DB 함수와 트리거 — 2026-11-16 배포 상태 그대로.
-- fire_morning_briefing의 예약 실행 주소(trigger id)는 공개 저장소라 가림. 토큰 자체는 vault('briefing_fire_token')에만 있음.

CREATE OR REPLACE FUNCTION public.briefing_due(at timestamp with time zone DEFAULT now())
 RETURNS TABLE(due boolean, reason text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  kst timestamp := at at time zone 'Asia/Seoul';
  d date := kst::date;
  m int := extract(hour from kst)::int * 60 + extract(minute from kst)::int;
  slot int;
  slot_end timestamptz;
  win_start timestamptz;
  seen timestamptz;
begin
  -- 실행 격자: 08:04, 09:04, 10:04 (1시간 간격). 10:04가 마지막(기상 기록 없으면 폴백)
  if m < 484 then
    return query select false, 'before_window'::text; return;
  end if;
  slot := least(484 + ((m - 484) / 60) * 60, 604);
  if m - slot > 20 then
    return query select false, 'off_slot'::text; return;
  end if;
  slot_end := (d + make_interval(mins => slot)) at time zone 'Asia/Seoul';
  win_start := case when slot = 484
                    then (d + time '04:00') at time zone 'Asia/Seoul'
                    else slot_end - interval '60 minutes' end;
  select w.seen_at into seen from public.briefing_wake_log w where w.date_key = to_char(d, 'YYYY-MM-DD');
  if seen is not null and seen > win_start and seen <= slot_end then
    return query select true, 'wake'::text;
  elsif slot = 604 and (seen is null or seen > slot_end) then
    return query select true, 'fallback'::text;
  else
    return query select false, 'not_due'::text;
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.fire_morning_briefing()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'vault'
AS $function$
declare
  kst timestamp := now() at time zone 'Asia/Seoul';
  today text := to_char(kst, 'YYYY-MM-DD');
  t time := kst::time;
  has_wake boolean;
  tok text;
  why text;
begin
  -- 08:30~12:00 사이에만 동작
  if t < time '08:30' or t >= time '12:00' then return; end if;

  select exists(
    select 1 from public.sleep
    where date_key = today and coalesce(wake_time, '') <> ''
  ) into has_wake;

  -- 기상 등록이 없으면 10:30까지 기다렸다가 폴백
  if not has_wake and t < time '10:30' then return; end if;

  -- 오늘 이미 호출했으면 종료
  if exists(select 1 from public.briefing_fire_log where date_key = today) then return; end if;

  -- 토큰이 아직 없으면 아무것도 하지 않음(기록도 남기지 않음)
  select decrypted_secret into tok from vault.decrypted_secrets where name = 'briefing_fire_token';
  if tok is null then return; end if;

  why := case when has_wake then 'wake' else 'fallback' end;
  insert into public.briefing_fire_log(date_key, reason) values (today, why) on conflict do nothing;
  if not found then return; end if;

  perform net.http_post(
    url := 'https://api.anthropic.com/v1/claude_code/routines/<ROUTINE_TRIGGER_ID>/fire',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || tok,
      'anthropic-version', '2026-10-21',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'text',
      case when has_wake
        then '기상 시각이 등록되어 시작된 실행이에요. 오늘 기상 기록을 반영해 수면 리뷰까지 작성해요.'
        else '10:30까지 기상 기록이 없어 시작된 실행이에요. 기상 기록 전 기준으로 작성해요.'
      end
    )
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.note_wake_registered()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  kst timestamp := now() at time zone 'Asia/Seoul';
  today text := to_char(kst, 'YYYY-MM-DD');
begin
  if kst::time < time '04:00' or kst::time >= time '12:00' then return; end if;
  insert into public.briefing_wake_log(date_key)
  select today
  where exists (
    select 1 from public.sleep
    where date_key = today and coalesce(wake_time, '') <> ''
  )
  on conflict do nothing;
end;
$function$;

CREATE OR REPLACE FUNCTION public.search_records(p_q text, p_kinds text[] DEFAULT NULL::text[], p_from text DEFAULT NULL::text, p_to text DEFAULT NULL::text, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
 RETURNS TABLE(src text, sub text, date_key text, txt text, memo_time text, event_time text, event_end_date text, done boolean, cid text, grp_total bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  with q as (select lower(trim(coalesce(p_q, ''))) as s),
  m as (
    select 'memo'::text as src, 'memo'::text as sub, mm.date_key, mm.text as txt,
           mm.memo_time, null::text as event_time, null::text as event_end_date,
           null::boolean as done, mm.client_id as cid, coalesce(mm.created, 0) as created
    from memos mm, q
    where length(q.s) >= 2 and position(q.s in lower(coalesce(mm.text, ''))) > 0
  ),
  t as (
    select 'todo'::text as src,
           case when tt.date_key = 'reserve' then 'reserve'
                when coalesce(tt.is_event, false) then 'event'
                when tt.text ~ '^\s*\d{1,2}:\d{2}\s' then 'timetable'
                else 'todo' end as sub,
           tt.date_key, tt.text as txt,
           null::text as memo_time, tt.event_time, tt.event_end_date,
           tt.done, tt.client_id as cid, coalesce(tt.created, 0) as created
    from todos tt, q
    where length(q.s) >= 2 and position(q.s in lower(coalesce(tt.text, ''))) > 0
  ),
  u as (select * from m union all select * from t),
  f as (
    select * from u
    where (p_kinds is null or sub = any(p_kinds))
      and (p_from is null or (date_key ~ '^\d{4}-\d{2}-\d{2}$' and date_key >= p_from))
      and (p_to is null or (date_key ~ '^\d{4}-\d{2}-\d{2}$' and date_key <= p_to))
  ),
  r as (
    select f.*,
           count(*) over (partition by src) as grp_total,
           row_number() over (partition by src order by (date_key = 'reserve'), date_key desc, created desc) as rn
    from f
  )
  select src, sub, date_key, txt, memo_time, event_time, event_end_date, done, cid, grp_total
  from r
  where rn > greatest(coalesce(p_offset, 0), 0)
    and rn <= greatest(coalesce(p_offset, 0), 0) + greatest(coalesce(p_limit, 10), 1)
  order by src, rn;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trip_items_touch()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at := now();
  return new;
end $function$;

-- 예약 작업 전용 비밀값 대조(2026-11-18, 감사 P1-12) — service_role만 실행 가능. 서버 함수가 x-cron-secret 헤더 값을 넘겨 확인.
create or replace function public.check_cron_secret(s text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(s,'') <> '' and exists(select 1 from vault.decrypted_secrets where name='cron_secret' and decrypted_secret = s);
$$;
revoke all on function public.check_cron_secret(text) from public, anon, authenticated;
grant execute on function public.check_cron_secret(text) to service_role;

-- 앱 키 대조(2026-11-20, 감사 P0-1 3단계) — service_role만 실행. compare-calendars가 x-client-info 마지막 '|' 조각을 넘겨 확인.
create or replace function public.check_app_key(k text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(k,'') <> '' and exists(select 1 from vault.decrypted_secrets where name='app_key_hash'
         and decrypted_secret = encode(extensions.digest(k, 'sha256'), 'hex'));
$$;
revoke all on function public.check_app_key(text) from public, anon, authenticated;
grant execute on function public.check_app_key(text) to service_role;

-- 요청 헤더에 유효한 앱 키가 있는지(최종 잠금용, 아직 미사용). 실행 권한은 public·anon·authenticated에서 회수.
create or replace function public.request_has_app_key()
returns boolean language plpgsql stable security definer set search_path = '' as $function$
declare
  ci text := coalesce((current_setting('request.headers', true))::json ->> 'x-client-info', '');
  k text;
begin
  if position('|' in ci) = 0 then return false; end if;
  k := regexp_replace(ci, '^.*\|', '');
  if k = '' then return false; end if;
  return exists(select 1 from vault.decrypted_secrets where name = 'app_key_hash'
                and decrypted_secret = encode(extensions.digest(k, 'sha256'), 'hex'));
end $function$;
revoke all on function public.request_has_app_key() from public, anon, authenticated;

-- ── 트리거 ──
CREATE TRIGGER trg_contents_updated_at BEFORE INSERT OR UPDATE ON public.contents FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trip_items_touch_trg BEFORE UPDATE ON public.trip_items FOR EACH ROW EXECUTE FUNCTION trip_items_touch();
