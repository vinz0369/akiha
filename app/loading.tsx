import { HeartIcon } from "@/components/ui/icons";

export default function Loading() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col items-center justify-center overflow-hidden bg-background px-6 text-center" aria-busy="true" aria-live="polite">
      <div className="relative grid size-24 place-items-center rounded-[30px] bg-[linear-gradient(145deg,var(--primary),var(--peach))] shadow-[0_22px_55px_rgb(185_62_105_/_0.2)]">
        <HeartIcon className="size-9" />
        <span className="absolute -right-1 -top-1 size-5 animate-pulse rounded-full bg-soft-yellow" aria-hidden="true" />
      </div>
      <p className="mt-6 text-2xl font-black tracking-tight">Akiha</p>
      <p className="mt-1 text-sm text-muted">Đang mở góc nhỏ của hai đứa…</p>
      <div className="mt-7 h-1 w-24 overflow-hidden rounded-full bg-primary-soft" aria-hidden="true">
        <div className="launch-progress h-full w-1/2 rounded-full bg-primary-strong" />
      </div>
      <span className="sr-only">Đang tải Akiha…</span>
    </main>
  );
}
