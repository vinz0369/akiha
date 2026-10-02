import Link from "next/link";
import { notFound } from "next/navigation";

import { MobileAppShell } from "@/components/layout/mobile-app-shell";
import { LinkFeedback } from "@/components/navigation/navigation-feedback";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { getCoupleMoment } from "@/features/moments/data";
import { MomentImageViewer } from "@/features/moments/moment-image-viewer";
import { MomentActions } from "@/features/moments/moment-actions";
import { MomentOwnerActions } from "@/features/moments/moment-owner-actions";
import { ReplyComposer } from "@/features/moments/reply-composer";
import { formatLongLocalDate } from "@/lib/dates/vietnam";

export default async function MomentPage({ params }: { params: Promise<{ date: string }> }) {
  const { date: momentId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(momentId)) notFound();
  const moment = await getCoupleMoment(momentId);
  if (!moment) notFound();
  const isOwner = moment.author_id === moment.viewer_id;
  const time = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(moment.captured_at));

  return (
    <MobileAppShell>
    <main className="app-page">
      <header className="flex items-center gap-3">
        <Link aria-label="Về album ngày" className="icon-button" href={`/days/${moment.local_date}`}><ArrowLeftIcon className="size-5" /><LinkFeedback label="Đang về album…" /></Link>
        <div className="min-w-0"><p className="eyebrow">{isOwner ? "Khoảnh khắc của bạn" : `Từ ${moment.author_name}`}</p><h1 className="mt-0.5 truncate text-xl font-black">{formatLongLocalDate(moment.local_date)}</h1></div>
      </header>

      <article className="mt-5">
        <MomentImageViewer authorName={moment.author_name} imageUrl={moment.imageUrl} time={time} />
        <div className="mt-4 flex items-center justify-between gap-3"><p className="font-black">{isOwner ? "Bạn" : moment.author_name}</p><time className="text-sm tabular-nums text-muted">{time}</time></div>
        {moment.caption ? <p className="mt-3 whitespace-pre-wrap text-lg leading-relaxed">{moment.caption}</p> : <p className="mt-3 text-sm italic text-muted">Khoảnh khắc này không có ghi chú.</p>}
        <MomentActions initialReaction={moment.viewer_reaction} isOwner={isOwner} momentId={moment.id} partnerReaction={moment.partnerReaction} replyCount={moment.replies.length} seenByPartner={moment.seen_by_partner} />
        {isOwner ? <MomentOwnerActions initialCaption={moment.caption} localDate={moment.local_date} momentId={moment.id} /> : <ReplyComposer momentId={moment.id} />}
      </article>

      <section className="mt-7" aria-labelledby="replies-title">
        <h2 className="text-lg font-black" id="replies-title">Lời nhắn</h2>
        {moment.replies.length ? <div className="mt-3 space-y-2">{moment.replies.map((reply) => <article className="surface-card rounded-[20px] p-4" key={reply.id}><div className="flex items-center justify-between gap-3"><p className="text-sm font-black">{reply.author_id === moment.viewer_id ? "Bạn" : reply.author_name}</p><time className="text-xs text-muted">{new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(reply.created_at))}</time></div><p className="mt-2 whitespace-pre-wrap text-[15px]">{reply.text}</p></article>)}</div> : <p className="mt-2 text-sm text-muted">Chưa có lời nhắn nào.</p>}
      </section>
    </main>
    </MobileAppShell>
  );
}
