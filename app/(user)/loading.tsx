import { MobileAppShell } from "@/components/layout/mobile-app-shell";
import { NavigationFeedback } from "@/components/navigation/navigation-feedback";

export default function UserLoading() {
  return (
    <MobileAppShell>
      <NavigationFeedback active label="Đang tải nội dung…" />
      <main
        aria-busy="true"
        aria-label="Đang tải nội dung"
        className="min-h-dvh px-5 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="skeleton h-3 w-24 rounded-full" />
            <div className="skeleton h-6 w-44 rounded-lg" />
          </div>
          <div className="skeleton size-11 rounded-full" />
        </div>
        <div className="skeleton mt-5 h-44 rounded-[30px]" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="skeleton h-20 rounded-[22px]" />
          <div className="skeleton h-20 rounded-[22px]" />
        </div>
        <div className="skeleton mt-5 aspect-square rounded-[28px]" />
        <span className="sr-only">Đang tải nội dung Akiha…</span>
      </main>
    </MobileAppShell>
  );
}
