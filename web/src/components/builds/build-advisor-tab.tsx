"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Trash2, Bot, MessageSquare } from "lucide-react";
import * as api from "@/lib/api-client";
import type { ChatMessageResponse } from "@/lib/types";
import { ChatHistory } from "@/components/advisor/chat-history";
import { ChatInput } from "@/components/advisor/chat-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

function ThinkingIndicator() {
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
      <div className="rounded-2xl rounded-bl-sm border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Thinking</span>
          <span className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="block h-1.5 w-1.5 rounded-full"
                style={{
                  background: "oklch(0.65 0.18 245)",
                  animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </span>
        </div>
      </div>
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export function BuildAdvisorTab({ buildId }: { buildId: string }) {
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadHistory = useCallback(async () => {
    try {
      const data = await api.getChatHistory(buildId);
      setMessages(data.messages);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [buildId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function handleSend(message: string) {
    const optimistic: ChatMessageResponse = {
      id: `temp-${Date.now()}`,
      build_id: buildId,
      role: "user",
      content: message,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setSending(true);

    try {
      await api.sendAdvisorMessage({ build_id: buildId, message });
      const data = await api.getChatHistory(buildId);
      setMessages(data.messages);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to send message",
      );
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  }

  async function handleClear() {
    try {
      await api.clearChatHistory(buildId);
      setMessages([]);
      setClearOpen(false);
      toast.success("Chat history cleared");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to clear chat");
    }
  }

  return (
    <div
      className="flex flex-col rounded-xl border"
      style={{ height: "calc(100vh - 280px)", minHeight: 480 }}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between rounded-t-xl px-4 py-3 bg-sidebar border-b">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: "oklch(0.65 0.18 245 / 15%)" }}
          >
            <Bot
              className="h-4 w-4"
              style={{ color: "oklch(0.65 0.18 245)" }}
            />
          </div>
          <span className="text-sm font-semibold">Build Advisor</span>
        </div>

        <Dialog open={clearOpen} onOpenChange={setClearOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={messages.length === 0}
              className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Clear chat history?</DialogTitle>
              <DialogDescription>
                This will permanently delete all messages in this conversation.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setClearOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleClear}>
                Clear
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Loading conversation...
            </p>
          </div>
        ) : messages.length === 0 && !sending ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{
                background: "oklch(0.20 0.04 245)",
                border: "1px solid oklch(0.35 0.08 245)",
              }}
            >
              <MessageSquare
                className="h-6 w-6"
                style={{ color: "oklch(0.65 0.18 245)" }}
              />
            </div>
            <div>
              <p className="font-medium">Ask the Build Advisor</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Ask anything about your engine swap — fitment, wiring, cooling,
                or what the service manual says.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <ChatHistory messages={messages} />
            {sending && <ThinkingIndicator />}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0">
        <ChatInput onSend={handleSend} disabled={sending} />
      </div>
    </div>
  );
}
