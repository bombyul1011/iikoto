// ── compare-calendars Edge Function (v6: 차이 목록 없는 단순 자동 동기화 + 제목 기준 개인 분류) ──
// 애플캘린더(iCloud 공개 ICS 링크 3개)가 원본. 오늘부터 N일(기본 30일)을 iikoto 일정(todos.is_event)에 한 방향으로 반영한다. 애플은 절대 수정하지 않는다.
//
// 규칙(calendar_sync_rules): 제외 단어 / 개인 분류 단어 / 캘린더별 on·off / 제목에 '?'(미정).
// 연동 장부(calendar_links): 애플 일정(apple_key) ↔ iikoto 일정(todo_cid). state='skipped'는 "다시 가져오지 않음"(iikoto에서 직접 지움).
//
// 동작:
//  - 연동된 일정: 애플이 바뀌면 iikoto 일정의 제목·시간·날짜·종료일을 따라 고침. 애플에서 지워졌거나 '?'가 붙으면 iikoto에서도 삭제.
//  - 연동 안 된 애플 일정: iikoto에 같은 일정이 이미 있으면(제목·날짜 일치/포함, 제목 같고 날짜 ±7일) 연결하고 애플 내용을 따라 맞춤, 없으면 새로 추가.
//  - 새로 추가할 때 분류(event_cat)는 캘린더 기본 매핑(CAL_MAP)을 따르되, 제목에 개인 분류 단어(personal_words)가 있으면 '개인'으로 넣는다. 이미 들어온 일정의 분류는 건드리지 않는다(iikoto에서 고친 분류 유지).
//  - iikoto에서 연동된 일정을 지우면 skipped로 기록해 다시 안 가져옴. iikoto에서 직접 만든 일정은 건드리지 않음.
// 시간 정책: 애플이 종일(시간 없음)이면 iikoto에 사용자가 붙인 시간은 건드리지 않는다. 애플에 시간이 있으면 그 시간을 따른다.
// 안전장치: 캘린더 3개를 모두 읽은 때만 삭제 / 삭제·'사용자가 지움' 판정은 한 번에 10건 초과면 보류 / 연동 일정 조회가 실패하면 '지움' 판정 자체를 건너뜀 /
//          추가는 한 번에 60건, 기존 일정 연결+수정은 20건까지 / 5초 안에 다시 호출되면 이전 결과를 그대로 돌려줌.
// 호출 옵션: ?dry=1 (쓰기 없이 계획만) / ?list=1 (원본 목록 포함) / ?days=30
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { AEv, DAY, KST_OFFSET, firstPart, msDate, norm, parseIcs, toApple } from "./ics.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const DEFAULT_DAYS = 30;
const FAR_DAYS = 150; // 삭제 판단용: 애플 일정이 비교 기간 밖으로 옮겨졌을 때 '지워졌다'고 오해하지 않도록 더 멀리까지 읽음
const MOVE_MATCH_DAYS = 7;
const MIN_CONTAIN_LEN = 2;
const MAX_ADD = 60;
const MAX_ADOPT = 20;
const MAX_DELETE = 10;
const THROTTLE_MS = 5 * 1000;
const USER_DELETE_GRACE_MS = 3 * 60 * 1000; // 방금 만든/고친 연동은 3분간 '사용자가 지움' 판정에서 제외(이동 중 순간적으로 비어 보이는 경우 방지)
const CALS = [
  { cal: "schedule", secret: "ICAL_SCHEDULE" },
  { cal: "travel", secret: "ICAL_TRAVEL" },
  { cal: "work", secret: "ICAL_WORK" },
];
const CAL_MAP: Record<string, { cat: string; vac: boolean }> = {
  schedule: { cat: "schedule", vac: false },
  travel: { cat: "personal", vac: true },
  work: { cat: "work", vac: false },
};
const PERSONAL_CAT = "personal";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type IEv = { cid: string; title: string; nf: string; np: string; date: string; endDate: string | null; time: string | null };
type Rules = { exclude_words: string[]; personal_words: string[]; pending_mark: string; cal_enabled: Record<string, boolean> };
type Link = { apple_key: string; cal: string | null; todo_cid: string | null; todo_date: string | null; title: string | null; state: string; reason: string | null; updated_at: string };
type TodoRow = { client_id: string; date_key: string; text: string; is_event: boolean | null; event_time: string | null; event_end_date: string | null; event_alert_on: boolean | null; is_vacation: boolean | null };

const genCid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const chunk = <T,>(arr: T[], n: number) => { const o: T[][] = []; for (let i = 0; i < arr.length; i += n) o.push(arr.slice(i, i + n)); return o; };

const sameTitle = (a: AEv, i: IEv) => i.nf === a.n || i.np === a.n;
const containTitle = (a: AEv, i: IEv) => {
  for (const t of [i.nf, i.np]) {
    const [short, long] = t.length <= a.n.length ? [t, a.n] : [a.n, t];
    if (short.length >= MIN_CONTAIN_LEN && long.includes(short)) return true;
  }
  return false;
};
// 시간이 다른가 — 애플에 시간이 있으면 그 시간과 같아야 함. 애플이 종일이면 iikoto에 시간이 있어도 '같음'으로 본다.
const timeDiffers = (aTime: string | null, iTime: string | null) => (aTime ? aTime !== (iTime || null) : false);

// 매칭: ① 같은 날+제목 일치 ② 같은 날+제목 포함 ③ 제목 일치+날짜만 다름(±7일)
function matchAll(A: AEv[], I: IEv[]) {
  const freeI = [...I];
  const pairs: { a: AEv; i: IEv; titleDiff: boolean }[] = [];
  const rest: AEv[] = [];
  for (const a of A) {
    const idx = freeI.findIndex((i) => i.date === a.date && sameTitle(a, i));
    if (idx >= 0) { pairs.push({ a, i: freeI[idx], titleDiff: false }); freeI.splice(idx, 1); } else rest.push(a);
  }
  const rest2: AEv[] = [];
  for (const a of rest) {
    const idx = freeI.findIndex((i) => i.date === a.date && containTitle(a, i));
    if (idx >= 0) { pairs.push({ a, i: freeI[idx], titleDiff: true }); freeI.splice(idx, 1); } else rest2.push(a);
  }
  const stillA: AEv[] = [];
  for (const a of rest2) {
    let best = -1;
    let bestGap = Infinity;
    freeI.forEach((i, k) => {
      if (!sameTitle(a, i)) return;
      const gap = Math.abs(Date.parse(a.date) - Date.parse(i.date)) / DAY;
      if (gap > 0 && gap <= MOVE_MATCH_DAYS && gap < bestGap) { best = k; bestGap = gap; }
    });
    if (best >= 0) { pairs.push({ a, i: freeI[best], titleDiff: false }); freeI.splice(best, 1); } else stillA.push(a);
  }
  return { pairs, stillA };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  const dry = url.searchParams.get("dry") === "1";
  const list = url.searchParams.get("list") === "1";
  const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get("days") || String(DEFAULT_DAYS), 10) || DEFAULT_DAYS));
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const kstNow = new Date(Date.now() + KST_OFFSET);
  const fromMs = Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate());
  const toMs = fromMs + days * DAY + DAY - 1;
  const farMs = fromMs + Math.max(FAR_DAYS, days) * DAY;
  const fromDk = msDate(fromMs);
  const toDk = msDate(toMs);
  const farDk = msDate(farMs);
  const nowIso = new Date().toISOString();

  // 0) 직전 실행 기록 — 너무 잦은 호출(버튼 연타, 크론과 겹침)은 쓰기 없이 돌려보냄
  const { data: metaRow } = await sb.from("calendar_sync_meta").select("last_run_at").eq("id", true).maybeSingle();
  if (!dry && metaRow?.last_run_at && Date.now() - Date.parse(metaRow.last_run_at) < THROTTLE_MS) {
    return json({ ok: true, throttled: true, last_run_at: metaRow.last_run_at, auto: { added: 0, updated: 0, deleted: 0 } });
  }

  // 규칙·연동 장부 (개인 분류 단어의 기본값은 DB 컬럼 default가 기준이라 여기서는 비워 둠)
  const rules: Rules = { exclude_words: ["생일", "★"], personal_words: [], pending_mark: "?", cal_enabled: { schedule: true, travel: true, work: true } };
  const { data: ruleRow } = await sb.from("calendar_sync_rules").select("*").eq("id", true).maybeSingle();
  if (ruleRow) {
    if (Array.isArray(ruleRow.exclude_words)) rules.exclude_words = ruleRow.exclude_words;
    if (Array.isArray(ruleRow.personal_words)) rules.personal_words = ruleRow.personal_words;
    if (typeof ruleRow.pending_mark === "string") rules.pending_mark = ruleRow.pending_mark;
    if (ruleRow.cal_enabled && typeof ruleRow.cal_enabled === "object") rules.cal_enabled = { ...rules.cal_enabled, ...ruleRow.cal_enabled };
  }
  const exWords = rules.exclude_words.map(norm).filter(Boolean);
  const personalWords = rules.personal_words.map(norm).filter(Boolean);
  const pendMark = norm(rules.pending_mark);
  // 새로 추가하는 일정의 분류: 제목에 개인 분류 단어가 있으면 개인, 아니면 캘린더 기본 매핑
  const catFor = (a: AEv): string => (personalWords.some((w) => a.n.includes(w)) ? PERSONAL_CAT : (CAL_MAP[a.cal] || CAL_MAP.schedule).cat);
  // 'pending'(? 붙음) → 이미 들어온 일정도 삭제 / 'rule'(제외 단어·꺼진 캘린더) → 새로는 안 가져오되 이미 들어온 건 그대로 둠(연결만 해제)
  const excludedBy = (a: AEv): "pending" | "rule" | null => {
    if (pendMark && a.n.includes(pendMark)) return "pending";
    if (rules.cal_enabled[a.cal] === false) return "rule";
    if (exWords.some((w) => a.n.includes(w))) return "rule";
    return null;
  };

  const { data: linkRows, error: lErr } = await sb.from("calendar_links").select("*");
  if (lErr) return json({ ok: false, error: lErr.message }, 500);
  const links = (linkRows || []) as Link[];
  const activeByKey = new Map<string, Link>();
  const skippedKeys = new Set<string>();
  for (const l of links) { if (l.state === "active") activeByKey.set(l.apple_key, l); else skippedKeys.add(l.apple_key); }

  // 1) 애플(ICS) 읽기 — 링크 주소는 응답/로그에 절대 남기지 않는다
  const calStatus: { cal: string; ok: boolean; reason?: string; events?: number }[] = [];
  const allApple: AEv[] = [];
  for (const c of CALS) {
    const link = Deno.env.get(c.secret);
    if (!link) { calStatus.push({ cal: c.cal, ok: false, reason: "비밀값 없음" }); continue; }
    try {
      const res = await fetch(link.trim().replace(/^webcal:\/\//i, "https://"), { signal: AbortSignal.timeout(20000) });
      if (!res.ok) { calStatus.push({ cal: c.cal, ok: false, reason: `HTTP ${res.status}` }); continue; }
      const text = await res.text();
      if (!/BEGIN:VCALENDAR/i.test(text)) { calStatus.push({ cal: c.cal, ok: false, reason: "캘린더 형식이 아님(링크 확인)" }); continue; }
      const evs = toApple(c.cal, parseIcs(text), fromMs, farMs);
      allApple.push(...evs);
      calStatus.push({ cal: c.cal, ok: true, events: evs.length });
    } catch (e) {
      calStatus.push({ cal: c.cal, ok: false, reason: e instanceof Error ? e.name : "읽기 실패" });
    }
  }
  const allOk = calStatus.every((s) => s.ok);
  const anyOk = calStatus.some((s) => s.ok);
  if (!anyOk) {
    if (!dry) await sb.from("calendar_sync_meta").upsert({ id: true, last_run_at: nowIso, last_ok: false, last_summary: { calendars: calStatus } });
    return json({ ok: false, error: "읽은 캘린더가 없어요", calendars: calStatus }, 200);
  }
  const winApple = allApple.filter((a) => a.date <= toDk);
  const appleByKey = new Map(allApple.map((a) => [a.key, a]));

  // 2) iikoto 일정 읽기 (비교 기간) + 연동된 일정(기간 밖에 있어도)
  const { data: rows, error: iErr } = await sb
    .from("todos").select("client_id,date_key,text,event_time,event_end_date")
    .eq("is_event", true).gte("date_key", fromDk).lte("date_key", toDk);
  if (iErr) return json({ ok: false, error: iErr.message }, 500);
  const iikoto: IEv[] = (rows || []).map((r) => ({
    cid: r.client_id as string, title: r.text as string, nf: norm(r.text as string), np: norm(firstPart(r.text as string)),
    date: r.date_key as string,
    endDate: r.event_end_date && r.event_end_date !== r.date_key ? (r.event_end_date as string) : null,
    time: (r.event_time as string) || null,
  }));

  const TODO_COLS = "client_id,date_key,text,is_event,event_time,event_end_date,event_alert_on,is_vacation";
  const activeLinks = [...activeByKey.values()].filter((l) => l.todo_cid);
  const linkedTodo = new Map<string, TodoRow>();
  let linkedReadOk = true; // 연동 일정 조회가 한 번이라도 실패하면 '지움' 판정을 하지 않는다(전부 사라진 것처럼 보여 대량 오판하는 사고 방지)
  for (const part of chunk(activeLinks.map((l) => l.todo_cid as string), 80)) {
    const { data, error } = await sb.from("todos").select(TODO_COLS).in("client_id", part);
    if (error) { linkedReadOk = false; break; }
    for (const r of (data || []) as TodoRow[]) linkedTodo.set(r.client_id, r);
  }

  // 3) 연동된 일정 처리
  const plan = { added: [] as string[], updated: [] as string[], deleted: [] as string[], linked: 0, userDeleted: [] as string[], unlinked: 0, deleteBlocked: false, userDeleteBlocked: false };
  const linkedCids = new Set<string>();
  type Upd = { link: Link; todo: TodoRow; patch: Record<string, unknown>; a: AEv };
  const updates: Upd[] = [];
  const deletions: { link: Link; todo: TodoRow }[] = [];
  const unlinkOnly: Link[] = [];
  let userDeleted: Link[] = [];
  const makePatch = (a: AEv, todo: { date_key: string; text: string; event_time: string | null; event_end_date: string | null }, forceTitle = false) => {
    const patch: Record<string, unknown> = {};
    if (todo.date_key !== a.date) patch.date_key = a.date;
    if (forceTitle || !(norm(todo.text) === a.n || norm(firstPart(todo.text)) === a.n)) { if (norm(todo.text) !== a.n) patch.text = a.title; }
    if (timeDiffers(a.time, todo.event_time)) patch.event_time = a.time;
    const curEnd = todo.event_end_date && todo.event_end_date !== todo.date_key ? todo.event_end_date : null;
    if ((a.endDate || null) !== curEnd) { patch.event_end_date = a.endDate; if (!a.endDate) patch.is_vacation = false; }
    return patch;
  };
  if (linkedReadOk) {
    for (const l of activeLinks) {
      const cid = l.todo_cid as string;
      const todo = linkedTodo.get(cid);
      if (!todo) {
        // 연동된 iikoto 일정이 사라짐 → 사용자가 iikoto에서 지운 것 → 다시 가져오지 않음
        if (Date.now() - Date.parse(l.updated_at) > USER_DELETE_GRACE_MS) userDeleted.push(l);
        continue;
      }
      linkedCids.add(cid);
      if (!todo.is_event) continue;
      const a = appleByKey.get(l.apple_key);
      const ex = a ? excludedBy(a) : null;
      if (!a) {
        // 애플에서 사라짐 → iikoto에서도 삭제 (3개 캘린더를 모두 읽었고 안전 범위일 때만)
        if (allOk && winApple.length > 0 && todo.date_key >= fromDk && todo.date_key <= farDk) deletions.push({ link: l, todo });
        continue;
      }
      if (ex === "pending") { if (allOk) deletions.push({ link: l, todo }); continue; }
      if (ex === "rule") { unlinkOnly.push(l); continue; }
      const patch = makePatch(a, todo);
      if (Object.keys(patch).length) updates.push({ link: l, todo, patch, a });
    }
    if (deletions.length > MAX_DELETE) { plan.deleteBlocked = true; deletions.length = 0; }
    if (userDeleted.length > MAX_DELETE) { plan.userDeleteBlocked = true; userDeleted = []; }
  } else {
    // 조회 실패 — 이번엔 연동 일정을 건드리지 않고(연결된 일정은 비교에서도 빼서 '새 일정'으로 오인해 중복 추가하지 않음) 다음 실행을 기다림
    for (const l of activeLinks) linkedCids.add(l.todo_cid as string);
  }
  plan.userDeleted = userDeleted.map((l) => l.title || l.apple_key);

  // 4) 연동 안 된 일정 처리: 이미 있는 일정은 연결(+애플 내용으로 맞춤), 없으면 새로 추가
  const poolA = winApple.filter((a) => !skippedKeys.has(a.key) && !activeByKey.has(a.key));
  const poolI = iikoto.filter((i) => !linkedCids.has(i.cid));
  const { pairs, stillA } = matchAll(poolA, poolI);
  const newLinks: { apple_key: string; cal: string; todo_cid: string; todo_date: string; title: string }[] = [];
  const adoptUpdates: { a: AEv; i: IEv; patch: Record<string, unknown> }[] = [];
  const toAdd: AEv[] = [];
  let adopted = 0;
  for (const { a, i, titleDiff } of pairs) {
    if (excludedBy(a)) continue; // 제외 규칙에 걸린 애플 일정은 연결 대상이 아님(직접 넣어 둔 iikoto 일정은 그대로)
    const patch = makePatch(a, { date_key: i.date, text: i.title, event_time: i.time, event_end_date: i.endDate }, titleDiff);
    if (Object.keys(patch).length) {
      if (adopted >= MAX_ADOPT) continue; // 한 번에 너무 많이 고치지 않음 — 다음 실행에서 이어서
      adopted++;
      adoptUpdates.push({ a, i, patch });
    }
    newLinks.push({ apple_key: a.key, cal: a.cal, todo_cid: i.cid, todo_date: i.date, title: a.title });
    plan.linked++;
  }
  for (const a of stillA) {
    if (excludedBy(a)) continue;
    if (toAdd.length < MAX_ADD) toAdd.push(a);
  }
  // 연결과 함께 고칠 일정의 현재 값을 읽어 둠(알림 처리에 필요)
  const adoptOk = new Set<string>();
  if (adoptUpdates.length) {
    for (const part of chunk(adoptUpdates.map((u) => u.i.cid), 80)) {
      const { data, error } = await sb.from("todos").select(TODO_COLS).in("client_id", part);
      if (error) continue;
      for (const r of (data || []) as TodoRow[]) linkedTodo.set(r.client_id, r);
    }
    for (const u of adoptUpdates) {
      const todo = linkedTodo.get(u.i.cid);
      if (!todo) continue;
      adoptOk.add(u.i.cid);
      updates.push({ link: { apple_key: u.a.key, cal: u.a.cal, todo_cid: u.i.cid, todo_date: u.i.date, title: u.a.title, state: "active", reason: null, updated_at: nowIso }, todo, patch: u.patch, a: u.a });
    }
  }

  for (const u of updates) plan.updated.push(`${u.a.date} ${u.a.title} (${Object.keys(u.patch).join(",")})`);
  for (const d of deletions) plan.deleted.push(`${d.todo.date_key} ${d.todo.text}`);
  for (const a of toAdd) plan.added.push(`${a.date}${a.endDate ? "~" + a.endDate : ""} ${a.time || "종일"} [${a.cal}→${catFor(a)}] ${a.title}`);
  plan.unlinked = unlinkOnly.length;

  // 5) 쓰기 (dry이면 계획만)
  const writeErrors: string[] = [];
  const auto = { added: 0, updated: 0, deleted: 0 };
  if (dry) {
    auto.added = toAdd.length; auto.updated = updates.length; auto.deleted = deletions.length;
  } else {
    // 5-1) 사용자가 iikoto에서 지운 연동 → 다시 안 가져옴
    for (const l of userDeleted) {
      const { error } = await sb.from("calendar_links").update({ state: "skipped", reason: "deleted_in_iikoto", updated_at: nowIso }).eq("apple_key", l.apple_key);
      if (error) writeErrors.push("skip:" + error.message);
    }
    // 5-2) 기존 일정과 연결
    if (newLinks.length) {
      const { error } = await sb.from("calendar_links").upsert(newLinks.map((n) => ({ ...n, state: "active", updated_at: nowIso })), { onConflict: "apple_key", ignoreDuplicates: true });
      if (error) writeErrors.push("link:" + error.message);
    }
    // 5-3) 제외 규칙 때문에 연결만 해제
    for (const l of unlinkOnly) await sb.from("calendar_links").delete().eq("apple_key", l.apple_key);
    // 5-4) 애플 변경 따라가기
    for (const u of updates) {
      const { error } = await sb.from("todos").update(u.patch).eq("client_id", u.todo.client_id);
      if (error) { writeErrors.push("update:" + error.message); continue; }
      auto.updated++;
      const newDate = (u.patch.date_key as string) || u.todo.date_key;
      const newText = (u.patch.text as string) || u.todo.text;
      const newTime = "event_time" in u.patch ? (u.patch.event_time as string | null) : u.todo.event_time;
      if (u.todo.event_alert_on) {
        if (newTime) {
          await sb.from("alerts").upsert({ source_type: "event", source_cid: u.todo.client_id, alert_at: `${newDate}T${newTime}:00+09:00`, title: newText, sent: false }, { onConflict: "source_type,source_cid" });
        } else {
          await sb.from("alerts").delete().eq("source_type", "event").eq("source_cid", u.todo.client_id);
        }
      }
      await sb.from("calendar_links").update({ todo_date: newDate, title: u.a.title, updated_at: nowIso }).eq("apple_key", u.link.apple_key);
    }
    // 5-5) 애플에서 지워진/미정(?)이 된 일정 삭제
    for (const d of deletions) {
      const { error } = await sb.from("todos").delete().eq("client_id", d.todo.client_id);
      if (error) { writeErrors.push("delete:" + error.message); continue; }
      auto.deleted++;
      await sb.from("alerts").delete().eq("source_type", "event").eq("source_cid", d.todo.client_id);
      await sb.from("calendar_links").delete().eq("apple_key", d.link.apple_key);
    }
    // 5-6) 새 애플 일정 추가 (연동 장부를 먼저 선점해 동시 실행 시 중복 추가 방지)
    for (const a of toAdd) {
      const cid = genCid();
      const map = CAL_MAP[a.cal] || CAL_MAP.schedule;
      const { error: le } = await sb.from("calendar_links").insert({ apple_key: a.key, cal: a.cal, todo_cid: cid, todo_date: a.date, title: a.title, state: "active", updated_at: nowIso });
      if (le) continue; // 이미 다른 실행이 처리했거나 오류
      const { error: te } = await sb.from("todos").insert({
        date_key: a.date, text: a.title, done: false, created: Date.now(), time_section: "none", client_id: cid,
        strike_parts: [], strike_times: {}, is_event: true, event_cat: catFor(a), event_time: a.time, event_end_date: a.endDate,
        cat: "todo", pinned: false, event_alert_on: false, todo_alert_on: false, is_vacation: !!(map.vac && a.endDate),
      });
      if (te) { writeErrors.push("insert:" + te.message); await sb.from("calendar_links").delete().eq("apple_key", a.key); continue; }
      auto.added++;
    }
    // 5-7) 지난 연동 기록 정리
    await sb.from("calendar_links").delete().lt("todo_date", msDate(fromMs - 7 * DAY));

    await sb.from("calendar_sync_meta").upsert({
      id: true, last_run_at: nowIso, last_ok: allOk && writeErrors.length === 0 && linkedReadOk,
      last_summary: {
        window: [fromDk, toDk], calendars: calStatus,
        auto: { ...auto, deleteBlocked: plan.deleteBlocked, userDeleteBlocked: plan.userDeleteBlocked, linkedReadFailed: !linkedReadOk, errors: writeErrors.length },
      },
    });
  }

  return json({
    ok: true, dry, window: [fromDk, toDk], calendars: calStatus, rules, auto, plan, writeErrors, linkedReadOk, allOk,
    ...(list ? {
      apple_list: winApple.map((a) => `${a.date}${a.endDate ? "~" + a.endDate : ""} ${a.time || "종일"} [${a.cal}] ${a.title}${excludedBy(a) ? " (제외:" + excludedBy(a) + ")" : ""}`).sort(),
      iikoto_list: iikoto.map((i) => `${i.date}${i.endDate ? "~" + i.endDate : ""} ${i.time || "-"} ${i.title}`).sort(),
    } : {}),
  });
});
