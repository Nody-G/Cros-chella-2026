"use client";

import { useEffect, useState } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, Lock, Eye, EyeOff, Loader2, Plus, Sparkles, Trash2, Edit3, RotateCcw, X, Save } from "lucide-react";
import { getGames, submitGame, revealGame, revealAllGames, deleteGame, updateGame, unrevealGame } from "@/lib/supabase-queries";
import type { Game, GameCategory } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";

const CATEGORIES: { value: GameCategory; label: string; emoji: string }[] = [
  { value: "quiz", label: "Quiz", emoji: "🧠" },
  { value: "physical", label: "Défi physique", emoji: "💪" },
  { value: "alcohol", label: "Défi alcool", emoji: "🍺" },
  { value: "disgusting", label: "Dégoûtant", emoji: "🤢" },
  { value: "culture", label: "Culture", emoji: "🎓" },
  { value: "creative", label: "Créatif", emoji: "🎨" },
  { value: "strategy", label: "Stratégie", emoji: "♟️" },
  { value: "speed", label: "Rapidité", emoji: "⚡" },
  { value: "luck", label: "Chance", emoji: "🍀" },
  { value: "social", label: "Social", emoji: "🤝" },
  { value: "mystery", label: "Mystère", emoji: "🔮" },
  { value: "other", label: "Autre", emoji: "🎲" },
];

export default function JeuxPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<GameCategory>("other");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState<GameCategory>("other");
  const { currentParticipant } = useAuth();
  const isAdmin = currentParticipant?.is_admin || false;

  useEffect(() => {
    async function fetch() {
      const gamesData = await getGames();
      setGames(gamesData);
      setLoading(false);
    }
    fetch();
  }, []);

  const refreshGames = async () => {
    const updated = await getGames();
    setGames(updated);
  };

  const handleSubmit = async () => {
    if (!currentParticipant || !title.trim()) return;
    setSubmitting(true);
    const success = await submitGame(currentParticipant.id, title.trim(), description.trim(), category);
    if (success) {
      await refreshGames();
      setShowForm(false);
      setTitle("");
      setDescription("");
      setCategory("other");
    }
    setSubmitting(false);
  };

  const handleReveal = async (id: string) => {
    await revealGame(id);
    await refreshGames();
  };

  const handleUnreveal = async (id: string) => {
    await unrevealGame(id);
    await refreshGames();
  };

  const handleRevealAll = async () => {
    await revealAllGames();
    await refreshGames();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce jeu ?")) return;
    await deleteGame(id);
    await refreshGames();
  };

  const handleStartEdit = (game: Game) => {
    setEditingId(game.id);
    setEditTitle(game.title);
    setEditDescription(game.description || "");
    setEditCategory(game.category);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editTitle.trim()) return;
    await updateGame(editingId, editTitle.trim(), editDescription.trim(), editCategory);
    setEditingId(null);
    await refreshGames();
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const revealedGames = games.filter((g) => g.is_revealed);
  const hiddenCount = games.filter((g) => !g.is_revealed).length;

  // Games authored by current user
  const myGames = games.filter((g) => g.author_id === currentParticipant?.id);

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
        <p className="text-muted-foreground text-sm mb-4">
          {loading
            ? "Chargement..."
            : games.length === 0
              ? "Aucun jeu soumis pour l'instant..."
              : `${revealedGames.length} révélé${revealedGames.length > 1 ? "s" : ""}, ${hiddenCount} mystère${hiddenCount > 1 ? "s" : ""}`}
        </p>

        {/* Explicit secrecy message */}
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔐</span>
            <div>
              <p className="text-sm font-bold text-amber-300 mb-1">Règle d&apos;or des jeux mystères</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong>Rien ne sera révélé tant que vous ne décidez pas de le révéler.</strong>{" "}
                Chaque jeu reste secret jusqu&apos;au moment où son auteur (ou l&apos;admin) choisit de le dévoiler.
                Vous pouvez modifier, supprimer ou annuler la révélation de votre jeu à tout moment. 🤫
              </p>
            </div>
          </div>
        </div>

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

            {/* My games section */}
            {myGames.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  🎯 Mes jeux ({myGames.length})
                </p>
                <div className="space-y-2">
                  {myGames.map((game) => {
                    const cat = CATEGORIES.find((c) => c.value === game.category);
                    const isEditing = editingId === game.id;

                    if (isEditing) {
                      return (
                        <Card key={game.id} className="border-primary/30">
                          <CardContent className="p-4 space-y-3">
                            <div className="grid grid-cols-4 gap-1.5">
                              {CATEGORIES.map((c) => (
                                <button
                                  key={c.value}
                                  onClick={() => setEditCategory(c.value)}
                                  className={`p-1.5 rounded-lg border text-center transition-all ${
                                    editCategory === c.value
                                      ? "border-primary bg-primary/10"
                                      : "border-border hover:border-primary/30"
                                  }`}
                                >
                                  <span className="text-sm block">{c.emoji}</span>
                                  <span className="text-[8px] text-muted-foreground">{c.label}</span>
                                </button>
                              ))}
                            </div>
                            <Input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              placeholder="Nom du jeu"
                            />
                            <Textarea
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              placeholder="Description / Règles"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="flex-1">
                                <X className="w-3.5 h-3.5 mr-1" /> Annuler
                              </Button>
                              <Button size="sm" onClick={handleSaveEdit} className="flex-1">
                                <Save className="w-3.5 h-3.5 mr-1" /> Sauver
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }

                    return (
                      <div key={game.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-lg">{cat?.emoji || "🎲"}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{game.title}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {game.is_revealed ? "👁️ Révélé" : "🔒 Secret"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button size="sm" variant="ghost" onClick={() => handleStartEdit(game)} title="Modifier">
                            <Edit3 className="w-3.5 h-3.5" />
                          </Button>
                          {game.is_revealed ? (
                            <Button size="sm" variant="ghost" onClick={() => handleUnreveal(game.id)} title="Re-masquer">
                              <RotateCcw className="w-3.5 h-3.5" />
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => handleReveal(game.id)} title="Révéler">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(game.id)} title="Supprimer" className="text-red-400 hover:text-red-300">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
                        {/* Admin can unreveal any game */}
                        {isAdmin && (
                          <Button size="sm" variant="ghost" onClick={() => handleUnreveal(game.id)} title="Re-masquer ce jeu">
                            <RotateCcw className="w-3.5 h-3.5" />
                          </Button>
                        )}
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
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleReveal(game.id)}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(game.id)} className="text-red-400 hover:text-red-300">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
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
                    <Button onClick={handleSubmit} disabled={!title.trim() || submitting} className="flex-1">
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
