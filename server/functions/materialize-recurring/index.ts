// ── materialize-recurring Edge Function ──
// pg_cron이 하루 한 번(자정 직후) 호출. recurring_items(반복 규칙 원본)를 읽어서,
// 오늘부터 규칙별 미리보기 범위(할일 7일/일정 30일)까지의 각 날짜에 대해 그 규칙이
// 해당하는 날짜(요일/간격 등)인지 판정하고, 아직 todos에 그 규칙의 그 날짜 레코드가
// 없으면 새로 만들어 넣는다.
//
// (2026-09-27 재설계) 기존엔 클라이언트가 getTodos(dk) 호출 시마다 매번 판정+저장까지
// 했는데, 여러 기기/여러 sync 경로가 동시에 같은 dk를 실체화하려 들면서 경합(레이스
// 컨디션)이 반복적으로 발생했음(반복 규칙이 풀리거나 recur_rule_cid가 null로 남는 등).
// 실체화를 여기 서버 쪽 단일 실행 지점 하나로 옮기면, 애초에 "여러 주체가 동시에 같은
// 작업을 한다"는 경합의 전제 자체가 사라짐 — 클라이언트는 이제 그 결과(todos)를
// 읽기만 하면 되고, 반복 판정/실체화 로직을 클라이언트에서 완전히 제거할 수 있음.
//
// cid 규칙은 기존과 동일하게 결정적으로 생성(`규칙cid_날짜`) — 그래야 이 함수가 하루에
// 여러 번(수동 재실행 등) 돌아도 중복 생성되지 않고, 기존에 이미 만들어진 과거 레코드와도
// 형식이 호환됨.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const RECUR_TODO_PREVIEW_DAYS = 7;
const RECUR_EVENT_PREVIEW_DAYS = 30;

type Rule = {
  client_id: string;
  text: string;
  is_event: boolean;
  event_time: string | null;
  event_cat: string | null;
  time_section: string | null;
  rule: { type: string; n?: number; days?: string[]; weekInterval?: number; day?: number };
  start_date: string | null;
  end_date: string | null;
};

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 기존 클라이언트의 _isRecurringDueOn과 동일한 판정 로직 — 서버로 옮기며 동작을 그대로 유지.
function isDueOn(rule: Rule, dk: string, d: Date): boolean {
  if (rule.start_date && dk < rule.start_date) return false;
  if (rule.end_date && dk > rule.end_date) return false;
  const r = rule.rule || { type: "" };
  if (r.type === "daily") {
    const n = r.n || 1;
    if (n === 1) return true;
    if (!rule.start_date) return true;
    const start = new Date(rule.start_date + "T00:00:00");
    const daysDiff = Math.round((d.getTime() - start.getTime()) / 86400000);
    return daysDiff >= 0 && daysDiff % n === 0;
  }
  if (r.type === "weekly") {
    const dow = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][d.getDay()];
    if (!(r.days || []).includes(dow)) return false;
    if ((r.weekInterval || 1) === 2) {
      if (!rule.start_date) return true;
      const start = new Date(rule.start_date + "T00:00:00");
      const weeksDiff = Math.floor((d.getTime() - start.getTime()) / (7 * 86400000));
      return weeksDiff % 2 === 0;
    }
    return true;
  }
  if (r.type === "monthly") return d.getDate() === r.day;
  return false;
}

Deno.serve(async (_req: Request) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: rules, error: rulesErr } = await supabase.from("recurring_items").select("*");
  if (rulesErr) {
    console.error("recurring_items 조회 실패:", rulesErr.message);
    return new Response(JSON.stringify({ error: rulesErr.message }), { status: 500 });
  }
  if (!rules || !rules.length) {
    return new Response(JSON.stringify({ created: 0 }), { status: 200 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxPreviewDays = Math.max(RECUR_TODO_PREVIEW_DAYS, RECUR_EVENT_PREVIEW_DAYS);

  const fromDk = dateKey(today);
  const toDate = new Date(today);
  toDate.setDate(toDate.getDate() + maxPreviewDays);
  const toDk = dateKey(toDate);

  const { data: existingTodos, error: todosErr } = await supabase
    .from("todos").select("date_key, recur_rule_cid").gte("date_key", fromDk).lte("date_key", toDk).not("recur_rule_cid", "is", null);
  if (todosErr) {
    console.error("todos 조회 실패:", todosErr.message);
    return new Response(JSON.stringify({ error: todosErr.message }), { status: 500 });
  }
  const existingSet = new Set((existingTodos || []).map((t) => `${t.recur_rule_cid}|${t.date_key}`));

  const { data: skipRows, error: skipErr } = await supabase
    .from("recurring_exceptions").select("recur_cid, date_key").gte("date_key", fromDk).lte("date_key", toDk).eq("status", "skipped");
  if (skipErr) {
    console.error("recurring_exceptions 조회 실패:", skipErr.message);
    return new Response(JSON.stringify({ error: skipErr.message }), { status: 500 });
  }
  const skipSet = new Set((skipRows || []).map((s) => `${s.recur_cid}|${s.date_key}`));

  const toInsert: Record<string, unknown>[] = [];

  for (const rule of (rules as Rule[])) {
    const previewDays = rule.is_event ? RECUR_EVENT_PREVIEW_DAYS : RECUR_TODO_PREVIEW_DAYS;
    for (let i = 0; i <= previewDays; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dk = dateKey(d);
      const key = `${rule.client_id}|${dk}`;
      if (existingSet.has(key)) continue;
      if (skipSet.has(key)) continue;
      if (!isDueOn(rule, dk, d)) continue;
      toInsert.push({
        date_key: dk,
        client_id: `${rule.client_id}_${dk}`,
        text: rule.text,
        done: false,
        created: Date.now(),
        time_section: rule.is_event ? null : (rule.time_section || "none"),
        is_event: !!rule.is_event,
        event_cat: rule.event_cat || null,
        event_time: rule.event_time || null,
        recur_rule_cid: rule.client_id,
      });
      existingSet.add(key);
    }
  }

  if (!toInsert.length) {
    return new Response(JSON.stringify({ created: 0 }), { status: 200 });
  }

  const { error: insertErr } = await supabase.from("todos").upsert(toInsert, { onConflict: "date_key,client_id", ignoreDuplicates: true });
  if (insertErr) {
    console.error("todos 삽입 실패:", insertErr.message);
    return new Response(JSON.stringify({ error: insertErr.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ created: toInsert.length }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
