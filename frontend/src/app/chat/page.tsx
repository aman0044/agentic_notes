"use client";
import { AppShell } from "@/components/layout/AppShell";
import { ChatInterface } from "@/components/chat/ChatInterface";

export default function ChatPage() {
  return (
    <AppShell title="AI Chat">
      <div className="h-full overflow-hidden">
        <ChatInterface />
      </div>
    </AppShell>
  );
}
