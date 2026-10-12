'use strict';

const CACHE_NAME = 'locales-nqn-v2';
const ASSETS_ESTATICOS = [
  './',
  './index.html',
  './leaflet.css',
  './leaflet.js',
  './comercios.json',
  './manifest.json'
];

// Instalación: intenta guardar assets en caché individualmente para que si uno falla no rompa todo
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of ASSETS_ESTATICOS) {
        try {
          await cache.add(asset);
        } catch (e) {
          console.warn('No se pudo cachear:', asset);
        }
      }
    }).then(() => self.skipWaiting())
  );
});

// Activación: elimina cachés viejas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Intercepción de peticiones
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorar métodos que no sean GET y llamados a Serverless Functions (/api/...)
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  // Para comercios.json: Network first, fallback a caché
  if (url.pathname.includes('comercios.json')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copia = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Para HTML / CSS / JS: Stale-While-Revalidate (devuelve caché rápido y actualiza de fondo)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse.ok) {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
        }
        return networkResponse;
      }).catch(() => {/* Offline */});

      return cachedResponse || fetchPromise;
    })
  );
});