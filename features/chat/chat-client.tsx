"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { MessageIcon, SendIcon, TrashIcon } from "@/components/ui/icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const STORAGE_KEY = "akiha-chat-v1";
const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: "Akiha AI ở đây. Hôm nay bạn muốn kể điều gì? ♡",
};

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function readSavedMessages(): Message[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
    if (!Array.isArray(value)) return [WELCOME_MESSAGE];
    const messages = value.filter((item): item is Message => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as Partial<Message>;
      return typeof candidate.id === "string"
        && (candidate.role === "user" || candidate.role === "assistant")
        && typeof candidate.content === "string";
    });
    return messages.length > 0 ? messages.slice(-40) : [WELCOME_MESSAGE];
  } catch {
    return [WELCOME_MESSAGE];
  }
}

export function ChatClient() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const requestControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setMessages(readSavedMessages());
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated || pending) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
  }, [hydrated, messages, pending]);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: pending ? "auto" : "smooth", block: "end" });
  }, [messages, pending]);

  async function requestReply(history: Message[]) {
    setPending(true);
    setError(null);
    const controller = new AbortController();
    const replyId = newId();
    let reply = "";
    requestControllerRef.current = controller;
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.slice(-24).map(({ role, content }) => ({ role, content })),
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(result?.error ?? "Không nhận được phản hồi.");
      }
      if (!response.body) throw new Error("Trình duyệt không nhận được luồng trả lời.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let started = false;

      while (true) {
        const { done, value } = await reader.read();
        const text = decoder.decode(value, { stream: !done });
        if (text) {
          reply += text;
          if (!started) {
            started = true;
            setStreamingMessageId(replyId);
            setMessages((current) => [...current, { id: replyId, role: "assistant", content: reply }]);
          } else {
            setMessages((current) => current.map((message) => (
              message.id === replyId ? { ...message, content: reply } : message
            )));
          }
        }
        if (done) break;
      }

      if (!reply.trim()) throw new Error("Không nhận được phản hồi.");
    } catch (reason) {
      if (reason instanceof Error && reason.name === "AbortError") {
        if (!reply.trim()) setError("Đã dừng câu trả lời. Vk có thể gửi lại khi muốn.");
      } else {
        if (reply) {
          setMessages((current) => current.filter((message) => message.id !== replyId));
        }
        setError(reason instanceof Error ? reason.message : "Chưa gửi được tin nhắn.");
      }
    } finally {
      requestControllerRef.current = null;
      setStreamingMessageId(null);
      setPending(false);
    }
  }

  function stopReply() {
    requestControllerRef.current?.abort();
  }

  function send(event?: FormEvent) {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || pending || !hydrated) return;
    const userMessage: Message = { id: newId(), role: "user", content };
    const history = [...messages, userMessage];
    setMessages(history);
    setDraft("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    void requestReply(history);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  }

  function resizeComposer() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }

  function clearConversation() {
    setMessages([WELCOME_MESSAGE]);
    setError(null);
    setConfirmingClear(false);
  }

  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden pb-[calc(5.35rem+env(safe-area-inset-bottom))]">
      <header className="app-tab-header flex shrink-0 items-center justify-between px-5 pb-3 pt-[calc(.75rem+env(safe-area-inset-top))]">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative grid size-12 shrink-0 place-items-center rounded-[18px] bg-[linear-gradient(145deg,var(--primary),var(--lavender))] text-sm font-black text-ink shadow-md ring-2 ring-white">
            V
            <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-[3px] border-white bg-success" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="eyebrow">Trò chuyện riêng</p>
            <h1 className="app-tab-title truncate leading-tight">Akiha AI</h1>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted"><span className="size-1.5 rounded-full bg-success" aria-hidden="true" />Trợ lý riêng của hai đứa</p>
          </div>
        </div>
        <button className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-primary-soft" onClick={() => setConfirmingClear(true)} type="button" aria-label="Xóa cuộc trò chuyện">
          <TrashIcon className="size-5" />
        </button>
      </header>

      <section aria-live="polite" aria-label="Nội dung trò chuyện" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5">
        <div className="mx-auto flex w-full max-w-[430px] flex-col gap-3">
          <div className="mx-auto mb-3 flex max-w-[330px] items-center gap-2 rounded-full border border-border/70 bg-white/65 px-3 py-2 text-xs leading-relaxed text-muted shadow-sm"><MessageIcon className="size-4 shrink-0 text-primary-strong" /><p>Đây là trò chuyện với AI và chỉ được lưu trên thiết bị này.</p></div>
          {messages.map((message) => (
            <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`} key={message.id}>
              <p className={`max-w-[84%] whitespace-pre-wrap break-words px-4 py-3 text-[15px] leading-relaxed shadow-sm ${message.role === "user" ? "rounded-[22px_22px_7px_22px] bg-[linear-gradient(145deg,var(--ink),#63384e)] text-white" : "rounded-[22px_22px_22px_7px] border border-white bg-white/90 text-foreground"}`}>
                {message.content}
              </p>
            </div>
          ))}
          {pending && !streamingMessageId ? (
            <div className="flex justify-start" aria-label="Ck đang trả lời">
              <div className="flex h-11 items-center gap-1.5 rounded-[22px_22px_22px_6px] border border-border/70 bg-white px-4 shadow-sm">
                {[0, 1, 2].map((dot) => <span className="chat-typing-dot size-1.5 rounded-full bg-muted" key={dot} style={{ animationDelay: `${dot * 140}ms` }} />)}
              </div>
            </div>
          ) : null}
          {error ? (
            <div className="rounded-2xl border border-danger/20 bg-danger/5 p-3 text-sm text-danger" role="alert">
              <p>{error}</p>
              <button className="mt-2 min-h-11 font-bold underline underline-offset-4" onClick={() => void requestReply(messages)} type="button">Gửi lại</button>
            </div>
          ) : null}
          <div ref={endRef} />
        </div>
      </section>

      <form className="app-composer shrink-0 px-3 py-3" onSubmit={send}>
        <div className="mx-auto flex max-w-[440px] items-end gap-2 rounded-[25px] border border-white bg-white/92 p-1.5 pl-4 shadow-[var(--shadow-md)] focus-within:ring-4 focus-within:ring-primary-strong/10">
          <textarea
            ref={textareaRef}
            aria-label="Tin nhắn"
            className="min-h-11 max-h-[120px] flex-1 resize-none bg-transparent py-2.5 text-base leading-6 outline-none"
            disabled={!hydrated}
            maxLength={2_000}
            onChange={(event) => { setDraft(event.target.value); resizeComposer(); }}
            onKeyDown={handleKeyDown}
            placeholder="Nhắn cho Akiha AI…"
            rows={1}
            value={draft}
          />
          <button aria-busy={pending} aria-label={pending ? "Dừng câu trả lời" : "Gửi tin nhắn"} className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-ink shadow-sm disabled:cursor-not-allowed disabled:opacity-40" disabled={!pending && (!hydrated || !draft.trim())} onClick={pending ? stopReply : undefined} type={pending ? "button" : "submit"}>
            {pending
              ? <span aria-hidden="true" className="size-3.5 rounded-[3px] bg-ink" />
              : <SendIcon className="size-5" />}
          </button>
        </div>
      </form>
      <ConfirmDialog
        confirmLabel="Xóa"
        description="Các tin nhắn với Akiha AI chỉ được lưu trên thiết bị này. Sau khi xóa sẽ không thể khôi phục."
        onCancel={() => setConfirmingClear(false)}
        onConfirm={clearConversation}
        open={confirmingClear}
        title="Xóa cuộc trò chuyện?"
      />
    </main>
  );
}
