// iikoto Service Worker
const CACHE = 'iikoto-v2.118-notif-focus-order-fix';
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
        // focus()를 먼저 완료한 뒤 postMessage를 보내도록 순서를 바꿈 — 이전엔 postMessage를 먼저 보내서,
        // 탭이 아직 백그라운드(스로틀링 상태)일 때 메시지가 도착해 처리가 밀리거나 씹히는 경우가 있었음
        // (특히 async 작업이 여러 개 걸리는 처리부일수록 취약). focus 완료 후 전송하면 포그라운드 상태가
        // 보장된 채로 메시지를 받으므로 훨씬 안정적(2026-09-26).
        await c.focus();
        c.postMessage({ type: 'notification-click', url: targetUrl });
        return;
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
