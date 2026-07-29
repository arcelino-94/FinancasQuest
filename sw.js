// ============================================================
// sw.js — Service Worker do Finanças Quest
// Necessário para: (1) o Chrome oferecer a instalação real do PWA
// e (2) o app funcionar minimamente offline.
// ============================================================

const CACHE_NOME = 'financas-quest-v1';

const ARQUIVOS_ESSENCIAIS = [
  './',
  './index.html',
  './app.js',
  './ui.js',
  './calculos.js',
  './gamificacao.js',
  './storage.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NOME)
      .then((cache) => cache.addAll(ARQUIVOS_ESSENCIAIS))
      .catch((err) => console.error('SW: falha ao pré-cachear', err))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(
        nomes.filter((n) => n !== CACHE_NOME).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

// Estratégia network-first: sempre busca a versão mais nova quando online
// (essencial já que o app está em desenvolvimento ativo), com fallback
// para o cache quando offline.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((resposta) => {
        const copia = resposta.clone();
        caches.open(CACHE_NOME).then((cache) => cache.put(event.request, copia));
        return resposta;
      })
      .catch(() => caches.match(event.request))
  );
});
