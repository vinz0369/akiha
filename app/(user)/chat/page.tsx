import type { Metadata } from "next";

import { MobileAppShell } from "@/components/layout/mobile-app-shell";
import { ChatClient } from "@/features/chat/chat-client";

export const metadata: Metadata = {
  title: "Akiha AI · Akiha",
};

export default function ChatPage() {
  return (
    <MobileAppShell>
      <ChatClient />
    </MobileAppShell>
  );
}
