import type { Reward } from "@/features/rewards/get-rewards";
import { GiftIcon } from "@/components/ui/icons";

export function RewardCard({ reward }: { reward: Reward }) {
  const progress = Math.min(reward.progress, reward.threshold);
  const unlocked = reward.status === "unlocked" || reward.status === "claimed";

  return (
    <article className={`relative overflow-hidden rounded-[26px] border p-5 shadow-[var(--shadow-sm)] ${unlocked ? "border-soft-yellow bg-[linear-gradient(145deg,#fff,var(--soft-yellow))]" : reward.status === "active" ? "border-white bg-white/92" : "border-border bg-white/72"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted">{reward.is_mystery && !unlocked ? "PHẦN THƯỞNG BÍ MẬT" : ({ proposed: "ĐANG CHỜ", active: "ĐANG TIẾN TỚI", unlocked: "ĐÃ MỞ KHÓA", claimed: "ĐÃ NHẬN", rejected: "CHƯA DUYỆT", archived: "ĐÃ LƯU" } as const)[reward.status]}</p>
          <h3 className="mt-1 text-lg font-semibold">{reward.title}</h3>
        </div>
        <span className={`grid size-12 place-items-center rounded-[18px] ${unlocked ? "bg-ink text-white shadow-md" : "bg-primary-soft text-primary-strong"}`} aria-hidden="true"><GiftIcon className="size-5" /></span>
      </div>
      {reward.public_description ? <p className="mt-2 text-sm text-muted">{reward.public_description}</p> : null}
      {reward.status === "active" ? (
        <>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-primary-strong" style={{ width: `${(progress / reward.threshold) * 100}%` }} />
          </div>
          <p className="mt-2 text-right text-xs tabular-nums text-muted">{reward.progress}/{reward.threshold}</p>
        </>
      ) : null}
      {reward.status === "proposed" ? <p className="mt-3 text-sm text-primary-strong">Đang chờ Vinh duyệt</p> : null}
      {reward.status === "rejected" ? <p className="mt-3 text-sm text-muted">{reward.rejected_reason ?? "Mình hẹn một món quà khác nhé."}</p> : null}
      {unlocked && reward.secret?.text ? (
        <details className="mt-4 rounded-xl bg-soft-yellow/20 p-4">
          <summary className="cursor-pointer font-medium">{reward.secret.type === "letter" ? "Mở lá thư" : "Mở điều bất ngờ"}</summary>
          <p className="mt-3 whitespace-pre-wrap">{reward.secret.text}</p>
        </details>
      ) : null}
    </article>
  );
}
