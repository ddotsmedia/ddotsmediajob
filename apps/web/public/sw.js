// DdotsMediaJobs service worker — lightweight offline shell.
const CACHE = 'ddots-v1';
const PRECACHE = ['/', '/jobs', '/offline'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

// Web push: show notification.
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { title: 'DdotsMediaJobs', body: event.data && event.data.text ? event.data.text() : '' }; }
  const title = data.title || 'DdotsMediaJobs';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/logo-mark.png',
      badge: '/logo-mark.png',
      data: { url: data.url || '/' },
    }),
  );
});

// Focus or open the target page on click.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  // Network-first for navigations; fall back to cache, then offline page.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/offline'))),
    );
    return;
  }

  // Cache-first for static assets.
  if (request.url.includes('/_next/static/') || /\.(?:png|jpg|svg|webp|woff2?)$/.test(request.url)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
        return res;
      })),
    );
  }
});
