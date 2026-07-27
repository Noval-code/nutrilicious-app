"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

/* ─────────────────────────────────────────────
   Types
   ───────────────────────────────────────────── */
interface Message {
  role: "user" | "bot";
  content: string;
}

/* ─────────────────────────────────────────────
   Quick Reply Suggestions
   ───────────────────────────────────────────── */
const QUICK_REPLIES = [
  "Menu apa saja untuk lunch?",
  "Harga paket Low Carbs?",
  "Rekomendasi menu tinggi protein",
  "Saya alergi kacang, menu apa yang aman?",
];

/* ─────────────────────────────────────────────
   LocalStorage helpers
   ───────────────────────────────────────────── */
const STORAGE_KEY = "nutribot_history";

function loadHistory(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(messages: Message[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch { /* quota exceeded — silently ignore */ }
}

/* ─────────────────────────────────────────────
   API call
   ───────────────────────────────────────────── */
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

async function sendChat(message: string, history: Message[]) {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) throw new Error("Gagal menghubungi NutriBot");
  return res.json() as Promise<{ reply: string; sources: string[] }>;
}

/* ─────────────────────────────────────────────
   Component
   ───────────────────────────────────────────── */
export function RAGChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    const saved = loadHistory();
    if (saved.length > 0) {
      setMessages(saved);
      setShowQuickReplies(false);
    }
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current!.scrollTop = scrollRef.current!.scrollHeight;
      }, 50);
    }
  }, [messages, isLoading]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  /* ─── Send message ─── */
  async function handleSend(text?: string) {
    const msg = (text || input).trim();
    if (!msg || isLoading) return;

    const userMsg: Message = { role: "user", content: msg };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setIsLoading(true);
    setShowQuickReplies(false);

    try {
      const data = await sendChat(msg, updated);
      const botMsg: Message = { role: "bot", content: data.reply };
      const full = [...updated, botMsg];
      setMessages(full);
      saveHistory(full);
    } catch {
      const errMsg: Message = {
        role: "bot",
        content: "Maaf, terjadi gangguan koneksi. Coba lagi nanti ya! 🙏",
      };
      const full = [...updated, errMsg];
      setMessages(full);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    handleSend();
  }

  function handleClearHistory() {
    setMessages([]);
    setShowQuickReplies(true);
    localStorage.removeItem(STORAGE_KEY);
  }

  /* ─── Render ─── */
  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        {/* ── Floating Button ── */}
        {!isOpen && (
          <Button
            id="nutribot-toggle"
            onClick={() => setIsOpen(true)}
            className="h-14 w-14 rounded-full shadow-2xl hover:scale-105 transition-all duration-300 bg-primary/95 text-white ring-4 ring-primary/20 backdrop-blur-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
          </Button>
        )}

        {/* ── Chat Window ── */}
        {isOpen && (
          <Card className="w-[380px] shadow-2xl border-muted rounded-2xl flex flex-col h-[520px] animate-in fade-in slide-in-from-bottom-10 duration-200">
            {/* Header */}
            <CardHeader className="bg-primary text-primary-foreground rounded-t-2xl px-4 py-3 flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 border-2 border-white/20">
                  <AvatarFallback className="bg-white/10 text-white font-bold text-xs">AI</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-sm font-bold leading-tight">NutriBot Asisten</CardTitle>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <Button
                    variant="ghost" size="icon"
                    onClick={handleClearHistory}
                    className="h-7 w-7 text-primary-foreground hover:bg-white/20 hover:text-white rounded-full"
                    title="Hapus riwayat"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </Button>
                )}
                <Button
                  variant="ghost" size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-7 w-7 text-primary-foreground hover:bg-white/20 hover:text-white rounded-full"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </Button>
              </div>
            </CardHeader>

            {/* Messages Area */}
            <CardContent className="flex-1 p-0 overflow-hidden bg-slate-50">
              <div ref={scrollRef} className="h-full overflow-y-auto p-4">
                <div className="flex flex-col gap-3 pb-2">
                  {/* Welcome message */}
                  <BotBubble content={"Halo! Saya NutriBot 🤖"} />

                  {/* Quick replies */}
                  {showQuickReplies && messages.length === 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {QUICK_REPLIES.map((q) => (
                        <button
                          key={q}
                          onClick={() => handleSend(q)}
                          className="text-xs px-3 py-1.5 rounded-full border border-primary/30 bg-white text-primary hover:bg-primary hover:text-white transition-colors duration-200 shadow-sm"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Chat messages */}
                  {messages.map((msg, i) =>
                    msg.role === "user" ? (
                      <UserBubble key={i} content={msg.content} />
                    ) : (
                      <BotBubble key={i} content={msg.content} />
                    )
                  )}

                  {/* Typing indicator */}
                  {isLoading && <TypingIndicator />}
                </div>
              </div>
            </CardContent>

            {/* Input */}
            <CardFooter className="p-3 border-t bg-white rounded-b-2xl">
              <form className="flex w-full items-center gap-2" onSubmit={handleSubmit}>
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ketik pertanyaan..."
                  disabled={isLoading}
                  className="rounded-full bg-slate-100 border-transparent focus-visible:ring-primary h-10 text-sm px-4"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={isLoading || !input.trim()}
                  className="h-10 w-10 rounded-full shrink-0 shadow-md"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                </Button>
              </form>
            </CardFooter>
          </Card>
        )}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────
   Chat Bubbles
   ───────────────────────────────────────────── */

function BotBubble({ content }: { content: string }) {
  return (
    <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-white border border-slate-100 shadow-sm px-4 py-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
      {content}
    </div>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="max-w-[88%] self-end rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-3 text-sm shadow-sm whitespace-pre-wrap leading-relaxed">
      {content}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-white border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
    </div>
  );
}
