// iikoto Service Worker
const CACHE = 'iikoto-v2.119-notif-client-navigate';
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

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const targetUrl = e.notification.data?.url || './';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clientList => {
      for (const c of clientList) {
        // postMessage는 백그라운드(freeze)에 있던 탭에서 메시지 리스너 자체가 깨어나지 않아
        // 씹히는 경우가 실제로 있었음(2026-09-26) — focus만으로는 JS 실행이 즉시 재개된다는 보장이 없음.
        // client.navigate()로 그 탭의 URL을 직접 바꾸면 콜드 스타트(openWindow)와 동일하게 페이지가
        // 다시 로드되면서 location.search를 처음부터 읽으므로, freeze 상태와 무관하게 동작함.
        if ('navigate' in c) {
          try {
            await c.navigate(targetUrl);
            return c.focus();
          } catch (err) {
            // navigate 실패 시 postMessage 대신 openWindow로 폴백 — 콜드 스타트와 동일한 검증된 경로.
            if (clients.openWindow) return clients.openWindow(targetUrl);
          }
        }
        await c.focus();
        c.postMessage({ type: 'notification-click', url: targetUrl });
        return;
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
