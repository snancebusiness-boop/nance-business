// Nance Group — service worker
// Pages et fichiers : réseau d'abord (toujours la dernière version), copie locale en secours.
// Les données (Supabase) et les fonctions /api ne sont JAMAIS mises en cache.
const VERSION = 'nance-v2';
const ESSENTIELS = ['/offline.html', '/style.css?v=1', '/assets/icone-app.svg', '/icons/icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ESSENTIELS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(cles => Promise.all(cles.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return;

  e.respondWith(
    fetch(req).then(rep => {
      if (rep.ok) { const copie = rep.clone(); caches.open(VERSION).then(c => c.put(req, copie)); }
      return rep;
    }).catch(async () => {
      const enCache = await caches.match(req);
      if (enCache) return enCache;
      if (req.mode === 'navigate') return caches.match('/offline.html');
      return new Response('', { status: 503 });
    })
  );
});
