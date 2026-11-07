/* AnatoMark service worker.
   - 3D models (.glb), the Draco decoder and the AR libraries are kept on the phone after the first
     load, so later visits are instant and work without a connection.
   - Pages, scripts and styles always try the network first, so an update you push shows up on the next
     visit; the cached copy is only the fallback when offline.
   IMPORTANT: when you replace a model file, bump MODELS_VERSION below, otherwise phones that already
   cached the old model keep showing it. */
const MODELS_VERSION = "m1";
const PAGES_VERSION = "p1";
const MODEL_CACHE = "anatomark-models-" + MODELS_VERSION;
const PAGE_CACHE = "anatomark-pages-" + PAGES_VERSION;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keep = [MODEL_CACHE, PAGE_CACHE];
    for (const k of await caches.keys()) {
      if (k.startsWith("anatomark-") && !keep.includes(k)) await caches.delete(k);
    }
    await self.clients.claim();
  })());
});

function isModelLike(url) {
  const p = url.pathname;
  if (url.origin === self.location.origin) {
    return p.endsWith(".glb") || p.indexOf("/libs/") === 0 || /\.(webp|png|jpe?g|svg|ico)$/.test(p);
  }
  // Draco decoder from gstatic and the CDN copies of A-Frame / AR.js (used when libs/ is not hosted)
  return url.hostname === "www.gstatic.com" || url.hostname === "aframe.io" || url.hostname === "cdn.jsdelivr.net";
}

async function cacheFirst(req) {
  const cache = await caches.open(MODEL_CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  // only keep complete, successful answers (never 206 partial downloads)
  if (res && res.status === 200) cache.put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const res = await fetch(req);
    if (res && res.status === 200) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: false }) || await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || req.headers.has("range")) return;   // let the browser handle these
  const url = new URL(req.url);
  if (url.pathname === "/sw.js") return;
  if (isModelLike(url)) { e.respondWith(cacheFirst(req)); return; }
  if (url.origin === self.location.origin) { e.respondWith(networkFirst(req)); }
});
