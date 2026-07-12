"use client";

import { useState } from "react";
import { Loader2, Trash2, Pencil, Check, X } from "lucide-react";
import { getProgramComments, addProgramComment, deleteProgramComment, updateProgramComment } from "@/lib/supabase-queries";
import type { ProgramComment, Participant } from "@/lib/types";

interface ProgramCommentsProps {
  programId: string;
  currentParticipant: Participant | null;
  isAdmin: boolean;
}

export function ProgramComments({ programId, currentParticipant, isAdmin }: ProgramCommentsProps) {
  const [comments, setComments] = useState<ProgramComment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const loadComments = async () => {
    const data = await getProgramComments(programId);
    setComments(data);
    setLoaded(true);
  };

  if (!loaded) {
    loadComments();
  }

  const handleSubmit = async () => {
    if (!currentParticipant || !input.trim()) return;
    setSubmitting(true);
    const success = await addProgramComment(programId, currentParticipant.id, input.trim());
    if (success) {
      setInput("");
      await loadComments();
    }
    setSubmitting(false);
  };

  const handleDelete = async (commentId: string) => {
    setDeletingId(commentId);
    const success = await deleteProgramComment(commentId);
    if (success) await loadComments();
    setDeletingId(null);
  };

  const handleStartEdit = (comment: ProgramComment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editContent.trim()) return;
    setSavingEdit(true);
    const success = await updateProgramComment(commentId, editContent.trim());
    if (success) {
      setEditingId(null);
      setEditContent("");
      await loadComments();
    }
    setSavingEdit(false);
  };

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-2">
      {comments.length === 0 ? (
        <p className="text-[10px] text-muted-foreground italic">Aucun commentaire. Sois le premier ! 💬</p>
      ) : (
        comments.map((comment) => {
          const isMyComment = comment.participant_id === currentParticipant?.id;
          const isEditing = editingId === comment.id;

          return (
            <div key={comment.id} className="flex items-start gap-2">
              <span className="text-sm flex-shrink-0">{comment.author?.emoji_avatar || "👤"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold">
                    {comment.author?.pseudo || comment.author?.name || "Anonyme"}
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    {new Date(comment.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {!isEditing && (isMyComment || isAdmin) && (
                    <div className="ml-auto flex items-center gap-1">
                      {isMyComment && (
                        <button onClick={() => handleStartEdit(comment)} className="text-muted-foreground/50 hover:text-primary transition-colors p-0.5">
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(comment.id)} disabled={deletingId === comment.id} className="text-muted-foreground/50 hover:text-destructive transition-colors p-0.5">
                        {deletingId === comment.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                </div>
                {isEditing ? (
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(comment.id); if (e.key === "Escape") handleCancelEdit(); }}
                      className="flex-1 text-xs bg-muted border border-border rounded px-2 py-1 outline-none focus:border-primary/50"
                      autoFocus
                    />
                    <button onClick={() => handleSaveEdit(comment.id)} disabled={savingEdit} className="text-green-400 hover:text-green-300 p-0.5">
                      {savingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    </button>
                    <button onClick={handleCancelEdit} className="text-red-400 hover:text-red-300 p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-foreground/80 mt-0.5">{comment.content}</p>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Input */}
      {currentParticipant && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            placeholder="Commenter cette activité..."
            className="flex-1 text-xs bg-muted border border-border rounded-full px-3 py-2 outline-none focus:border-primary/50 placeholder:text-muted-foreground"
            style={{ fontSize: "16px" }}
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || !input.trim()}
            className="text-primary hover:text-primary/80 disabled:opacity-30 transition-colors p-1"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "➤"}
          </button>
        </div>
      )}
    </div>
  );
}
