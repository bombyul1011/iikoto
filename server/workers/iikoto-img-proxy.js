// iikoto-img-proxy Worker — 2단계 보완안(감사 P1-12, 2026-11-16)
// 포스터·표지 이미지를 CORS 허용으로 중계(공유 카드 canvas 그리기용).
// 바뀐 점: 허용한 이미지 제공처(TMDB·애플뮤직·카카오·다음·알라딘)의 https 주소만 중계하고,
//          응답이 이미지일 때만 돌려줌 — 예전엔 아무 주소나 대신 받아 줘서 남의 중계기로 쓰일 수 있었음.
const ALLOWED_HOSTS = [
  /^image\.tmdb\.org$/,
  /(^|\.)mzstatic\.com$/,
  /(^|\.)kakaocdn\.net$/,
  /(^|\.)daumcdn\.net$/,
  /^image\.aladin\.co\.kr$/,
];
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname !== '/img-proxy') return new Response('Not found', { status: 404 });
    const imgUrl = url.searchParams.get('url');
    if (!imgUrl) return new Response('Missing url', { status: 400 });
    let target;
    try { target = new URL(imgUrl); } catch { return new Response('Bad url', { status: 400 }); }
    if (target.protocol !== 'https:' || !ALLOWED_HOSTS.some(re => re.test(target.hostname))) {
      return new Response('Host not allowed', { status: 403 });
    }
    const res = await fetch(target.toString());
    const type = res.headers.get('Content-Type') || '';
    if (!res.ok || !type.startsWith('image/')) return new Response('Not an image', { status: 502 });
    const headers = new Headers({ 'Content-Type': type, 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=86400' });
    return new Response(res.body, { status: 200, headers });
  }
}
