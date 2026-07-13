"use client";

import { useState, useEffect } from "react";
import { Loader2, Trash2, Pencil, Check, X } from "lucide-react";
import { getProposalComments, addProposalComment, deleteProposalComment, updateProposalComment } from "@/lib/supabase-queries";
import type { ProposalComment, Participant } from "@/lib/types";

interface ProposalCommentsProps {
  proposalId: string;
  currentParticipant: Participant | null;
  isAdmin: boolean;
}

export function ProposalComments({ proposalId, currentParticipant, isAdmin }: ProposalCommentsProps) {
  const [comments, setComments] = useState<ProposalComment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const loadComments = async () => {
    const data = await getProposalComments(proposalId);
    setComments(data);
    setLoaded(true);
  };

  useEffect(() => {
    if (!loaded) {
      loadComments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, proposalId]);

  const handleSubmit = async () => {
    if (!currentParticipant || !input.trim()) return;
    setSubmitting(true);
    const success = await addProposalComment(proposalId, currentParticipant.id, input.trim());
    if (success) {
      setInput("");
      await loadComments();
    }
    setSubmitting(false);
  };

  const handleDelete = async (commentId: string) => {
    setDeletingId(commentId);
    const success = await deleteProposalComment(commentId);
    if (success) await loadComments();
    setDeletingId(null);
  };

  const handleStartEdit = (comment: ProposalComment) => {
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
    const success = await updateProposalComment(commentId, editContent.trim());
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
          const isMyComment = comment.author_id === currentParticipant?.id;
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
                        <button onClick={() => handleStartEdit(comment)} className="text-muted-foreground hover:text-primary">
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(comment.id)} disabled={deletingId === comment.id} className="text-muted-foreground hover:text-destructive">
                        {deletingId === comment.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                </div>
                {isEditing ? (
                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      type="text"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(comment.id); if (e.key === "Escape") handleCancelEdit(); }}
                      className="flex-1 text-xs bg-muted border border-border rounded px-2 py-1"
                      autoFocus
                    />
                    <button onClick={() => handleSaveEdit(comment.id)} disabled={savingEdit} className="text-green-400 hover:text-green-300">
                      {savingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    </button>
                    <button onClick={handleCancelEdit} className="text-muted-foreground hover:text-foreground">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-foreground/80 mt-0.5 break-words">{comment.content}</p>
                )}
              </div>
            </div>
          );
        })
      )}

      <div className="flex items-center gap-2 mt-2">
        <input
          type="text"
          placeholder="Écrire un commentaire..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          className="flex-1 text-xs bg-muted border border-border rounded-lg px-3 py-2"
        />
        <button
          onClick={handleSubmit}
          disabled={submitting || !input.trim()}
          className="h-8 px-2 text-muted-foreground hover:text-primary disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "💬"}
        </button>
      </div>
    </div>
  );
}
