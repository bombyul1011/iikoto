// iikoto Service Worker
const CACHE = 'iikoto-v2.16-cleanup2';
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
  // [2026-10-01] Declarative Web Push(iOS 18.4+): 서버가 {web_push:8030, notification:{navigate…}} 형식으로 보내면
  // 브라우저가 알림을 직접 띄우고, 탭하면 navigate URL로 앱을 연다(앱이 백그라운드/종료여도 OS가 처리).
  // 여기서 showNotification을 또 부르면 그 알림이 선언형 알림을 대체해 탭 동작이 다시 이 SW의 notificationclick(iOS 백그라운드에서
  // 발화 안 함)에 의존하게 되므로, 선언형이면 아무것도 하지 않고 브라우저 기본 표시에 맡긴다.
  if (e.notification) { e.waitUntil(Promise.resolve()); return; }
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

// 알림 클릭 처리 방식 재설계(2026-09-26): notificationclick 이벤트가 iOS PWA 백그라운드
// 조건에서 발화하지 않는 사례를 확인함(핸들러 진입 로그 자체가 안 찍힘, 웹사이트 데이터
// 완전 삭제 후 재설치해도 재현). 그래서 이 핸들러에 팝업 표시 책임을 더 이상 지우지 않고,
// 그 역할은 app.js의 checkPendingAlerts()(포그라운드 복귀 시 서버 폴링)로 완전히 이관했다.
// 여기서는 시스템이 이미 열어준 창을 최대한 활용하는 최소한의 시도만 하고, 이게 실패해도
// 앱은 정상 동작한다(다음 포그라운드 전환 때 checkPendingAlerts가 알아서 팝업을 띄움).
self.addEventListener('notificationclick', e => {
  // 선언형 알림(navigate 보유)은 브라우저가 해당 URL로 이동시키므로 여기서 가로채지 않는다.
  if (e.notification && e.notification.navigate) return;
  e.notification.close();
  const targetUrl = e.notification.data?.url || './';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (clientList.length > 0) return clientList[0].focus().catch(()=>{});
      return clients.openWindow(targetUrl).catch(()=>{});
    }).catch(()=>{})
  );
});
