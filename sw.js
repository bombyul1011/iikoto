// iikoto Service Worker
const CACHE = 'iikoto-v2.15-rhythm-track-tweaks';
const ASSETS = [
  './',
  './index.html'
];

// 설치 — 핵심 파일 캐시
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

// 활성화 — 이전 캐시 삭제 후 즉시 클라이언트 점유
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 요청 처리 — 네트워크 우선, 실패시 캐시
self.addEventListener('fetch', e => {
  // Supabase API는 캐시 안 함
  if(e.request.url.includes('supabase.co')) return;
  // GET이 아닌 요청(POST/DELETE 등)은 caches.put()이 아예 지원하지 않아 여기서 가로채면
  // "Returned response is null" 에러로 fetch 자체가 실패한 것처럼 깨짐 — photo-proxy의
  // 업로드(POST)/삭제(DELETE) 요청이 대표적인 예. 이런 요청은 그냥 네트워크로 흘려보냄.
  if(e.request.method !== 'GET') return;
  // 사진 프록시(workers.dev)도 캐시 대상에서 제외 — R2 원본에 이미 immutable 캐시 헤더가
  // 걸려있고(worker-photo-proxy.js), sw 캐시까지 얹으면 삭제 후에도 옛 이미지가 sw 캐시에
  // 남아 보일 수 있어 이중 캐시를 피함.
  if(e.request.url.includes('workers.dev')) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // 성공하면 캐시 업데이트
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => {
        // 오프라인이면 캐시에서 — 상대경로 './'로 폴백 (앱 루트, 절대경로 '/' 아님)
        return caches.match(e.request) || caches.match('./');
      })
  );
});
