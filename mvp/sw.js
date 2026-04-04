/* ============================================================
   OficinaPRO — Service Worker
   Estratégia: Network-First para app shell (updates imediatos),
               Network-First para dados Supabase,
               Cache apenas como fallback offline.
   ============================================================ */

const CACHE_NAME = 'oficina-pro-v4';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './supabase.js',
  './manifest.json',
  './icon.svg',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js'
];

/* ── Install: pré-cacheia o app shell ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

/* ── Activate: remove caches antigos ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* ── Fetch: Network-First para tudo ── */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // Network-First: tenta buscar da rede, usa cache só se offline
  event.respondWith(
    fetch(event.request).then(response => {
      if (!response || response.status !== 200 || response.type === 'opaque') {
        return response;
      }
      // Atualiza o cache com a versão mais recente
      const toCache = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
      return response;
    }).catch(() => caches.match(event.request))
  );
});
