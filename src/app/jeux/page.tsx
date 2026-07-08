"use client";

import { useEffect, useState } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, Lock, Eye, EyeOff, Loader2, Plus, Sparkles } from "lucide-react";
import { getGames, getParticipants, submitGame, revealGame, revealAllGames } from "@/lib/supabase-queries";
import type { Game, GameCategory, Participant } from "@/lib/types";

const CATEGORIES: { value: GameCategory; label: string; emoji: string }[] = [
  { value: "quiz", label: "Quiz", emoji: "🧠" },
  { value: "physical", label: "Défi physique", emoji: "💪" },
  { value: "alcohol", label: "Défi alcool", emoji: "🍺" },
  { value: "disgusting", label: "Dégoûtant", emoji: "🤢" },
  { value: "culture", label: "Culture", emoji: "🎓" },
  { value: "creative", label: "Créatif", emoji: "🎨" },
  { value: "other", label: "Autre", emoji: "🎲" },
];

export default function JeuxPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedAuthor, setSelectedAuthor] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<GameCategory>("other");
  const [submitting, setSubmitting] = useState(false);
  const [isAdmin] = useState(true); // TODO: real auth

  useEffect(() => {
    async function fetch() {
      const [gamesData, participantsData] = await Promise.all([
        getGames(),
        getParticipants(),
      ]);
      setGames(gamesData);
      setParticipants(participantsData);
      setLoading(false);
    }
    fetch();
  }, []);

  const handleSubmit = async () => {
    if (!selectedAuthor || !title.trim()) return;
    setSubmitting(true);
    const success = await submitGame(selectedAuthor, title.trim(), description.trim(), category);
    if (success) {
      const updated = await getGames();
      setGames(updated);
      setShowForm(false);
      setTitle("");
      setDescription("");
      setCategory("other");
      setSelectedAuthor("");
    }
    setSubmitting(false);
  };

  const handleReveal = async (id: string) => {
    await revealGame(id);
    const updated = await getGames();
    setGames(updated);
  };

  const handleRevealAll = async () => {
    await revealAllGames();
    const updated = await getGames();
    setGames(updated);
  };

  const revealedGames = games.filter((g) => g.is_revealed);
  const hiddenCount = games.filter((g) => !g.is_revealed).length;

  return (
    <main className="pb-20 min-h-screen">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Gamepad2 className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Jeux Mystères 🎮</h1>
          </div>
          {isAdmin && hiddenCount > 0 && (
            <Button size="sm" variant="outline" onClick={handleRevealAll}>
              <Eye className="w-3.5 h-3.5 mr-1" />
              Tout révéler
            </Button>
          )}
        </div>
        <p className="text-muted-foreground text-sm mb-6">
          {loading
            ? "Chargement..."
            : games.length === 0
              ? "Aucun jeu soumis pour l'instant..."
              : `${revealedGames.length} révélé${revealedGames.length > 1 ? "s" : ""}, ${hiddenCount} mystère${hiddenCount > 1 ? "s" : ""}`}
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Teaser if hidden games exist */}
            {hiddenCount > 0 && (
              <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10">
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="w-4 h-4 text-primary" />
                  <span className="font-bold text-sm">{hiddenCount} jeu{hiddenCount > 1 ? "x" : ""} mystère{hiddenCount > 1 ? "s" : ""}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Quelqu&apos;un a préparé quelque chose... Bonne chance. 🤫
                </p>
              </div>
            )}

            {/* Revealed games */}
            <div className="space-y-3 mb-6">
              {revealedGames.map((game) => {
                const cat = CATEGORIES.find((c) => c.value === game.category);
                return (
                  <Card key={game.id} className="overflow-hidden border-primary/10">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{cat?.emoji || "🎲"}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-sm">{game.title}</h3>
                            <Badge variant="secondary" className="text-[10px]">
                              {cat?.label || "Autre"}
                            </Badge>
                          </div>
                          {game.description && (
                            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                              {game.description}
                            </p>
                          )}
                          {game.author && (
                            <p className="text-[10px] text-muted-foreground mt-2">
                              Proposé par <strong>{game.author.pseudo || game.author.name}</strong>
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Admin: reveal hidden games one by one */}
            {isAdmin && games.filter((g) => !g.is_revealed).length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  🔓 Révéler un jeu (admin)
                </p>
                <div className="space-y-2">
                  {games.filter((g) => !g.is_revealed).map((game) => (
                    <div key={game.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                      <div className="flex items-center gap-2">
                        <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">Jeu mystère</span>
                        {game.author && (
                          <span className="text-xs text-muted-foreground">
                            ({game.author.pseudo || game.author.name})
                          </span>
                        )}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => handleReveal(game.id)}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit form */}
            {!showForm ? (
              <Button onClick={() => setShowForm(true)} className="w-full" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Proposer un jeu 🎲
              </Button>
            ) : (
              <Card className="border-primary/20">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h3 className="font-bold text-sm">Propose ton jeu</h3>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Qui es-tu ?</label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={selectedAuthor}
                      onChange={(e) => setSelectedAuthor(e.target.value)}
                    >
                      <option value="">Choisis ton nom...</option>
                      {participants.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.pseudo ? `(${p.pseudo})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Catégorie</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat.value}
                          onClick={() => setCategory(cat.value)}
                          className={`p-2 rounded-lg border text-center transition-all ${
                            category === cat.value
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/30"
                          }`}
                        >
                          <span className="text-lg block">{cat.emoji}</span>
                          <span className="text-[9px] text-muted-foreground">{cat.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nom du jeu</label>
                    <Input
                      placeholder="Ex: Quiz culture générale débile"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description / Règles</label>
                    <Textarea
                      placeholder="Décris ton jeu... (optionnel mais recommandé)"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setShowForm(false)} className="flex-1">
                      Annuler
                    </Button>
                    <Button onClick={handleSubmit} disabled={!selectedAuthor || !title.trim() || submitting} className="flex-1">
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Envoyer 🚀
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
      <MobileNav />
    </main>
  );
}
