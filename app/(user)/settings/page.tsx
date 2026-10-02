import Image from "next/image";

import packageJson from "@/package.json";
import { MobileAppShell } from "@/components/layout/mobile-app-shell";
import { InstallAppCard } from "@/components/pwa/install-app";
import { DownloadIcon, HeartIcon, LockIcon, MessageIcon } from "@/components/ui/icons";
import { logout } from "@/features/auth/actions";
import { NotificationSettings } from "@/features/notifications/notification-settings";
import { DeviceManager } from "@/features/settings/device-manager";
import { getSettingsData } from "@/features/settings/get-settings-data";
import { SessionManager } from "@/features/settings/session-manager";

export default async function SettingsPage() {
  const { devices } = await getSettingsData();
  return (
    <MobileAppShell>
      <main className="app-page">
        <header className="app-section-header"><p className="eyebrow">Góc nhỏ của hai đứa</p><h1 className="app-tab-title mt-1">Cài đặt</h1><p className="app-tab-subtitle">Thông báo, thiết bị, dữ liệu và quyền riêng tư.</p></header>
        <section className="settings-hero relative mt-5 overflow-hidden rounded-[28px] bg-ink text-white shadow-[var(--shadow-md)] ring-2 ring-white/80">
          <div className="relative aspect-[16/9]">
            <Image alt="Thu và Vinh bên nhau" className="object-cover object-[58%_45%]" fill priority sizes="(max-width: 520px) 100vw, 480px" src="/api/couple-photo" unoptimized />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/5 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5"><p className="eyebrow !text-primary">Thu & Vinh</p><p className="mt-1 text-lg font-extrabold leading-snug">Mỗi ngày một chút, thành câu chuyện của hai đứa.</p></div>
          </div>
        </section>

        <section className="settings-card mt-4"><div className="settings-heading"><span className="settings-icon"><MessageIcon className="size-5" /></span><div><h2 className="text-base font-extrabold">Akiha AI</h2><p className="mt-1 text-sm leading-relaxed text-muted">Trợ lý trò chuyện vẫn sử dụng V4 Flash. Đây là AI riêng, không phải tin nhắn trực tiếp giữa Thu và Vinh.</p></div></div></section>
        <div className="mt-4"><NotificationSettings /></div>
        <div className="mt-4"><DeviceManager devices={devices} /></div>
        <div className="mt-4"><SessionManager /></div>
        <div className="mt-4"><InstallAppCard /></div>

        <section className="settings-card relative mt-4 overflow-hidden"><div className="settings-heading"><span className="settings-icon"><DownloadIcon className="size-5" /></span><div>
          <h2 className="text-base font-extrabold">Dữ liệu của hai đứa</h2>
          <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted">Xuất danh sách khoảnh khắc chung hoặc tải bản sao toàn bộ ảnh riêng tư.</p></div></div>
          <div className="mt-4 grid grid-cols-2 gap-2"><a className="grid min-h-12 place-items-center rounded-2xl bg-primary-soft font-bold text-primary-strong" href="/api/export?format=json">Tải JSON</a><a className="grid min-h-12 place-items-center rounded-2xl bg-lavender font-bold" href="/api/export?format=csv">Tải CSV</a><a className="col-span-2 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-ink font-bold text-white" href="/api/export/photos"><DownloadIcon className="size-4" />Tải ZIP ảnh</a></div>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3" aria-label="Cam kết riêng tư"><div className="rounded-[22px] bg-lavender p-4"><LockIcon className="size-5 text-primary-strong" /><p className="mt-3 text-sm font-bold">Ảnh riêng tư</p><p className="mt-1 text-xs text-muted">Chỉ hai thành viên xem được.</p></div><div className="rounded-[22px] bg-primary-soft p-4"><HeartIcon className="size-5 text-primary-strong" /><p className="mt-3 text-sm font-bold">Không công khai</p><p className="mt-1 text-xs text-muted">Không feed, không lượt thích.</p></div></section>
        <form action={logout} className="mt-5"><button className="min-h-12 w-full rounded-2xl border border-danger/20 bg-danger/5 font-semibold text-danger" type="submit">Đăng xuất</button></form>
        <p className="mt-4 text-center text-xs text-muted">Akiha {packageJson.version}</p>
      </main>
    </MobileAppShell>
  );
}
