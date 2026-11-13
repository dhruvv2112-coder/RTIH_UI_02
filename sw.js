// Offline-first shell cache (Brief P4). Paths are relative so the app works at / (Vercel) and
// under /field/ on the Godavari Hub. Network-first for app files (fresh code when online, cached
// copy when offline); cache-first for fonts. Hub API calls (/api/*) are never cached.
const CACHE = 'godavari-field-v3';
const ASSETS = [
  './', 'index.html', 'manifest.webmanifest', 'assets/icon.svg',
  'src/styles/tokens.css', 'src/styles/base.css', 'src/styles/components.css', 'src/styles/screens.css',
  'src/js/app.js', 'src/js/store.js', 'src/js/data.js', 'src/js/icons.js', 'src/js/util.js', 'src/js/ui.js', 'src/js/bus.js', 'src/js/overlays.js', 'src/js/live.js',
  'src/js/screens/tasks.js', 'src/js/screens/map.js', 'src/js/screens/report.js', 'src/js/screens/inspection.js', 'src/js/screens/profile.js',
];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) return;
  if (url.host.includes('fonts.g')) {
    e.respondWith(caches.match(request).then((hit) => hit || fetch(request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); return r; })));
    return;
  }
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(request)
      .then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); } return r; })
      .catch(async () => (await caches.match(request, { ignoreSearch: true })) || (request.mode === 'navigate' ? caches.match('index.html') : Response.error())),
  );
});
