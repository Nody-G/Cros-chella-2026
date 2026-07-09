"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart, Loader2, CheckCircle2 } from "lucide-react";
import { updateHype } from "@/lib/supabase-queries";
import { useAuth } from "@/hooks/use-auth";

const HYPE_LABELS = [
  { value: 1, emoji: "😐", label: "Mouais..." },
  { value: 2, emoji: "🤔", label: "Pourquoi pas ?" },
  { value: 3, emoji: "😏", label: "Ça peut être fun" },
  { value: 4, emoji: "😊", label: "J&apos;ai hâte" },
  { value: 5, emoji: "🔥", label: "J&apos;suis chaud !" },
  { value: 6, emoji: "🤯", label: "J&apos;arrive les frérots !" },
];

export function HypeSection() {
  const { currentParticipant } = useAuth();
  const [name, setName] = useState("");
  const [hype, setHype] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentParticipant) {
      setName(currentParticipant.name);
    }
  }, [currentParticipant]);

  const handleSubmit = async () => {
    const finalName = currentParticipant?.name || name;
    if (!finalName.trim() || hype === 0) return;
    setLoading(true);
    await updateHype(finalName.trim(), hype);
    setSubmitted(true);
    setLoading(false);
  };

  if (submitted) {
    return (
      <section className="px-4 py-16 max-w-lg mx-auto text-center" id="hype">
        <div className="p-8 rounded-2xl bg-card border border-primary/20 card-glow-gold">
          <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">
            Merci {name} ! 🎉
          </h2>
          <p className="text-muted-foreground text-sm">
            Niveau de hype : {HYPE_LABELS[hype - 1]?.emoji} {HYPE_LABELS[hype - 1]?.label}
          </p>
          <p className="text-muted-foreground text-xs mt-3">
            On te tient au courant pour la suite...
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-16 max-w-lg mx-auto" id="hype">
      <div className="p-6 rounded-2xl bg-card border border-border shadow-sm">
        <div className="text-center mb-6">
          <Heart className="w-8 h-8 text-primary mx-auto mb-3" />
          <h2 className="text-xl font-bold text-foreground mb-1">
            T&apos;es chaud ? 🔥
          </h2>
          <p className="text-muted-foreground text-sm">
            Dis-nous à quel point t&apos;as hâte
          </p>
        </div>

        <div className="space-y-5">
          {/* Hype level */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 block">
              Niveau de hype
            </label>
            <div className="grid grid-cols-3 gap-2">
              {HYPE_LABELS.map((level) => (
                <button
                  key={level.value}
                  onClick={() => setHype(level.value)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    hype === level.value
                      ? "border-primary bg-primary/10 shadow-md shadow-primary/10 scale-[1.02]"
                      : "border-border hover:border-primary/30 hover:bg-muted/50"
                  }`}
                >
                  <span className="text-2xl block">{level.emoji}</span>
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    {level.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || hype === 0 || loading}
            className="w-full py-6 text-base font-bold"
            size="lg"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Heart className="w-4 h-4 mr-2" />
            )}
            Envoyer mon hype 💥
          </Button>
        </div>
      </div>
    </section>
  );
}
