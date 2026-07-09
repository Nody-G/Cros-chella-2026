"use client";

import { useEffect, useState, useRef } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Loader2, Send, Camera, Upload, X, ImagePlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getMessages, sendMessage, uploadChatImage } from "@/lib/supabase-queries";
import type { Message } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const { currentParticipant } = useAuth();
  const currentUserId = currentParticipant?.id || "";
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetch() {
      const data = await getMessages();
      setMessages(data);
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
    fetch();

    // Subscribe to new messages
    const channel = supabase
      .channel("messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload) => {
        const newMsg = payload.new as Message;
        // Fetch author info
        const { data: author } = await supabase
          .from("participants")
          .select("*")
          .eq("id", newMsg.author_id)
          .single();
        setMessages((prev) => [...prev, { ...newMsg, author: author || undefined }]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    setShowAttachMenu(false);
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && !imageFile) || !currentUserId) return;
    setSending(true);

    let imageUrl: string | undefined;
    if (imageFile) {
      setUploadingImage(true);
      const url = await uploadChatImage(currentUserId, imageFile);
      setUploadingImage(false);
      if (url) {
        imageUrl = url;
      } else {
        setSending(false);
        return;
      }
    }

    await sendMessage(currentUserId, newMessage.trim() || "📷", imageUrl);
    setNewMessage("");
    clearImage();
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <main className="pb-20 min-h-screen flex flex-col">
      <div className="max-w-lg mx-auto w-full flex flex-col flex-1">
        {/* Header */}
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-lg font-bold">Chat 💬</h1>
              <p className="text-xs text-muted-foreground">Le mur de discussion du Cros-Chella</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-4xl block mb-3">💬</span>
              <p className="text-muted-foreground text-sm">Aucun message. Sois le premier !</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.author_id === currentUserId;
              return (
                <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs overflow-hidden ${isMe ? "bg-primary/20" : ""}`}>
                    {msg.author?.avatar_url ? (
                      <img src={msg.author.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (msg.author?.emoji_avatar || msg.author?.name?.[0] || "?")
                    )}
                  </div>
                  <div className={`max-w-[75%] ${isMe ? "text-right" : ""}`}>
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-xs font-medium">
                        {msg.author?.pseudo || msg.author?.name || "Anonyme"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                    <div className={`inline-block rounded-2xl overflow-hidden ${isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm"}`}>
                      {msg.image_url && (
                        <img
                          src={msg.image_url}
                          alt="Image partagée"
                          className="max-w-full max-h-64 object-cover cursor-pointer"
                          onClick={() => window.open(msg.image_url!, "_blank")}
                        />
                      )}
                      {msg.content && (
                        <div className={`px-3 py-2 text-sm ${msg.image_url ? "pt-1" : ""}`}>
                          {msg.content}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Image preview */}
        {imagePreview && (
          <div className="px-4 py-2 border-t border-border bg-muted/30">
            <div className="relative inline-block">
              <img src={imagePreview} alt="Preview" className="h-20 rounded-lg object-cover" />
              <button
                onClick={clearImage}
                className="absolute -top-2 -right-2 w-5 h-5 bg-destructive rounded-full flex items-center justify-center"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 border-t border-border bg-background">
          {!currentUserId ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              🔒 Connecte-toi pour envoyer des messages
            </p>
          ) : (
            <div className="flex gap-2 items-end">
              {/* Attach button */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  disabled={sending}
                  className="text-muted-foreground hover:text-primary"
                >
                  <ImagePlus className="w-5 h-5" />
                </Button>
                {showAttachMenu && (
                  <div className="absolute bottom-full left-0 mb-2 z-50 bg-card border border-border rounded-lg shadow-xl p-1 min-w-[170px]">
                    <button
                      type="button"
                      onClick={() => { fileInputRef.current?.click(); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-left"
                    >
                      <Upload className="w-4 h-4 text-primary" />
                      📁 Importer une photo
                    </button>
                    <button
                      type="button"
                      onClick={() => { cameraInputRef.current?.click(); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-left"
                    >
                      <Camera className="w-4 h-4 text-primary" />
                      📸 Prendre une photo
                    </button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={handleImageSelect}
                />
              </div>

              <Input
                placeholder="Écris ton message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={(!newMessage.trim() && !imageFile) || sending}
                size="icon"
              >
                {sending || uploadingImage ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
      <MobileNav />
    </main>
  );
}
