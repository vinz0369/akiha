"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { SendIcon } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/client";

export function ReplyComposer({ momentId }: { momentId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const value = text.trim();
    if (!value || pending) return;
    setPending(true); setError(null);
    const { error: mutationError } = await createClient().rpc("add_couple_moment_reply", {
      p_moment_id: momentId,
      p_text: value,
    });
    setPending(false);
    if (mutationError) { setError("Chưa gửi được lời nhắn."); return; }
    setText("");
    router.refresh();
  }

  return (
    <div className="mt-4">
      <label className="sr-only" htmlFor="moment-reply">Trả lời khoảnh khắc</label>
      <div className="flex items-end gap-2 rounded-[22px] border border-border bg-white p-1.5 pl-4 shadow-sm focus-within:ring-4 focus-within:ring-primary-strong/10">
        <textarea className="max-h-28 min-h-11 flex-1 resize-none border-0 bg-transparent py-2.5 text-base shadow-none outline-none" id="moment-reply" maxLength={280} onChange={(event) => setText(event.target.value)} placeholder="Nhắn một điều nhỏ…" rows={1} value={text} />
        <button aria-label="Gửi lời nhắn" className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-white disabled:opacity-40" disabled={pending || !text.trim()} onClick={() => void send()} type="button"><SendIcon className="size-5" /></button>
      </div>
      {error ? <p className="mt-2 text-sm text-danger" role="alert">{error}</p> : null}
    </div>
  );
}
