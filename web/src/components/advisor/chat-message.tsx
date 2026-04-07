"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessageResponse } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Bot } from "lucide-react";

export function ChatMessage({ message }: { message: ChatMessageResponse }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[78%] rounded-2xl rounded-br-sm px-4 py-2.5 text-sm text-white"
          style={{ background: "oklch(0.65 0.18 245)" }}
        >
          <p className="whitespace-pre-wrap leading-relaxed">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
        style={{
          background: "oklch(0.20 0.04 245)",
          border: "1px solid oklch(0.35 0.08 245)",
        }}
      >
        <Bot
          className="h-3.5 w-3.5"
          style={{ color: "oklch(0.65 0.18 245)" }}
        />
      </div>
      <div className="max-w-[78%] rounded-2xl rounded-bl-sm border bg-card px-4 py-2.5 text-sm">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
