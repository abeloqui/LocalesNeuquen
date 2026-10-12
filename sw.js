/* Directorio Libre Neuquén – Service Worker
   Estrategia híbrida, tolerante a fallos, sin frameworks.
   - Estáticos: Cache-First / Stale-While-Revalidate
   - Datos públicos (comercios): Network-First con fallback a caché
   - API / POST: siempre red (nunca cachear)
*/
'use strict';

const VERSION = 'dirlibre-nqn-v1';
const STATIC_CACHE = VERSION + '-static';
const DATA_CACHE  = VERSION + '-data';

/* Assets que se precachean. Si uno falla, no se rompe la instalación. */
const PRECACHE = [
  './',
  './index.html',
  './leaflet.css',
  './leaflet.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

/* ---------- helpers ---------- */
function esPeticionApi(url) {
  return url.pathname.startsWith('/api/') ||
         url.pathname.includes('/api/');
}

function esDatosComercios(url) {
  // comercios.json estático o GET público de la API de listado
  return url.pathname.endsWith('/comercios.json') ||
         (url.pathname.endsWith('/api/comercios') && !url.search.includes('accion='));
}

/* ---------- install: precache tolerante ---------- */
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    // Bucle tolerante: un asset que falle no cancela la instalación
    for (const url of PRECACHE) {
      try {
        await cache.add(url);
      } catch (err) {
        // silencioso: el asset se pedirá bajo demanda más tarde
      }
    }
    self.skipWaiting();
  })());
});

/* ---------- activate: limpieza de cachés viejas ---------- */
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k.startsWith('dirlibre-nqn-') && k !== STATIC_CACHE && k !== DATA_CACHE)
        .map((k) => caches.delete(k))
    );
    self.clients.claim();
  })());
});

/* ---------- fetch: estrategia por tipo ---------- */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;               // POST y demás → red pura

  const url = new URL(req.url);

  // Solo mismo origen (o assets relativos)
  if (url.origin !== self.location.origin) return;

  // API (login, guardar, solicitud, geocodificar…) → nunca cachear
  if (esPeticionApi(url) && !esDatosComercios(url)) return;

  // ---- Datos de comercios: Network-First + fallback a caché ----
  if (esDatosComercios(url)) {
    event.respondWith(networkFirstDatos(req));
    return;
  }

  // ---- Estáticos y resto de la app: Cache-First / SWR ----
  event.respondWith(cacheFirstStatic(req));
});

/* Network-First para datos (con timeout suave y fallback) */
async function networkFirstDatos(req) {
  const cache = await caches.open(DATA_CACHE);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(req, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(timer);
    if (res && res.ok) {
      // Clonar y guardar en segundo plano
      cache.put(req, res.clone()).catch(() => {});
      return res;
    }
  } catch (_) { /* red caída o timeout */ }

  const cached = await cache.match(req);
  if (cached) return cached;

  // Último recurso: respuesta vacía controlada para no romper el JSON parse
  return new Response(JSON.stringify({ ok: true, items: [], inicializado: false, offline: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'X-Offline': '1' }
  });
}

/* Cache-First / Stale-While-Revalidate para estáticos */
async function cacheFirstStatic(req) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(req);
  if (cached) {
    // Revalidar en segundo plano
    fetch(req).then((res) => {
      if (res && res.ok) cache.put(req, res).catch(() => {});
    }).catch(() => {});
    return cached;
  }

  try {
    const res = await fetch(req);
    if (res && res.ok) {
      cache.put(req, res.clone()).catch(() => {});
    }
    return res;
  } catch (_) {
    // Fallback mínimo para navegación
    if (req.mode === 'navigate') {
      const fallback = await cache.match('./index.html') || await cache.match('./');
      if (fallback) return fallback;
    }
    return new Response('Sin conexión', { status: 503, statusText: 'Offline' });
  }
}
