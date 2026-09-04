// iikoto-photo-proxy Worker
// R2 바인딩: env.PHOTO_BUCKET (Settings에서 이미 연결 완료)
// 배포 경로: Cloudflare 대시보드 → iikoto-photo-proxy → Overview → 코드 편집기에 이 내용 붙여넣기 → Deploy

// 최소 인증: 앱만 아는 비밀 헤더값. Worker Settings → Variables and Secrets에서
// UPLOAD_SECRET 이라는 이름으로 원하는 임의의 긴 문자열을 Secret으로 등록해두세요.
// (예: openssl rand -hex 24 로 생성한 값 등 — 아무 무작위 긴 문자열이면 충분)

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,X-Upload-Secret'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    // 업로드: POST /upload/:key  (body = 이미지 바이너리, Content-Type: image/webp)
    if (request.method === 'POST' && url.pathname.startsWith('/upload/')) {
      const secret = request.headers.get('X-Upload-Secret');
      if (!env.UPLOAD_SECRET || secret !== env.UPLOAD_SECRET) {
        return new Response('unauthorized', { status: 401, headers: cors });
      }
      const key = decodeURIComponent(url.pathname.replace('/upload/', ''));
      if (!key || key.includes('..')) {
        return new Response('bad key', { status: 400, headers: cors });
      }
      const body = await request.arrayBuffer();
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
      const secret = request.headers.get('X-Upload-Secret');
      if (!env.UPLOAD_SECRET || secret !== env.UPLOAD_SECRET) {
        return new Response('unauthorized', { status: 401, headers: cors });
      }
      const key = decodeURIComponent(url.pathname.replace('/upload/', ''));
      if (!key || key.includes('..')) {
        return new Response('bad key', { status: 400, headers: cors });
      }
      console.log('[삭제 요청] key:', key);
      const existedBefore = await env.PHOTO_BUCKET.head(key);
      console.log('[삭제 전 존재여부]', existedBefore ? '있음' : '없음(=이미 없거나 key불일치)');
      await env.PHOTO_BUCKET.delete(key);
      const existedAfter = await env.PHOTO_BUCKET.head(key);
      console.log('[삭제 후 존재여부]', existedAfter ? '여전히 있음(삭제실패)' : '없음(삭제성공)');
      // 조회용 엣지 캐시에도 같은 URL로 남아있을 수 있어 함께 무효화
      const photoUrl = new URL(`/photo/${key}`, url.origin);
      await caches.default.delete(new Request(photoUrl.toString()));
      return new Response(JSON.stringify({ ok: true, key, existedBefore: !!existedBefore, existedAfter: !!existedAfter }), {
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
