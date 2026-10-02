import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChatClient } from "@/features/chat/chat-client";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("ChatClient", () => {
  it("sends a message and displays Vinh's reply", async () => {
    const encoder = new TextEncoder();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode("Ck nghe đây, "));
        controller.enqueue(encoder.encode("kể ck nghe thêm nha ♡"));
        controller.close();
      },
    }), { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } }));

    render(<ChatClient />);
    const input = screen.getByLabelText("Tin nhắn");
    await waitFor(() => expect(input).toBeEnabled());
    fireEvent.change(input, { target: { value: "Hôm nay vk hơi mệt" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));

    expect(await screen.findByText("Ck nghe đây, kể ck nghe thêm nha ♡")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith("/api/chat", expect.objectContaining({
      method: "POST",
    }));
    await waitFor(() => expect(localStorage.getItem("akiha-chat-v1")).toContain("Hôm nay vk hơi mệt"));
  });

  it("shows the first streamed text before the reply finishes", async () => {
    const encoder = new TextEncoder();
    let finish!: () => void;
    const waiting = new Promise<void>((resolve) => { finish = resolve; });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode("Ck nghe đây"));
        await waiting;
        controller.enqueue(encoder.encode(" nè ♡"));
        controller.close();
      },
    })));

    render(<ChatClient />);
    const input = screen.getByLabelText("Tin nhắn");
    await waitFor(() => expect(input).toBeEnabled());
    fireEvent.change(input, { target: { value: "Ck ơi" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));

    expect(await screen.findByText("Ck nghe đây")).toBeVisible();
    expect(screen.getByRole("button", { name: "Dừng câu trả lời" })).toBeVisible();
    finish();
    expect(await screen.findByText("Ck nghe đây nè ♡")).toBeVisible();
  });

  it("restores conversation history stored on the device", async () => {
    localStorage.setItem("akiha-chat-v1", JSON.stringify([
      { id: "saved", role: "assistant", content: "Bé ngủ ngon không?" },
    ]));
    render(<ChatClient />);
    expect(await screen.findByText("Bé ngủ ngon không?")).toBeVisible();
  });
});
