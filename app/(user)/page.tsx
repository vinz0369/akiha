import Image from "next/image";
import Link from "next/link";

import { MobileAppShell } from "@/components/layout/mobile-app-shell";
import { LinkFeedback } from "@/components/navigation/navigation-feedback";
import { ArrowRightIcon, HeartIcon } from "@/components/ui/icons";
import { HomeCamera } from "@/features/camera/home-camera";
import { getCoupleHome } from "@/features/moments/data";
import { MomentRealtimeRefresh } from "@/features/moments/moment-realtime-refresh";
import { formatLongLocalDate } from "@/lib/dates/vietnam";

export default async function HomePage() {
  const state = await getCoupleHome();
  const recentMoments = [...state.moments].sort(
    (left, right) => Date.parse(right.captured_at) - Date.parse(left.captured_at),
  ).slice(0, 3);

  return (
    <MobileAppShell>
      <MomentRealtimeRefresh coupleId={state.couple_id} unseenCount={state.unseen_count} />
      <main className="today-screen">
        <header className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">Nhật ký của hai đứa</p>
            <h1 className="app-tab-title mt-0.5 truncate">Chào {state.viewer_name}</h1>
          </div>
          <Link aria-label="Mở cài đặt" className="relative size-11 shrink-0 overflow-hidden rounded-full border-[3px] border-white bg-primary-soft shadow-[var(--shadow-md)]" href="/settings">
            <Image alt="Thu và Vinh" className="object-cover object-[58%_45%]" fill sizes="44px" src="/api/couple-photo" unoptimized />
            <LinkFeedback label="Đang mở cài đặt…" />
          </Link>
        </header>

        <Link
          aria-label={`${state.moments.length} ảnh trong album hôm nay. Mở album.`}
          className="today-summary aurora-card"
          href={`/days/${state.today}`}
        >
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate text-[11px] font-extrabold text-primary-strong"><span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-primary-strong" />{formatLongLocalDate(state.today)}</p>
            <h2 className="mt-1 line-clamp-2 text-[1.05rem] font-black leading-[1.2]">
              {state.unseen_count > 0
                ? `${state.partner_name} vừa gửi ${state.unseen_count} khoảnh khắc mới.`
                : state.moments.length > 0
                  ? `Hai đứa đã giữ lại ${state.moments.length} khoảnh khắc hôm nay.`
                  : "Một ngày bình thường cũng đáng được giữ lại."}
            </h2>
            <p className="mt-1 flex items-center gap-1 text-xs font-bold text-muted">
              {state.moments.length > 0 ? `${state.moments.length} ảnh hôm nay` : "Album hôm nay đang trống"}
              <ArrowRightIcon aria-hidden="true" className="size-3.5" />
            </p>
          </div>
          <div className={`today-summary-photo ${recentMoments.length > 1 ? "today-summary-photo-stacked" : ""}`}>
            {recentMoments.length > 0 ? (
              recentMoments.map((moment) => moment.imageUrl ? (
                <span aria-hidden="true" className="today-summary-photo-layer" key={moment.id}>
                  <Image alt="" className="object-cover" fill sizes="64px" src={moment.imageUrl} unoptimized />
                </span>
              ) : null)
            ) : (
              <HeartIcon aria-hidden="true" className="size-7 text-primary-strong" />
            )}
            {state.unseen_count > 0 ? <span className="today-summary-unseen">{state.unseen_count}</span> : null}
          </div>
          <LinkFeedback label="Đang mở album hôm nay…" />
        </Link>

        <section className="today-camera-block" aria-labelledby="today-camera-title">
          <div className="flex items-end justify-between gap-3 px-1">
            <div className="min-w-0">
              <p className="eyebrow">Máy ảnh</p>
              <h2 className="truncate text-base font-black" id="today-camera-title">Gửi cho {state.partner_name}</h2>
            </div>
            <p className="shrink-0 text-[11px] font-bold text-muted">Ghi chú không bắt buộc</p>
          </div>
          <HomeCamera embedded partnerName={state.partner_name} />
        </section>
      </main>
    </MobileAppShell>
  );
}
