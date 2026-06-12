const CACHE = "nimbus-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE)
            .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  // API calls — network first, cache fallback
  if (
    url.hostname.includes("open-meteo.com") ||
    url.hostname.includes("waqi.info") ||
    url.hostname.includes("geocoding-api.open-meteo.com")
  ) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE)
              .then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // App shell — cache first
  e.respondWith(
    caches.match(e.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          // Cache fonts or other assets on the fly
          if (url.origin === location.origin || url.hostname.includes("fonts.googleapis.com") || url.hostname.includes("fonts.gstatic.com")) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        });
      })
      .catch(() => {
        if (e.request.mode === "navigate" || (e.request.headers.get("accept") && e.request.headers.get("accept").includes("text/html"))) {
          return caches.match("/index.html");
        }
        // Return a basic error response or just let the browser handle it
        return new Response("Resource offline", { status: 503, statusText: "Offline" });
      })
  );
});

// Service Worker pre-fetching strategy for next/previous cities in the swipe sequence
self.addEventListener("message", e => {
  if (e.data && e.data.type === "PREFETCH_WEATHER") {
    const urls = e.data.urls || [];
    urls.forEach(url => {
      caches.open(CACHE).then(cache => {
        cache.match(url).then(cachedResponse => {
          // If not cached, fetch it from network and store in cache
          if (!cachedResponse) {
            console.log("[SW] Pre-fetching adjacent city resource:", url);
            fetch(url).then(res => {
              if (res.ok) {
                cache.put(url, res);
              }
            }).catch(err => {
              console.warn("[SW] SW Pre-fetch failed for URL:", url, err);
            });
          }
        });
      });
    });
  }
});

