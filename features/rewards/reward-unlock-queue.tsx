"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { createClient } from "@/lib/supabase/client";
import { GiftIcon, HeartIcon } from "@/components/ui/icons";

const unlockedRewardSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  public_description: z.string().nullable(),
  status: z.enum(["unlocked", "claimed"]),
  secret: z.object({ type: z.string(), text: z.string().nullable(), asset_path: z.string().nullable() }).nullable(),
});

type UnlockedReward = z.infer<typeof unlockedRewardSchema>;

export function RewardUnlockQueue({ rewardIds }: { rewardIds: string[] }) {
  const [rewards, setRewards] = useState<UnlockedReward[]>([]);
  const [index, setIndex] = useState(0);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (rewardIds.length === 0) return;
    let cancelled = false;
    void createClient().rpc("get_reward_state").then(({ data, error }) => {
      if (cancelled || error) return;
      const parsed = z.array(z.unknown()).parse(data).flatMap((value) => {
        const reward = unlockedRewardSchema.safeParse(value);
        return reward.success && rewardIds.includes(reward.data.id) ? [reward.data] : [];
      });
      setRewards(parsed.sort((left, right) => rewardIds.indexOf(left.id) - rewardIds.indexOf(right.id)));
    });
    return () => { cancelled = true; };
  }, [rewardIds]);

  useEffect(() => {
    if (!rewards[index]) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIndex(rewards.length);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [index, rewards]);

  const reward = rewards[index];
  useEffect(() => {
    if (reward && !previousFocus.current) {
      previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    } else if (!reward && previousFocus.current) {
      previousFocus.current.focus();
      previousFocus.current = null;
    }
  }, [reward]);

  if (!reward) return null;
  const last = index === rewards.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/45 px-0 backdrop-blur-[2px] sm:p-4" onClick={() => setIndex(rewards.length)} role="presentation">
      <section
        aria-labelledby="reward-unlock-title"
        aria-modal="true"
        className="w-full max-w-[430px] overflow-hidden rounded-t-[34px] bg-lavender px-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 text-center text-ink shadow-2xl sm:rounded-[34px]"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const focusable = dialogRef.current?.querySelectorAll<HTMLElement>("button, summary, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
          if (!focusable?.length) return;
          const first = focusable[0];
          const lastFocusable = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); lastFocusable.focus(); }
          else if (!event.shiftKey && document.activeElement === lastFocusable) { event.preventDefault(); first.focus(); }
        }}
        ref={dialogRef}
        role="dialog"
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border" aria-hidden="true" />
        <div className="mx-auto grid size-20 place-items-center rounded-[28px] bg-ink text-soft-yellow shadow-lg" aria-hidden="true"><GiftIcon className="size-9" /></div>
        <p className="mt-4 text-xs font-bold uppercase tracking-[.16em] text-primary-strong">Một món quà từ anh{rewards.length > 1 ? ` · ${index + 1}/${rewards.length}` : ""}</p>
        <h2 className="mt-2 text-2xl font-semibold" id="reward-unlock-title">{reward.title}</h2>
        {reward.public_description ? <p className="mt-3 text-muted">{reward.public_description}</p> : null}
        {reward.secret?.text ? <details className="mt-5 rounded-[22px] bg-white/75 p-4 text-left"><summary className="cursor-pointer font-semibold">{reward.secret.type === "letter" ? "Mở lá thư" : "Mở điều bất ngờ"}</summary><p className="mt-3 whitespace-pre-wrap">{reward.secret.text}</p></details> : null}
        <button autoFocus className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-2xl bg-ink px-5 font-bold text-white" onClick={() => setIndex((current) => current + 1)} type="button">
          {last ? <>Cất món quà này <HeartIcon className="size-4" /></> : "Xem món quà tiếp theo"}
        </button>
      </section>
    </div>
  );
}
