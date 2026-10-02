export type RewardRule = {
  ruleType: "streak_days" | "total_checkins";
  threshold: number;
};

export type RewardMetrics = {
  currentStreak: number;
  totalCheckins: number;
};

export function rewardProgress(rule: RewardRule, metrics: RewardMetrics): number {
  return rule.ruleType === "streak_days" ? metrics.currentStreak : metrics.totalCheckins;
}

export function shouldUnlockReward(rule: RewardRule, metrics: RewardMetrics): boolean {
  return rewardProgress(rule, metrics) >= rule.threshold;
}

export function nextRewardStatus(
  status: "proposed" | "rejected" | "active" | "unlocked" | "claimed" | "archived",
  eligible: boolean,
) {
  if (status === "unlocked" || status === "claimed") return status;
  return status === "active" && eligible ? "unlocked" : status;
}
