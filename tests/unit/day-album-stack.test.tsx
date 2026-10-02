import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DayAlbumStack } from "@/features/moments/day-album-stack";
import type { MomentCard } from "@/features/moments/types";

vi.mock("next/image", () => ({
  default: (props: { alt: string }) => <span aria-label={props.alt || undefined} role={props.alt ? "img" : undefined} />,
}));

vi.mock("@/features/moments/moment-actions", () => ({
  MomentActions: ({ momentId }: { momentId: string }) => <span data-testid="moment-actions">{momentId}</span>,
}));

afterEach(cleanup);

function moment(index: number): MomentCard {
  return {
    id: `00000000-0000-4000-8000-00000000000${index}`,
    author_id: "00000000-0000-4000-8000-000000000010",
    author_name: `Người ${index}`,
    local_date: "2026-09-09",
    captured_at: `2026-09-09T0${index}:00:00.000Z`,
    caption: `Ghi chú ${index}`,
    full_path: `full-${index}.webp`,
    thumb_path: `thumb-${index}.webp`,
    width: 800,
    height: 1000,
    seen_by_partner: true,
    viewer_reaction: null,
    reply_count: 0,
    imageUrl: `/photo-${index}.webp`,
    partnerReaction: null,
  };
}

describe("DayAlbumStack", () => {
  it("shows a three-photo stack and advances on tap", async () => {
    render(<DayAlbumStack moments={[moment(1), moment(2), moment(3), moment(4)]} viewerId="00000000-0000-4000-8000-000000000099" />);

    expect(screen.getByLabelText("Ảnh 1 trên 4")).toHaveTextContent("1 / 4");
    expect(document.querySelectorAll(".day-stack-layer")).toHaveLength(3);

    fireEvent.click(screen.getByRole("button", { name: /Chạm để xem ảnh tiếp theo/ }));

    await waitFor(() => expect(screen.getByLabelText("Ảnh 2 trên 4")).toHaveTextContent("2 / 4"));
    expect(screen.getByRole("button", { name: "Đọc đầy đủ ghi chú" })).toHaveTextContent("Ghi chú 2");
  });

  it("moves to the previous photo on a right swipe", async () => {
    render(<DayAlbumStack moments={[moment(1), moment(2), moment(3), moment(4)]} viewerId="00000000-0000-4000-8000-000000000099" />);
    const photo = screen.getByRole("button", { name: /Chạm để xem ảnh tiếp theo/ });

    fireEvent.pointerDown(photo, { clientX: 60, clientY: 120 });
    fireEvent.pointerUp(photo, { clientX: 140, clientY: 124 });

    await waitFor(() => expect(screen.getByLabelText("Ảnh 4 trên 4")).toHaveTextContent("4 / 4"));
  });
});
