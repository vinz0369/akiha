const CACHE_NAME = "akiha-shell-v11";
const OFFLINE_ASSETS = ["/offline", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_ASSETS)));
  if (!self.registration.active) self.skipWaiting();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
    )),
    self.registration.navigationPreload?.enable(),
  ]));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.mode !== "navigate") return;
  event.respondWith((async () => {
    try {
      return await event.preloadResponse ?? await fetch(event.request);
    } catch {
      return await caches.match("/offline") ?? Response.error();
    }
  })());
});

self.addEventListener("push", (event) => {
  const payload = event.data
    ? event.data.json()
    : { title: "Akiha", body: "Người thương vừa gửi một khoảnh khắc.", route: "/" };
  event.waitUntil(self.registration.showNotification(payload.title ?? "Akiha", {
    body: payload.body,
    icon: payload.icon ?? "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { route: payload.route ?? "/" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const route = event.notification.data?.route ?? "/";
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
    const current = windows[0];
    if (current) {
      await current.navigate(route);
      return current.focus();
    }
    return self.clients.openWindow(route);
  }));
});
