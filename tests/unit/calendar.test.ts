import { describe, expect, it } from "vitest";

import { calendarMonthGrid } from "@/lib/dates/calendar";

describe("calendarMonthGrid", () => {
  it("starts on Monday and always returns six complete weeks", () => {
    const grid = calendarMonthGrid(2026, 9);
    expect(grid).toHaveLength(42);
    expect(grid[0].localDate).toBe("2026-08-31");
    expect(grid[41].localDate).toBe("2026-10-11");
  });

  it("handles a month beginning on Sunday", () => {
    const grid = calendarMonthGrid(2026, 2);
    expect(grid[0].localDate).toBe("2026-01-26");
    expect(grid[6].localDate).toBe("2026-02-01");
  });
});
