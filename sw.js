// iikoto Service Worker
const CACHE = 'iikoto-v2.120-notif-force-reload';
const ASSETS = [
  './',
  './index.html'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if(e.request.url.includes('supabase.co')) return;
  if(e.request.method !== 'GET') return;
  if(e.request.url.includes('workers.dev')) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => {
        return caches.match(e.request) || caches.match('./');
      })
  );
});

self.addEventListener('push', e => {
  let data = { title: '이이코토', body: '', url: './' };
  try {
    if (e.data) data = { ...data, ...e.data.json() };
  } catch (err) {
    if (e.data) data.body = e.data.text();
  }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icon-192.png',
      badge: './icon-192.png',
      data: { url: data.url || './' }
    })
  );
});

// 알림 클릭 시 열려있는 탭이 있으면 그 탭을 새 URL로 새로고침(navigate)하고, 없으면 새 창을 연다.
// postMessage로 열려있는 페이지에 메시지만 전달하던 이전 방식은 앱이 백그라운드에 오래 있을 때
// 페이지의 JS 실행이 멈춰(freeze) 메시지가 씹히는 문제가 있어 폐기(2026-09-26).
// navigate/openWindow 둘 다 페이지를 처음부터 새로 읽게 만들어 location.search 파싱 경로 하나로 통일.
// ── 임시 디버그 로깅 (2026-09-26) ──
// notificationclick 핸들러 진입 여부 자체를 확인하기 위함. 확인 끝나면 이 블록과
// debug_log 테이블은 지워도 됨. 콘솔을 못 보는 환경이라 서버 테이블에 남긴다.
const SUPA_URL='https://vqvpzrxmtpryzhontlxc.supabase.co';
const SUPA_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxdnB6cnhtdHByeXpob250bHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNTgxMjksImV4cCI6MjA5NjYzNDEyOX0.pbtq1UMPC7ylYM1H2xVa19C1TFlceLmEfEtkz3WK2VI';
async function _debugLog(step, extra){
  try{
    await fetch(SUPA_URL+'/rest/v1/debug_log', {
      method:'POST',
      headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Content-Type':'application/json','Prefer':'return=minimal'},
      body: JSON.stringify({ step, extra: extra||null, created_at: new Date().toISOString() })
    });
  }catch(err){ /* 로깅 실패는 무시 — 본 로직에 영향 주면 안 됨 */ }
}

self.addEventListener('notificationclick', e => {
  _debugLog('notificationclick:entered', e.notification.data?.url); // 핸들러 진입 여부 확인용
  e.notification.close();
  const targetUrl = e.notification.data?.url || './';
  // iOS Safari(WebKit)에서 client.navigate()는 백그라운드/frozen 탭에 대해 신뢰할 수 없이 동작함
  // (호출/await는 되지만 실제 네비게이션이 일어나지 않는 사례). navigate()를 완전히 버리고
  // 항상 openWindow()로 통일 — PWA 스코프 내 URL이면 대부분 플랫폼이 기존 창을 재사용/포커스함(2026-09-26).
  e.waitUntil(
    clients.openWindow(targetUrl).then(
      () => _debugLog('notificationclick:openWindow_ok'),
      (err) => _debugLog('notificationclick:openWindow_fail', String(err))
    )
  );
});
