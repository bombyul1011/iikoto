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
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const targetUrl = e.notification.data?.url || './';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clientList => {
      const c = clientList[0];
      if (c && 'navigate' in c) {
        await c.navigate(targetUrl);
        return c.focus();
      }
      return clients.openWindow(targetUrl);
    })
  );
});
