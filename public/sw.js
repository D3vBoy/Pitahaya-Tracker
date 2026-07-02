const CACHE_VERSION = "pitahaya-pwa-v3";
const PRECACHE_URLS = ["/pitahaya.webmanifest", "/api/pwa-icon/192", "/api/pwa-icon/512"];

function isNextAsset(url) {
  return url.pathname.startsWith("/_next/");
}

function isManifestRequest(url) {
  return url.pathname === "/pitahaya.webmanifest" || url.pathname === "/manifest.webmanifest";
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isNextAsset(url)) {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  if (isManifestRequest(url)) {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response("Sin conexion", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        })
    );
    return;
  }

  const isStaticAsset = ["style", "script", "image", "font"].includes(request.destination);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Pitahaya Tracker", body: event.data.text() };
  }

  const title = payload.title || "Nuevo mensaje";
  const body = payload.body || "Tienes una nueva notificacion";
  const url = payload.url || "/";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/api/pwa-icon/192",
      badge: "/api/pwa-icon/192",
      data: { url },
      tag: "pitahaya-chat",
      renotify: true,
      vibrate: [180, 80, 180],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const target = clientList.find((client) => client.url.includes(self.location.origin));
      if (target) {
        target.focus();
        return target.navigate(targetUrl);
      }
      return clients.openWindow(targetUrl);
    })
  );
});
