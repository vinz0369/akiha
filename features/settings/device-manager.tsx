"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { PushDevice } from "@/features/settings/get-settings-data";
import { createClient } from "@/lib/supabase/client";
import { DeviceIcon } from "@/components/ui/icons";

function deviceName(userAgent: string) {
  if (/android/i.test(userAgent)) return "Android · Chrome";
  if (/iphone|ipad/i.test(userAgent)) return "iPhone/iPad · Safari";
  if (/windows/i.test(userAgent)) return "Windows · Trình duyệt";
  if (/macintosh/i.test(userAgent)) return "Mac · Trình duyệt";
  return "Thiết bị đã đăng ký";
}

export function DeviceManager({ devices }: { devices: PushDevice[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeDevices = devices.filter((device) => device.is_active);

  async function disable(id: string) {
    setPendingId(id);
    setError(null);
    const { error: mutationError } = await createClient().rpc("unregister_push_device", {
      p_subscription_id: id,
    });
    setPendingId(null);
    if (mutationError) setError("Chưa thể ngắt thiết bị. Hãy thử lại.");
    else router.refresh();
    setConfirmingId(null);
  }

  return (
    <section className="settings-card">
      <div className="settings-heading"><span className="settings-icon"><DeviceIcon className="size-5" /></span><div><h2 className="text-base font-extrabold">Thiết bị nhận nhắc nhở</h2>
      <p className="mt-1 text-sm text-muted">Quản lý riêng từng điện thoại hoặc trình duyệt.</p></div></div>
      {activeDevices.length ? <div className="mt-4 space-y-2">{activeDevices.map((device) => (
        <article className="flex items-center justify-between gap-3 rounded-2xl bg-surface-subtle p-3" key={device.id}>
          <div className="min-w-0"><p className="font-semibold">{deviceName(device.user_agent)}</p><p className="mt-0.5 text-xs text-muted">Thêm ngày {new Intl.DateTimeFormat("vi-VN").format(new Date(device.created_at))}</p></div>
          <button className="min-h-11 shrink-0 px-3 text-sm font-semibold text-danger" disabled={pendingId === device.id} onClick={() => setConfirmingId(device.id)} type="button">{pendingId === device.id ? "Đang tắt…" : "Ngắt"}</button>
        </article>
      ))}</div> : <p className="mt-4 rounded-2xl bg-surface-subtle p-4 text-sm text-muted">Chưa có thiết bị nào đang nhận thông báo.</p>}
      {error ? <p className="mt-3 text-sm text-danger" role="alert">{error}</p> : null}
      <ConfirmDialog
        confirmLabel="Ngắt"
        description="Thiết bị này sẽ không còn nhận thông báo ảnh mới. Bạn có thể bật lại sau trong phần cài đặt trình duyệt."
        onCancel={() => setConfirmingId(null)}
        onConfirm={() => { if (confirmingId) void disable(confirmingId); }}
        open={confirmingId !== null}
        pending={pendingId !== null}
        title="Ngắt thiết bị này?"
      />
    </section>
  );
}
