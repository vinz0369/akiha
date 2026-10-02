import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  invoke: vi.fn(),
  prepareImage: vi.fn(),
  remove: vi.fn(),
  rpc: vi.fn(),
  upload: vi.fn(),
}));

vi.mock("@/features/checkins/image", () => ({ prepareImage: mocks.prepareImage }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: mocks.getUser },
    functions: { invoke: mocks.invoke },
    rpc: mocks.rpc,
    storage: { from: () => ({ remove: mocks.remove, upload: mocks.upload }) },
  }),
}));

import { submitMoment } from "@/features/checkins/service";

afterEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  vi.restoreAllMocks();
});

describe("submitMoment", () => {
  it("uses a stable request id for idempotent uploads", async () => {
    const userId = "00000000-0000-4000-8000-000000000001";
    const requestId = "00000000-0000-4000-8000-000000000099";
    const image = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" });
    mocks.getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
    mocks.prepareImage.mockResolvedValue({ full: image, thumbnail: image, mimeType: "image/jpeg", width: 1, height: 1 });
    mocks.upload.mockResolvedValue({ error: null });
    mocks.rpc.mockResolvedValue({ data: { status: "existing", moment_id: "00000000-0000-4000-8000-000000000010", local_date: "2026-09-02" }, error: null });

    const result = await submitMoment({
      localDate: "2026-09-02",
      caption: "Hello",
      file: new File([image], "moment.jpg", { type: "image/jpeg" }),
      clientRequestId: requestId,
    });

    expect(result.status).toBe("existing");
    expect(mocks.rpc).toHaveBeenCalledWith("create_couple_moment", expect.objectContaining({ p_client_request_id: requestId }));
    expect(mocks.upload).toHaveBeenNthCalledWith(1, `${userId}/2026-09-02/${requestId}/full.jpg`, image, expect.any(Object));
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
