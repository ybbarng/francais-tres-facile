"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type OfflineCacheStatus =
  | "unsupported"
  | "unknown"
  | "none"
  | "stale"
  | "caching"
  | "cached";

interface UseOfflineCacheParams {
  materialId: string;
  updatedAt: string;
  urls: string[];
}

interface UseOfflineCacheResult {
  status: OfflineCacheStatus;
  progress: { done: number; total: number } | null;
  save: () => void;
  remove: () => void;
  refresh: () => void;
}

function getController(): ServiceWorker | null {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.controller ?? null;
}

export function useOfflineCache({
  materialId,
  updatedAt,
  urls,
}: UseOfflineCacheParams): UseOfflineCacheResult {
  const [status, setStatus] = useState<OfflineCacheStatus>("unknown");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const urlsRef = useRef(urls);
  urlsRef.current = urls;

  const requestStatus = useCallback(() => {
    const sw = getController();
    if (!sw) return;
    sw.postMessage({ type: "GET_MATERIAL_STATUS", materialId, updatedAt });
  }, [materialId, updatedAt]);

  const save = useCallback(() => {
    const sw = getController();
    if (!sw) return;
    setStatus("caching");
    setProgress({ done: 0, total: urlsRef.current.length });
    sw.postMessage({
      type: "CACHE_MATERIAL",
      materialId,
      updatedAt,
      urls: urlsRef.current,
    });
  }, [materialId, updatedAt]);

  const remove = useCallback(() => {
    const sw = getController();
    if (!sw) return;
    sw.postMessage({ type: "DELETE_MATERIAL", materialId });
  }, [materialId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }

    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.materialId !== materialId) return;

      if (data.type === "MATERIAL_STATUS") {
        if (data.cached) {
          setStatus("cached");
          setProgress({ done: data.count, total: data.count });
        } else if (data.stale) {
          setStatus("stale");
          setProgress(null);
        } else {
          setStatus("none");
          setProgress(null);
        }
      } else if (data.type === "CACHE_PROGRESS") {
        setStatus("caching");
        setProgress({ done: data.done, total: data.total });
      } else if (data.type === "CACHE_DONE") {
        setStatus("cached");
        setProgress({ done: data.ok, total: data.ok + data.failed });
      } else if (data.type === "MATERIAL_DELETED") {
        setStatus("none");
        setProgress(null);
      }
    };

    navigator.serviceWorker.addEventListener("message", onMessage);

    // SW controller가 아직 없을 수 있으니 ready 이후 재요청
    navigator.serviceWorker.ready.then(() => {
      requestStatus();
    });

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, [materialId, requestStatus]);

  // updatedAt이 바뀌면 status 다시
  useEffect(() => {
    requestStatus();
  }, [requestStatus]);

  return { status, progress, save, remove, refresh: requestStatus };
}
