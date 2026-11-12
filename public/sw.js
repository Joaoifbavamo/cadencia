const CACHE = "cadencia-shell-v1";
self.addEventListener("message", (event) => {
  if (event.data?.type === "ACTIVATE_UPDATE") self.skipWaiting();
});
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll([
        "./",
        "./manifest.webmanifest",
        "./icons/apple-touch-icon.png",
        /* BUILD_ASSETS */
      ]),
    ),
  );
});
self.addEventListener("push", (event) => {
  let p;
  try {
    p = event.data.json();
  } catch {
    p = {
      title: "Cadência",
      body: "Abra seu diário para conferir.",
      tag: "cadencia",
    };
  }
  event.waitUntil(
    self.registration.showNotification(p.title || "Cadência", {
      body: p.body || "",
      tag: p.tag || "cadencia",
      icon: new URL("icons/icon-192.png", self.registration.scope).href,
      data: { url: self.registration.scope },
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (windows) => {
        const target = windows.find((w) =>
          w.url.startsWith(self.registration.scope),
        );
        if (target) return target.focus();
        return clients.openWindow(self.registration.scope);
      }),
  );
});
// No skipWaiting: an update activates only after old tabs close, protecting an ongoing workout.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("cadencia-shell-") && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      ),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.search ||
    url.pathname.includes("/auth/") ||
    url.pathname.includes("/rest/")
  )
    return;
  const shell =
    event.request.mode === "navigate" ||
    url.pathname.includes("/assets/") ||
    url.pathname.includes("/icons/") ||
    url.pathname.endsWith("manifest.webmanifest");
  if (!shell) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then((c) => c.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches
          .match(event.request)
          .then(
            (r) =>
              r ||
              (event.request.mode === "navigate"
                ? caches.match("./")
                : Response.error()),
          ),
      ),
  );
});
