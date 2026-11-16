// ── ICS 파싱·반복 펼치기 (compare-calendars 공용) ──
export const DAY = 86400000;
export const KST_OFFSET = 9 * 3600000;

type Prop = { name: string; params: Record<string, string>; value: string };
export type RawEv = {
  uid: string;
  title: string;
  start: number;
  allDay: boolean;
  dur: number;
  rrule?: Record<string, string>;
  ex: Set<number>;
  exDays: Set<number>;
  rid?: { ms: number; day: boolean };
  cancelled: boolean;
};
// key = 애플 일정의 고정 식별자. 반복이 아닌 일정은 uid 그대로(날짜가 바뀌어도 같은 일정으로 추적),
// 반복 일정은 uid#원래발생일 (한 번만 옮긴 경우도 같은 key로 추적).
export type AEv = { cal: string; uid: string; key: string; title: string; n: string; date: string; endDate: string | null; time: string | null; allDay: boolean };

export const msDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const msTime = (ms: number) => new Date(ms).toISOString().slice(11, 16);
export const shortMD = (d: string) => `${+d.slice(5, 7)}/${+d.slice(8, 10)}`;
// (보관본 주: 배포본은 아래 문자 범위에 폭 없는 문자 U+200B~U+200D, U+FEFF를 그대로 넣어 둠 — 여기서는 같은 뜻의 \u 표기로 적음)
export const norm = (s: string) => (s || "").normalize("NFKC").toLowerCase().replace(/[\s​-‍﻿]+/g, "");

export function firstPart(text: string): string {
  let body = text;
  let from = 0;
  while (from < text.length) {
    const idx = text.indexOf(">", from);
    if (idx < 0) break;
    if (text[idx - 1] === "-") { from = idx + 1; continue; }
    body = text.slice(idx + 1);
    break;
  }
  const p = body.split("/").map((s) => s.trim()).filter(Boolean);
  return p[0] || text;
}

function splitParams(s: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (const c of s) {
    if (c === '"') { inQ = !inQ; cur += c; }
    else if (c === ";" && !inQ) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}
function parseLine(line: string): Prop | null {
  let inQ = false;
  let idx = -1;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQ = !inQ;
    else if (c === ":" && !inQ) { idx = i; break; }
  }
  if (idx < 0) return null;
  const parts = splitParams(line.slice(0, idx));
  const params: Record<string, string> = {};
  for (const p of parts.slice(1)) {
    const e = p.indexOf("=");
    if (e > 0) params[p.slice(0, e).toUpperCase()] = p.slice(e + 1).replace(/^"|"$/g, "");
  }
  return { name: parts[0].toUpperCase(), params, value: line.slice(idx + 1) };
}
function parseDt(value: string, params: Record<string, string>): { ms: number; allDay: boolean } | null {
  const m = value.trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (m[4] === undefined || params.VALUE === "DATE") return { ms: Date.UTC(y, mo - 1, d), allDay: true };
  let ms = Date.UTC(y, mo - 1, d, +m[4], +m[5], +(m[6] || 0));
  if (m[7]) ms += KST_OFFSET;
  return { ms, allDay: false };
}
function parseDuration(v: string): number {
  const m = v.match(/^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!m) return 0;
  return (+(m[1] || 0)) * 7 * DAY + (+(m[2] || 0)) * DAY + (+(m[3] || 0)) * 3600000 + (+(m[4] || 0)) * 60000 + (+(m[5] || 0)) * 1000;
}
const unescapeText = (v: string) => v.replace(/\\[nN]/g, " ").replace(/\\([,;\\])/g, "$1").trim();

export function parseIcs(text: string): RawEv[] {
  const lines = text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
  const events: RawEv[] = [];
  let props: Prop[] | null = null;
  let alarm = 0;
  for (const line of lines) {
    const u = line.toUpperCase();
    if (u === "BEGIN:VEVENT") { props = []; alarm = 0; continue; }
    if (!props) continue;
    if (u === "BEGIN:VALARM") { alarm++; continue; }
    if (u === "END:VALARM") { alarm = Math.max(0, alarm - 1); continue; }
    if (u === "END:VEVENT") {
      const ev = buildEv(props);
      if (ev) events.push(ev);
      props = null;
      continue;
    }
    if (alarm > 0) continue;
    const p = parseLine(line);
    if (p) props.push(p);
  }
  return events;
}
function buildEv(props: Prop[]): RawEv | null {
  const get = (n: string) => props.find((p) => p.name === n);
  const ds = get("DTSTART");
  if (!ds) return null;
  const st = parseDt(ds.value, ds.params);
  if (!st) return null;
  let dur = st.allDay ? DAY : 0;
  const de = get("DTEND");
  const du = get("DURATION");
  if (de) {
    const en = parseDt(de.value, de.params);
    if (en) dur = Math.max(0, en.ms - st.ms);
  } else if (du) {
    dur = parseDuration(du.value.trim());
  }
  const ex = new Set<number>();
  const exDays = new Set<number>();
  for (const p of props.filter((p) => p.name === "EXDATE")) {
    for (const v of p.value.split(",")) {
      const d = parseDt(v, p.params);
      if (!d) continue;
      ex.add(d.ms);
      if (d.allDay) exDays.add(d.ms);
    }
  }
  const rrp = get("RRULE");
  let rrule: Record<string, string> | undefined;
  if (rrp) {
    rrule = {};
    for (const part of rrp.value.split(";")) {
      const e = part.indexOf("=");
      if (e > 0) rrule[part.slice(0, e).toUpperCase()] = part.slice(e + 1);
    }
  }
  const ridp = get("RECURRENCE-ID");
  let rid: { ms: number; day: boolean } | undefined;
  if (ridp) {
    const r = parseDt(ridp.value, ridp.params);
    if (r) rid = { ms: r.ms, day: r.allDay };
  }
  const status = (get("STATUS")?.value || "").trim().toUpperCase();
  return {
    uid: (get("UID")?.value || "").trim() || crypto.randomUUID(),
    title: unescapeText(get("SUMMARY")?.value || "") || "(제목 없음)",
    start: st.ms,
    allDay: st.allDay,
    dur,
    rrule,
    ex,
    exDays,
    rid,
    cancelled: status === "CANCELLED",
  };
}

const WD: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
function expand(ev: RawEv, ex: Set<number>, exDays: Set<number>, fromMs: number, toMs: number): number[] {
  const r = ev.rrule;
  if (!r) return ev.start >= fromMs && ev.start <= toMs ? [ev.start] : [];
  const freq = r.FREQ;
  const interval = Math.max(1, parseInt(r.INTERVAL || "1", 10) || 1);
  const count = r.COUNT ? parseInt(r.COUNT, 10) : Infinity;
  let until = Infinity;
  if (r.UNTIL) {
    const u = parseDt(r.UNTIL, {});
    if (u) until = u.allDay ? u.ms + DAY - 1 : u.ms;
  }
  const tod = ((ev.start % DAY) + DAY) % DAY;
  const ds = ev.start - tod;
  const sd = new Date(ds);
  const sy = sd.getUTCFullYear(), sm = sd.getUTCMonth(), sday = sd.getUTCDate(), sdow = sd.getUTCDay();
  const byday = (r.BYDAY || "").split(",").filter(Boolean).map((x) => {
    const m = x.match(/^([+-]?\d{1,2})?(SU|MO|TU|WE|TH|FR|SA)$/);
    return m ? { n: m[1] ? parseInt(m[1], 10) : 0, wd: WD[m[2]] } : null;
  }).filter((x): x is { n: number; wd: number } => !!x);
  const bymd = (r.BYMONTHDAY || "").split(",").filter(Boolean).map(Number);
  const bymonth = (r.BYMONTH || "").split(",").filter(Boolean).map(Number);
  const out: number[] = [];
  let n = 0;
  let done = false;

  const consider = (dayMs: number): boolean => {
    if (dayMs < ds) return true;
    const occ = dayMs + tod;
    if (occ > until || occ > toMs) { done = true; return false; }
    n++;
    if (n > count) { done = true; return false; }
    if (ex.has(occ) || exDays.has(dayMs)) return true;
    if (occ >= fromMs) out.push(occ);
    return true;
  };
  const dim = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const monthCands = (y: number, m: number): number[] => {
    const last = dim(y, m);
    let days: number[] = [];
    if (bymd.length) {
      days = bymd.map((d) => (d > 0 ? d : last + d + 1)).filter((d) => d >= 1 && d <= last);
    } else if (byday.length) {
      for (const b of byday) {
        const list: number[] = [];
        for (let d = 1; d <= last; d++) if (new Date(Date.UTC(y, m, d)).getUTCDay() === b.wd) list.push(d);
        if (b.n === 0) days.push(...list);
        else {
          const d = b.n > 0 ? list[b.n - 1] : list[list.length + b.n];
          if (d) days.push(d);
        }
      }
    } else if (sday <= last) {
      days = [sday];
    }
    return [...new Set(days)].sort((a, b) => a - b).map((d) => Date.UTC(y, m, d));
  };

  for (let p = 0; p < 8000 && !done; p++) {
    let cands: number[] = [];
    if (freq === "DAILY") {
      cands = [ds + p * interval * DAY];
    } else if (freq === "WEEKLY") {
      const base = ds - ((sdow + 6) % 7) * DAY + p * interval * 7 * DAY;
      const wds = byday.length ? byday.map((b) => b.wd) : [sdow];
      cands = wds.map((wd) => base + ((wd + 6) % 7) * DAY).sort((a, b) => a - b);
    } else if (freq === "MONTHLY") {
      const mi = sm + p * interval;
      cands = monthCands(sy + Math.floor(mi / 12), ((mi % 12) + 12) % 12);
    } else if (freq === "YEARLY") {
      const y = sy + p * interval;
      const months = (bymonth.length ? bymonth.map((x) => x - 1) : [sm]).sort((a, b) => a - b);
      for (const m of months) {
        const last = dim(y, m);
        const ds2 = (bymd.length ? bymd : [sday]).map((d) => (d > 0 ? d : last + d + 1)).filter((d) => d >= 1 && d <= last).sort((a, b) => a - b);
        for (const d of ds2) cands.push(Date.UTC(y, m, d));
      }
    } else {
      break;
    }
    for (const c of cands) if (!consider(c)) break;
  }
  return out;
}

export function toApple(cal: string, events: RawEv[], fromMs: number, toMs: number): AEv[] {
  const rids = new Map<string, { ms: Set<number>; days: Set<number> }>();
  for (const e of events) {
    if (!e.rid) continue;
    const o = rids.get(e.uid) || { ms: new Set<number>(), days: new Set<number>() };
    o.ms.add(e.rid.ms);
    if (e.rid.day) o.days.add(e.rid.ms);
    rids.set(e.uid, o);
  }
  const out: AEv[] = [];
  const seen = new Set<string>();
  for (const e of events) {
    if (e.cancelled) continue;
    const extra = !e.rid ? rids.get(e.uid) : undefined;
    const ex = extra ? new Set([...e.ex, ...extra.ms]) : e.ex;
    const exDays = extra ? new Set([...e.exDays, ...extra.days]) : e.exDays;
    for (const occ of expand(e, ex, exDays, fromMs, toMs)) {
      const date = msDate(occ);
      const dedupe = `${e.uid}|${date}|${e.allDay ? "" : msTime(occ)}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      // 종료일(연속일정) — 종일 일정은 그대로, 시간 일정은 24시간 이상일 때만 연속일정으로 취급
      // (밤 11시~새벽 1시 같은 일정이 이틀짜리 막대로 바뀌는 것 방지)
      let endDate: string | null = null;
      if (e.dur > 0 && (e.allDay || e.dur >= DAY)) {
        const endRaw = occ + e.dur;
        const last = e.allDay ? endRaw - DAY : (endRaw % DAY === 0 ? endRaw - 1 : endRaw);
        const ed = msDate(last);
        if (ed > date) endDate = ed;
      }
      const key = e.rid ? `${e.uid}#${msDate(e.rid.ms)}` : (e.rrule ? `${e.uid}#${date}` : e.uid);
      out.push({ cal, uid: e.uid, key, title: e.title, n: norm(e.title), date, endDate, time: e.allDay ? null : msTime(occ), allDay: e.allDay });
    }
  }
  return out;
}
