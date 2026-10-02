import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RewardCard } from "@/features/rewards/reward-card";
import { nextRewardStatus, shouldUnlockReward } from "@/lib/rewards/rules";

describe("reward rules", () => {
  it("unlocks at and above the threshold", () => {
    const rule = { ruleType: "streak_days" as const, threshold: 7 };
    expect(shouldUnlockReward(rule, { currentStreak: 6, totalCheckins: 20 })).toBe(false);
    expect(shouldUnlockReward(rule, { currentStreak: 7, totalCheckins: 20 })).toBe(true);
    expect(shouldUnlockReward(rule, { currentStreak: 8, totalCheckins: 20 })).toBe(true);
  });

  it("does not let historical correction relock an achievement", () => {
    expect(nextRewardStatus("unlocked", false)).toBe("unlocked");
    expect(nextRewardStatus("claimed", false)).toBe("claimed");
  });
});

describe("RewardCard secret boundary", () => {
  it("does not render secret content before unlock", () => {
    render(<RewardCard reward={{
      id: "00000000-0000-4000-8000-000000000100",
      source: "admin",
      title: "A mystery",
      public_description: null,
      is_mystery: true,
      rule_type: "streak_days",
      threshold: 7,
      progress: 4,
      status: "active",
      rejected_reason: null,
      unlocked_at: null,
      claimed_at: null,
      secret: { type: "letter", text: "top secret", asset_path: null },
    }} />);
    expect(screen.queryByText("top secret")).not.toBeInTheDocument();
  });
});
