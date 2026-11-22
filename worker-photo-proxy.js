// iikoto-photo-proxy Worker
// R2 바인딩: env.PHOTO_BUCKET (Settings에서 이미 연결 완료)
// 배포 경로: Cloudflare 대시보드 → iikoto-photo-proxy → Overview → 코드 편집기에 이 내용 붙여넣기 → Deploy

// 앱 키 검사(감사 P0-1 3단계, 2026-11-18): 요청 헤더 X-App-Key의 sha256이 Worker 비밀값 APP_KEY_HASH(=앱 설정의 등록 코드)와 같으면 통과.
// 예전 X-Upload-Secret(UPLOAD_SECRET) 방식은 2026-11-22 폐기.
async function sha256Hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function authorized(request, env) {
  const appKey = request.headers.get('X-App-Key') || '';
  return !!(appKey && env.APP_KEY_HASH && (await sha256Hex(appKey)) === env.APP_KEY_HASH);
}

// 자동 백업 보관(감사 4단계, 2026-11-20): Supabase 백업 함수(weekly-backup)가 PUT /backup/<파일명>으로 올림.
// 비밀값 BACKUP_SECRET(헤더 X-Backup-Secret)으로만 접근. R2 안 위치는 backups/ — /photo/ 경로로는 절대 읽을 수 없게 막음.
// 보관 규칙: 최근 8개는 모두, 그보다 오래된 건 달마다 가장 이른 1개씩 12개월치만 남기고 정리.
const BACKUP_PREFIX = 'backups/';
function backupAuthorized(request, env) {
  const s = request.headers.get('X-Backup-Secret') || '';
  return !!(env.BACKUP_SECRET && s && s === env.BACKUP_SECRET);
}
async function listBackups(env) {
  const out = [];
  let cursor;
  do {
    const r = await env.PHOTO_BUCKET.list({ prefix: BACKUP_PREFIX, cursor });
    for (const o of r.objects) out.push({ key: o.key, name: o.key.slice(BACKUP_PREFIX.length), size: o.size, uploaded: o.uploaded });
    cursor = r.truncated ? r.cursor : undefined;
  } while (cursor);
  // 파일명 iikoto-YYYY-MM-DD.json.gz → 이름 역순 = 최신순
  return out.sort((a, b) => (a.name < b.name ? 1 : -1));
}
async function pruneBackups(env) {
  const all = await listBackups(env);
  const keep = new Set(all.slice(0, 8).map(b => b.key));
  const now = new Date();
  const cutoff = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 1)).toISOString().slice(0, 7);
  const firstOfMonth = {};
  for (const b of all.slice(8)) {
    const m = (b.name.match(/(\d{4}-\d{2})-\d{2}/) || [])[1];
    if (!m || m < cutoff) continue;
    if (!firstOfMonth[m] || b.name < firstOfMonth[m].name) firstOfMonth[m] = b;
  }
  for (const b of Object.values(firstOfMonth)) keep.add(b.key);
  const removed = [];
  for (const b of all) if (!keep.has(b.key)) { await env.PHOTO_BUCKET.delete(b.key); removed.push(b.name); }
  return { kept: keep.size, removed };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,X-App-Key,X-Backup-Secret'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    // 자동 백업: PUT /backup/<파일명>(저장 후 보관 규칙대로 정리), GET /backup/(목록), GET /backup/<파일명>(내려받기)
    if (url.pathname.startsWith('/backup/')) {
      if (!backupAuthorized(request, env)) {
        return new Response('unauthorized', { status: 401, headers: cors });
      }
      const name = decodeURIComponent(url.pathname.slice('/backup/'.length));
      if (name && !/^[A-Za-z0-9._-]+$/.test(name)) {
        return new Response('bad name', { status: 400, headers: cors });
      }
      if (request.method === 'PUT' && name) {
        const body = await request.arrayBuffer();
        if (body.byteLength > 50 * 1024 * 1024) return new Response('too large', { status: 413, headers: cors });
        await env.PHOTO_BUCKET.put(BACKUP_PREFIX + name, body, {
          httpMetadata: { contentType: request.headers.get('Content-Type') || 'application/gzip' }
        });
        const pruned = await pruneBackups(env);
        return new Response(JSON.stringify({ ok: true, name, bytes: body.byteLength, ...pruned }), {
          headers: { ...cors, 'Content-Type': 'application/json' }
        });
      }
      if (request.method === 'GET' && !name) {
        return new Response(JSON.stringify(await listBackups(env)), { headers: { ...cors, 'Content-Type': 'application/json' } });
      }
      if (request.method === 'GET' && name) {
        const obj = await env.PHOTO_BUCKET.get(BACKUP_PREFIX + name);
        if (!obj) return new Response('not found', { status: 404, headers: cors });
        return new Response(obj.body, { headers: { ...cors, 'Content-Type': obj.httpMetadata?.contentType || 'application/gzip', 'Cache-Control': 'no-store' } });
      }
      return new Response('method not allowed', { status: 405, headers: cors });
    }

    // 업로드: POST /upload/:key  (body = 이미지 바이너리, Content-Type: image/webp)
    if (request.method === 'POST' && url.pathname.startsWith('/upload/')) {
      if (!(await authorized(request, env))) {
        return new Response('unauthorized', { status: 401, headers: cors });
      }
      const key = decodeURIComponent(url.pathname.replace('/upload/', ''));
      if (!key || key.includes('..') || key.startsWith(BACKUP_PREFIX)) {
        return new Response('bad key', { status: 400, headers: cors });
      }
      // 2단계 보완(감사 P1-12): 이미지 형식만, 10MB 이하만 받음 — 예전엔 크기·형식 제한이 없었음
      const ctype = request.headers.get('Content-Type') || '';
      if (!/^image\/(webp|jpeg|png|heic|heif)$/i.test(ctype)) {
        return new Response('bad type', { status: 415, headers: cors });
      }
      const body = await request.arrayBuffer();
      if (body.byteLength > 10 * 1024 * 1024) {
        return new Response('too large', { status: 413, headers: cors });
      }
      await env.PHOTO_BUCKET.put(key, body, {
        httpMetadata: { contentType: request.headers.get('Content-Type') || 'image/webp' }
      });
      return new Response(JSON.stringify({ ok: true, key }), {
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    // 삭제: DELETE /upload/:key — 메모 삭제 시 R2 원본까지 함께 정리하기 위한 엔드포인트.
    // 업로드와 같은 시크릿으로 보호(같은 자격이면 지울 수 있어야 하므로 별도 시크릿 불필요).
    if (request.method === 'DELETE' && url.pathname.startsWith('/upload/')) {
      if (!(await authorized(request, env))) {
        return new Response('unauthorized', { status: 401, headers: cors });
      }
      const key = decodeURIComponent(url.pathname.replace('/upload/', ''));
      if (!key || key.includes('..') || key.startsWith(BACKUP_PREFIX)) {
        return new Response('bad key', { status: 400, headers: cors });
      }
      await env.PHOTO_BUCKET.delete(key);
      // 조회용 엣지 캐시에도 같은 URL로 남아있을 수 있어 함께 무효화
      const photoUrl = new URL(`/photo/${key}`, url.origin);
      await caches.default.delete(new Request(photoUrl.toString()));
      return new Response(JSON.stringify({ ok: true, key }), {
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    // 조회: GET /photo/:key — Cloudflare 엣지 캐시를 명시적으로 사용해 두 번째 조회부터는
    // R2까지 가지 않고 엣지에서 바로 응답(체감 로딩 지연/깜빡임 감소)
    if (request.method === 'GET' && url.pathname.startsWith('/photo/')) {
      const cache = caches.default;
      const cacheKey = new Request(url.toString(), request);
      const cached = await cache.match(cacheKey);
      if (cached) return cached;

      const key = decodeURIComponent(url.pathname.replace('/photo/', ''));
      if (key.startsWith(BACKUP_PREFIX)) return new Response('not found', { status: 404, headers: cors });
      const obj = await env.PHOTO_BUCKET.get(key);
      if (!obj) {
        return new Response('not found', { status: 404, headers: cors });
      }
      const response = new Response(obj.body, {
        headers: {
          ...cors,
          'Content-Type': obj.httpMetadata?.contentType || 'image/webp',
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      });
      // 스트림은 한 번만 읽을 수 있어 캐시 저장용으로 clone해서 넣음
      await cache.put(cacheKey, response.clone());
      return response;
    }

    return new Response('iikoto-photo-proxy', { headers: cors });
  }
};
