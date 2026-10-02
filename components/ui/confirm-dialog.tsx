"use client";

import { useEffect, useId, useRef } from "react";

import { AlertIcon } from "@/components/ui/icons";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pending = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      className="confirm-dialog"
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onCancel();
      }}
      ref={dialogRef}
    >
      <section className="confirm-sheet">
        <span aria-hidden="true" className="confirm-handle" />
        <div aria-hidden="true" className="confirm-icon"><AlertIcon className="size-6" /></div>
        <h2 className="mt-4 text-xl font-black" id={titleId}>{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted" id={descriptionId}>{description}</p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button autoFocus className="min-h-12 rounded-2xl bg-surface-subtle px-4 font-bold text-foreground" disabled={pending} onClick={onCancel} type="button">Hủy</button>
          <button aria-busy={pending} className="min-h-12 rounded-2xl bg-danger px-4 font-bold text-white shadow-sm" disabled={pending} onClick={onConfirm} type="button">{pending ? "Đang xử lý…" : confirmLabel}</button>
        </div>
      </section>
    </dialog>
  );
}
