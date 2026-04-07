"use client";

import { useState } from "react";
import { SendHorizontal } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (message: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  const canSend = !disabled && value.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="border-t p-3">
      <div className="flex items-end gap-2 rounded-xl border bg-background px-3 py-2 focus-within:ring-1 focus-within:ring-[oklch(0.65_0.18_245)]">
        <Textarea
          placeholder="Ask about your engine swap... (Enter to send, Shift+Enter for new line)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          className="min-h-[36px] max-h-[120px] flex-1 resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
        />
        <button
          type="submit"
          disabled={!canSend}
          className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all"
          style={{
            background: canSend
              ? "oklch(0.65 0.18 245)"
              : "oklch(0.65 0.18 245 / 30%)",
            color: "#fff",
            cursor: canSend ? "pointer" : "not-allowed",
          }}
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
