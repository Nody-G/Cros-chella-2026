"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { updateAttendance } from "@/lib/supabase-queries";
import { useAuth } from "@/hooks/use-auth";
import type { AttendanceStatus } from "@/lib/types";

const ATTENDANCE_OPTIONS: { value: AttendanceStatus; emoji: string; label: string; color: string; hoverColor: string; activeColor: string }[] = [
  {
    value: "yes",
    emoji: "✅",
    label: "Je viens !",
    color: "border-green-500/30 bg-green-500/5",
    hoverColor: "hover:border-green-500/50 hover:bg-green-500/10",
    activeColor: "border-green-500 bg-green-500/20 shadow-green-500/20 shadow-lg",
  },
  {
    value: "maybe",
    emoji: "🤔",
    label: "Peut-être",
    color: "border-yellow-500/30 bg-yellow-500/5",
    hoverColor: "hover:border-yellow-500/50 hover:bg-yellow-500/10",
    activeColor: "border-yellow-500 bg-yellow-500/20 shadow-yellow-500/20 shadow-lg",
  },
  {
    value: "no",
    emoji: "❌",
    label: "Pas dispo",
    color: "border-red-500/30 bg-red-500/5",
    hoverColor: "hover:border-red-500/50 hover:bg-red-500/10",
    activeColor: "border-red-500 bg-red-500/20 shadow-red-500/20 shadow-lg",
  },
];

export function AttendanceSection() {
  const { currentParticipant } = useAuth();
  const [selected, setSelected] = useState<AttendanceStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (currentParticipant?.attendance) {
      setSelected(currentParticipant.attendance);
      setSubmitted(true);
    }
  }, [currentParticipant]);

  const handleSelect = async (value: AttendanceStatus) => {
    if (!currentParticipant) return;
    setSelected(value);
    setLoading(true);
    const success = await updateAttendance(currentParticipant.id, value);
    setLoading(false);
    if (success) {
      setSubmitted(true);
    }
  };

  if (!currentParticipant) {
    return (
      <section className="px-4 py-12 max-w-lg mx-auto text-center">
        <div className="p-6 rounded-2xl bg-card border border-border">
          <p className="text-muted-foreground text-sm">
            Connecte-toi pour dire si tu viens ! 🎉
          </p>
        </div>
      </section>
    );
  }

  if (submitted && selected) {
    const option = ATTENDANCE_OPTIONS.find((o) => o.value === selected);
    return (
      <section className="px-4 py-12 max-w-lg mx-auto text-center">
        <div className="p-6 rounded-2xl bg-card border border-border card-glow-gold">
          <CheckCircle2 className="w-10 h-10 text-primary mx-auto mb-3" />
          <h2 className="text-lg font-bold text-foreground mb-2">
            Merci {currentParticipant.pseudo || currentParticipant.name} ! 🎉
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            Tu as répondu : <span className="text-foreground font-medium">{option?.emoji} {option?.label}</span>
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSubmitted(false)}
            className="text-xs"
          >
            Changer ma réponse
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-12 max-w-lg mx-auto">
      <div className="p-6 rounded-2xl bg-card border border-border">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-foreground mb-1">
            Tu viens au Cros-Chella ? 🎪
          </h2>
          <p className="text-muted-foreground text-sm">
            Dis-nous si on peut compter sur toi !
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {ATTENDANCE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              disabled={loading}
              className={`p-4 rounded-xl border-2 text-center transition-all ${
                selected === option.value ? option.activeColor : `${option.color} ${option.hoverColor}`
              } ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <span className="text-3xl block mb-2">{option.emoji}</span>
              <span className="text-sm font-medium text-foreground block">{option.label}</span>
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 mt-4 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Enregistrement...
          </div>
        )}
      </div>
    </section>
  );
}
