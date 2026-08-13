// Timesheet service worker — caches the app shell for offline use.
// Bump V when you publish a change so clients pick up the new version.
// NOTE: uses the 'tsr-' prefix, and the activate cleanup below only deletes
// caches with the same prefix. The old shared name ('ts-v23') is still used
// by the v2/ copy of the app, and v3/ uses 'ts3-*' — this worker must never
// evict theirs.
const V = 'tsr-v1';
const FILES = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(V).then(c => c.addAll(FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k.startsWith('tsr-') && k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first for the HTML (so updates appear quickly when online),
// cache-first for everything else, with a cache fallback when offline.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const isHtml = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isHtml) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(V).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(r => r || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(V).then(c => c.put(req, copy));
      return res;
    }))
  );
});
