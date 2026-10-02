import { describe, expect, it } from "vitest";

import { reactionPool, selectReaction, type ReactionTemplate } from "@/lib/reactions/selection";

const templates: ReactionTemplate[] = [
  { id: "normal", kind: "normal", text: "Normal", milestoneValue: null, weight: 1, active: true },
  { id: "photo", kind: "with_photo", text: "Photo", milestoneValue: null, weight: 1, active: true },
  { id: "late", kind: "late_night", text: "Late", milestoneValue: null, weight: 1, active: true },
  { id: "seven", kind: "milestone", text: "Seven", milestoneValue: 7, weight: 1, active: true },
];

describe("reaction selection", () => {
  it("gives an exact milestone priority over late-night and photo", () => {
    expect(reactionPool({ streak: 7, localMinutes: 23 * 60, photoCount: 2 }, templates)).toBe("milestone");
  });

  it("gives late-night priority over photo without a milestone", () => {
    expect(reactionPool({ streak: 6, localMinutes: 22 * 60 + 30, photoCount: 2 }, templates)).toBe("late_night");
  });

  it("selects photo and no-photo pools", () => {
    expect(reactionPool({ streak: 2, localMinutes: 18 * 60, photoCount: 1 }, templates)).toBe("with_photo");
    expect(reactionPool({ streak: 2, localMinutes: 18 * 60, photoCount: 0 }, templates)).toBe("without_photo");
  });

  it("avoids the three recent templates when another candidate exists", () => {
    const pool: ReactionTemplate[] = [
      { id: "a", kind: "normal", text: "A", milestoneValue: null, weight: 1, active: true },
      { id: "b", kind: "normal", text: "B", milestoneValue: null, weight: 1, active: true },
    ];
    expect(selectReaction(pool, { streak: 1, localMinutes: 600, photoCount: 0 }, ["a"], 0)?.id).toBe("b");
  });

  it("ignores inactive templates and falls back to normal", () => {
    const selected = selectReaction([
      ...templates,
      { id: "inactive", kind: "without_photo", text: "Off", milestoneValue: null, weight: 100, active: false },
    ], { streak: 2, localMinutes: 600, photoCount: 0 }, [], 0);
    expect(selected?.id).toBe("normal");
  });
});
