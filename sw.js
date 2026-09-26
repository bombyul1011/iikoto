// iikoto Service Worker
const CACHE = 'iikoto-v2.121-force-reload-postmsg';
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
  e.notification.close();
  const targetUrl = e.notification.data?.url || './';
  // iOS에서 openWindow()가 스코프 내 기존 창을 "새로고침 없이 포커스만" 하는 경우가 있어
  // (실제로 겪은 증상: 창은 열리는데 새로고침이 안 되고 팝업도 안 뜸), 그 경로를 신뢰하지 않기로 함.
  // 대신 기존 클라이언트가 있으면 postMessage로 강제 새로고침(location.reload)을 지시하고,
  // 없으면 openWindow로 새 창을 연다. 두 경로 모두 완료 후 서버에 로그를 남겨 진단(2026-09-26).
  e.waitUntil((async () => {
    await _debugLog('notificationclick:entered', targetUrl);
    try {
      const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (clientList.length > 0) {
        // 기존 창에 강제 새로고침 지시. postMessage는 freeze된 탭에서 씹힐 수 있으나,
        // notificationclick 자체가 사용자 제스처로 깨어난 시점이라 이전의 순수 postMessage
        // 실패 사례와는 조건이 다름 — 그래도 실패 대비 openWindow도 함께 시도.
        for (const c of clientList) {
          c.postMessage({ type: 'FORCE_RELOAD', url: targetUrl });
        }
        await _debugLog('notificationclick:postMessage_sent', clientList.length + ' clients');
      } else {
        await clients.openWindow(targetUrl);
        await _debugLog('notificationclick:openWindow_ok_no_existing_client');
      }
    } catch (err) {
      await _debugLog('notificationclick:error', String(err));
      try { await clients.openWindow(targetUrl); } catch (e2) {}
    }
  })());
});
