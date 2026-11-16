// iikoto-img-proxy Worker (배포본 그대로, 2026-11-16 보관)
// 포스터·표지 이미지를 CORS 허용으로 중계 — 공유 카드(canvas) 그리기에 사용.
// 감사 P1-12: 아무 주소나 받아 주므로 허용 주소 제한 예정(2단계).
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/img-proxy') {
      const imgUrl = url.searchParams.get('url');
      if (!imgUrl) return new Response('Missing url', { status: 400 });
      const res = await fetch(imgUrl);
      const headers = new Headers(res.headers);
      headers.set('Access-Control-Allow-Origin', '*');
      return new Response(res.body, { status: res.status, headers });
    }
    return new Response('Not found', { status: 404 });
  }
}
