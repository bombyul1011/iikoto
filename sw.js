// iikoto Service Worker
const CACHE = 'iikoto-v2.73-completed-time-edit';
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
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const c of clientList) {
        if ('focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
