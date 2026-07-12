"use client";

import { useEffect, useState, useRef } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Loader2, Send, Camera, Upload, X, ImagePlus, Pencil, Trash2, Check, XCircle, SmilePlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getMessages, sendMessage, uploadChatImage, editMessage, deleteMessage, toggleMessageReaction } from "@/lib/supabase-queries";
import type { Message } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { compressImage, readFileAsDataURL } from "@/lib/image-utils";

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null);
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

    // Close menus on outside click/tap
    const closeMenus = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-msg-menu]") && !target.closest("[data-menu-trigger]")) {
        setActiveMenu(null);
        setReactionPickerMsgId(null);
      }
    };
    document.addEventListener("click", closeMenus);
    document.addEventListener("touchstart", closeMenus);

    // Subscribe to new messages + edits + deletes
    const channel = supabase
      .channel("messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload) => {
        const newMsg = payload.new as Message;
        const { data: author } = await supabase
          .from("participants")
          .select("*")
          .eq("id", newMsg.author_id)
          .single();
        setMessages((prev) => [...prev, { ...newMsg, author: author || undefined }]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (payload) => {
        const updated = payload.new as Message;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === updated.id
              ? { ...m, content: updated.content, image_url: updated.image_url, edited_at: updated.edited_at, deleted_at: updated.deleted_at, reactions: (updated as Message).reactions || m.reactions }
              : m
          )
        );
      })
      .subscribe();

    return () => {
      document.removeEventListener("click", closeMenus);
      document.removeEventListener("touchstart", closeMenus);
      supabase.removeChannel(channel);
    };
  }, []);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowAttachMenu(false);
    try {
      const compressed = await compressImage(file, "chat");
      setImageFile(compressed);
      const preview = await readFileAsDataURL(compressed);
      setImagePreview(preview);
    } catch (err) {
      console.error("Image compression error:", err);
      // Fallback: use original file
      setImageFile(file);
      const preview = await readFileAsDataURL(file);
      setImagePreview(preview);
    }
    // Reset input so same file can be re-selected
    e.target.value = "";
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

  const handleEditKeyDown = (e: React.KeyboardEvent, msgId: string) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEditSave(msgId);
    }
    if (e.key === "Escape") {
      setEditingId(null);
      setEditContent("");
    }
  };

  const handleEditSave = async (msgId: string) => {
    if (!editContent.trim()) return;
    const ok = await editMessage(msgId, editContent.trim());
    if (ok) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, content: editContent.trim(), edited_at: new Date().toISOString() } : m
        )
      );
    }
    setEditingId(null);
    setEditContent("");
  };

  const handleDelete = async (msgId: string) => {
    const ok = await deleteMessage(msgId);
    if (ok) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, content: "", image_url: null, deleted_at: new Date().toISOString() } : m
        )
      );
    }
    setActiveMenu(null);
  };

  const startEdit = (msg: Message) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
    setActiveMenu(null);
  };

  const REACTION_EMOJIS = ["❤️", "😂", "🔥", "👍", "👎", "😮", "😢", "🎉", "💀", "🤡"];

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!currentUserId) return;
    setReactionPickerMsgId(null);
    const newReactions = await toggleMessageReaction(messageId, currentUserId, emoji);
    if (newReactions) {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions: newReactions } : m))
      );
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    if (isToday) return `Auj. ${time}`;
    if (isYesterday) return `Hier ${time}`;
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) + ` ${time}`;
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
              const isDeleted = !!msg.deleted_at;
              const isEdited = !!msg.edited_at && !isDeleted;
              const isEditing = editingId === msg.id;

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
                        {isEdited && <span className="ml-1 italic">(modifié)</span>}
                      </span>
                    </div>
                    <div
                      className={`relative inline-block rounded-2xl group ${isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm"}`}
                    >
                      {/* Long-press / click menu trigger — visible on all devices */}
                      {isMe && !isDeleted && !isEditing && (
                        <button
                          data-menu-trigger
                          onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === msg.id ? null : msg.id); }}
                          className="absolute -top-0.5 opacity-0 group-hover:opacity-50 hover:!opacity-100 p-0.5 rounded transition-opacity text-muted-foreground/40 hover:text-muted-foreground z-20"
                          aria-label="Options du message"
                          style={{ touchAction: "manipulation", right: isMe ? 0 : undefined, left: isMe ? undefined : 0 }}
                        >
                          ⋯
                        </button>
                      )}
                      {/* Context menu */}
                      {activeMenu === msg.id && (
                        <div data-msg-menu className={`absolute ${isMe ? "right-0" : "left-0"} top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-2xl p-1.5 flex gap-1`}>
                          <button
                            onClick={() => startEdit(msg)}
                            className="p-2.5 rounded-lg hover:bg-muted active:bg-muted transition-colors"
                            title="Modifier"
                          >
                            <Pencil className="w-4 h-4 text-primary" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm("Supprimer ce message ?")) handleDelete(msg.id);
                              setActiveMenu(null);
                            }}
                            className="p-2.5 rounded-lg hover:bg-destructive/10 active:bg-destructive/10 transition-colors text-destructive"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {isDeleted ? (
                        <div className="px-3 py-2 text-sm italic opacity-50">
                          🚫 Message supprimé
                        </div>
                      ) : isEditing ? (
                        <div className="px-2 py-1.5 flex items-center gap-1">
                          <input
                            autoFocus
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            onKeyDown={(e) => handleEditKeyDown(e, msg.id)}
                            className="flex-1 bg-transparent text-sm outline-none min-w-0"
                          />
                          <button onClick={() => handleEditSave(msg.id)} className="text-green-400 hover:text-green-300 flex-shrink-0">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setEditingId(null); setEditContent(""); }} className="text-red-400 hover:text-red-300 flex-shrink-0">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          {msg.image_url && (
                            <img
                              src={msg.image_url}
                              alt="Image partagée"
                              className="max-w-full max-h-64 object-cover cursor-pointer rounded-t-2xl"
                              onClick={() => window.open(msg.image_url!, "_blank")}
                            />
                          )}
                          {msg.content && (
                            <div className={`px-3 py-2 text-sm ${msg.image_url ? "pt-1" : ""}`}>
                              {msg.content}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    {/* Reactions display */}
                    {!isDeleted && msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(msg.reactions).map(([emoji, voters]) => {
                          const voterList = voters as string[];
                          if (voterList.length === 0) return null;
                          const iReacted = voterList.includes(currentUserId);
                          return (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(msg.id, emoji)}
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-all ${
                                iReacted
                                  ? "bg-primary/20 border-primary/40 text-primary"
                                  : "bg-muted border-border text-muted-foreground hover:border-primary/30"
                              }`}
                              title={`${voterList.length} réaction${voterList.length > 1 ? "s" : ""}`}
                            >
                              <span>{emoji}</span>
                              <span className="text-[10px]">{voterList.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {/* Reaction add button + picker */}
                    {!isDeleted && !isEditing && (
                      <div className="relative mt-0.5">
                        <button
                          data-menu-trigger
                          onClick={(e) => { e.stopPropagation(); setReactionPickerMsgId(reactionPickerMsgId === msg.id ? null : msg.id); }}
                          className="text-muted-foreground/40 hover:text-muted-foreground transition-colors p-0.5"
                          aria-label="Réagir"
                        >
                          <SmilePlus className="w-3.5 h-3.5" />
                        </button>
                        {reactionPickerMsgId === msg.id && (
                          <div data-msg-menu className={`absolute ${isMe ? "right-0" : "left-0"} bottom-full mb-1 z-50 bg-card border border-border rounded-xl shadow-xl p-2 flex gap-1 flex-wrap max-w-[260px]`}>
                            {REACTION_EMOJIS.map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => handleReaction(msg.id, emoji)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-lg"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
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
