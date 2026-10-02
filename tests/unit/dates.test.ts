import { describe, expect, it } from "vitest";

import { addLocalDays, isLateCheckinWindow, toLocalDate } from "@/lib/dates/vietnam";

describe("Vietnam business dates", () => {
  it("uses the Vietnam date when UTC is still on the previous day", () => {
    expect(toLocalDate(new Date("2026-09-01T18:00:00.000Z"))).toBe("2026-09-02");
  });

  it("allows yesterday through exactly 02:00 local", () => {
    expect(isLateCheckinWindow(new Date("2026-09-01T18:59:59.000Z"))).toBe(true);
    expect(isLateCheckinWindow(new Date("2026-09-01T19:00:00.000Z"))).toBe(true);
  });

  it("closes the grace window after 02:00 local", () => {
    expect(isLateCheckinWindow(new Date("2026-09-01T19:00:01.000Z"))).toBe(false);
  });

  it("handles leap-day and year boundaries without fixed offsets", () => {
    expect(addLocalDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addLocalDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});
