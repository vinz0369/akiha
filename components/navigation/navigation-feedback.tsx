"use client";

import { useLinkStatus } from "next/link";

type NavigationFeedbackProps = {
  active: boolean;
  label?: string;
};

export function NavigationFeedback({
  active,
  label = "Đang mở trang…",
}: NavigationFeedbackProps) {
  return active ? <span className="sr-only" role="status">{label}</span> : null;
}

export function LinkFeedback({ label }: { label?: string }) {
  const { pending } = useLinkStatus();
  return <NavigationFeedback active={pending} label={label} />;
}
