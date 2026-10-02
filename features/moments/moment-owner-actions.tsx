"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TrashIcon } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/client";

const deleteResultSchema = z.object({ object_paths: z.array(z.string()) });

export function MomentOwnerActions({ momentId, initialCaption, localDate }: {
  momentId: string;
  initialCaption: string | null;
  localDate: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(initialCaption ?? "");
  const [pending, setPending] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setPending(true); setError(null);
    const { error: mutationError } = await createClient().rpc("update_couple_moment_caption", {
      p_moment_id: momentId,
      p_caption: caption.trim() || null,
    });
    setPending(false);
    if (mutationError) { setError("Chưa lưu được ghi chú. Hãy thử lại."); return; }
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    setPending(true); setError(null);
    const supabase = createClient();
    const { data, error: mutationError } = await supabase.rpc("delete_couple_moment", { p_moment_id: momentId });
    if (mutationError) { setPending(false); setConfirmingRemove(false); setError("Chưa thể xóa khoảnh khắc."); return; }
    const parsed = deleteResultSchema.parse(data);
    if (parsed.object_paths.length) await supabase.storage.from("moments").remove(parsed.object_paths);
    router.replace(`/days/${localDate}`);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button className="min-h-12 rounded-2xl bg-primary-soft px-4 text-sm font-bold text-primary-strong" onClick={() => setEditing(true)} type="button">Sửa ghi chú</button>
        <button className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-danger/20 bg-danger/5 px-4 text-sm font-bold text-danger" disabled={pending} onClick={() => setConfirmingRemove(true)} type="button"><TrashIcon className="size-4" />{pending ? "Đang xóa…" : "Xóa ảnh"}</button>
        {error ? <p className="col-span-2 text-sm text-danger" role="alert">{error}</p> : null}
        <ConfirmDialog
          confirmLabel="Xóa ảnh"
          description="Ảnh và ghi chú sẽ bị xóa khỏi album chung của hai đứa. Hành động này không thể hoàn tác."
          onCancel={() => setConfirmingRemove(false)}
          onConfirm={() => void remove()}
          open={confirmingRemove}
          pending={pending}
          title="Xóa ảnh này?"
        />
      </div>
    );
  }

  return (
    <section className="surface-card mt-5 rounded-[24px] p-4">
      <label className="text-sm font-bold" htmlFor="edit-caption">Ghi chú</label>
      <textarea className="mt-2 min-h-28 w-full resize-none rounded-2xl border p-3 text-base" id="edit-caption" maxLength={280} onChange={(event) => setCaption(event.target.value)} value={caption} />
      <p className="mt-1 text-right text-xs tabular-nums text-muted">{caption.length}/280</p>
      {error ? <p className="mt-2 text-sm text-danger" role="alert">{error}</p> : null}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="min-h-12 rounded-2xl" disabled={pending} onClick={() => setEditing(false)} type="button">Hủy</button>
        <button className="min-h-12 rounded-2xl bg-ink px-4 font-bold text-white" disabled={pending} onClick={() => void save()} type="button">{pending ? "Đang lưu…" : "Lưu"}</button>
      </div>
    </section>
  );
}
