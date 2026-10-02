"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { CheckIcon, DeviceIcon } from "@/components/ui/icons";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

type InstallContextValue = {
  canInstall: boolean;
  installed: boolean;
  isIos: boolean;
  install: () => Promise<void>;
};

const InstallContext = createContext<InstallContextValue | null>(null);

export function InstallAppProvider({ children }: { children: ReactNode }) {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || Boolean((navigator as NavigatorWithStandalone).standalone);
    queueMicrotask(() => {
      setInstalled(standalone);
      setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    });

    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const value = useMemo<InstallContextValue>(() => ({
    canInstall: Boolean(promptEvent),
    installed,
    isIos,
    install: async () => {
      if (!promptEvent) return;
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setPromptEvent(null);
    },
  }), [installed, isIos, promptEvent]);

  return <InstallContext.Provider value={value}>{children}</InstallContext.Provider>;
}

export function InstallAppCard() {
  const context = useContext(InstallContext);
  if (!context) return null;

  return (
    <section className="settings-card relative overflow-hidden">
      <span className="absolute -right-6 -top-8 size-24 rounded-full bg-lavender" aria-hidden="true" />
      <div className="relative flex items-start gap-4">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-strong">
          <DeviceIcon className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-extrabold">Cài Akiha lên điện thoại</h2>
          {context.installed ? <p className="mt-1 flex items-center gap-1.5 text-sm text-success"><CheckIcon className="size-4 shrink-0" />Đã cài trên thiết bị này</p> : null}
          {!context.installed && context.canInstall ? (
            <><p className="mt-1 text-sm text-muted">Mở nhanh như một ứng dụng, không còn thanh địa chỉ Chrome.</p><button className="mt-4 min-h-12 w-full rounded-2xl bg-ink px-5 font-bold text-white" onClick={() => void context.install()} type="button">Thêm vào màn hình chính</button></>
          ) : null}
          {!context.installed && !context.canInstall && context.isIos ? <p className="mt-2 text-sm leading-relaxed text-muted">Trong Safari: nhấn <strong>Chia sẻ</strong>, rồi chọn <strong>Thêm vào Màn hình chính</strong>.</p> : null}
          {!context.installed && !context.canInstall && !context.isIos ? <p className="mt-2 text-sm leading-relaxed text-muted">Trong Chrome: mở <strong>menu ba chấm</strong>, rồi chọn <strong>Cài đặt ứng dụng</strong> hoặc <strong>Thêm vào màn hình chính</strong>.</p> : null}
        </div>
      </div>
    </section>
  );
}
