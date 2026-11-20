// iikoto-photo-proxy Worker
// R2 바인딩: env.PHOTO_BUCKET (Settings에서 이미 연결 완료)
// 배포 경로: Cloudflare 대시보드 → iikoto-photo-proxy → Overview → 코드 편집기에 이 내용 붙여넣기 → Deploy

// 최소 인증: 앱만 아는 비밀 헤더값. Worker Settings → Variables and Secrets에서
// UPLOAD_SECRET 이라는 이름으로 원하는 임의의 긴 문자열을 Secret으로 등록해두세요.
// (예: openssl rand -hex 24 로 생성한 값 등 — 아무 무작위 긴 문자열이면 충분)

// 앱 키 검사(감사 P0-1 3단계, 2026-11-18): 요청 헤더 X-App-Key의 sha256이 Worker 비밀값 APP_KEY_HASH(=앱 설정의 등록 코드)와 같으면 통과.
// 전환 기간에만 예전 X-Upload-Secret(UPLOAD_SECRET)도 받아 줌 — 모든 기기가 새 앱으로 바뀐 뒤 그 줄을 지울 예정.
async function sha256Hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function authorized(request, env) {
  const appKey = request.headers.get('X-App-Key') || '';
  if (appKey && env.APP_KEY_HASH && (await sha256Hex(appKey)) === env.APP_KEY_HASH) return true;
  const legacy = request.headers.get('X-Upload-Secret');
  return !!(env.UPLOAD_SECRET && legacy && legacy === env.UPLOAD_SECRET);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,X-Upload-Secret,X-App-Key'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    // 업로드: POST /upload/:key  (body = 이미지 바이너리, Content-Type: image/webp)
    if (request.method === 'POST' && url.pathname.startsWith('/upload/')) {
      if (!(await authorized(request, env))) {
        return new Response('unauthorized', { status: 401, headers: cors });
      }
      const key = decodeURIComponent(url.pathname.replace('/upload/', ''));
      if (!key || key.includes('..')) {
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
      if (!key || key.includes('..')) {
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
