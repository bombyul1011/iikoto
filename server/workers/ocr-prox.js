// ocr-proxy — Cloudflare Worker
// 역할: 클라이언트가 보낸 이미지(base64)를 Google Cloud Vision API로 중계해 텍스트만 추출해 반환.
// 이미지는 요청 처리 중에만 메모리에 존재하며, 어디에도 저장하지 않음(R2/KV 저장 코드 없음, 이미지 데이터 콘솔 로그 없음).
//
// 배포 방법:
// 1. Cloudflare 대시보드 → Workers & Pages → Create → Worker 생성 (이름 예: ocr-proxy)
// 2. 이 파일 내용을 Worker 편집기에 붙여넣기
// 3. Settings → Variables → Secret 추가: 이름 GOOGLE_VISION_API_KEY, 값에 발급받은 API 키 입력
//    (Secret으로 넣으면 대시보드에서도 값이 다시 노출되지 않음 — 평문 환경변수 아님)
// 4. Deploy
// 5. 배포된 URL(예: ocr-proxy.<계정>.workers.dev)을 index.html의 OCR_PROXY_URL에 넣기

export default {
  async fetch(request, env) {
    // CORS preflight 대응
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    try {
      const { imageBase64 } = await request.json();
      if (!imageBase64) {
        return jsonResponse({ error: 'imageBase64 누락' }, 400);
      }

      // data:image/jpeg;base64, 같은 접두어가 붙어 오면 제거
      const base64Data = imageBase64.includes(',')
        ? imageBase64.split(',')[1]
        : imageBase64;

      const visionRes = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${env.GOOGLE_VISION_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [
              {
                image: { content: base64Data },
                features: [{ type: 'TEXT_DETECTION' }],
imageContext: { languageHints: ['ko', 'en', 'ja'] }              },
            ],
          }),
        }
      );

      if (!visionRes.ok) {
        // Vision API 에러 응답 본문에 이미지 데이터는 포함되지 않으므로 그대로 로그해도 안전
        const errText = await visionRes.text();
        console.error('Vision API 오류', visionRes.status, errText);
        return jsonResponse({ error: 'OCR 처리 실패' }, 502);
      }

      const visionData = await visionRes.json();
      const annotations = visionData.responses?.[0]?.textAnnotations;
      // 첫 번째 annotation이 전체 인식 텍스트(좌표 등 메타데이터는 제외하고 텍스트만 추출)
      const text = annotations && annotations.length > 0 ? annotations[0].description : '';

      return jsonResponse({ text: text.trim() });
    } catch (e) {
      console.error('OCR 프록시 처리 중 오류', e.message);
      return jsonResponse({ error: '요청 처리 실패' }, 500);
    }
  },
};

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
