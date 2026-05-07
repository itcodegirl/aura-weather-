const CACHE_VERSION = "aura-weather-v1";
const APP_SHELL_CACHE = `${CACHE_VERSION}-app-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const APP_SHELL_URLS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/atmosphere-ring.svg",
  "/og-image.png",
];
const CACHEABLE_DESTINATIONS = new Set([
  "document",
  "font",
  "image",
  "manifest",
  "script",
  "style",
  "worker",
]);
const INDEX_ASSET_PATTERN = /\b(?:href|src)="([^"]+)"/g;
const BUILD_ASSET_PATTERN = /["'](assets\/[^"']+\.(?:css|js))["']/g;

function isSameOrigin(requestUrl) {
  return requestUrl.origin === self.location.origin;
}

function isCacheableRequest(request) {
  if (request.method !== "GET") {
    return false;
  }

  const requestUrl = new URL(request.url);
  return isSameOrigin(requestUrl) && CACHEABLE_DESTINATIONS.has(request.destination);
}

function getSameOriginAppAsset(path) {
  try {
    const assetUrl = new URL(path, self.location.origin);
    if (!isSameOrigin(assetUrl) || !assetUrl.pathname.startsWith("/assets/")) {
      return null;
    }

    return `${assetUrl.pathname}${assetUrl.search}`;
  } catch {
    return null;
  }
}

function findIndexAssetUrls(indexHtml) {
  return [
    ...new Set(
      Array.from(indexHtml.matchAll(INDEX_ASSET_PATTERN), (match) =>
        getSameOriginAppAsset(match[1])
      ).filter(Boolean)
    ),
  ];
}

function findBuildAssetUrls(javascript) {
  return Array.from(javascript.matchAll(BUILD_ASSET_PATTERN), (match) =>
    getSameOriginAppAsset(`/${match[1]}`)
  ).filter(Boolean);
}

async function cacheResponse(cacheName, request, response) {
  if (!response || response.status >= 400) {
    return;
  }

  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
}

async function readAssetText(cache, assetUrl) {
  const response = (await cache.match(assetUrl)) || (await fetch(assetUrl));
  if (!response || !response.ok) {
    return "";
  }

  await cache.put(assetUrl, response.clone());
  return response.clone().text();
}

async function findBuildDependencies(cache, entryAssetUrls) {
  const discoveredAssetUrls = new Set();
  const visitedJavascriptUrls = new Set();
  const pendingJavascriptUrls = entryAssetUrls.filter((assetUrl) =>
    assetUrl.endsWith(".js")
  );

  while (pendingJavascriptUrls.length > 0) {
    const javascriptUrl = pendingJavascriptUrls.pop();
    if (visitedJavascriptUrls.has(javascriptUrl)) {
      continue;
    }

    visitedJavascriptUrls.add(javascriptUrl);
    const javascript = await readAssetText(cache, javascriptUrl);
    for (const assetUrl of findBuildAssetUrls(javascript)) {
      if (discoveredAssetUrls.has(assetUrl)) {
        continue;
      }

      discoveredAssetUrls.add(assetUrl);
      if (assetUrl.endsWith(".js")) {
        pendingJavascriptUrls.push(assetUrl);
      }
    }
  }

  return [...discoveredAssetUrls];
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    await cacheResponse(APP_SHELL_CACHE, "/", response);
    return response;
  } catch {
    const cache = await caches.open(APP_SHELL_CACHE);
    return (
      (await cache.match(request)) ||
      (await cache.match("/")) ||
      (await cache.match("/index.html")) ||
      Response.error()
    );
  }
}

async function staleWhileRevalidate(request) {
  const runtimeCache = await caches.open(RUNTIME_CACHE);
  const appShellCache = await caches.open(APP_SHELL_CACHE);
  const cachedResponse =
    (await runtimeCache.match(request)) || (await appShellCache.match(request));
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        void runtimeCache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cachedResponse || Response.error());

  return cachedResponse || fetchPromise;
}

async function cacheAppShell() {
  const cache = await caches.open(APP_SHELL_CACHE);
  await cache.addAll(APP_SHELL_URLS);

  const indexResponse =
    (await cache.match("/index.html")) ||
    (await cache.match("/")) ||
    (await fetch("/index.html"));
  const indexHtml = await indexResponse.clone().text();
  const assetUrls = findIndexAssetUrls(indexHtml);
  const dependencyUrls = await findBuildDependencies(cache, assetUrls);
  const urlsToCache = [...new Set([...assetUrls, ...dependencyUrls])];

  if (urlsToCache.length > 0) {
    await cache.addAll(urlsToCache);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheAppShell());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => !cacheName.startsWith(CACHE_VERSION))
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isCacheableRequest(request)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
