"use client";

import type { ChatMessageResponse } from "@/lib/types";
import { ChatMessage } from "./chat-message";

export function ChatHistory({
  messages,
}: {
  messages: ChatMessageResponse[];
}) {
  return (
    <div className="space-y-3">
      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} />
      ))}
    </div>
  );
}
