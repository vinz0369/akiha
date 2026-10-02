"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { ArrowRightIcon } from "@/components/ui/icons";

export function ProposalForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setPending(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("propose_reward", {
      p_input: {
        title: formData.get("title"),
        public_description: formData.get("description"),
        rule_type: formData.get("ruleType"),
        threshold: Number(formData.get("threshold")),
      },
    });
    setPending(false);
    if (error) {
      setMessage("Chưa gửi được mong muốn. Hãy kiểm tra và thử lại.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return <button className="flex min-h-13 w-full items-center justify-center gap-2 rounded-[18px] bg-ink px-4 font-bold text-white shadow-[0_12px_28px_rgb(69_43_58_/_0.2)]" onClick={() => setOpen(true)} type="button">Ước một món quà <ArrowRightIcon className="size-5" /></button>;
  }

  return (
    <form action={submit} className="rounded-[24px] border border-white bg-white/90 p-5 text-ink shadow-sm">
      <h2 className="text-lg font-semibold">Ước một phần thưởng</h2>
      <label className="mt-4 block text-sm font-medium" htmlFor="reward-title">Em mong muốn điều gì?</label>
      <input className="mt-2 min-h-12 w-full rounded-xl border border-border px-3" id="reward-title" maxLength={100} name="title" required />
      <label className="mt-4 block text-sm font-medium" htmlFor="reward-description">Ghi chú nhỏ <span className="text-muted">Không bắt buộc</span></label>
      <textarea className="mt-2 min-h-20 w-full rounded-xl border border-border p-3" id="reward-description" maxLength={500} name="description" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="text-sm font-medium">Tính theo
          <select className="mt-2 min-h-12 w-full rounded-xl border border-border px-2" name="ruleType">
            <option value="streak_days">Ngày liên tiếp</option>
            <option value="total_checkins">Tổng lần check-in</option>
          </select>
        </label>
        <label className="text-sm font-medium">Mục tiêu
          <input className="mt-2 min-h-12 w-full rounded-xl border border-border px-3" max={10000} min={1} name="threshold" required type="number" />
        </label>
      </div>
      {message ? <p className="mt-3 text-sm text-danger" role="alert">{message}</p> : null}
      <div className="mt-5 flex justify-end gap-2">
        <button className="min-h-11 px-4" disabled={pending} onClick={() => setOpen(false)} type="button">Hủy</button>
        <button aria-busy={pending} className="min-h-11 rounded-xl bg-primary px-5 font-medium" disabled={pending} type="submit">{pending ? "Đang gửi…" : "Gửi mong muốn"}</button>
      </div>
    </form>
  );
}
