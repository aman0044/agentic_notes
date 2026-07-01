"use client";
import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useChatStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Trash2, Bot, User, Loader2 } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import TextareaAutosize from "react-textarea-autosize";

export function ChatInterface() {
  const { messages, addMessage, clearMessages } = useChatStore();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const askMut = useMutation({
    mutationFn: (question: string) => api.chat.ask(question),
    onSuccess: (data) => {
      addMessage({
        role: "assistant",
        content: data.answer,
        timestamp: new Date().toISOString(),
      });
    },
  });

  function handleSend() {
    if (!input.trim() || askMut.isPending) return;
    const question = input.trim();
    setInput("");
    addMessage({ role: "user", content: question, timestamp: new Date().toISOString() });
    askMut.mutate(question);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, askMut.isPending]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Chat with your notes</span>
          <span className="text-xs text-muted-foreground">({messages.length} messages)</span>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="icon-sm" onClick={clearMessages} title="Clear chat">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Ask anything about your notes</p>
              <p className="text-xs text-muted-foreground mt-1">
                I have access to your recent notes and can extract information from them.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {[
                "Summarize my recent notes",
                "What did I write about AI?",
                "Find notes about productivity",
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => { setInput(s); }}
                  className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "")}
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                  msg.role === "user" ? "bg-primary" : "bg-muted border border-border"
                )}
              >
                {msg.role === "user" ? (
                  <User className="w-3.5 h-3.5 text-primary-foreground" />
                ) : (
                  <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </div>
              <div
                className={cn(
                  "max-w-[75%] rounded-xl px-4 py-2.5 text-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted border border-border"
                )}
              >
                {msg.role === "assistant" ? (
                  <div className="prose-notes text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p>{msg.content}</p>
                )}
                {msg.timestamp && (
                  <p className={cn("text-[10px] mt-1.5", msg.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {timeAgo(msg.timestamp)}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {askMut.isPending && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="bg-muted border border-border rounded-xl px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:0ms]" />
                <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:150ms]" />
                <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-border flex-shrink-0">
        <div className="flex gap-2 items-end bg-muted/60 rounded-xl border border-border px-4 py-2.5">
          <TextareaAutosize
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask a question about your notes... (Enter to send)"
            className="flex-1 bg-transparent outline-none text-sm resize-none placeholder:text-muted-foreground/50 max-h-32"
            minRows={1}
            maxRows={5}
          />
          <Button
            size="icon-sm"
            onClick={handleSend}
            disabled={!input.trim() || askMut.isPending}
            className="flex-shrink-0"
          >
            {askMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
