"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { EyeIcon, HeartIcon, HugIcon, ReplyIcon, SmileIcon } from "@/components/ui/icons";
import type { ReactionKind } from "@/features/moments/types";
import { createClient } from "@/lib/supabase/client";

const reactions = [
  ["heart", HeartIcon, "Thả tim"],
  ["hug", HugIcon, "Gửi một cái ôm"],
  ["laugh", SmileIcon, "Cười cùng nhau"],
] as const;

export function MomentActions({
  momentId,
  isOwner,
  initialReaction,
  replyCount,
  seenByPartner,
  partnerReaction,
}: {
  momentId: string;
  isOwner: boolean;
  initialReaction: ReactionKind | null;
  replyCount: number;
  seenByPartner: boolean;
  partnerReaction: ReactionKind | null;
}) {
  const router = useRouter();
  const [reaction, setReaction] = useState<ReactionKind | null>(initialReaction);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOwner) return;
    void createClient().rpc("mark_couple_moment_seen", { p_moment_id: momentId });
  }, [isOwner, momentId]);

  async function react(kind: ReactionKind) {
    if (pending) return;
    const previous = reaction;
    const next = reaction === kind ? null : kind;
    setReaction(next);
    setPending(true);
    setError(null);
    const { error: mutationError } = await createClient().rpc("set_couple_moment_reaction", {
      p_moment_id: momentId,
      p_kind: next,
    });
    setPending(false);
    if (mutationError) {
      setReaction(previous);
      setError("Chưa gửi được cảm xúc.");
    } else {
      router.refresh();
    }
  }

  if (isOwner) {
    const reacted = reactions.find(([kind]) => kind === partnerReaction);
    const ReactionIcon = reacted?.[1];
    return (
      <div className="mt-3 flex min-h-11 items-center justify-between gap-3 text-xs font-bold text-muted">
        <span className="flex items-center gap-1.5">{ReactionIcon ? <ReactionIcon className="size-4 text-primary-strong" /> : <EyeIcon className="size-4" />}{reacted ? reacted[2] : seenByPartner ? "Đã mở" : "Chưa mở"}</span>
        <Link className="flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-primary-strong" href={`/moments/${momentId}`}>
          <ReplyIcon className="size-4" />{replyCount ? `${replyCount} trả lời` : "Chi tiết"}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-2">
        <div aria-label="Gửi cảm xúc" className="flex gap-2" role="group">
          {reactions.map(([kind, Icon, label]) => (
            <button
              aria-label={label}
              aria-pressed={reaction === kind}
              className={`grid size-11 place-items-center rounded-full border ${reaction === kind ? "border-primary-strong bg-primary-soft text-primary-strong shadow-sm" : "border-border bg-white text-muted"}`}
              disabled={pending}
              key={kind}
              onClick={() => void react(kind)}
              type="button"
            >
              <Icon className="size-5" />
            </button>
          ))}
        </div>
        <Link aria-label="Trả lời khoảnh khắc" className="flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm font-bold text-primary-strong" href={`/moments/${momentId}`}>
          <ReplyIcon className="size-4" />{replyCount || "Trả lời"}
        </Link>
      </div>
      {error ? <p className="mt-2 text-xs text-danger" role="alert">{error}</p> : null}
    </div>
  );
}
