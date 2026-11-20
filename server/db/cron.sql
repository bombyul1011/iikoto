-- iikoto Supabase pg_cron 예약 작업 — 2026-11-16 배포 상태 그대로. 시각은 UTC(한국시간 -9시간).
-- 서버 함수 호출에 쓰는 키는 vault('anon_key_for_cron'), 예약 작업 전용 비밀값은 vault('cron_secret')(2026-11-18 추가 —
-- send-alerts·materialize-recurring은 x-cron-secret 헤더가 맞아야만 실행됨, 감사 P1-12).

-- 1분마다 알림 생성·발송
select cron.schedule('send-alerts-every-minute', '* * * * *', $$
  select net.http_post(
    url := 'https://vqvpzrxmtpryzhontlxc.supabase.co/functions/v1/send-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key_for_cron'),
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
$$);

-- 매일 03:30 KST — 보낸 지 3일 지난 알림 정리
select cron.schedule('cleanup-old-alerts-daily', '30 18 * * *', $$
  delete from alerts where sent = true and alert_at < now() - interval '3 days'
$$);

-- 매일 00:05 KST — 반복 할일·일정 실체화
select cron.schedule('materialize-recurring-daily', '5 15 * * *', $$
  select net.http_post(
    url := 'https://vqvpzrxmtpryzhontlxc.supabase.co/functions/v1/materialize-recurring',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key_for_cron'),
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
$$);

-- 매일 08:00, 19:00 KST — 애플 캘린더 동기화
select cron.schedule('compare-calendars-twice-daily', '0 10,23 * * *', $$
  select net.http_post(
    url := 'https://vqvpzrxmtpryzhontlxc.supabase.co/functions/v1/compare-calendars',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key_for_cron'),
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
$$);

-- 1분마다 — 아침 기상 등록 감지(브리핑용)
select cron.schedule('note-wake-registered', '* * * * *', $$
  select public.note_wake_registered()
$$);

-- 매주 일요일 04:00 KST — 서버 전체 자동 백업(R2 backups/, 감사 4단계)
select cron.schedule('weekly-backup-sun-0400kst', '0 19 * * 6', $$
  select net.http_post(
    url := 'https://vqvpzrxmtpryzhontlxc.supabase.co/functions/v1/weekly-backup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key_for_cron'),
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
$$);

-- 매일 09:17 KST — 8일 넘게 성공한 자동 백업이 없으면 알림(하루 1번, 감사 4-2)
select cron.schedule('backup-stale-check-daily', '17 0 * * *', $$
  insert into public.alerts(source_type, source_cid, alert_at, title, body)
  select 'backup_stale', to_char(now() at time zone 'Asia/Seoul','YYYY-MM-DD'), now(),
         '자동 백업이 멈췄어요', '8일 넘게 서버 자동 백업이 없어요. 설정탭에서 수동 백업을 한 번 해 주세요.'
  where not exists (select 1 from public.backup_log where ok and created_at > now() - interval '8 days')
    and not exists (select 1 from public.alerts where source_type='backup_stale' and source_cid=to_char(now() at time zone 'Asia/Seoul','YYYY-MM-DD'));
$$);
