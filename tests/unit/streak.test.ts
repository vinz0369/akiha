import { describe, expect, it } from "vitest";

import { currentStreak, longestStreak, longestStreakInMonth } from "@/lib/dates/streak";

describe("current streak", () => {
  it("returns zero without active dates", () => {
    expect(currentStreak([], [], "2026-09-02")).toBe(0);
  });

  it("anchors to today when today is active", () => {
    expect(currentStreak(["2026-09-01", "2026-09-02"], [], "2026-09-02")).toBe(2);
  });

  it("keeps yesterday's run while today is still open", () => {
    expect(currentStreak(["2026-08-30", "2026-08-31", "2026-09-01"], [], "2026-09-02")).toBe(3);
  });

  it("uses protected dates for continuity without requiring a workout", () => {
    expect(
      currentStreak(["2026-08-30", "2026-09-01"], ["2026-08-31"], "2026-09-02"),
    ).toBe(3);
  });

  it("ignores duplicate and future dates", () => {
    expect(
      currentStreak(["2026-09-01", "2026-09-01", "2026-09-03"], [], "2026-09-02"),
    ).toBe(1);
  });
});

describe("longest streak", () => {
  it("selects the longest of multiple runs", () => {
    expect(
      longestStreak(
        ["2026-09-01", "2026-09-04", "2026-09-05", "2026-09-07"],
        ["2026-09-06"],
      ),
    ).toBe(4);
  });

  it("cuts the monthly summary at month boundaries", () => {
    expect(
      longestStreakInMonth(
        ["2026-08-31", "2026-09-01", "2026-09-02", "2026-10-01"],
        [],
        2026,
        9,
      ),
    ).toBe(2);
  });
});
