"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { getPublicEnv } from "@/lib/validation/env";
import { BellIcon } from "@/components/ui/icons";

type NotificationState = "checking" | "unavailable" | "off" | "on" | "denied";

function applicationServerKey(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  return new Uint8Array(bytes.buffer);
}

export function NotificationSettings() {
  const [state, setState] = useState<NotificationState>("checking");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      queueMicrotask(() => setState("unavailable"));
      return;
    }
    if (Notification.permission === "denied") {
      queueMicrotask(() => setState("denied"));
      return;
    }
    void navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setState(subscription ? "on" : "off"))
      .catch(() => setState("off"));
  }, []);

  async function enable() {
    setPending(true); setMessage(null);
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setState(permission === "denied" ? "denied" : "off"); setPending(false); return;
    }
    const publicKey = getPublicEnv().NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      setMessage("Bản triển khai này chưa cấu hình thông báo đẩy."); setPending(false); return;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey(publicKey),
      });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error("Đăng ký thông báo chưa đầy đủ");
      const { error } = await createClient().rpc("register_push_subscription", { p_input: {
        endpoint: json.endpoint, p256dh: json.keys.p256dh, auth_key: json.keys.auth,
        user_agent: navigator.userAgent,
      } });
      if (error) throw error;
      setState("on"); setMessage("Đã bật thông báo ảnh mới trên thiết bị này.");
    } catch {
      setState("off"); setMessage("Thiết bị này chưa bật được thông báo.");
    } finally {
      setPending(false);
    }
  }

  async function disable() {
    setPending(true); setMessage(null);
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await createClient().rpc("unregister_push_subscription", { p_endpoint: subscription.endpoint });
      await subscription.unsubscribe();
    }
    setState("off"); setPending(false); setMessage("Đã tắt thông báo trên thiết bị này.");
  }

  async function testNotification() {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification("Akiha", {
      body: "Thông báo đã sẵn sàng ♡",
      icon: "/icons/icon-192.png",
      data: { route: "/" },
    });
  }

  return (
    <section className="settings-card"><div className="settings-heading"><span className="settings-icon"><BellIcon className="size-5" /></span><div>
      <h2 className="text-base font-extrabold">Thông báo khoảnh khắc</h2>
      <p className="mt-1 text-sm text-muted">Trạng thái: <strong className="font-bold text-foreground">{({ checking: "đang kiểm tra", unavailable: "không hỗ trợ", off: "đang tắt", on: "đang bật", denied: "bị chặn" } as const)[state]}</strong></p></div></div>
      {state === "off" ? <button className="primary-action mt-4 min-h-12 rounded-2xl px-5" disabled={pending} onClick={enable} type="button">Bật thông báo</button> : null}
      {state === "on" ? <div className="mt-4 flex flex-wrap gap-2"><button className="min-h-11 rounded-xl bg-primary/20 px-4" disabled={pending} onClick={testNotification} type="button">Gửi thử</button><button className="min-h-11 px-4 text-danger" disabled={pending} onClick={disable} type="button">Tắt</button></div> : null}
      {state === "denied" ? <p className="mt-3 text-sm text-muted">Thông báo đang bị chặn trong cài đặt trình duyệt. Bạn vẫn thấy ảnh mới khi mở Akiha.</p> : null}
      {state === "unavailable" ? <p className="mt-3 text-sm text-muted">Trình duyệt này không hỗ trợ thông báo web.</p> : null}
      {message ? <p className="mt-3 text-sm" role="status">{message}</p> : null}
    </section>
  );
}
