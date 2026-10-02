import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { NavigationFeedback } from "@/components/navigation/navigation-feedback";

afterEach(cleanup);

describe("NavigationFeedback", () => {
  it("announces and animates a pending mobile navigation", () => {
    render(
      <NavigationFeedback active label="Đang mở lịch…" />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Đang mở lịch…");
  });

  it("stays visually dormant when navigation is idle", () => {
    render(<NavigationFeedback active={false} />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
