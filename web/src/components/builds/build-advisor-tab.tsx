"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Trash2 } from "lucide-react";
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
  }, [messages]);

  async function handleSend(message: string) {
    // Optimistic user message
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
      const res = await api.sendAdvisorMessage({ build_id: buildId, message });
      // Reload full history to get server-generated IDs
      const data = await api.getChatHistory(buildId);
      setMessages(data.messages);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to send message",
      );
      // Remove optimistic message on error
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
    <div className="flex h-[600px] flex-col rounded-md border">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h3 className="text-sm font-medium">Build Advisor</h3>
        <Dialog open={clearOpen} onOpenChange={setClearOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={messages.length === 0}
            >
              <Trash2 className="mr-1 h-4 w-4" />
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
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground">
            Loading chat history...
          </p>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            Ask the AI advisor about your engine swap build.
          </p>
        ) : (
          <ChatHistory messages={messages} />
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={sending} />
    </div>
  );
}
