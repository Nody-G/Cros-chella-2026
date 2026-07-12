"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bug, Lightbulb, Send, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { createFeedback } from "@/lib/supabase-queries";
import type { FeedbackType } from "@/lib/types";

export function FeedbackButton() {
  const { currentParticipant } = useAuth();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!currentParticipant || !title.trim()) return;
    setSending(true);
    const result = await createFeedback({
      author_id: currentParticipant.id,
      type,
      title: title.trim(),
      description: description.trim() || undefined,
    });
    setSending(false);
    if (result) {
      setSent(true);
      setTimeout(() => {
        setOpen(false);
        setSent(false);
        setTitle("");
        setDescription("");
        setType("bug");
      }, 1500);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) { setSent(false); setTitle(""); setDescription(""); setType("bug"); } }}>
      <DialogTrigger asChild>
        <button className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-primary/30 text-muted-foreground hover:text-foreground transition-all w-full">
          <span className="text-2xl">🐛</span>
          <span className="text-xs font-medium">Signaler un bug</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {sent ? "Merci ! 🎉" : "Signaler un bug ou une idée 💡"}
          </DialogTitle>
        </DialogHeader>

        {sent ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              Ton retour a été envoyé à Niels !<br />
              Merci d&apos;améliorer Cros-Chella 🙏
            </p>
          </div>
        ) : !currentParticipant ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground text-sm">
              Connecte-toi pour envoyer un feedback 🔑
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Type toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setType("bug")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  type === "bug"
                    ? "border-red-500 bg-red-500/15 text-red-400 shadow-lg shadow-red-500/10"
                    : "border-border bg-card text-muted-foreground hover:border-red-500/40"
                }`}
              >
                <Bug className="w-4 h-4" />
                Bug 🐛
              </button>
              <button
                onClick={() => setType("idea")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  type === "idea"
                    ? "border-yellow-500 bg-yellow-500/15 text-yellow-400 shadow-lg shadow-yellow-500/10"
                    : "border-border bg-card text-muted-foreground hover:border-yellow-500/40"
                }`}
              >
                <Lightbulb className="w-4 h-4" />
                Idée 💡
              </button>
            </div>

            {/* Title */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                {type === "bug" ? "Quel est le bug ? 🐛" : "C'est quoi ton idée ? 💡"}
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={type === "bug" ? "Ex: la photo s'affiche pas..." : "Ex: ajouter un système de cagnotte..."}
                maxLength={200}
                className="bg-card border-border"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Détails (optionnel) 📝
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décris le bug ou ton idée plus en détail..."
                maxLength={2000}
                rows={3}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={!title.trim() || sending}
              className="w-full"
            >
              {sending ? (
                "Envoi..."
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer {type === "bug" ? "🐛" : "💡"}
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
