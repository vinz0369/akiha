import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CalendarGrid } from "@/features/calendar/calendar-grid";

describe("CalendarGrid", () => {
  it("announces the shared photo counts without relying on color", () => {
    render(<CalendarGrid year={2026} month={9} today="2026-09-02" days={[
      {
        local_date: "2026-09-02",
        moment_count: 4,
        viewer_count: 2,
        partner_count: 2,
        thumb_paths: ["one", "two", "three"],
        thumbnailUrls: ["https://example.test/one.webp", "https://example.test/two.webp", "https://example.test/three.webp"],
      },
    ]} />);
    expect(screen.getAllByLabelText(/4 ảnh: bạn 2, người thương 2/i).length).toBeGreaterThan(0);
    expect(screen.getByText("+1")).toBeInTheDocument();
  });
});
