"use client";

import { useEffect, useState, useRef } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Trash2, Bot, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";

interface BotMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export default function BotPage() {
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const { currentParticipant } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load history
  useEffect(() => {
    if (!currentParticipant) return;

    async function loadHistory() {
      const { data } = await supabase
        .from("bot_conversations")
        .select("*")
        .eq("participant_id", currentParticipant!.id)
        .order("created_at", { ascending: true })
        .limit(100);

      setMessages(data || []);
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }

    loadHistory();
  }, [currentParticipant]);

  // Realtime subscription for bot replies
  useEffect(() => {
    if (!currentParticipant) return;

    const channel = supabase
      .channel("bot-conv-" + currentParticipant.id)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bot_conversations",
          filter: `participant_id=eq.${currentParticipant.id}`,
        },
        (payload) => {
          const newMsg = payload.new as BotMessage;
          setMessages((prev) => {
            // Avoid duplicates (we already add user messages optimistically)
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentParticipant]);

  const handleSend = async () => {
    if (!input.trim() || sending || !currentParticipant) return;

    const msg = input.trim();
    setInput("");
    setSending(true);

    // Optimistic add user message
    const tempId = "temp-" + Date.now();
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: "user", content: msg, created_at: new Date().toISOString() },
    ]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    try {
      const res = await fetch("/api/bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: currentParticipant.id,
          message: msg,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setMessages((prev) => [
            ...prev,
            {
              id: "error-" + Date.now(),
              role: "assistant",
              content: "🛑 T'as envoyé trop de messages ! Laisse-moi souffler, réessaie dans une heure.",
              created_at: new Date().toISOString(),
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: "error-" + Date.now(),
              role: "assistant",
              content: "🤖 J'ai planté... Essaie encore !",
              created_at: new Date().toISOString(),
            },
          ]);
        }
      } else {
        setRemaining(data.remaining);
        // The bot reply comes via realtime, but also add it directly for snappiness
        // Remove temp user msg and let realtime rebuild the list properly
        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== tempId);
          // Check if realtime already added the reply
          if (withoutTemp.some((m) => m.role === "assistant" && m.content === data.reply)) {
            return withoutTemp;
          }
          return withoutTemp;
        });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: "error-" + Date.now(),
          role: "assistant",
          content: "🤖 Erreur réseau... T'es en zone blanche en Ardèche ?",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleClearHistory = async () => {
    if (!currentParticipant) return;
    if (!confirm("Supprimer toute ta conversation avec Botardèche ?")) return;

    await supabase
      .from("bot_conversations")
      .delete()
      .eq("participant_id", currentParticipant.id);

    setMessages([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-gradient-to-b from-[#1a0a2e] to-[#0d0618]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/30 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-orange-500 flex items-center justify-center text-xl">
            🤖
          </div>
          <div>
            <h1 className="text-white font-bold text-base">Botardèche</h1>
            <p className="text-white/50 text-xs">Le bot trash du Cros-Chella</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {remaining !== null && (
            <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded-full">
              {remaining} msg restants
            </span>
          )}
          <button
            onClick={handleClearHistory}
            className="text-white/30 hover:text-red-400 transition-colors p-2"
            title="Supprimer la conversation"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="animate-spin text-purple-400" size={32} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 px-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-orange-500 flex items-center justify-center text-4xl">
              🤖
            </div>
            <h2 className="text-white text-xl font-bold">Salut ! Je suis Botardèche</h2>
            <p className="text-white/60 text-sm max-w-xs">
              Le bot officieux du Cros-Chella. Je connais tout sur tout le monde.
              Pose-moi une question, ou demande-moi un roast... si t&apos;oses. 🔥
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                "Qui est le plus hype ?",
                "Raconte un truc sur Charly",
                "C&apos;est quoi le programme ?",
                "Roast Alva",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInput(suggestion.replace(/&apos;/g, "'").replace(/&amp;/g, "&"));
                    inputRef.current?.focus();
                  }}
                  className="text-xs bg-white/10 hover:bg-white/20 text-white/70 px-3 py-1.5 rounded-full transition-colors"
                >
                  {suggestion.replace(/&apos;/g, "'").replace(/&amp;/g, "&")}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-br-md"
                      : "bg-white/10 text-white rounded-bl-md border border-white/5"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <Bot size={14} className="text-orange-400" />
                      <span className="text-orange-400 text-xs font-bold">Botardèche</span>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${msg.role === "user" ? "text-white/40" : "text-white/30"}`}>
                    {new Date(msg.created_at).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-white/10 rounded-2xl rounded-bl-md px-4 py-3 border border-white/5">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-orange-400 animate-pulse" />
                    <span className="text-white/50 text-sm">Botardèche réfléchit...</span>
                    <Loader2 size={14} className="animate-spin text-white/30" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/10 bg-black/30 backdrop-blur-sm">
        <div className="flex gap-2 items-center">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pose une question à Botardèche..."
            className="flex-1 bg-white/10 border-white/10 text-white placeholder:text-white/30 rounded-full px-4"
            disabled={sending}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="rounded-full w-10 h-10 p-0 bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600"
          >
            {sending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </Button>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
