"use client";

import { useEffect, useState } from "react";

export function ServiceWorkerRegistration() {
  const [online, setOnline] = useState(true);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    queueMicrotask(() => setOnline(navigator.onLine));
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    if (!("serviceWorker" in navigator)) {
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
    let refreshing = false;
    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        if (registration.waiting) setWaiting(registration.waiting);
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) setWaiting(worker);
          });
        });
      } catch {
        // Offline support is progressive enhancement; the app remains usable online.
      }
    };
    window.addEventListener("load", register, { once: true });
    if (document.readyState === "complete") void register();
    return () => {
      window.removeEventListener("load", register);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  if (online && !waiting) return null;
  return (
    <aside className="fixed inset-x-3 top-[calc(.75rem+env(safe-area-inset-top))] z-[1100] mx-auto flex max-w-[430px] items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 text-sm text-white shadow-xl" role="status">
      <p>{waiting ? "Có phiên bản Akiha mới." : "Đang ngoại tuyến · Ảnh nháp vẫn được giữ trên thiết bị."}</p>
      {waiting ? <button className="min-h-11 shrink-0 rounded-xl bg-primary px-3 font-bold text-ink" onClick={() => waiting.postMessage({ type: "SKIP_WAITING" })} type="button">Cập nhật</button> : null}
    </aside>
  );
}
