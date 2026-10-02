import Link from "next/link";

import { LinkFeedback } from "@/components/navigation/navigation-feedback";
import { CloudOffIcon } from "@/components/ui/icons";

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col items-center justify-center bg-background px-6 text-center text-ink">
      <div className="grid size-20 place-items-center rounded-[28px] bg-primary text-ink shadow-[0_16px_36px_rgb(185_62_105_/_0.14)]" aria-hidden="true"><CloudOffIcon className="size-9" /></div>
      <p className="eyebrow mt-6">Tạm mất kết nối</p>
      <h1 className="mt-2 text-2xl font-black">Em đang ngoại tuyến.</h1>
      <p className="mt-3 max-w-sm text-sm text-muted">Bản nháp check-in vẫn an toàn trên thiết bị. Hãy kết nối mạng trước khi gửi.</p>
      <Link className="mt-7 inline-flex min-h-12 items-center rounded-xl bg-ink px-6 font-bold text-white" href="/">Thử lại<LinkFeedback label="Đang kết nối lại…" /></Link>
    </main>
  );
}
