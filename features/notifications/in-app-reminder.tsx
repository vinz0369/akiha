"use client";

import { useEffect, useState } from "react";

export function InAppReminder({ eligible, message }: { eligible: boolean; message: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!eligible) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      queueMicrotask(() => setVisible(true));
      return;
    }
    void navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setVisible(!subscription))
      .catch(() => setVisible(true));
  }, [eligible]);

  if (!visible) return null;
  return <aside className="fixed inset-x-5 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-[390px] rounded-2xl bg-foreground/90 px-4 py-3 text-center text-xs text-white shadow-lg backdrop-blur" role="status">{message}</aside>;
}
