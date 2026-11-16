// 알라딘 ItemLookUp 프록시 — 카카오 책 검색으로 얻은 ISBN을 받아 알라딘에서 페이지 수(itemPage)만 조회해 반환
// 배포: Cloudflare Workers (wrangler 또는 대시보드에서 새 Worker 생성 후 이 코드로 교체)
// 사용 예: https://<worker-domain>/?isbn=9791199555112
// (보관본 주, 2026-11-16: 배포본에는 아래 TTB 키가 실제 값으로 적혀 있음. 공개 저장소라 여기서는 가림.
//  복원할 때는 알라딘 TTB 키를 넣거나, Worker 비밀값으로 옮겨 env에서 읽도록 바꿀 것)

const ALADIN_TTBKEY = '<ALADIN_TTB_KEY>';
const ALLOWED_ORIGIN = '*'; // 필요시 iikoto 배포 도메인으로 좁혀도 됨 (예: https://bombyul1011.github.io)

export default {
  async fetch(request) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const isbn = (url.searchParams.get('isbn') || '').replace(/[^0-9Xx]/g, '');

    if (!isbn) {
      return new Response(JSON.stringify({ error: 'isbn 파라미터가 필요합니다' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const itemIdType = isbn.length === 13 ? 'ISBN13' : 'ISBN';
    const aladinUrl = `https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx?ttbkey=${ALADIN_TTBKEY}&itemIdType=${itemIdType}&ItemId=${isbn}&output=js&Version=20131101&OptResult=packing`;

    try {
      const res = await fetch(aladinUrl);
      if (!res.ok) {
        return new Response(JSON.stringify({ error: `알라딘 조회 실패 (${res.status})` }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      const data = await res.json();
      const item = (data.item || [])[0];
      const pageCount = item && item.subInfo && item.subInfo.itemPage ? item.subInfo.itemPage : null;

      return new Response(JSON.stringify({ pageCount }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: '프록시 요청 중 오류', detail: String(e) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  },
};
