// ── send-alerts Edge Function ──
// pg_cron이 1분마다 호출. 세 갈래 작업을 순서대로 수행:
// 1) 고정 시각형 알림(아침브리핑/수면/수면점수 미등록/주간·월말리포트) — user_settings.timezone
//    기준 현지시각과 user_settings 시각이 일치하고 해당 종류가 enabled일 때만 생성.
//    timezone 컬럼은 평소 기본값 Asia/Seoul, 여행 중에만 클라이언트(app.js syncUserTimezoneIfChanged)가
//    기기 시간대가 바뀌었을 때만 갱신함 — 그 외에는 항상 한국 기준으로 동작.
//    [2026-10-01] 저녁 마무리(evening_wrap)/남은 할일+습관(remaining_todo)/점심 후 메모(noon_memo) 알림은 폐지.
//    (user_settings의 해당 컬럼은 남겨둠 — remaining_todo_time은 앱의 "오늘 저녁" 스누즈 시각으로 계속 쓰임)
//    [2026-10-01] 수면점수 미등록 알림(sleep_score_missing) 추가 — 09:00 고정, 오늘 sleep 행의 score가 비었을 때만 생성.
//    [2026-10-01] 생일 축하 — user_settings.birthday('MM-DD', 설정탭에서 입력)가 오늘 날짜와 같으면 아침 브리핑을 생일 버전으로 보냄(2/29생은 평년 2/28).
//    [2026-10-26] 오늘의 질문 알림(question_alert)은 기능 자체와 함께 폐지.
//    [2026-11-20] 감사 5-9 — 예약 시각은 5분 여유 창으로 판정, 발송은 '맡음 표시 후 발송'·전부 일시 실패면 30분 안에서 재시도.
//    [2026-11-23] 감사 5-8·5-9 — 할일·일정 알림은 발송 직전 항목 존재 확인, 새벽 6시 전엔 어제 시작한 진행 중 리듬도 리마인드.
// 2) 조건부 스캔형(리듬 진행중 리마인드) — rhythm_enabled일 때만, 동일하게 timezone 기준으로 경과시간 계산.
//    1시간/3시간 두 단계로 발송(2026-09-19 추가) — 각 단계는 alerts.source_cid에 구분자를 붙여
//    별개 row로 관리하되, 실제 리듬블록을 찾아갈 push url의 cid는 alerts.link_cid(원본 client_id)를
//    별도로 저장해두고 그걸 사용함 — source_cid(중복방지 키)와 link_cid(딥링크용 원본 id)를 분리.
// 3) alerts 테이블에서 "발송 시각이 지났고 아직 안 보낸" 것을 찾아 push 발송, 성공하면 sent=true.
//    할일 알림('todo')과 스누즈 임시 알림('todo_snooze', 할일당 1개, 2026-09-20 추가)은 클릭 시
//    ?snooze=<todo cid> 로 열려 앱이 스누즈 시트를 띄움.
//    [2026-10-01] 발송 payload를 Declarative Web Push(iOS 18.4+) 형식으로 전환 — {web_push:8030, notification:{title,body,navigate}}.
//    iOS가 알림을 직접 띄우고, 탭하면 앱이 백그라운드/종료 상태여도 OS가 navigate URL(APP_BASE + ?memo=…&aid=…)로 앱을 열어줌.
//    (notificationclick이 iOS PWA 백그라운드에서 발화하지 않던 문제 우회). 구형 경로(SW가 showNotification)용으로
//    최상위 title/body/url도 그대로 함께 실음. mutable은 일부러 생략 — 생략해야 SW push 핸들러가 알림을 덮어쓰지 않음.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendNotification } from "npm:web-push-neo@latest";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;

// Declarative Web Push의 navigate는 base URL 없이 파싱되므로 절대 URL이어야 하고, 앱과 same-origin·scope 안이어야 함.
const APP_BASE = "https://bombyul1011.github.io/iikoto/";

const vapidDetails = {
  subject: "mailto:iikoto-app@example.com",
  publicKey: VAPID_PUBLIC_KEY,
  privateKey: VAPID_PRIVATE_KEY,
};

function nowInTz(tz: string | null | undefined): { hhmm: string; dk: string; dow: number; y: number; m: number; d: number; totalMin: number } {
  const zone = tz || "Asia/Seoul";
  let parts: Record<string, string>;
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short",
    });
    parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  } catch {
    return nowInTz("Asia/Seoul");
  }
  const y = Number(parts.year), m = Number(parts.month), d = Number(parts.day);
  let hh = Number(parts.hour);
  if (hh === 24) hh = 0;
  const mm = Number(parts.minute);
  const dowMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dow = dowMap[parts.weekday] ?? 0;
  const dk = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return {
    hhmm: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
    dk, dow, y, m, d, totalMin: hh * 60 + mm,
  };
}

function hasBatchim(word: string): boolean {
  const last = word.charCodeAt(word.length - 1);
  return (last - 0xac00) % 28 !== 0;
}
function josa(word: string, withBatchim: string, withoutBatchim: string): string {
  return hasBatchim(word) ? withBatchim : withoutBatchim;
}

function pickRandom<T>(pool: T[]): T {
  return pool[Math.floor(Math.random() * pool.length)];
}

const RHYTHM_CAT_LABELS: Record<string, string> = {
  exercise: "운동", rest: "휴식", groom: "단장", work: "업무",
  appointment: "외출", note: "작업", enjoy: "감상", home: "정리",
};

const RHYTHM_REMIND_BODIES: Record<string, string[]> = {
  exercise: [
    "오늘의 운동, 짧게 기록해볼까요?",
    "몸의 변화나 느낌을 한 줄 남겨보세요.",
    "지금의 페이스, 메모로 남겨두면 좋아요.",
  ],
  rest: [
    "이 시간, 어떻게 쉬고 있는지 남겨볼까요?",
    "쉬면서 든 생각을 짧게 적어보세요.",
    "오늘의 휴식을 한 줄로 남겨보세요.",
  ],
  groom: [
    "오늘의 준비 과정을 짧게 남겨볼까요?",
    "지금 하고 있는 일을 메모해보세요.",
    "오늘의 루틴, 기록으로 남겨보세요.",
  ],
  work: [
    "지금 하고 있는 작업을 메모해둘까요?",
    "잠깐 멈춰 지금 생각을 남겨보세요.",
    "오늘 진행 중인 일, 한 줄 기록해보세요.",
  ],
  appointment: [
    "지금 이 시간을 짧게 남겨볼까요?",
    "오늘의 순간을 메모로 남겨보세요.",
    "지금 느낀 걸 짧은 기록으로 남겨보세요.",
  ],
  note: [
    "지금 이 순간을 기록해보세요.",
    "떠오른 생각을 짧게 적어볼까요?",
    "오늘 가장 기억에 남는 순간은 언제인가요?",
  ],
  enjoy: [
    "인상 깊은 장면이나 문장을 남겨볼까요?",
    "지금 느낀 감상을 짧게 기록해보세요.",
    "떠오른 문장이 있다면 메모해두세요.",
  ],
  home: [
    "정리하며 든 생각을 남겨볼까요?",
    "오늘의 정리, 짧게 기록해보세요.",
    "지금의 공간을 한 줄로 남겨보세요.",
  ],
};
const RHYTHM_REMIND_BODIES_3H: Record<string, string[]> = {
  exercise: [
    "벌써 3시간째예요. 오늘의 운동, 어떻게 흘러왔나요?",
    "긴 시간 이어온 운동, 지금까지의 흘름을 남겨볼까요?",
  ],
  rest: [
    "3시간째 쉬고 있어요. 충분히 쉬어지고 있나요?",
    "긴 휴식이었어요. 지금 상태를 한 줄로 남겨보세요.",
  ],
  groom: [
    "3시간째 이어지고 있어요. 오늘의 루틴을 되집어볼까요?",
  ],
  work: [
    "3시간째 이어진 작업, 지금까지 어디까지 왔나요?",
    "긴 시간 집중했어요. 진행 상황을 남겨볼까요?",
  ],
  appointment: [
    "3시간째 밖에 계시네요. 오늘 하루 어땐나요?",
    "긴 외출이었어요. 오늘을 한 줄로 남겨보세요.",
  ],
  note: [
    "3시간째 작업 중이에요. 지금까지의 흘름을 남겨볼까요?",
  ],
  enjoy: [
    "3시간째 감상 중이에요. 지금까지 느낀 걸 남겨볼까요?",
  ],
  home: [
    "3시간째 정리 중이에요. 얼마나 정돈됐는지 남겨보세요.",
  ],
};
function pickRhythmRemindBody(cat: string, label: string, stage: "1h" | "3h"): string {
  const pool = stage === "3h" ? (RHYTHM_REMIND_BODIES_3H[cat] || RHYTHM_REMIND_BODIES[cat]) : RHYTHM_REMIND_BODIES[cat];
  if (!pool || !pool.length) return `${label}${josa(label, "이", "가")} 진행 중이에요`;
  return pickRandom(pool);
}

async function upsertAlert(
  supabase: ReturnType<typeof createClient>,
  sourceType: string,
  sourceCid: string,
  alertAtIso: string,
  title: string,
  body: string,
  linkCid?: string,
) {
  await supabase.from("alerts").upsert(
    { source_type: sourceType, source_cid: sourceCid, alert_at: alertAtIso, title, body, sent: false, link_cid: linkCid ?? sourceCid },
    { onConflict: "source_type,source_cid" },
  );
}

const MORNING_BODIES: string[] = [
  "창문을 열고 오늘의 공기를 느껴보세요.",
  "기지개 한 번 켜고, 오늘을 시작해볼까요?",
  "물 한 잔으로 몸을 깨워보세요.",
  "밤새 머문 공기를 환기해보는 건 어때요?",
  "오늘의 날씨는 어떤가요? 창밖을 한번 봐요.",
  "개운한 아침이에요. 천천히 하루를 열어보세요.",
  "이불을 정리하며 하루를 정돈해볼까요?",
];

// 생일 판정 — birthday는 'MM-DD'. dk는 'YYYY-MM-DD'(현재 timezone 기준 오늘). 2/29생은 평년에 2/28에 축하.
function isBirthdayToday(birthday: string | null | undefined, dk: string): boolean {
  if (!birthday) return false;
  const md = dk.slice(5);
  if (md === birthday) return true;
  if (birthday === "02-29") {
    const y = Number(dk.slice(0, 4));
    const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    return !leap && md === "02-28";
  }
  return false;
}
const BIRTHDAY_MORNING_BODIES: string[] = [
  "오늘은 온전히 봄이님의 날이에요. 천천히 시작해도 좋아요.",
  "태어난 이 날을 축하해요. 오늘은 스스로에게 너그러워지는 하루로.",
  "특별한 하루에요. 앱에서 봄이님을 위한 인사가 기다려요.",
];
async function maybeScheduleMorningBriefing(supabase: ReturnType<typeof createClient>, dk: string, nowIso: string, birthday?: string | null) {
  const { data: existing } = await supabase
    .from("alerts").select("id").eq("source_type", "morning_briefing").eq("source_cid", dk).maybeSingle();
  if (existing) return;
  if (isBirthdayToday(birthday, dk)) {
    await upsertAlert(supabase, "morning_briefing", dk, nowIso, "생일 축하해요, 봄이님 🎂", pickRandom(BIRTHDAY_MORNING_BODIES));
    return;
  }
  await upsertAlert(supabase, "morning_briefing", dk, nowIso, "좋은 아침이에요 🌤️", pickRandom(MORNING_BODIES));
}

const SLEEP_GOAL_MIN = 450;
const SLEEP_GOAL_80PCT_MIN = 360;
const SLEEP_GOAL_60PCT_MIN = 270;
function dawnAdjustedMin(t: string | null, cutoffMin: number): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  let min = h * 60 + m;
  if (min < cutoffMin) min += 1440;
  return min;
}
const SLEEP_ALERT_BODIES = {
  veryGood: [
    "충분히 쉬고 하루를 보냈어요. 이제 오늘의 밤도 준비해볼 시간이에요.",
    "어제의 충분한 잠처럼, 오늘도 좋은 밤을 만들어봐요.",
    "잘 쉬어둔 만큼 오늘 하루도 잘 보냈어요. 이제 편안하게 마무리해요.",
  ],
  good: [
    "어제의 수면이 괜찮았어요. 오늘도 비슷한 밤을 만들어봐요.",
    "어제 잘 잤어요. 오늘도 편안하게 잠들어봐요.",
    "좋은 수면 리듬을 이어가고 있어요. 오늘도 편안한 밤을 준비해봐요.",
  ],
  slight: [
    "어제 잠이 조금 부족했어요. 오늘은 평소보다 조금 일찍 자볼까요?",
    "어제 아쉬웠던 잠, 오늘은 조금 더 챙겨볼까요?",
    "오늘은 어제보다 조금 일찍 하루를 마무리해봐요.",
  ],
  much: [
    "어제 잠이 많이 부족했어요. 오늘은 든든하게 푹 쉬어주세요.",
    "어제 충분히 자지 못했어요. 오늘은 다른 것보다 잠을 먼저 챙겨봐요.",
    "오늘은 푹 일찍 자서 부족했던 잠을 보충해봐요.",
  ],
};
function pickSleepBody(tier: keyof typeof SLEEP_ALERT_BODIES): string {
  return pickRandom(SLEEP_ALERT_BODIES[tier]);
}
async function maybeScheduleSleepAlert(supabase: ReturnType<typeof createClient>, dk: string, nowIso: string) {
  const { data: existing } = await supabase
    .from("alerts").select("id").eq("source_type", "sleep_alert").eq("source_cid", dk).maybeSingle();
  if (existing) return;

  const { data: sleepRow } = await supabase
    .from("sleep").select("sleep_time,wake_time").eq("date_key", dk).maybeSingle();

  let body = "오늘은 목표 시각에 맞춰볼까요?";
  if (sleepRow?.sleep_time && sleepRow?.wake_time) {
    const SLEEP_CUTOFF_MIN = 12 * 60;
    const sleepMin = dawnAdjustedMin(sleepRow.sleep_time, SLEEP_CUTOFF_MIN);
    const wakeMin = dawnAdjustedMin(sleepRow.wake_time, 0);
    if (sleepMin != null && wakeMin != null) {
      let durationMin = wakeMin - sleepMin;
      if (durationMin < 0) durationMin += 1440;
      if (durationMin >= SLEEP_GOAL_MIN) body = pickSleepBody("veryGood");
      else if (durationMin >= SLEEP_GOAL_80PCT_MIN) body = pickSleepBody("good");
      else if (durationMin >= SLEEP_GOAL_60PCT_MIN) body = pickSleepBody("slight");
      else body = pickSleepBody("much");
    }
  }
  await upsertAlert(supabase, "sleep_alert", dk, nowIso, "취침 시간이에요", body);
}

// 수면점수 미등록 알림(2026-10-01) — 09:00 고정. sleep 행의 date_key는 기상한 날짜라 오늘 dk로 조회.
// 행이 없거나 score가 비어있을 때만 생성(이미 등록했으면 알림 자체를 만들지 않음). 클릭/복귀 시 앱이 점수 입력 모달을 연다.
async function maybeScheduleSleepScoreMissing(supabase: ReturnType<typeof createClient>, dk: string, nowIso: string) {
  const { data: existing } = await supabase
    .from("alerts").select("id").eq("source_type", "sleep_score_missing").eq("source_cid", dk).maybeSingle();
  if (existing) return;
  const { data: sleepRow } = await supabase
    .from("sleep").select("score").eq("date_key", dk).maybeSingle();
  if (sleepRow && sleepRow.score != null) return;
  await upsertAlert(supabase, "sleep_score_missing", dk, nowIso, "수면 점수를 등록해주세요", "오늘 아침 수면 점수를 입력해볼까요?");
}

// 23시 취침 알림 클릭 시 뜨는 메모 모달 전용 문구 — 알림 자체의 title/body(수면 코멘트, 위 SLEEP_ALERT_BODIES)와는
// 별개로, "하루를 회고하며 짧게 남겨보라"는 유도 톤. 리듬 리마인드처럼 여러 개 중 랜덤 선택(2026-09-19).
const SLEEP_MEMO_TITLES: string[] = [
  "오늘 하루는 어땠나요?",
  "잠들기 전, 오늘을 잠깐 되짜어볼까요?",
  "오늘 있었던 일 하나쯤 남겨볼까요?",
];
const SLEEP_MEMO_BODIES: string[] = [
  "잠들기 전, 오늘을 짧게 남겨보세요.",
  "수고한 오늘을 가볍게 정리해봐요.",
  "오늘의 기록을 남겨두면 내일이 더 선명해져요.",
];

async function maybeScheduleReports(
  supabase: ReturnType<typeof createClient>,
  dk: string, dow: number, y: number, m: number, d: number, nowIso: string,
) {
  if (dow === 0) {
    const { data: existing } = await supabase
      .from("alerts").select("id").eq("source_type", "weekly_report").eq("source_cid", dk).maybeSingle();
    if (!existing) await upsertAlert(supabase, "weekly_report", dk, nowIso, "이번주 리포트가 준비됐어요", "한 주를 돌아볼까요?");
  }
  const lastDayOfMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (d === lastDayOfMonth) {
    const { data: existing } = await supabase
      .from("alerts").select("id").eq("source_type", "monthly_report").eq("source_cid", dk).maybeSingle();
    if (!existing) await upsertAlert(supabase, "monthly_report", dk, nowIso, "이번달 리포트가 준비됐어요", "한 달을 정리해볼까요?");
  }
}

const RHYTHM_REMIND_STAGES: { elapsedMin: number; suffix: string; stage: "1h" | "3h"; titleSuffix: string }[] = [
  { elapsedMin: 60, suffix: "_1h", stage: "1h", titleSuffix: "1시간째 진행중이에요" },
  { elapsedMin: 180, suffix: "_3h", stage: "3h", titleSuffix: "3시간째 진행중이에요" },
];
async function maybeScheduleRhythmReminders(supabase: ReturnType<typeof createClient>, dk: string, nowMin: number, nowIso: string) {
  // 자정 넘긴 리듬(감사 P2-13, 5-9): 새벽 6시 전에는 어제 날짜에 시작해 아직 진행 중인 블록도 봄(예: 22:30 시작 → 01:30에 3시간 알림).
  // 경과 시간은 아래에서 음수면 +1440으로 이미 보정됨. 같은 단계 중복은 source_cid로 막힘.
  const dks = [dk];
  if (nowMin < 6 * 60) {
    const [yy, mm, dd] = dk.split("-").map(Number);
    dks.push(new Date(Date.UTC(yy, mm - 1, dd - 1)).toISOString().slice(0, 10));
  }
  const { data: ongoing } = await supabase
    .from("rhythm_blocks").select("client_id,cat,start_time").in("date_key", dks).or("end_time.is.null,end_time.eq.");
  if (!ongoing || !ongoing.length) return;

  for (const b of ongoing) {
    if (!b.client_id || !b.start_time) continue;

    const [sh, sm] = b.start_time.split(":").map(Number);
    const startMin = sh * 60 + sm;
    let elapsed = nowMin - startMin;
    if (elapsed < 0) elapsed += 1440;

    for (const stg of RHYTHM_REMIND_STAGES) {
      if (elapsed < stg.elapsedMin) continue;
      const stageCid = `${b.client_id}${stg.suffix}`;
      const { data: existing } = await supabase
        .from("alerts").select("id").eq("source_type", "rhythm_ongoing").eq("source_cid", stageCid).maybeSingle();
      if (existing) continue;

      const label = RHYTHM_CAT_LABELS[b.cat] || b.cat;
      const title = `${label}${josa(label, "이", "가")} ${stg.titleSuffix}`;
      const body = pickRhythmRemindBody(b.cat, label, stg.stage);
      await upsertAlert(supabase, "rhythm_ongoing", stageCid, nowIso, title, body, b.client_id);
    }
  }
}

Deno.serve(async (_req: Request) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  // 예약 작업 전용 비밀값 검사(감사 P1-12, 2026-11-18) — pg_cron이 vault('cron_secret')를 x-cron-secret 헤더로 보냄.
  // 값 대조는 DB 함수 check_cron_secret(service_role만 실행 가능)으로 해서 비밀값이 함수 설정에 따로 남지 않게 함.
  {
    const sec = _req.headers.get("x-cron-secret") || "";
    const { data: okSecret } = sec ? await supabase.rpc("check_cron_secret", { s: sec }) : { data: false };
    if (okSecret !== true) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }
  const nowIso = new Date().toISOString();

  const { data: settings } = await supabase.from("user_settings").select("*").eq("id", true).maybeSingle();
  const { hhmm, dk, dow, y, m, d, totalMin } = nowInTz(settings?.timezone);

  // 예약 시각 여유 창(감사 5-9): 예전엔 '정확히 그 분'에만 만들어서, 그 1분의 예약 호출이 늦거나 빠지면 그날 알림이 통째로 사라졌음.
  // 이제 설정 시각부터 5분 안이면 만듦. 같은 날 중복은 각 maybeSchedule*가 source_cid(날짜)로 이미 막음.
  const due = (t: string | null | undefined) => {
    if (!t || !/^\d{2}:\d{2}$/.test(t)) return false;
    const diff = totalMin - (Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)));
    return diff >= 0 && diff < 5;
  };
  void hhmm;
  if (settings) {
    if (settings.morning_enabled && due(settings.morning_briefing_time)) await maybeScheduleMorningBriefing(supabase, dk, nowIso, settings.birthday);
    if (settings.sleep_enabled && due(settings.sleep_alert_time)) await maybeScheduleSleepAlert(supabase, dk, nowIso);
    if (settings.sleep_score_enabled && due("09:00")) await maybeScheduleSleepScoreMissing(supabase, dk, nowIso);
    if (settings.report_enabled && due("22:00")) await maybeScheduleReports(supabase, dk, dow, y, m, d, nowIso);
    if (settings.rhythm_enabled) await maybeScheduleRhythmReminders(supabase, dk, totalMin, nowIso);
  }

  const { data: dueAlerts, error: alertsErr } = await supabase
    .from("alerts").select("id, source_type, source_cid, link_cid, title, body, alert_at").eq("sent", false).lte("alert_at", nowIso);

  if (alertsErr) {
    console.error("alerts 조회 실패:", alertsErr.message);
    return new Response(JSON.stringify({ error: alertsErr.message }), { status: 500 });
  }
  if (!dueAlerts || dueAlerts.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
  }

  const { data: subs, error: subsErr } = await supabase
    .from("push_subscriptions").select("id, endpoint, p256dh, auth");
  if (subsErr) {
    console.error("subs 조회 실패:", subsErr.message);
    return new Response(JSON.stringify({ error: subsErr.message }), { status: 500 });
  }

  let sentCount = 0;
  const staleSubIds: string[] = [];

  for (const alert of dueAlerts) {
    // 발송 전에 '내가 맡음'으로 표시(sent=false인 것만) — 겹쳐 실행된 다른 호출이 같은 알림을 두 번 보내지 않게.
    const { data: claimed } = await supabase.from("alerts").update({ sent: true }).eq("id", alert.id).eq("sent", false).select("id");
    if (!claimed || !claimed.length) continue;

    // 할일·스누즈·일정 알림은 발송 직전에 그 항목이 아직 있는지 확인(감사 P2-4, 5-8) — 다른 날로 옮기거나 지웠는데
    // 오프라인 등으로 앱의 예약 삭제가 서버에 못 닿으면, 없는 할일 알림이 옛 시각에 울렸음. 할일·스누즈는 완료됐어도 안 보냄.
    if (alert.source_type === "todo" || alert.source_type === "todo_snooze" || alert.source_type === "event") {
      const { data: todoRows, error: todoErr } = await supabase.from("todos").select("done").eq("client_id", alert.source_cid).limit(1);
      if (!todoErr && (!todoRows || !todoRows.length)) continue;
      if (alert.source_type !== "event" && todoRows && todoRows[0]?.done) continue;
    }
    sentCount++;

    const linkCid = alert.link_cid || alert.source_cid;
    const url = alert.source_type === "rhythm_ongoing"
      ? `./?memo=rhythm&cid=${encodeURIComponent(linkCid)}`
      : alert.source_type === "sleep_alert"
      ? `./?memo=sleep&t=${encodeURIComponent(pickRandom(SLEEP_MEMO_TITLES))}&b=${encodeURIComponent(pickRandom(SLEEP_MEMO_BODIES))}`
      : alert.source_type === "sleep_score_missing"
      ? `./?memo=sleepscore`
      : alert.source_type === "todo" || alert.source_type === "todo_snooze"
      ? `./?snooze=${encodeURIComponent(linkCid)}`
      : "./";
    // 앱이 "알림을 탭해서 열렸다"를 alerts.opened에 기록할 수 있도록 알림 row id(aid)를 모든 URL에 덧붙임.
    const aidParam = `aid=${encodeURIComponent(String(alert.id))}`;
    const query = url === "./" ? `?${aidParam}` : `${url.slice(2)}&${aidParam}`; // url.slice(2) = "?memo=…" 형태
    const title = alert.title || "이이코토";
    const body = alert.body || "";
    const payload = JSON.stringify({
      // Declarative Web Push(iOS 18.4+) — 브라우저가 직접 표시하고, 탭하면 navigate(절대 URL)로 앱을 연다.
      web_push: 8030,
      notification: { title, body, navigate: `${APP_BASE}${query}` },
      // 구형/비선언형 경로(SW가 showNotification) 호환용 최상위 필드.
      title,
      body,
      url: `./${query}`,
    });

    const results = await Promise.allSettled(
      (subs || []).map((sub) =>
        sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { vapidDetails },
        )
      ),
    );
    // 모든 기기로의 발송이 실패했고(만료된 구독 제외) 예정 시각에서 30분이 안 지났으면 다시 '안 보냄'으로 돌려 다음 분에 재시도(감사 5-9 —
    // 예전엔 발송 전에 sent=true를 찍어서 일시적인 푸시 서버 오류에도 알림이 조용히 사라졌음).
    const delivered = results.some((r) => r.status === "fulfilled");
    const transientOnly = results.length > 0 && results.every((r) => {
      if (r.status === "fulfilled") return false;
      const m = r.reason instanceof Error ? r.reason.message : String(r.reason);
      return !(m.includes("410") || m.includes("404"));
    });
    if (!delivered && transientOnly && Date.now() - new Date(alert.alert_at).getTime() < 30 * 60 * 1000) {
      await supabase.from("alerts").update({ sent: false }).eq("id", alert.id);
      sentCount--;
    }
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        const sub = (subs || [])[i];
        const msg = r.reason instanceof Error ? (r.reason.stack || r.reason.message) : String(r.reason);
        console.error("push 실패 (sub " + sub.id + "):", msg);
        if (msg.includes("410") || msg.includes("404")) staleSubIds.push(sub.id);
      }
    });
  }

  if (staleSubIds.length) {
    await supabase.from("push_subscriptions").delete().in("id", [...new Set(staleSubIds)]);
  }

  return new Response(JSON.stringify({ sent: sentCount, staleRemoved: staleSubIds.length }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
