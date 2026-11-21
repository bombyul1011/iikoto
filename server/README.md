# server/ — 이이코토 서버 쪽 보관본

앱 3파일(index.html·app.js·sw.js)과 따로 배포되는 서버 코드와 DB 설정을 모아 둔 곳입니다.
**여기 있는 파일은 배포에 쓰이지 않습니다.** 실제 동작은 Supabase와 Cloudflare에 배포된 버전이 기준이고,
이 폴더는 프로젝트에 문제가 생겼을 때 기능을 다시 세우기 위한 복원용 사본입니다(감사 P2-14, 2026-11-16 작성).

| 위치 | 내용 | 배포처 |
|---|---|---|
| `functions/send-alerts/` | 알림 생성·푸시 발송 (v40, 예약 작업 비밀값 검사, 5분 여유 창·일시 실패 재시도) | Supabase Edge Function |
| `functions/materialize-recurring/` | 반복 할일·일정 실체화 (v5, 예약 작업 비밀값 검사) | Supabase Edge Function |
| `functions/compare-calendars/` | 애플 캘린더 → 이이코토 일정 동기화 (v7, 예약 작업 비밀값 또는 앱 키 검사, `ics.ts` 포함) | Supabase Edge Function |
| `workers/iikoto-img-proxy.js` | 포스터·표지 이미지 중계 | Cloudflare Worker |
| `workers/ocr-prox.js` | 구글 비전 OCR 중계 | Cloudflare Worker |
| `workers/aladin-book-proxy.js` | 알라딘 책 페이지 수 조회 | Cloudflare Worker |
| `../worker-photo-proxy.js` (저장소 루트) | 사진 올리기·보기·지우기 (R2) | Cloudflare Worker |
| `db/schema.sql` | 표·제약·인덱스 (식사는 `meal_entries` 끼니당 1행, 먹고 싶은 메뉴·레시피는 `menu_library` 메뉴당 1행, 옛 `meals`는 보관용) | Supabase DB |
| `db/policies.sql` | 접근 정책(RLS) — 3단계 전환 전 원래 상태 | Supabase DB |
| `db/functions.sql` | DB 함수·트리거 | Supabase DB |
| `db/cron.sql` | 예약 작업(pg_cron) | Supabase DB |

## 들어 있지 않은 것 (비밀값)

공개 저장소라 비밀값은 넣지 않았습니다. 복원할 때 각 배포처에 다시 등록해야 합니다.

- Supabase 함수 비밀값: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `ICAL_SCHEDULE`, `ICAL_TRAVEL`, `ICAL_WORK`
- Supabase vault: `anon_key_for_cron`, `briefing_fire_token`, `cron_secret`(예약 작업 전용, 복원 시 `vault.create_secret(encode(gen_random_bytes(32),'hex'),'cron_secret')`로 새로 만들면 됨), `app_key_hash`(앱 키의 sha256 = 앱 설정의 등록 코드)
- Cloudflare 워커 비밀값: `APP_KEY_HASH`(사진·OCR 둘 다, 앱 키 sha256), `UPLOAD_SECRET`(사진, 전환 기간용 — 추후 삭제), `GOOGLE_VISION_API_KEY`(OCR), R2 바인딩 `PHOTO_BUCKET`
- 파일 안에서 `<...>`로 가린 값: 알라딘 TTB 키, 이이타비 접근키 해시, 아침 브리핑 예약 실행 주소

## 갱신 규칙

서버 함수·워커·DB 정책을 바꿔 배포했으면 이 폴더의 해당 파일도 같은 내용으로 고쳐 둡니다.
기록 데이터 자체의 백업은 여기가 아니라 설정탭의 전체 백업 파일과 서버 안 사본(`backup_YYYYMMDD` 스키마)에 있습니다.

## 서버 전체 잠금 (2026-11-20)
- 모든 REST 요청은 `public.require_app_key()`(pre-request)를 거침. 앱 키 없으면 401.
- 서버 함수(service_role)는 통과. 새 기기는 설정 → 앱 키를 먼저 넣어야 기록이 보임.
- 비상 해제: `alter role authenticator reset pgrst.db_pre_request; notify pgrst, 'reload config';`

## 자동 백업 (2026-11-20, 감사 4단계)
- `functions/weekly-backup/` — 매주 일요일 04:00 KST(cron `weekly-backup-sun-0400kst`). 모든 표를 `iikoto-backup` v1 형식(앱 수동 백업과 동일)으로 gzip해 R2 `backups/iikoto-YYYY-MM-DD.json.gz`에 저장. 결과는 `backup_log`, 실패 시 alerts(`backup_failed`) 푸시.
- 보관: 최근 8개 + 그 이전은 달마다 1개씩 12개월(워커가 저장 직후 정리). 1회 약 0.35MB.
- 내려받기: `GET https://iikoto-photo-proxy.faith-003.workers.dev/backup/<파일명>` + 헤더 `X-Backup-Secret`(vault `backup_secret`, 워커 `BACKUP_SECRET`). 목록은 `/backup/`. `/photo/backups/...`로는 읽을 수 없음.
- 복원 확인(11/20): 첫 백업 24개 표 3,518행, 내려받아 표별 행 수·해시 전부 일치.
