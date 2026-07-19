/* ============================================================
   OficinaPRO — Service Worker
   Estratégia: Network-First para app shell (updates imediatos),
               Network-First para dados Supabase,
               Cache apenas como fallback offline.

   ATENÇÃO — ao adicionar/renomear arquivos CSS ou JS:
   1. Inclua o caminho novo em APP_SHELL abaixo.
   2. Aumente o número da versão em CACHE_NAME (v7 → v8...)
      para forçar a atualização do cache nos aparelhos.
   ============================================================ */

const CACHE_NAME = 'oficina-pro-v7';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './assets/icons/icon.svg',

  // CSS (mesma lista do index.html)
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/shared.css',
  './css/print.css',
  './css/overrides.css',
  './css/pages/nova-os.css',
  './css/pages/os-view.css',
  './css/pages/lucratividade.css',
  './css/pages/login.css',
  './css/pages/configuracoes.css',
  './css/pages/assinatura.css',

  // JavaScript (módulos)
  './js/main.js',
  './js/config/constants.js',
  './js/core/navigation.js',
  './js/core/app-state.js',
  './js/core/profile-store.js',
  './js/services/supabase-client.js',
  './js/services/os-service.js',
  './js/services/fotos-service.js',
  './js/services/profile-service.js',
  './js/services/cep-service.js',
  './js/services/gps-service.js',
  './js/utils/dom.js',
  './js/utils/format.js',
  './js/utils/masks.js',
  './js/pages/login.js',
  './js/pages/dashboard.js',
  './js/pages/configuracoes.js',
  './js/pages/nfse.js',
  './js/pages/lucratividade.js',
  './js/pages/nova-os/state.js',
  './js/pages/nova-os/wizard.js',
  './js/pages/nova-os/itens.js',
  './js/pages/nova-os/pattern-lock.js',
  './js/pages/nova-os/fotos.js',
  './js/pages/nova-os/cliente-lookup.js',
  './js/pages/os-view/os-view.js',
  './js/pages/os-view/assinatura.js',
  './js/pages/os-view/editar.js',

  // Externos
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
