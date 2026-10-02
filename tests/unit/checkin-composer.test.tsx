import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clearPendingCapture: vi.fn(),
  loadPendingCapture: vi.fn(),
  storePendingCapture: vi.fn(),
  submitMoment: vi.fn(),
}));

vi.mock("@/features/camera/pending-capture", () => ({
  clearPendingCapture: mocks.clearPendingCapture,
  loadPendingCapture: mocks.loadPendingCapture,
  storePendingCapture: mocks.storePendingCapture,
}));
vi.mock("@/features/checkins/service", () => ({ submitMoment: mocks.submitMoment }));

import { CheckInComposer } from "@/features/checkins/checkin-composer";

afterEach(() => {
  cleanup();
  localStorage.clear();
  Object.values(mocks).forEach((mock) => mock.mockReset());
  vi.restoreAllMocks();
});

describe("CheckInComposer camera handoff", () => {
  it("shows the captured photo and submits the original file", async () => {
    const capture = new File([new Uint8Array([0xff, 0xd8, 0xff])], "camera.jpg", { type: "image/jpeg" });
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn().mockReturnValue("blob:camera-preview") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
    mocks.loadPendingCapture.mockResolvedValue(capture);
    mocks.clearPendingCapture.mockResolvedValue(undefined);
    mocks.submitMoment.mockResolvedValue({
      status: "created",
      moment_id: "00000000-0000-4000-8000-000000000010",
      local_date: "2026-09-02",
    });

    render(<CheckInComposer />);
    await screen.findByRole("img", { name: "Ảnh chuẩn bị gửi" });
    fireEvent.click(screen.getByRole("button", { name: "Gửi cho người thương" }));

    await waitFor(() => expect(mocks.submitMoment).toHaveBeenCalledOnce());
    expect(mocks.submitMoment.mock.calls[0][0].file).toBe(capture);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:camera-preview");
    expect(await screen.findByRole("heading", { name: /Một khoảnh khắc mới/ })).toBeVisible();
  });
});
