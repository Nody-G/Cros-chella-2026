"use client";

import { useEffect, useState } from "react";
import { getParticipants, getBotDossiers, createBotDossier, deleteBotDossier, updateBotDossier } from "@/lib/supabase-queries";
import { Participant, BotDossier } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Sparkles, Pencil } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function DossiersPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [dossiers, setDossiers] = useState<BotDossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [filterTarget, setFilterTarget] = useState<string>("all");

  // Form state (create)
  const [openForm, setOpenForm] = useState(false);
  const [targetId, setTargetId] = useState<string>("");
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Edit state
  const [editingDossier, setEditingDossier] = useState<BotDossier | null>(null);
  const [editTargetId, setEditTargetId] = useState<string>("");
  const [editContent, setEditContent] = useState("");
  const [editIsAnonymous, setEditIsAnonymous] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    // Current user selector from localStorage
    const saved = localStorage.getItem("croschella_user");
    if (saved) {
      setSelectedParticipant(saved);
      setCurrentUserId(saved);
    }

    async function loadData() {
      const [parts, dos] = await Promise.all([
        getParticipants(),
        getBotDossiers(),
      ]);
      setParticipants(parts);
      setDossiers(dos);
      setLoading(false);
    }
    loadData();

    // Subscribe to realtime updates on bot_dossiers
    const channel = supabase
      .channel("bot_dossiers")
      .on("postgres_changes", { event: "*", schema: "public", table: "bot_dossiers" }, async () => {
        const fresh = await getBotDossiers();
        setDossiers(fresh);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSelectUser = (id: string) => {
    setSelectedParticipant(id);
    setCurrentUserId(id);
    localStorage.setItem("croschella_user", id);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId || !content.trim()) return;

    setSubmitting(true);
    const newDos = await createBotDossier(
      targetId,
      currentUserId || null,
      content,
      "libre",
      isAnonymous
    );

    if (newDos) {
      setDossiers((prev) => [newDos, ...prev]);
      setContent("");
      setOpenForm(false);
    }
    setSubmitting(false);
  };

  const openEditModal = (dos: BotDossier) => {
    setEditingDossier(dos);
    setEditTargetId(dos.target_participant_id);
    setEditContent(dos.content);
    setEditIsAnonymous(dos.is_anonymous);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDossier || !editTargetId || !editContent.trim()) return;

    setUpdating(true);
    const success = await updateBotDossier(editingDossier.id, {
      target_participant_id: editTargetId,
      content: editContent,
      category: "libre",
      is_anonymous: editIsAnonymous,
    });

    if (success) {
      setDossiers((prev) =>
        prev.map((d) =>
          d.id === editingDossier.id
            ? {
                ...d,
                target_participant_id: editTargetId,
                content: editContent,
                category: "libre",
                is_anonymous: editIsAnonymous,
                target: participants.find((p) => p.id === editTargetId),
              }
            : d
        )
      );
      setEditingDossier(null);
    }
    setUpdating(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer définitivement ce dossier ?")) return;
    const success = await deleteBotDossier(id);
    if (success) {
      setDossiers((prev) => prev.filter((d) => d.id !== id));
    }
  };

  const currentUserObj = participants.find((p) => p.id === currentUserId);
  const isAdmin = currentUserObj?.is_admin || false;

  const filteredDossiers = filterTarget === "all"
    ? dossiers
    : dossiers.filter((d) => d.target_participant_id === filterTarget);

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto p-4 py-8 text-center text-muted-foreground">
        Chargement du mur des dossiers...
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 py-6 space-y-6 pb-20">
      {/* Selector if not selected */}
      {!selectedParticipant && (
        <Card className="border-amber-500/30 bg-amber-500/10 mb-4">
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-2">Qui es-tu ?</p>
            <div className="flex flex-wrap gap-2">
              {participants.map((p) => (
                <Button
                  key={p.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectUser(p.id)}
                  className="gap-1"
                >
                  <span>{p.emoji_avatar || "👤"}</span>
                  <span>{p.pseudo || p.name}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-red-950/40 via-background to-amber-950/40 p-5 rounded-2xl border border-red-500/20">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-red-400">💣 Le Mur des Dossiers</h1>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 gap-1">
              <span>🤫 100% Anonyme</span>
            </Badge>
            <Badge variant="outline" className="border-red-500/40 text-red-400 bg-red-500/10">
              Alimente Botardèche 🤖
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            Écris librement ce que tu veux sur n&apos;importe quel participant.
            <span className="font-semibold text-emerald-400"> C&apos;est 100% anonyme !</span> Botardèche traite automatiquement l&apos;information et l&apos;enregistre dans sa mémoire pour clasher la cible dans le chat.
          </p>
        </div>

        <Dialog open={openForm} onOpenChange={setOpenForm}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700 text-white font-semibold gap-2 shadow-lg shadow-red-600/20">
              <Plus className="w-4 h-4" />
              Balancer une info / dossier
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-400">
                <span>💣</span> Balancer une info (100% Anonyme)
              </DialogTitle>
              <CardDescription>
                Écris librement. L&apos;IA traitera et classera automatiquement ton information dans sa mémoire.
              </CardDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Cible (sur qui est cette info ?) *</Label>
                <Select value={targetId} onValueChange={setTargetId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionne un participant" />
                  </SelectTrigger>
                  <SelectContent>
                    {participants.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-2">
                          <span>{p.emoji_avatar || "👤"}</span>
                          <span>{p.pseudo || p.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>L&apos;information / le dossier libre *</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Écris tout ce que tu veux (anecdote, dossier, habitude, souvenir, vanne, secret...). L'IA s'occupe de tout traiter !"
                  rows={5}
                  required
                />
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl flex items-center justify-between text-xs text-emerald-400">
                <div className="flex items-center gap-2">
                  <span>🤫</span>
                  <span><strong>100% Anonyme</strong> — Ton nom n&apos;apparaît pas</span>
                </div>
                <input
                  type="checkbox"
                  id="anonCheck"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded border-input text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setOpenForm(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={submitting || !targetId || !content.trim()} className="bg-red-600 hover:bg-red-700 text-white font-semibold">
                  {submitting ? "Envoi..." : "Balancer à Botardèche 💣"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Modal (Admin & Author) */}
      <Dialog open={!!editingDossier} onOpenChange={(open) => !open && setEditingDossier(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <span>✏️</span> Modifier l&apos;info {isAdmin && <Badge variant="outline" className="text-amber-400 border-amber-400/40 text-[10px]">Admin</Badge>}
            </DialogTitle>
            <CardDescription>
              Modifie ou corrige cette information. La mémoire de Botardèche sera mise à jour instantanément.
            </CardDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Cible</Label>
              <Select value={editTargetId} onValueChange={setEditTargetId} required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {participants.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <span>{p.emoji_avatar || "👤"}</span>
                        <span>{p.pseudo || p.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Contenu de l&apos;information</Label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={4}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditingDossier(null)}>
                Annuler
              </Button>
              <Button type="submit" disabled={updating || !editTargetId || !editContent.trim()} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                {updating ? "Enregistrement..." : "Enregistrer les modifications ✏️"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Filter Tabs by Target */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <Button
          size="sm"
          variant={filterTarget === "all" ? "default" : "outline"}
          onClick={() => setFilterTarget("all")}
          className="rounded-full text-xs"
        >
          Tous ({dossiers.length})
        </Button>
        {participants.map((p) => {
          const count = dossiers.filter((d) => d.target_participant_id === p.id).length;
          if (count === 0) return null;
          return (
            <Button
              key={p.id}
              size="sm"
              variant={filterTarget === p.id ? "default" : "outline"}
              onClick={() => setFilterTarget(p.id)}
              className="rounded-full text-xs gap-1 whitespace-nowrap"
            >
              <span>{p.emoji_avatar || "👤"}</span>
              <span>{p.pseudo || p.name}</span>
              <span className="opacity-70">({count})</span>
            </Button>
          );
        })}
      </div>

      {/* Feed of Dossiers */}
      {filteredDossiers.length === 0 ? (
        <Card className="text-center p-8 bg-muted/20 border-dashed">
          <CardContent className="space-y-3 p-0">
            <div className="text-4xl">💣</div>
            <h3 className="font-semibold">Aucun dossier pour le moment</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Soyez le premier à balancer une casserole ou une anecdote hilarante sur vos potes !
            </p>
            <Button onClick={() => setOpenForm(true)} variant="outline" size="sm" className="gap-2">
              <Plus className="w-3.5 h-3.5" />
              Ajouter un dossier
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredDossiers.map((dos) => {
            const target = dos.target;
            const isMyDossier = dos.author_participant_id === currentUserId;
            const canEditOrDelete = isMyDossier || isAdmin;

            return (
              <Card key={dos.id} className="relative overflow-hidden border-border/60 hover:border-red-500/30 transition-colors">
                <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                  <div className="flex items-center gap-2">
                    <div className="text-2xl">{target?.emoji_avatar || "👤"}</div>
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                        <span>Cible :</span>
                        <span className="text-red-400">{target?.pseudo || target?.name || "Inconnu"}</span>
                      </CardTitle>
                      <CardDescription className="text-[11px] flex items-center gap-1 mt-0.5">
                        <span className="font-semibold text-emerald-400">🤫 100% Anonyme</span>
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {canEditOrDelete && (
                      <div className="flex items-center gap-0.5 ml-1">
                        <button
                          onClick={() => openEditModal(dos)}
                          className="text-muted-foreground hover:text-amber-400 p-1 transition-colors"
                          title={isAdmin ? "Modifier (Admin)" : "Modifier mon dossier"}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(dos.id)}
                          className="text-muted-foreground hover:text-red-400 p-1 transition-colors"
                          title={isAdmin ? "Supprimer (Admin)" : "Supprimer mon dossier"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <p className="text-xs leading-relaxed bg-muted/40 p-3 rounded-xl border border-border/40 font-normal whitespace-pre-wrap">
                    &quot;{dos.content}&quot;
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2.5">
                    <span className="flex items-center gap-1 text-red-400/80">
                      <Sparkles className="w-3 h-3" />
                      Mémorisé par Botardèche 🤖
                    </span>
                    <span>{new Date(dos.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
