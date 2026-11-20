// ocr-proxy — Cloudflare Worker
// 역할: 클라이언트가 보낸 이미지(base64)를 Google Cloud Vision API로 중계해 텍스트만 추출해 반환.
// 이미지는 요청 처리 중에만 메모리에 존재하며, 어디에도 저장하지 않음(R2/KV 저장 코드 없음, 이미지 데이터 콘솔 로그 없음).
// Worker 비밀값: GOOGLE_VISION_API_KEY(구글 비전 키), APP_KEY_HASH(앱 설정의 등록 코드)
// 앱 키 검사(감사 P0-1 3단계, 2026-11-18): 요청 헤더 X-App-Key의 sha256이 APP_KEY_HASH와 같을 때만 처리 — 예전엔 인증이 없어 구글 비전 요금이 남에게 쓰일 수 있었음.

async function sha256Hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-App-Key',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: CORS });

    const appKey = request.headers.get('X-App-Key') || '';
    if (!appKey || !env.APP_KEY_HASH || (await sha256Hex(appKey)) !== env.APP_KEY_HASH) {
      return jsonResponse({ error: 'unauthorized' }, 401);
    }

    try {
      const { imageBase64 } = await request.json();
      if (!imageBase64) return jsonResponse({ error: 'imageBase64 누락' }, 400);
      if (imageBase64.length > 14 * 1024 * 1024) return jsonResponse({ error: '이미지가 너무 커요' }, 413);

      // data:image/jpeg;base64, 같은 접두어가 붙어 오면 제거
      const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

      const visionRes = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${env.GOOGLE_VISION_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [{
              image: { content: base64Data },
              features: [{ type: 'TEXT_DETECTION' }],
              imageContext: { languageHints: ['ko', 'en', 'ja'] },
            }],
          }),
        }
      );

      if (!visionRes.ok) {
        const errText = await visionRes.text();
        console.error('Vision API 오류', visionRes.status, errText);
        return jsonResponse({ error: 'OCR 처리 실패' }, 502);
      }

      const visionData = await visionRes.json();
      const annotations = visionData.responses?.[0]?.textAnnotations;
      const text = annotations && annotations.length > 0 ? annotations[0].description : '';
      return jsonResponse({ text: text.trim() });
    } catch (e) {
      console.error('OCR 프록시 처리 중 오류', e.message);
      return jsonResponse({ error: '요청 처리 실패' }, 500);
    }
  },
};

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}
