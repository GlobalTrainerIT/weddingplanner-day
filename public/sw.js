const CACHE_NAME = 'vow-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and Supabase API calls (except cached routes)
  if (request.method !== 'GET') return;
  if (url.hostname.includes('supabase.co') && !url.pathname.includes('/storage/')) return;

  // Network-first for navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/index.html')))
    );
    return;
  }

  // Cache-first for static assets (JS, CSS, images, fonts)
  if (request.destination === 'script' || request.destination === 'style' || request.destination === 'image' || request.destination === 'font') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => cached);
      })
    );
    return;
  }

  // Stale-while-revalidate for Supabase storage (vendor contracts, images)
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/storage/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }
});

// Listen for messages from the app (e.g., cache specific pages)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_PAGE') {
    caches.open(CACHE_NAME).then((cache) => cache.add(event.data.url));
  }
});

// ============================================================
// Push notifications
// ============================================================

self.addEventListener('push', (event) => {
  let payload;
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Vow Wedding Planner', body: event.data ? event.data.text() : '' };
  }

  const { title, body, icon, badge, tag, data } = payload;
  const options = {
    body: body || '',
    icon: icon || '/icon-192.webp',
    badge: badge || '/icon-192.webp',
    tag: tag || 'vow-notification',
    data: data || {},
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title || 'Vow Wedding Planner', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Only ever navigate within this app: a push payload is attacker-influenced
  // data, so an absolute URL in it must never become an open redirect.
  const deepLink = event.notification.data?.deepLink || '/';
  let url = self.location.origin + '/';
  try {
    const parsed = new URL(deepLink, self.location.origin);
    if (parsed.origin === self.location.origin) {
      url = parsed.href;
    }
  } catch (e) {
    // keep the default
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if one is open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(url);
    })
  );
});

