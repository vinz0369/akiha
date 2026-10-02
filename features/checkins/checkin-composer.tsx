"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { LinkFeedback } from "@/components/navigation/navigation-feedback";
import { ArrowLeftIcon, CheckIcon, CloseIcon, ImageIcon, SendIcon } from "@/components/ui/icons";
import { clearPendingCapture, loadPendingCapture, storePendingCapture } from "@/features/camera/pending-capture";
import { submitMoment, type MomentResult } from "@/features/checkins/service";
import { toLocalDate } from "@/lib/dates/vietnam";

const DRAFT_KEY = "akiha:moment-draft:v2";

type SelectedPhoto = { file: File; previewUrl: string };

function createSelectedPhoto(file: File): SelectedPhoto {
  return { file, previewUrl: URL.createObjectURL(file) };
}

function freshRequestId() {
  return crypto.randomUUID();
}

export function CheckInComposer() {
  const localDate = toLocalDate(new Date());
  const [caption, setCaption] = useState("");
  const [photo, setPhoto] = useState<SelectedPhoto | null>(null);
  const photoRef = useRef<SelectedPhoto | null>(null);
  const requestIdRef = useRef<string>("");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [result, setResult] = useState<MomentResult | null>(null);

  function replacePhoto(file: File | null) {
    if (photoRef.current) URL.revokeObjectURL(photoRef.current.previewUrl);
    const next = file ? createSelectedPhoto(file) : null;
    photoRef.current = next;
    setPhoto(next);
  }

  useEffect(() => {
    const stored = window.localStorage.getItem(DRAFT_KEY);
    if (stored) {
      try {
        const draft = JSON.parse(stored) as { caption?: string; requestId?: string; localDate?: string };
        if (draft.localDate === localDate && typeof draft.caption === "string") {
          queueMicrotask(() => setCaption(draft.caption!.slice(0, 280)));
        }
        requestIdRef.current = draft.localDate === localDate && typeof draft.requestId === "string"
          ? draft.requestId
          : freshRequestId();
      } catch {
        requestIdRef.current = freshRequestId();
      }
    } else {
      requestIdRef.current = freshRequestId();
    }
    void loadPendingCapture().then((file) => {
      if (file) replacePhoto(file);
    });
    return () => {
      if (photoRef.current) URL.revokeObjectURL(photoRef.current.previewUrl);
    };
  }, [localDate]);

  useEffect(() => {
    if (result || !requestIdRef.current) return;
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({
      caption,
      localDate,
      requestId: requestIdRef.current,
    }));
  }, [caption, localDate, result]);

  async function handleSubmit() {
    if (!photo) {
      setError("Hãy chụp hoặc chọn một ảnh trước khi gửi.");
      return;
    }
    setError(null);
    try {
      const created = await submitMoment({
        localDate,
        caption: caption.trim() || null,
        file: photo.file,
        clientRequestId: requestIdRef.current,
        onProgress: setProgress,
      });
      setResult(created);
      setProgress(null);
      window.localStorage.removeItem(DRAFT_KEY);
      await clearPendingCapture();
      replacePhoto(null);
    } catch (caught) {
      setProgress(null);
      setError(caught instanceof Error ? caught.message : "Chưa gửi được ảnh. Hãy thử lại.");
    }
  }

  if (result) {
    return (
      <main aria-live="polite" className="app-canvas mx-auto grid min-h-dvh w-full max-w-[520px] place-items-center overflow-hidden px-6 text-center">
        <section className="relative w-full overflow-hidden rounded-[34px] border border-white bg-white/90 p-7 shadow-[var(--shadow-lg)]">
          <div aria-hidden="true" className="mx-auto grid size-20 place-items-center rounded-[28px] bg-[linear-gradient(145deg,var(--ink),#65374e)] text-white shadow-lg">
            <CheckIcon className="size-10" />
          </div>
          <p className="eyebrow mt-6">Đã gửi thành công</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-.04em]">Một khoảnh khắc mới đã đến với người thương.</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">Ảnh đã được lưu trong album chung của hai đứa.</p>
          <div className="mt-7 grid gap-3">
            <Link className="primary-action grid min-h-14 place-items-center px-5" href={`/moments/${result.moment_id}`}>
              Xem khoảnh khắc
              <LinkFeedback label="Đang mở khoảnh khắc…" />
            </Link>
            <Link className="grid min-h-12 place-items-center rounded-2xl bg-primary-soft font-bold text-primary-strong" href="/">
              Về Hôm nay
              <LinkFeedback label="Đang về Hôm nay…" />
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-canvas mx-auto flex min-h-dvh w-full max-w-[520px] flex-col px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
      <header className="flex items-center gap-3">
        <Link aria-label="Về Hôm nay" className="icon-button" href="/">
          <ArrowLeftIcon className="size-5" />
          <LinkFeedback label="Đang về Hôm nay…" />
        </Link>
        <div>
          <p className="eyebrow">Gửi một khoảnh khắc</p>
          <h1 className="mt-0.5 text-xl font-black">Cho người thương xem hôm nay</h1>
        </div>
      </header>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto pb-5">
        {photo ? (
          <section className="relative aspect-[4/5] overflow-hidden rounded-[30px] border-4 border-white bg-ink shadow-[var(--shadow-lg)]">
            <div aria-label="Ảnh chuẩn bị gửi" className="absolute inset-0 bg-cover bg-center" role="img" style={{ backgroundImage: `url(${photo.previewUrl})` }} />
            <button
              aria-label="Bỏ ảnh này"
              className="absolute right-3 top-3 grid size-12 place-items-center rounded-full bg-ink/65 text-white backdrop-blur"
              onClick={() => { replacePhoto(null); void clearPendingCapture(); }}
              type="button"
            >
              <CloseIcon className="size-5" />
            </button>
          </section>
        ) : (
          <label className="grid aspect-[4/5] cursor-pointer place-items-center rounded-[30px] border-2 border-dashed border-primary/70 bg-white/70 p-8 text-center shadow-sm">
            <span>
              <span aria-hidden="true" className="mx-auto grid size-16 place-items-center rounded-[22px] bg-primary-soft text-primary-strong"><ImageIcon className="size-7" /></span>
              <span className="mt-4 block text-lg font-black">Chọn một ảnh</span>
              <span className="mt-1 block text-sm text-muted">Ảnh sẽ được tối ưu trước khi gửi.</span>
            </span>
            <input
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                if (file) { replacePhoto(file); void storePendingCapture(file); }
                event.target.value = "";
              }}
              type="file"
            />
          </label>
        )}

        <label className="mt-5 block text-sm font-bold" htmlFor="caption">
          Ghi chú <span className="font-normal text-muted">Không bắt buộc</span>
        </label>
        <textarea
          aria-describedby="caption-count"
          className="mt-2 min-h-28 w-full resize-none rounded-[22px] border p-4 text-base"
          id="caption"
          maxLength={280}
          onChange={(event) => setCaption(event.target.value)}
          placeholder="Viết một điều nhỏ cho người ấy…"
          value={caption}
        />
        <p className="mt-1 text-right text-xs tabular-nums text-muted" id="caption-count">{caption.length}/280</p>
        {error ? <p className="mt-4 rounded-2xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger" role="alert">{error}</p> : null}
      </div>

      <button
        aria-busy={progress !== null}
        className="primary-action flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-[22px] px-6 disabled:cursor-wait disabled:opacity-60"
        disabled={progress !== null || !photo}
        onClick={() => void handleSubmit()}
        type="button"
      >
        <SendIcon className="size-5" />
        {progress ?? "Gửi cho người thương"}
      </button>
    </main>
  );
}
