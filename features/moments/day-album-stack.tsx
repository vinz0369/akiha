"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { CloseIcon, ImageIcon } from "@/components/ui/icons";
import { MomentActions } from "@/features/moments/moment-actions";
import { FullscreenImageButton } from "@/features/moments/moment-image-viewer";
import type { MomentCard } from "@/features/moments/types";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

export function DayAlbumStack({ moments, viewerId }: { moments: MomentCard[]; viewerId: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [advancing, setAdvancing] = useState(false);
  const [direction, setDirection] = useState<"next" | "previous">("next");
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const captionDialogRef = useRef<HTMLDialogElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
  }, []);

  if (!moments.length) {
    return (
      <section className="day-album-empty surface-card" aria-label="Album trống">
        <span aria-hidden="true" className="grid size-16 place-items-center rounded-[22px] bg-primary-soft text-primary-strong">
          <ImageIcon className="size-8" />
        </span>
        <h2 className="mt-4 text-xl font-black">Ngày này chưa có ảnh.</h2>
        <p className="mt-2 text-sm text-muted">Khoảnh khắc đầu tiên sẽ xuất hiện ở đây.</p>
      </section>
    );
  }

  const activeMoment = moments[activeIndex];
  const isOwner = activeMoment.author_id === viewerId;
  const activeTime = formatTime(activeMoment.captured_at);

  function move(nextDirection: "next" | "previous") {
    if (moments.length < 2 || advancing) return;
    setDirection(nextDirection);
    setAdvancing(true);
    const reduceMotion = typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = reduceMotion ? 20 : 180;
    advanceTimer.current = setTimeout(() => {
      setActiveIndex((current) => nextDirection === "next"
        ? (current + 1) % moments.length
        : (current - 1 + moments.length) % moments.length);
      setAdvancing(false);
      advanceTimer.current = null;
    }, delay);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < 44 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.2) return;
    suppressClick.current = true;
    move(deltaX < 0 ? "next" : "previous");
  }

  return (
    <section className="day-album-content" aria-label="Ảnh trong album">
      <div className="day-stack-wrap">
        <div className="day-photo-stack">
          {moments.map((moment, index) => {
            const offset = (index - activeIndex + moments.length) % moments.length;
            if (offset > 2) return null;
            const position = offset === 0 ? "front" : offset === 1 ? "middle" : "back";
            const className = `day-stack-layer day-stack-layer-${position}${offset === 0 && advancing ? ` day-stack-layer-leaving day-stack-layer-leaving-${direction}` : ""}`;
            const image = moment.imageUrl ? (
              <Image
                alt={offset === 0 ? `Ảnh ${activeIndex + 1} trên ${moments.length}, của ${moment.author_name} lúc ${formatTime(moment.captured_at)}` : ""}
                className="object-cover"
                draggable={false}
                fill
                loading={offset < 2 ? "eager" : "lazy"}
                sizes="(max-width: 520px) 82vw, 360px"
                src={moment.imageUrl}
                unoptimized
              />
            ) : (
              <span className="absolute inset-0 grid place-items-center bg-border text-muted"><ImageIcon className="size-10" /></span>
            );

            if (offset === 0 && moments.length > 1) {
              return (
                <button
                  aria-label={`Ảnh ${activeIndex + 1} trên ${moments.length}, của ${moment.author_name}. Chạm để xem ảnh tiếp theo`}
                  className={className}
                  disabled={advancing}
                  key={moment.id}
                  onClick={() => {
                    if (suppressClick.current) {
                      suppressClick.current = false;
                      return;
                    }
                    move("next");
                  }}
                  onPointerCancel={() => { pointerStart.current = null; }}
                  onPointerDown={(event) => {
                    pointerStart.current = { x: event.clientX, y: event.clientY };
                  }}
                  onPointerUp={handlePointerUp}
                  type="button"
                >
                  {image}
                  <span aria-hidden="true" className="day-stack-tap-hint">Chạm hoặc vuốt để xem</span>
                </button>
              );
            }

            return <div aria-hidden={offset !== 0} className={className} key={moment.id}>{image}</div>;
          })}
          <FullscreenImageButton authorName={activeMoment.author_name} imageUrl={activeMoment.imageUrl} time={activeTime} />
        </div>
      </div>

      <div className="day-album-info surface-card" key={activeMoment.id}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-black">{isOwner ? "Bạn" : activeMoment.author_name}</p>
            <time className="text-xs tabular-nums text-muted">{activeTime}</time>
          </div>
          <span className="day-album-counter" aria-label={`Ảnh ${activeIndex + 1} trên ${moments.length}`}>
            {activeIndex + 1} / {moments.length}
          </span>
        </div>

        {activeMoment.caption ? (
          <button aria-label="Đọc đầy đủ ghi chú" className="day-album-caption-trigger" onClick={() => captionDialogRef.current?.showModal()} type="button">
            <span className="day-album-caption">{activeMoment.caption}</span>
          </button>
        ) : <p className="day-album-caption italic text-muted">Không có ghi chú.</p>}
        <span aria-live="polite" className="sr-only">Đang xem ảnh {activeIndex + 1} trên {moments.length}, của {activeMoment.author_name}.</span>

        <MomentActions
          initialReaction={activeMoment.viewer_reaction}
          isOwner={isOwner}
          key={activeMoment.id}
          momentId={activeMoment.id}
          partnerReaction={activeMoment.partnerReaction}
          replyCount={activeMoment.reply_count}
          seenByPartner={activeMoment.seen_by_partner}
        />
      </div>

      <dialog
        aria-label="Ghi chú của khoảnh khắc"
        className="caption-dialog"
        onCancel={(event) => {
          event.preventDefault();
          captionDialogRef.current?.close();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) captionDialogRef.current?.close();
        }}
        ref={captionDialogRef}
      >
        <div className="caption-dialog-card">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow">Lời nhắn trong ảnh</p>
              <p className="truncate font-black">{isOwner ? "Bạn" : activeMoment.author_name} · {activeTime}</p>
            </div>
            <button aria-label="Đóng ghi chú" autoFocus className="icon-button" onClick={() => captionDialogRef.current?.close()} type="button"><CloseIcon className="size-5" /></button>
          </div>
          <p className="caption-dialog-text">{activeMoment.caption}</p>
        </div>
      </dialog>
    </section>
  );
}
