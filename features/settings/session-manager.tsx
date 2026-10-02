"use client";

import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { createClient } from "@/lib/supabase/client";
import { LockIcon } from "@/components/ui/icons";

export function SessionManager() {
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function signOutOthers() {
    setPending(true); setMessage(null);
    const { error } = await createClient().auth.signOut({ scope: "others" });
    setPending(false);
    setConfirming(false);
    setMessage(error ? "Chưa thể đăng xuất các thiết bị khác." : "Đã đăng xuất khỏi các thiết bị khác.");
  }
  return <section className="settings-card"><div className="settings-heading"><span className="settings-icon"><LockIcon className="size-5" /></span><div><h2 className="text-base font-extrabold">Riêng tư và phiên đăng nhập</h2><p className="mt-1 text-sm leading-relaxed text-muted">Dùng khi em từng đăng nhập trên máy cũ hoặc thiết bị không còn sử dụng.</p></div></div><button className="mt-4 min-h-12 rounded-2xl border border-danger/20 bg-danger/5 px-4 font-bold text-danger" disabled={pending} onClick={() => setConfirming(true)} type="button">{pending ? "Đang xử lý…" : "Đăng xuất thiết bị khác"}</button>{message ? <p className="mt-3 text-sm text-muted" role="status">{message}</p> : null}<ConfirmDialog confirmLabel="Đăng xuất" description="Akiha sẽ đăng xuất khỏi mọi thiết bị khác. Phiên đăng nhập trên điện thoại này vẫn được giữ nguyên." onCancel={() => setConfirming(false)} onConfirm={() => void signOutOthers()} open={confirming} pending={pending} title="Đăng xuất các thiết bị khác?" /></section>;
}
