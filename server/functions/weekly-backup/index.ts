// ── weekly-backup Edge Function (감사 4단계, 2026-11-20) ──
// pg_cron이 매주 일요일 04:00 KST에 호출. 서버의 모든 표(public, backup* 제외)를 통째로 읽어
// 앱의 수동 백업과 같은 형식(format 'iikoto-backup' v1, manifest에 표별 행 수·해시)으로 묶고 gzip해서
// Cloudflare R2(iikoto-photo-proxy 워커의 /backup/)에 iikoto-YYYY-MM-DD.json.gz로 저장.
// 결과는 backup_log에 남기고(설정탭 "마지막 자동 백업" 표시용), 실패하면 alerts에 넣어 send-alerts가 푸시로 알림.
// 보관 정리(최근 8개 + 달마다 1개씩 1년)는 워커가 저장 직후에 함.
// 워커 업로드 비밀값: vault backup_secret = 워커 BACKUP_SECRET.
// 인증: x-cron-secret(예약 작업 전용 비밀값). ?dry=1이면 업로드 없이 행 수만 돌려줌.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BACKUP_URL = "https://iikoto-photo-proxy.faith-003.workers.dev/backup/";
const PAGE = 1000;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function kstDate() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}
async function fetchAll(t: string, pk: string) {
  const rows: unknown[] = [];
  const cols = pk ? pk.split(",") : [];
  for (let off = 0; ; off += PAGE) {
    let q = supabase.from(t).select("*");
    for (const c of cols) q = q.order(c, { ascending: true });
    const { data, error } = await q.range(off, off + PAGE - 1);
    if (error) throw new Error(`${t}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < PAGE) return rows;
  }
}
function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  const sec = req.headers.get("x-cron-secret") || "";
  const { data: okSecret } = sec ? await supabase.rpc("check_cron_secret", { s: sec }) : { data: false };
  if (okSecret !== true) return json({ error: "unauthorized" }, 401);
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  const file = `iikoto-${kstDate()}.json.gz`;
  try {
    // 업로드 비밀값은 vault(backup_secret)에 있음 — service_role만 읽을 수 있는 get_backup_secret()으로 가져옴
    const { data: BACKUP_SECRET, error: se } = await supabase.rpc("get_backup_secret");
    if (se || !BACKUP_SECRET) throw new Error("backup_secret 없음");
    const { data: list, error: le } = await supabase.rpc("backup_tables");
    if (le) throw new Error("표 목록: " + le.message);
    const tables: Record<string, unknown[]> = {};
    const manifest: Record<string, { rows: number; hash: string }> = {};
    let total = 0;
    for (const { t, pk } of list as { t: string; pk: string }[]) {
      const rows = await fetchAll(t, pk);
      tables[t] = rows;
      manifest[t] = { rows: rows.length, hash: await sha256Hex(JSON.stringify(rows)) };
      total += rows.length;
    }
    if (dry) return json({ ok: true, dry: true, file, row_total: total, manifest });
    const payload = {
      format: "iikoto-backup", format_version: 1, source: "auto", exported_at: new Date().toISOString(),
      project_ref: (SUPABASE_URL.match(/https:\/\/([^.]+)\./) || [])[1] || "", manifest, tables,
    };
    const gz = await new Response(
      new Blob([JSON.stringify(payload)]).stream().pipeThrough(new CompressionStream("gzip")),
    ).arrayBuffer();
    const up = await fetch(BACKUP_URL + file, {
      method: "PUT", headers: { "Content-Type": "application/gzip", "X-Backup-Secret": BACKUP_SECRET }, body: gz,
    });
    const upText = await up.text();
    if (!up.ok) throw new Error(`업로드 ${up.status} ${upText.slice(0, 200)}`);
    await supabase.from("backup_log").insert({ ok: true, file, bytes: gz.byteLength, row_total: total, manifest });
    return json({ ok: true, file, bytes: gz.byteLength, row_total: total, worker: JSON.parse(upText) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("백업 실패:", msg);
    await supabase.from("backup_log").insert({ ok: false, file, error: msg.slice(0, 500) });
    if (!dry) {
      await supabase.from("alerts").insert({
        source_type: "backup_failed", source_cid: kstDate(), alert_at: new Date().toISOString(),
        title: "자동 백업 실패", body: "이번 주 서버 자동 백업이 실패했어요. 설정탭에서 수동 백업을 한 번 해 주세요.",
      });
    }
    return json({ ok: false, error: msg }, 500);
  }
});
