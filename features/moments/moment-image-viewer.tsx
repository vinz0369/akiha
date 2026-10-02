"use client";

import Image from "next/image";
import { useRef, type RefObject } from "react";

import { CloseIcon, ExpandIcon, ImageIcon } from "@/components/ui/icons";

function FullscreenDialog({
  alt,
  authorName,
  dialogRef,
  imageUrl,
  time,
}: {
  alt: string;
  authorName: string;
  dialogRef: RefObject<HTMLDialogElement | null>;
  imageUrl: string;
  time: string;
}) {
  return (
    <dialog
      aria-label={`Xem toàn màn hình: ${alt}`}
      className="moment-viewer"
      onCancel={(event) => {
        event.preventDefault();
        dialogRef.current?.close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
      ref={dialogRef}
    >
      <div className="moment-viewer-stage">
        <Image alt={alt} className="object-contain" fill loading="eager" sizes="100vw" src={imageUrl} unoptimized />
        <div className="moment-viewer-topbar">
          <p className="min-w-0 truncate text-sm font-extrabold text-white">{authorName} · {time}</p>
          <button aria-label="Đóng ảnh" autoFocus className="moment-viewer-close" onClick={() => dialogRef.current?.close()} type="button">
            <CloseIcon className="size-6" />
          </button>
        </div>
        <p className="moment-viewer-help">Chụm hai ngón tay để phóng to</p>
      </div>
    </dialog>
  );
}

export function FullscreenImageButton({
  authorName,
  imageUrl,
  time,
}: {
  authorName: string;
  imageUrl: string | null;
  time: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  if (!imageUrl) return null;
  const alt = `Ảnh của ${authorName} lúc ${time}`;

  return (
    <>
      <button aria-label="Mở ảnh toàn màn hình" className="day-stack-expand" onClick={() => dialogRef.current?.showModal()} type="button">
        <ExpandIcon className="size-4" />
      </button>
      <FullscreenDialog alt={alt} authorName={authorName} dialogRef={dialogRef} imageUrl={imageUrl} time={time} />
    </>
  );
}

export function MomentImageViewer({
  authorName,
  imageUrl,
  time,
}: {
  authorName: string;
  imageUrl: string | null;
  time: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const alt = `Ảnh của ${authorName} lúc ${time}`;

  if (!imageUrl) {
    return (
      <div className="moment-photo-frame">
        <span className="absolute inset-0 grid place-items-center text-muted">
          <ImageIcon className="size-10" />
        </span>
      </div>
    );
  }

  return (
    <>
      <button
        aria-label="Xem ảnh toàn màn hình"
        className="moment-photo-frame moment-photo-trigger"
        onClick={() => dialogRef.current?.showModal()}
        type="button"
      >
        <Image alt={alt} className="object-cover" fill loading="eager" sizes="(max-width: 520px) calc(100vw - 2.5rem), 480px" src={imageUrl} unoptimized />
        <span aria-hidden="true" className="moment-photo-hint">
          <ExpandIcon className="size-4" />
          Xem ảnh
        </span>
      </button>

      <FullscreenDialog alt={alt} authorName={authorName} dialogRef={dialogRef} imageUrl={imageUrl} time={time} />
    </>
  );
}
