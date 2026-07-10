"use client";

import { useState } from "react";
import { Loader2, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProposalComments, addProposalComment, deleteProposalComment } from "@/lib/supabase-queries";
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

  const loadComments = async () => {
    const data = await getProposalComments(proposalId);
    setComments(data);
    setLoaded(true);
  };

  // Load on first render
  if (!loaded) {
    loadComments();
  }

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
    if (success) {
      await loadComments();
    }
    setDeletingId(null);
  };

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-2">
      {/* Existing comments */}
      {comments.length === 0 ? (
        <p className="text-[10px] text-muted-foreground italic">Aucun commentaire. Sois le premier ! 💬</p>
      ) : (
        comments.map((comment) => (
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
                {(comment.author_id === currentParticipant?.id || isAdmin) && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    disabled={deletingId === comment.id}
                    className="ml-auto text-muted-foreground hover:text-destructive"
                  >
                    {deletingId === comment.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>
              <p className="text-xs text-foreground/80 mt-0.5 break-words">{comment.content}</p>
            </div>
          </div>
        ))
      )}

      {/* Comment input */}
      <div className="flex items-center gap-2 mt-2">
        <input
          type="text"
          placeholder="Écrire un commentaire..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          className="flex-1 h-8 rounded-md bg-card border border-border text-xs px-3 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2"
          disabled={submitting || !input.trim()}
          onClick={handleSubmit}
        >
          {submitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
