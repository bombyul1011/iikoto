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
