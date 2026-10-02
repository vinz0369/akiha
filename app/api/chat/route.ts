import { chatRequestSchema } from "@/lib/chat/schema";
import { createClient } from "@/lib/supabase/server";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "deepseek/deepseek-v4-flash-0731";
const MAX_CONTEXT_CHARACTERS = 12_000;

const AKIHA_PERSONA = `Bạn là Akiha AI, một người bạn trò chuyện ấm áp trong ứng dụng nhật ký riêng tư của cặp đôi Thu và Vinh.

Cách nói:
- Xưng là "Akiha" hoặc "mình", gọi người đang trò chuyện là "bạn". Không giả làm Thu hoặc Vinh.
- Viết tiếng Việt đời thường, ấm áp, tinh tế, hơi trêu nhẹ khi phù hợp. Ưu tiên 1-4 câu ngắn như tin nhắn thật.
- Quan tâm nhưng không kiểm soát, không gây tội lỗi. Với chuyện tập gym, nhấn mạnh xuất hiện và cố gắng quan trọng hơn hoàn hảo.
- Có thể dùng emoji vừa phải như ♡, 🌷, 😌; không dùng trong mọi tin nhắn.
- Không dùng giọng trợ lý, không mở đầu bằng "Tất nhiên" hay liệt kê dài nếu không được hỏi.

Ranh giới:
- Không tự bịa một kỷ niệm, lời hứa hay sự kiện riêng giữa Thu và Vinh nếu chưa xuất hiện trong đoạn chat.
- Nếu được hỏi đây có phải Thu hoặc Vinh thật không, nói rõ đây là Akiha AI, không phải người yêu của họ.
- Không khẳng định chắc chắn về y tế, pháp lý hoặc tài chính; khuyên tìm người có chuyên môn khi vấn đề nghiêm trọng.
- Khi người dùng có dấu hiệu nguy hiểm hoặc muốn tự làm hại bản thân, ưu tiên an toàn, khuyên liên hệ ngay người thân/dịch vụ khẩn cấp và đừng ở một mình.`;

type OpenRouterChunk = {
  choices?: Array<{ delta?: { content?: string | null } }>;
  error?: { message?: string };
};

function trimConversation(messages: Array<{ role: "user" | "assistant"; content: string }>) {
  const selected: typeof messages = [];
  let characters = 0;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (selected.length > 0 && characters + message.content.length > MAX_CONTEXT_CHARACTERS) break;
    selected.unshift(message);
    characters += message.content.length;
  }

  return selected;
}

function createReplyStream(
  upstream: ReadableStream<Uint8Array>,
  upstreamController: AbortController,
  cleanup: () => void,
) {
  const reader = upstream.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let cancelled = false;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";
      let finished = false;

      try {
        while (!finished) {
          const { done, value } = await reader.read();
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split(/\r?\n/);
          buffer = done ? "" : (lines.pop() ?? "");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6);
            if (payload === "[DONE]") {
              finished = true;
              break;
            }

            let chunk: OpenRouterChunk;
            try {
              chunk = JSON.parse(payload) as OpenRouterChunk;
            } catch {
              continue;
            }

            if (chunk.error) throw new Error(chunk.error.message ?? "OpenRouter stream error");
            const content = chunk.choices?.[0]?.delta?.content;
            if (content) controller.enqueue(encoder.encode(content));
          }

          if (done) break;
        }

        if (!cancelled) controller.close();
      } catch (error) {
        if (!cancelled) controller.error(error);
      } finally {
        cleanup();
        reader.releaseLock();
      }
    },
    async cancel(reason) {
      cancelled = true;
      cleanup();
      upstreamController.abort();
      await reader.cancel(reason);
    },
  });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Bạn cần đăng nhập lại để trò chuyện." }, { status: 401 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Chatbot chưa được cấu hình API key." }, { status: 503 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Nội dung gửi lên không hợp lệ." }, { status: 400 });
  }

  const parsed = chatRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ error: "Tin nhắn quá dài hoặc đoạn chat không hợp lệ." }, { status: 400 });
  }

  const { data: reservation, error: reservationError } = await supabase.rpc("reserve_chat_request");
  if (reservationError) {
    console.error("Chat rate-limit error", reservationError.message);
    return Response.json({ error: "Chưa thể bắt đầu cuộc trò chuyện lúc này." }, { status: 503 });
  }
  const limit = reservation as { allowed?: boolean; reason?: string; retry_after_seconds?: number } | null;
  if (!limit?.allowed) {
    const retryAfter = Math.max(1, Number(limit?.retry_after_seconds ?? 60));
    const message = limit?.reason === "daily_limit"
      ? "Hôm nay mình đã trò chuyện khá nhiều rồi. Vk nghỉ một chút, mai mình nói tiếp nhé."
      : "Tin nhắn đang gửi hơi nhanh. Vk đợi một phút rồi thử lại nhé.";
    return Response.json({ error: message }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  const abortUpstream = () => controller.abort();
  const cleanup = () => {
    clearTimeout(timeout);
    request.signal.removeEventListener("abort", abortUpstream);
  };
  request.signal.addEventListener("abort", abortUpstream, { once: true });

  try {
    const upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "Akiha",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: AKIHA_PERSONA },
          ...trimConversation(parsed.data.messages),
        ],
        max_tokens: 220,
        temperature: 0.85,
        reasoning: { effort: "none", exclude: true },
        provider: { sort: "latency" },
        stream: true,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!upstream.ok || !upstream.body) {
      const result = await upstream.json().catch(() => null) as OpenRouterChunk | null;
      console.error("OpenRouter chat error", upstream.status, result?.error?.message ?? "empty_response");
      cleanup();
      return Response.json({ error: "Ck đang mất kết nối một chút. Vk thử lại nhé." }, { status: 502 });
    }

    return new Response(createReplyStream(upstream.body, controller, cleanup), {
      headers: {
        "Cache-Control": "no-cache, no-transform",
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    cleanup();
    const reason = error instanceof Error ? error.name : "unknown";
    console.error("OpenRouter request failed", reason);
    return Response.json(
      { error: reason === "AbortError" ? "Phản hồi hơi lâu. Bé thử gửi lại nhé." : "Chưa kết nối được với chatbot." },
      { status: 504 },
    );
  }
}
