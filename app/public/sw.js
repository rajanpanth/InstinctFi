// InstinctFi Service Worker — offline shell + cache + push notifications
//
// Bump CACHE_VERSION on every release to bust the old cache.
// The activate event automatically purges old versioned caches.
const CACHE_VERSION = 3;
const CACHE_NAME = `instinctfi-v${CACHE_VERSION}`;
const PRECACHE_URLS = [
  "/",
  "/polls",
  "/create",
  "/leaderboard",
  "/activity",
  "/portfolio",
  "/offline.html",
];

// Static assets to cache aggressively
const STATIC_EXTENSIONS = [".js", ".css", ".woff2", ".woff", ".png", ".svg", ".ico", ".webp"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Network-first for API and data requests
  if (event.request.url.includes("/api/") || event.request.method !== "GET") {
    return;
  }

  // Cache-first for static assets (JS, CSS, fonts, images)
  const url = new URL(event.request.url);
  const isStatic = STATIC_EXTENSIONS.some((ext) => url.pathname.endsWith(ext));

  if (isStatic) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Stale-while-revalidate for page navigations
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            cache.put(event.request, response.clone());
          }
          return response;
        })
        .catch(() => {
          // If both network and cache fail, show offline page for navigations
          if (event.request.mode === "navigate") {
            return caches.match("/offline.html");
          }
          return cached;
        });

      return cached || fetchPromise;
    })
  );
});

// ── Push Notifications ─────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || "Something happened on InstinctFi",
      icon: "/logo.svg",
      badge: "/logo.svg",
      tag: data.tag || "instinctfi-notification",
      data: {
        url: data.url || "/",
      },
      actions: data.actions || [],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || "InstinctFi", options)
    );
  } catch (e) {
    console.error("Push notification error:", e);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Focus existing tab if available
        for (const client of clients) {
          if (client.url.includes(url) && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open a new tab
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});

