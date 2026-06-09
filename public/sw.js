// ftf service worker — 자료 단위 명시적 오프라인 캐싱
//
// 캐시 네임 규칙:
//   ftf-material-<materialId>-<updatedAt>
// 자료의 updatedAt이 바뀌면 새 캐시 네임으로 옮겨가고, 옛 캐시는
// 클라이언트가 GET_MATERIAL_STATUS 결과를 보고 DELETE_MATERIAL로 정리.
//
// 메시지 인터페이스 (client → SW):
//   { type: "CACHE_MATERIAL", materialId, updatedAt, urls }
//   { type: "DELETE_MATERIAL", materialId }
//   { type: "GET_MATERIAL_STATUS", materialId, updatedAt }
//
// 응답은 동일 source의 client에 postMessage:
//   { type: "CACHE_PROGRESS", materialId, done, total }
//   { type: "CACHE_DONE", materialId, ok, failed }
//   { type: "MATERIAL_STATUS", materialId, cached, stale, count }

const SW_VERSION = "1";
const MATERIAL_PREFIX = "ftf-material-";

function materialCacheName(materialId, updatedAt) {
  return `${MATERIAL_PREFIX}${materialId}-${updatedAt}`;
}

function isMaterialCache(name) {
  return name.startsWith(MATERIAL_PREFIX);
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

async function postToClient(clientId, message) {
  if (!clientId) return;
  const client = await self.clients.get(clientId);
  if (client) client.postMessage(message);
}

async function cacheMaterial(materialId, updatedAt, urls, clientId) {
  const cacheName = materialCacheName(materialId, updatedAt);
  const cache = await caches.open(cacheName);
  let done = 0;
  let failed = 0;
  const total = urls.length;

  for (const url of urls) {
    try {
      const existing = await cache.match(url);
      if (!existing) {
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) {
          await cache.put(url, res.clone());
        } else {
          failed += 1;
        }
      }
      done += 1;
    } catch (_e) {
      failed += 1;
      done += 1;
    }
    await postToClient(clientId, {
      type: "CACHE_PROGRESS",
      materialId,
      done,
      total,
    });
  }

  // 옛 버전 캐시 정리
  const names = await caches.keys();
  for (const name of names) {
    if (name.startsWith(`${MATERIAL_PREFIX}${materialId}-`) && name !== cacheName) {
      await caches.delete(name);
    }
  }

  await postToClient(clientId, {
    type: "CACHE_DONE",
    materialId,
    ok: total - failed,
    failed,
  });
}

async function deleteMaterial(materialId, clientId) {
  const names = await caches.keys();
  for (const name of names) {
    if (name.startsWith(`${MATERIAL_PREFIX}${materialId}-`)) {
      await caches.delete(name);
    }
  }
  await postToClient(clientId, { type: "MATERIAL_DELETED", materialId });
}

async function getMaterialStatus(materialId, updatedAt, clientId) {
  const expectedName = materialCacheName(materialId, updatedAt);
  const names = await caches.keys();
  let cached = false;
  let stale = false;
  let count = 0;
  for (const name of names) {
    if (!name.startsWith(`${MATERIAL_PREFIX}${materialId}-`)) continue;
    const cache = await caches.open(name);
    const keys = await cache.keys();
    if (name === expectedName) {
      cached = keys.length > 0;
      count = keys.length;
    } else if (keys.length > 0) {
      stale = true;
    }
  }
  await postToClient(clientId, {
    type: "MATERIAL_STATUS",
    materialId,
    cached,
    stale,
    count,
  });
}

self.addEventListener("message", (event) => {
  const data = event.data || {};
  const clientId = event.source && event.source.id;
  if (data.type === "CACHE_MATERIAL") {
    event.waitUntil(cacheMaterial(data.materialId, data.updatedAt, data.urls, clientId));
  } else if (data.type === "DELETE_MATERIAL") {
    event.waitUntil(deleteMaterial(data.materialId, clientId));
  } else if (data.type === "GET_MATERIAL_STATUS") {
    event.waitUntil(getMaterialStatus(data.materialId, data.updatedAt, clientId));
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 쉐도잉 자산만 캐시 우선 처리
  if (url.pathname.startsWith("/shadowing/data/") || url.pathname.startsWith("/shadowing/audio/")) {
    event.respondWith(cacheFirst(req));
  }
});

async function cacheFirst(request) {
  const names = await caches.keys();
  for (const name of names) {
    if (!isMaterialCache(name)) continue;
    const cache = await caches.open(name);
    const hit = await cache.match(request);
    if (hit) return hit;
  }
  return fetch(request);
}
