"use client";

import { RefreshIcon } from "@/components/ui/icons";

export default function UserAreaError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col items-center justify-center bg-background px-6 text-center text-ink">
      <div className="grid size-20 place-items-center rounded-[28px] bg-primary text-ink shadow-[0_16px_36px_rgb(185_62_105_/_0.14)]" aria-hidden="true"><RefreshIcon className="size-9" /></div>
      <p className="eyebrow mt-6">Đừng lo nhé</p>
      <h1 className="mt-2 text-2xl font-black">Akiha chưa tải được.</h1>
      <p className="mt-2 text-sm text-muted">Dữ liệu của em vẫn an toàn. Hãy kiểm tra kết nối rồi thử lại.</p>
      <button className="mt-7 min-h-12 rounded-2xl bg-ink px-6 font-bold text-white" onClick={reset} type="button">
        Thử lại
      </button>
    </main>
  );
}
