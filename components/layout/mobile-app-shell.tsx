"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { LinkFeedback } from "@/components/navigation/navigation-feedback";
import { CalendarIcon, HomeIcon, MessageIcon, SettingsIcon } from "@/components/ui/icons";

export function MobileAppShell({
  children,
  navigation = true,
}: {
  children: ReactNode;
  navigation?: boolean;
}) {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "Hôm nay", Icon: HomeIcon, active: pathname === "/" || pathname.startsWith("/check-in") },
    { href: "/calendar", label: "Lịch", Icon: CalendarIcon, active: pathname.startsWith("/calendar") || pathname.startsWith("/days") || pathname.startsWith("/moments") },
    { href: "/chat", label: "Akiha AI", Icon: MessageIcon, active: pathname.startsWith("/chat") },
    { href: "/settings", label: "Cài đặt", Icon: SettingsIcon, active: pathname.startsWith("/settings") },
  ];

  return (
    <div className="app-canvas relative mx-auto flex h-dvh min-h-0 w-full max-w-[520px] flex-col overflow-hidden border-x border-white/60 shadow-[0_0_90px_rgb(87_43_64_/_0.1)]">
      {children}
      {navigation ? <nav aria-label="Điều hướng chính" className="app-dock fixed inset-x-3 bottom-[calc(.5rem+env(safe-area-inset-bottom))] z-40 mx-auto grid h-[72px] max-w-[488px] grid-cols-4 rounded-[24px] border border-white/90 bg-white/90 p-1.5 shadow-[var(--shadow-dock)] backdrop-blur-2xl">
        {items.map(({ href, label, Icon, active }) => (
          <Link
            aria-current={active ? "page" : undefined}
            className={`app-nav-item group relative flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-[18px] px-1 text-[11px] font-extrabold ${active ? "app-nav-item-active text-primary-strong" : "text-muted hover:text-foreground"}`}
            href={href}
            key={href}
          >
            <span aria-hidden="true" className={`app-nav-icon grid h-8 w-12 place-items-center rounded-full ${active ? "bg-[linear-gradient(145deg,var(--primary-soft),white)] shadow-sm" : "group-hover:bg-primary-soft/60"}`}><Icon className="size-[21px]" /></span>
            <span className="whitespace-nowrap leading-none">{label}</span>
            <LinkFeedback label={`Đang mở ${label}…`} />
          </Link>
        ))}
      </nav> : null}
    </div>
  );
}
