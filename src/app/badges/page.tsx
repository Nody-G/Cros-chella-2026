"use client";

import { useEffect, useState } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Award, X } from "lucide-react";
import { getAllBadges, awardBadge, deleteBadge } from "@/lib/supabase-queries";
import { supabase } from "@/lib/supabase";
import type { CustomBadge } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";

const EMOJI_SUGGESTIONS = [
  // 🎱 Jeux & Sport
  "🎱", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️", "🎯", "🎲", "♟️",
  "🎰", "🎮", "🕹️", "🎳", "🏆", "⚽", "🏀", "🏈", "🎾", "🏓",
  // 🔥 Attitude & Réactions
  "🔥", "💀", "⚡", "💥", "✨", "🌟", "⭐", "💫", "🎊", "🎉",
  "🥳", "🤯", "😱", "🥵", "🥶", "😤", "😡", "🤬", "😈", "👿",
  "👹", "👺", "🤡", "💩", "👻", "🎃", "🤖", "👽", "🗿", "💀",
  // 🍺 Fête & Nourriture
  "🍺", "🍻", "🥂", "🍷", "🍸", "🍹", "🥃", "🫗", "🍾", "☕",
  "🍕", "🍔", "🌭", "🌮", "🌯", "🍿", "🧁", "🍰", "🎂", "🍩",
  // 👑 Personnages & Titres
  "👑", "💎", "🫅", "🤴", "👸", "🦸", "🦹", "🧙", "🧛", "🧟",
  "🧜", "🧝", "🎅", "🤶", "🎭", "🎪", "🎤", "🎸", "🥁", "🎺",
  // 😎 Expressions & Humeur
  "😎", "🤪", "🥴", "🤫", "🫠", "😏", "🤑", "🤓", "🧐", "🫡",
  "💪", "🧠", "👁️", "👅", "🫀", "🫁", "🦴", "🦷", "👀", "💅",
  // 🦀 Animaux
  "🐐", "🦄", "🐸", "🦀", "🐍", "🦎", "🐊", "🦈", "🐬", "🐳",
  "🐙", "🦑", "🐛", "🦋", "🐌", "🐜", "🐝", "🐞", "🦗", "🕷️",
  // ❤️ Symboles & Divers
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "❤️‍🔥",
  "💘", "💝", "💖", "💗", "💓", "💞", "💕", "💯", "💢", "💨",
  // 🏠 Lieux & Nature
  "🏠", "🏡", "🏰", "🗼", "🌋", "🏔️", "⛰️", "🌊", "🏝️", "🌅",
  "🌈", "☀️", "🌙", "⭐", "❄️", "🌪️", "🔥", "💧", "🍀", "🌸",
  // 🚀 Objets & Transport
  "🚀", "🛸", "🚁", "🏎️", "🏍️", "🛵", "🚲", "🛴", "🛹", "🎿",
  "🎸", "🎹", "🎷", "🎺", "🎻", "🪘", "🪗", "🪕", "📱", "💻",
  // 🤝 Geste & Mains
  "🤝", "👍", "👎", "👊", "✊", "🤛", "🤜", "👏", "🙌", "👐",
  "🤲", "🫶", "🫰", "🤞", "✌️", "🤟", "🤘", "👌", "🤌", "🤏",
  "👈", "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐️", "🖖", "👋",
];

export default function BadgesPage() {
  const [badges, setBadges] = useState<CustomBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState("");
  const [emoji, setEmoji] = useState("🏅");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { currentParticipant, participants, isAdmin } = useAuth();

  useEffect(() => {
    let mounted = true;

    async function fetchBadges() {
      const data = await getAllBadges();
      if (!mounted) return;
      setBadges(data);
      setLoading(false);
    }
    fetchBadges();

    // Realtime
    const existingChannel = supabase.getChannels().find(
      (ch) => ch.topic === "realtime:badges-realtime"
    );
    if (existingChannel) supabase.removeChannel(existingChannel);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (supabase as any)
      .channel("badges-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "custom_badges" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        () => {
          if (mounted) fetchBadges();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAward = async () => {
    if (!selectedParticipant || !title.trim() || !currentParticipant) return;
    setSubmitting(true);
    const success = await awardBadge({
      participant_id: selectedParticipant,
      awarded_by: currentParticipant.id,
      emoji: emoji || "🏅",
      title: title.trim(),
      description: description.trim() || undefined,
    });
    if (success) {
      setShowForm(false);
      setSelectedParticipant("");
      setEmoji("🏅");
      setTitle("");
      setDescription("");
    }
    setSubmitting(false);
  };

  const handleDelete = async (badgeId: string) => {
    await deleteBadge(badgeId);
  };

  // Group badges by participant
  const badgesByParticipant = new Map<string, CustomBadge[]>();
  for (const badge of badges) {
    const existing = badgesByParticipant.get(badge.participant_id) || [];
    existing.push(badge);
    badgesByParticipant.set(badge.participant_id, existing);
  }

  // Sort participants: those with badges first, then alphabetically
  const sortedParticipants = [...participants].sort((a, b) => {
    const aBadges = badgesByParticipant.get(a.id)?.length || 0;
    const bBadges = badgesByParticipant.get(b.id)?.length || 0;
    if (bBadges !== aBadges) return bBadges - aBadges;
    return a.name.localeCompare(b.name);
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold">
            🏅 Badges
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Les médailles de gloire (et de honte) du Cros-Chella
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {badges.length} badge{badges.length !== 1 ? "s" : ""} décerné{badges.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Admin: Award button */}
        {isAdmin && !showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="w-full mb-6 bg-gradient-to-r from-primary to-accent text-primary-foreground"
          >
            <Plus className="w-4 h-4 mr-2" />
            Décerer un badge
          </Button>
        )}

        {/* Admin: Award form */}
        {isAdmin && showForm && (
          <Card className="mb-6 glass border-primary/30">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">🏅 Décerer un badge</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Participant selector */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Pour qui ?
                </label>
                <select
                  value={selectedParticipant}
                  onChange={(e) => setSelectedParticipant(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Choisir un pote...</option>
                  {participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.emoji_avatar || "👤"} {p.pseudo || p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Emoji picker */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Emoji
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {EMOJI_SUGGESTIONS.map((e) => (
                    <button
                      key={e}
                      onClick={() => setEmoji(e)}
                      className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                        emoji === e
                          ? "bg-primary/20 ring-2 ring-primary scale-110"
                          : "bg-secondary hover:bg-secondary/80"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
                <Input
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  placeholder="Ou tape un emoji..."
                  className="text-center text-lg"
                  maxLength={4}
                />
              </div>

              {/* Title */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Titre du badge
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Boss du billard, Roi de la grillade..."
                  maxLength={50}
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Description <span className="text-muted-foreground">(optionnel)</span>
                </label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Pour avoir raté sa bille de finale à 30cm du trou"
                  maxLength={200}
                />
              </div>

              <Button
                onClick={handleAward}
                disabled={!selectedParticipant || !title.trim() || submitting}
                className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Award className="w-4 h-4 mr-2" />
                )}
                Décerer ce badge !
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Badges by participant */}
        <div className="space-y-4">
          {sortedParticipants.map((participant) => {
            const participantBadges = badgesByParticipant.get(participant.id) || [];
            if (participantBadges.length === 0 && !isAdmin) return null;

            return (
              <Card key={participant.id} className="glass">
                <CardContent className="p-4">
                  {/* Participant header */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{participant.emoji_avatar || "👤"}</span>
                    <div>
                      <h3 className="font-bold">{participant.pseudo || participant.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {participantBadges.length} badge{participantBadges.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  {/* Badges grid */}
                  {participantBadges.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {participantBadges.map((badge) => (
                        <div
                          key={badge.id}
                          className="group relative flex items-center gap-1.5 bg-secondary/60 rounded-full pl-2 pr-3 py-1.5 hover:bg-secondary transition-colors"
                          title={badge.description || badge.title}
                        >
                          <span className="text-lg">{badge.emoji}</span>
                          <span className="text-xs font-medium">{badge.title}</span>

                          {/* Admin: delete button */}
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(badge.id)}
                              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}

                          {/* Tooltip on hover */}
                          {badge.description && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-popover border border-border rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                              {badge.description}
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                Par {badge.awarder?.pseudo || badge.awarder?.name || "Admin"}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Aucun badge pour l&apos;instant...
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
