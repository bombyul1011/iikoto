// iikoto Service Worker
const CACHE = 'iikoto-v20260823-nextweek-suggest';
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
