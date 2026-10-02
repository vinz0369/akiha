"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { ImageIcon } from "@/components/ui/icons";
import { MomentActions } from "@/features/moments/moment-actions";
import type { MomentCard } from "@/features/moments/types";
import { createClient } from "@/lib/supabase/client";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

export function TodayMoments({ moments, viewerId, coupleId, unseenCount }: {
  moments: MomentCard[];
  viewerId: string;
  coupleId: string;
  unseenCount: number;
}) {
  const router = useRouter();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!("setAppBadge" in navigator)) return;
    const badge = navigator as Navigator & { setAppBadge(count?: number): Promise<void>; clearAppBadge(): Promise<void> };
    void (unseenCount > 0 ? badge.setAppBadge(unseenCount) : badge.clearAppBadge()).catch(() => undefined);
  }, [unseenCount]);

  useEffect(() => {
    const unseenIds = moments
      .filter((moment) => moment.author_id !== viewerId && !moment.seen_by_partner)
      .map((moment) => moment.id);
    if (!unseenIds.length) return;
    const supabase = createClient();
    void Promise.all(unseenIds.map((momentId) => supabase.rpc("mark_couple_moment_seen", { p_moment_id: momentId })))
      .then(() => router.refresh());
  }, [moments, router, viewerId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`couple-home-${coupleId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "checkins", filter: `couple_id=eq.${coupleId}` }, () => {
        if (refreshTimer.current) clearTimeout(refreshTimer.current);
        refreshTimer.current = setTimeout(() => router.refresh(), 180);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "moment_reactions" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "moment_replies" }, () => router.refresh())
      .subscribe();
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [coupleId, router]);

  if (!moments.length) {
    return (
      <section className="surface-card mt-4 rounded-[28px] p-6 text-center">
        <span aria-hidden="true" className="mx-auto grid size-16 place-items-center rounded-[22px] bg-primary-soft text-primary-strong"><ImageIcon className="size-7" /></span>
        <h2 className="mt-4 text-xl font-black">Hôm nay đang chờ bức ảnh đầu tiên.</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">Một tấm ảnh bình thường cũng đủ để người kia biết hôm nay của bạn thế nào.</p>
      </section>
    );
  }

  return (
    <section aria-label="Khoảnh khắc hôm nay" className="mt-4 space-y-5">
      {moments.map((moment) => {
        const isOwner = moment.author_id === viewerId;
        return (
          <article className="surface-card overflow-hidden rounded-[30px] p-2 shadow-[var(--shadow-md)]" key={moment.id}>
            <div className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-black">{isOwner ? "Bạn" : moment.author_name}</p>
                <p className="text-xs tabular-nums text-muted">{formatTime(moment.captured_at)}</p>
              </div>
              {!isOwner && !moment.seen_by_partner ? <span className="rounded-full bg-primary-soft px-3 py-1 text-[11px] font-extrabold text-primary-strong">Mới</span> : null}
            </div>
            <Link aria-label={`Mở ảnh của ${moment.author_name} lúc ${formatTime(moment.captured_at)}`} className="relative block aspect-[4/5] overflow-hidden rounded-[24px] bg-border" href={`/moments/${moment.id}`}>
              {moment.imageUrl ? <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${moment.imageUrl.replaceAll('"', "%22")}")` }} /> : <span className="absolute inset-0 grid place-items-center text-muted"><ImageIcon className="size-9" /></span>}
            </Link>
            <div className="px-3 pb-2 pt-3">
              {moment.caption ? <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{moment.caption}</p> : <p className="text-sm italic text-muted">Không có ghi chú.</p>}
              <MomentActions initialReaction={moment.viewer_reaction} isOwner={isOwner} momentId={moment.id} partnerReaction={moment.partnerReaction} replyCount={moment.reply_count} seenByPartner={moment.seen_by_partner} />
            </div>
          </article>
        );
      })}
    </section>
  );
}
