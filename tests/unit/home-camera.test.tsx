import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clearPendingCapture: vi.fn(),
  loadPendingCapture: vi.fn(),
  refresh: vi.fn(),
  storePendingCapture: vi.fn(),
  submitMoment: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/features/camera/pending-capture", () => ({
  clearPendingCapture: mocks.clearPendingCapture,
  loadPendingCapture: mocks.loadPendingCapture,
  storePendingCapture: mocks.storePendingCapture,
}));
vi.mock("@/features/checkins/service", () => ({ submitMoment: mocks.submitMoment }));

import { HomeCamera } from "@/features/camera/home-camera";

function installCamera() {
  const stop = vi.fn();
  const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
  const getUserMedia = vi.fn().mockResolvedValue(stream);
  Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
  Object.defineProperty(navigator, "vibrate", { configurable: true, value: vi.fn() });
  Object.defineProperty(HTMLMediaElement.prototype, "srcObject", { configurable: true, writable: true, value: null });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  return { getUserMedia, stop };
}

beforeEach(() => {
  mocks.loadPendingCapture.mockResolvedValue(null);
  mocks.clearPendingCapture.mockResolvedValue(undefined);
  mocks.storePendingCapture.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  Object.values(mocks).forEach((mock) => mock.mockReset());
  vi.restoreAllMocks();
});

describe("HomeCamera single-screen flow", () => {
  it("opens the portrait camera automatically and stops it on unmount", async () => {
    const { getUserMedia, stop } = installCamera();
    const view = render(<HomeCamera partnerName="Vinh" />);

    await screen.findByRole("button", { name: "Chụp ảnh" });
    expect(screen.getByRole("region", { name: "Khung máy ảnh" })).toBeVisible();
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: false,
      video: {
        aspectRatio: { ideal: 4 / 5 },
        facingMode: "user",
        height: { ideal: 1350 },
        width: { ideal: 1080 },
      },
    });

    view.unmount();
    expect(stop).toHaveBeenCalled();
  });

  it("captures, accepts an optional caption, and sends without navigating", async () => {
    installCamera();
    Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", { configurable: true, value: 1080 });
    Object.defineProperty(HTMLVideoElement.prototype, "videoHeight", { configurable: true, value: 1350 });
    const context = { drawImage: vi.fn(), scale: vi.fn(), translate: vi.fn() } as unknown as CanvasRenderingContext2D;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/jpeg;base64,/9j/");
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
      callback(new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" }));
    });
    mocks.submitMoment.mockResolvedValue({
      status: "created",
      moment_id: "00000000-0000-4000-8000-000000000010",
      local_date: "2026-09-09",
    });

    render(<HomeCamera partnerName="Vinh" />);
    fireEvent.click(await screen.findByRole("button", { name: "Chụp ảnh" }));
    await screen.findByRole("img", { name: "Ảnh vừa chụp" });
    fireEvent.change(screen.getByLabelText("Ghi chú không bắt buộc"), { target: { value: "Nhớ em" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi ảnh" }));

    await waitFor(() => expect(mocks.submitMoment).toHaveBeenCalledOnce());
    expect(mocks.submitMoment.mock.calls[0][0]).toMatchObject({ caption: "Nhớ em" });
    expect(mocks.submitMoment.mock.calls[0][0].file).toBeInstanceOf(File);
    expect(mocks.storePendingCapture).toHaveBeenCalledOnce();
    await screen.findByText("Đã gửi cho Vinh");
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("keeps the retry action visible when camera permission is denied", async () => {
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn().mockRejectedValue(new DOMException("Denied", "NotAllowedError")) },
    });

    render(<HomeCamera />);

    await screen.findByText("Cần quyền dùng camera");
    expect(screen.getByRole("button", { name: "Thử lại" })).toBeVisible();
    expect(screen.queryByRole("button", { name: /không cần ảnh/i })).not.toBeInTheDocument();
  });
});
