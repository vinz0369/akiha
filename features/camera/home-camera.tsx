"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  CalendarIcon,
  CameraIcon,
  CheckIcon,
  CloseIcon,
  ImageIcon,
  MessageIcon,
  RefreshIcon,
  SendIcon,
  SettingsIcon,
} from "@/components/ui/icons";
import {
  clearPendingCapture,
  loadPendingCapture,
  storePendingCapture,
} from "@/features/camera/pending-capture";
import { submitMoment } from "@/features/checkins/service";
import { toLocalDate } from "@/lib/dates/vietnam";

type CameraState = "requesting" | "streaming" | "blocked" | "unavailable";
type FacingMode = "user" | "environment";
type Capture = { file: File; previewUrl: string };

type HomeCameraProps = {
  embedded?: boolean;
  latestImageUrl?: string | null;
  momentCount?: number;
  partnerName?: string;
  unseenCount?: number;
};

const DRAFT_KEY = "akiha:camera-draft:v3";

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function newRequestId() {
  return crypto.randomUUID();
}

function createCapture(file: File, previewUrl = URL.createObjectURL(file)): Capture {
  return { file, previewUrl };
}

export function HomeCamera({
  embedded = false,
  latestImageUrl = null,
  momentCount = 0,
  partnerName = "người thương",
  unseenCount = 0,
}: HomeCameraProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(false);
  const requestSequenceRef = useRef(0);
  const requestIdRef = useRef("");
  const captureRef = useRef<Capture | null>(null);
  const [state, setState] = useState<CameraState>("requesting");
  const [facingMode, setFacingMode] = useState<FacingMode>("user");
  const [capture, setCapture] = useState<Capture | null>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const replaceCapture = useCallback((next: Capture | null) => {
    const previous = captureRef.current;
    if (previous?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(previous.previewUrl);
    captureRef.current = next;
    setCapture(next);
  }, []);

  const startCamera = useCallback(async () => {
    const sequence = ++requestSequenceRef.current;
    stopStream(streamRef.current);
    streamRef.current = null;

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setState("unavailable");
      return;
    }

    setState("requesting");
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          aspectRatio: { ideal: 4 / 5 },
          facingMode,
          height: { ideal: 1350 },
          width: { ideal: 1080 },
        },
      });

      if (!mountedRef.current || sequence !== requestSequenceRef.current) {
        stopStream(stream);
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState("streaming");
    } catch {
      stopStream(streamRef.current);
      streamRef.current = null;
      if (mountedRef.current && sequence === requestSequenceRef.current) setState("blocked");
    }
  }, [facingMode]);

  useEffect(() => {
    mountedRef.current = true;
    const stored = window.localStorage.getItem(DRAFT_KEY);
    if (stored) {
      try {
        const draft = JSON.parse(stored) as { caption?: string; requestId?: string };
        if (typeof draft.caption === "string") {
          queueMicrotask(() => {
            if (mountedRef.current) setCaption(draft.caption!.slice(0, 280));
          });
        }
        if (typeof draft.requestId === "string") requestIdRef.current = draft.requestId;
      } catch {
        window.localStorage.removeItem(DRAFT_KEY);
      }
    }
    if (!requestIdRef.current) requestIdRef.current = newRequestId();

    void loadPendingCapture().then((file) => {
      if (!mountedRef.current) return;
      if (file) replaceCapture(createCapture(file));
      else void startCamera();
    });

    const handleVisibility = () => {
      if (captureRef.current) return;
      if (document.visibilityState === "hidden") {
        requestSequenceRef.current += 1;
        stopStream(streamRef.current);
        streamRef.current = null;
      } else {
        void startCamera();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      mountedRef.current = false;
      requestSequenceRef.current += 1;
      document.removeEventListener("visibilitychange", handleVisibility);
      stopStream(streamRef.current);
      if (captureRef.current?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(captureRef.current.previewUrl);
      }
    };
  }, [replaceCapture, startCamera]);

  useEffect(() => {
    if (!capture) return;
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({
      caption,
      requestId: requestIdRef.current,
    }));
  }, [caption, capture]);

  const captureFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!video || state !== "streaming") return;

    setError(null);
    const sourceWidth = video.videoWidth || 1080;
    const sourceHeight = video.videoHeight || 1350;
    const targetRatio = 4 / 5;
    const sourceRatio = sourceWidth / sourceHeight;
    const cropWidth = sourceRatio > targetRatio ? sourceHeight * targetRatio : sourceWidth;
    const cropHeight = sourceRatio > targetRatio ? sourceHeight : sourceWidth / targetRatio;
    const sourceX = (sourceWidth - cropWidth) / 2;
    const sourceY = (sourceHeight - cropHeight) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(cropWidth);
    canvas.height = Math.round(cropHeight);
    const context = canvas.getContext("2d");

    if (!context) {
      setError("Trình duyệt này không thể chụp ảnh.");
      return;
    }

    if (facingMode === "user") {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }
    context.drawImage(
      video,
      sourceX,
      sourceY,
      cropWidth,
      cropHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );
    if (!blob) {
      setError("Trình duyệt này không thể chụp ảnh.");
      return;
    }

    const file = new File([blob], `akiha-${Date.now()}.jpg`, { type: "image/jpeg" });
    const next = createCapture(file, canvas.toDataURL("image/jpeg", 0.9));
    replaceCapture(next);
    await storePendingCapture(file);
    stopStream(streamRef.current);
    streamRef.current = null;
    navigator.vibrate?.(12);
  }, [facingMode, replaceCapture, state]);

  const retake = useCallback(async () => {
    setCaption("");
    setError(null);
    requestIdRef.current = newRequestId();
    window.localStorage.removeItem(DRAFT_KEY);
    await clearPendingCapture();
    replaceCapture(null);
    void startCamera();
  }, [replaceCapture, startCamera]);

  const send = useCallback(async () => {
    if (!capture || progress) return;
    setError(null);

    try {
      if (!navigator.onLine) {
        throw new Error("Chưa gửi · Ảnh nháp vẫn được giữ. Hãy thử lại khi có mạng.");
      }
      await submitMoment({
        caption: caption.trim() || null,
        clientRequestId: requestIdRef.current,
        file: capture.file,
        localDate: toLocalDate(new Date()),
        onProgress: setProgress,
      });
      setProgress(null);
      setSent(true);
      setCaption("");
      requestIdRef.current = newRequestId();
      window.localStorage.removeItem(DRAFT_KEY);
      await clearPendingCapture();
      replaceCapture(null);
      navigator.vibrate?.([18, 45, 18]);
      router.refresh();
      void startCamera();
      window.setTimeout(() => setSent(false), 2200);
    } catch (caught) {
      setProgress(null);
      setError(caught instanceof Error ? caught.message : "Chưa gửi được ảnh. Hãy thử lại.");
    }
  }, [caption, capture, progress, replaceCapture, router, startCamera]);

  return (
    <div className={embedded ? "camera-embedded" : "camera-screen"}>
      {!embedded ? <header className="camera-header">
        <Link aria-label="Mở album" className="camera-top-button relative" href="/calendar">
          <CalendarIcon className="size-5" />
          {unseenCount > 0 ? <span className="camera-badge" aria-label={`${unseenCount} ảnh mới`}>{Math.min(unseenCount, 9)}</span> : null}
        </Link>
        <div className="min-w-0 text-center">
          <p className="truncate text-[11px] font-extrabold uppercase tracking-[.14em] text-primary-strong">Thu & Vinh</p>
          <h1 className="truncate text-base font-black">Gửi cho {partnerName}</h1>
        </div>
        <div className="flex gap-2">
          <Link aria-label="Mở Akiha AI" className="camera-top-button" href="/chat"><MessageIcon className="size-5" /></Link>
          <Link aria-label="Mở cài đặt" className="camera-top-button" href="/settings"><SettingsIcon className="size-5" /></Link>
        </div>
      </header> : null}

      <section
        aria-busy={progress !== null}
        aria-label="Khung máy ảnh"
        className="camera-viewport"
      >
        {capture ? (
          <div
            aria-label="Ảnh vừa chụp"
            className="absolute inset-0 bg-cover bg-center"
            role="img"
            style={{ backgroundImage: `url(${capture.previewUrl})` }}
          />
        ) : (
          <video
            aria-label={`Xem trước camera ${facingMode === "user" ? "trước" : "sau"}`}
            autoPlay
            className={`size-full object-cover transition-opacity duration-200 ${facingMode === "user" ? "scale-x-[-1]" : ""} ${state === "streaming" ? "opacity-100" : "opacity-0"}`}
            muted
            playsInline
            ref={videoRef}
          />
        )}

        {!capture && state === "streaming" ? (
          <>
            <button
              aria-label={`Chuyển sang camera ${facingMode === "user" ? "sau" : "trước"}`}
              className="camera-overlay-button right-3 top-3"
              onClick={() => setFacingMode((current) => current === "user" ? "environment" : "user")}
              type="button"
            >
              <RefreshIcon className="size-5" />
            </button>
            <div className="absolute inset-x-0 bottom-5 flex items-center justify-center">
              <button aria-label="Chụp ảnh" className="camera-shutter" onClick={() => void captureFrame()} type="button">
                <span aria-hidden="true" />
              </button>
            </div>
          </>
        ) : null}

        {!capture && state !== "streaming" ? (
          <div className="absolute inset-0 grid place-items-center px-7 text-center text-white">
            <div>
              <span aria-hidden="true" className="mx-auto grid size-16 place-items-center rounded-full bg-white/12"><CameraIcon className="size-7" /></span>
              {state === "requesting" ? (
                <p className="mt-4 font-bold" role="status">Đang mở camera…</p>
              ) : (
                <>
                  <p className="mt-4 text-lg font-black">{state === "blocked" ? "Cần quyền dùng camera" : "Không tìm thấy camera"}</p>
                  <p className="mx-auto mt-2 max-w-xs text-sm text-white/75">Cho phép camera trong Chrome rồi thử lại.</p>
                  <button className="mt-5 min-h-12 rounded-full bg-white px-6 font-extrabold text-ink" onClick={() => void startCamera()} type="button">Thử lại</button>
                </>
              )}
            </div>
          </div>
        ) : null}

        {capture ? (
          <>
            <button aria-label="Chụp lại" className="camera-overlay-button left-3 top-3" disabled={progress !== null} onClick={() => void retake()} type="button">
              <CloseIcon className="size-5" />
            </button>
            <div className="camera-caption-panel">
              <label className="sr-only" htmlFor="camera-caption">Ghi chú không bắt buộc</label>
              <div className="flex min-w-0 flex-1 items-center rounded-full bg-white px-4 shadow-lg">
                <input
                  aria-describedby="camera-caption-help"
                  className="h-12 min-w-0 flex-1 border-0 bg-transparent text-base shadow-none outline-none"
                  disabled={progress !== null}
                  id="camera-caption"
                  maxLength={280}
                  onChange={(event) => setCaption(event.target.value)}
                  placeholder="Viết một điều nhỏ…"
                  value={caption}
                />
              </div>
              <button aria-label="Gửi ảnh" className="camera-send" disabled={progress !== null} onClick={() => void send()} type="button">
                {progress ? <span className="camera-spinner" aria-hidden="true" /> : <SendIcon className="size-5" />}
              </button>
              <span className="sr-only" id="camera-caption-help">Ghi chú không bắt buộc, tối đa 280 ký tự.</span>
            </div>
          </>
        ) : null}

        {progress ? <div className="camera-progress" role="status">{progress}</div> : null}
        {error ? <div className="camera-error" role="alert">{error}</div> : null}
        {sent ? <div className="camera-success" role="status"><CheckIcon className="size-5" /> Đã gửi cho {partnerName}</div> : null}
      </section>

      {!embedded ? <footer className="camera-footer">
        <Link aria-label="Xem album hôm nay" className="camera-latest" href="/calendar">
          {latestImageUrl ? <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${latestImageUrl.replaceAll('"', "%22")}")` }} /> : <ImageIcon className="size-5" />}
          {momentCount > 0 ? <span className="camera-count" aria-label={`${momentCount} ảnh hôm nay`}>{momentCount}</span> : null}
        </Link>
        <p className="min-w-0 flex-1 text-center text-xs font-bold text-muted">
          {capture ? "Thêm ghi chú hoặc gửi ngay" : "Chạm nút tròn để chụp"}
        </p>
        <span aria-hidden="true" className="size-12" />
      </footer> : null}
    </div>
  );
}
