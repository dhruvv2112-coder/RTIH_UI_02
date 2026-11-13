// Offline-first shell cache (Brief P4). Network-first for HTML, cache-first for static assets.
const CACHE = 'godavari-field-v2';
// Paths are relative to the worker's scope so the app works at / (Vercel) and /staff/ (local suite).
const ASSETS = [
  './', 'index.html', 'manifest.webmanifest', 'assets/icon.svg',
  'src/styles/tokens.css', 'src/styles/base.css', 'src/styles/components.css', 'src/styles/screens.css',
  'src/js/app.js', 'src/js/store.js', 'src/js/data.js', 'src/js/icons.js', 'src/js/util.js', 'src/js/ui.js', 'src/js/bus.js', 'src/js/overlays.js',
  'src/js/live.js', 'src/js/geo.js', 'src/js/map3d.js', 'src/js/map3d-staff.js',
  'src/js/screens/tasks.js', 'src/js/screens/map.js', 'src/js/screens/report.js', 'src/js/screens/inspection.js', 'src/js/screens/profile.js',
].map((p) => new URL(p, self.registration.scope).href);
const INDEX = new URL('index.html', self.registration.scope).href;
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) return; // live link: never cache
  if (request.mode === 'navigate') {
    e.respondWith(fetch(request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(INDEX, copy)); return r; }).catch(() => caches.match(INDEX)));
    return;
  }
  e.respondWith(caches.match(request).then((hit) => hit || fetch(request).then((r) => {
    if (r.ok && (url.origin === location.origin || url.host.includes('fonts.g'))) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); }
    return r;
  })));
});
