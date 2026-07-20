"use client";

import { useEffect, useState } from "react";
import { getParticipants, getBotDossiers, createBotDossier, deleteBotDossier, updateBotDossier } from "@/lib/supabase-queries";
import { Participant, BotDossier } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Pencil, ShieldAlert, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";

export default function DossiersPage() {
  const { currentParticipant, isAdmin } = useAuth();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [dossiers, setDossiers] = useState<BotDossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // Form state
  const [targetId, setTargetId] = useState<string>("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Edit state (admin)
  const [editingDossier, setEditingDossier] = useState<BotDossier | null>(null);
  const [editTargetId, setEditTargetId] = useState<string>("");
  const [editContent, setEditContent] = useState("");
  const [updating, setUpdating] = useState(false);
  const [synthesizingId, setSynthesizingId] = useState<string | null>(null);
  const [synthesizedNotice, setSynthesizedNotice] = useState<string | null>(null);

  useEffect(() => {
    // Current user id from localStorage if present
    const saved = localStorage.getItem("croschella_user");
    if (saved) {
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

  const triggerMimoSynthesis = async (dossierId: string) => {
    try {
      setSynthesizingId(dossierId);
      const res = await fetch("/api/dossiers/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dossierId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const facts = (data.synthesized_facts || data.synthesizedFacts || []).join(" / ");
        setSynthesizedNotice(`Mimo API a synthétisé : "${facts}" et mis à jour la mémoire de Botardèche ! 🤖✨`);
        setTimeout(() => setSynthesizedNotice(null), 8000);
      } else {
        console.warn("Synthèse Mimo warning:", data.error);
      }
    } catch (err) {
      console.error("Error triggering Mimo synthesis:", err);
    } finally {
      setSynthesizingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId || !content.trim()) return;

    setSubmitting(true);
    setSubmittedSuccess(false);

    const newDos = await createBotDossier(
      targetId,
      null, // Always null author for 100% complete privacy
      content,
      "libre",
      true // Always anonymous
    );

    if (newDos) {
      setDossiers((prev) => [newDos, ...prev]);
      setContent("");
      setTargetId("");
      setSubmittedSuccess(true);
      setTimeout(() => setSubmittedSuccess(false), 6000);

      // Trigger automatic Mimo API synthesis into bot_knowledge
      triggerMimoSynthesis(newDos.id);
    }
    setSubmitting(false);
  };

  const openEditModal = (dos: BotDossier) => {
    setEditingDossier(dos);
    setEditTargetId(dos.target_participant_id);
    setEditContent(dos.content);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDossier || !editTargetId || !editContent.trim()) return;

    setUpdating(true);
    const success = await updateBotDossier(editingDossier.id, {
      target_participant_id: editTargetId,
      content: editContent,
      category: "libre",
      is_anonymous: true,
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
                is_anonymous: true,
                target: participants.find((p) => p.id === editTargetId),
              }
            : d
        )
      );
      triggerMimoSynthesis(editingDossier.id);
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
  const isUserAdmin = isAdmin || currentParticipant?.is_admin || currentUserObj?.is_admin || false;

  if (loading) {
    return (
      <div className="container max-w-2xl mx-auto p-4 py-8 text-center text-muted-foreground">
        Chargement du coffre à secrets...
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto p-4 py-6 space-y-6 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-950/50 via-background to-amber-950/50 p-6 rounded-2xl border border-red-500/30 text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          <span>🔒 100% Secret & Anonyme</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-red-400">
          🤫 La Boîte à Secrets du Botardèche
        </h1>
        <p className="text-xs text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Nourris l&apos;IA en toute confidentialité. Tout ce que tu écris ici est <span className="font-semibold text-emerald-400">confidentiel</span> et transmis à Botardèche pour alimenter sa mémoire.
          <br />
          <span className="text-foreground font-medium text-[11px] opacity-90">🔒 Afin de garantir la bienveillance et le bon fonctionnement de l&apos;IA, l&apos;administrateur dispose d&apos;un accès de modération sur la lecture et le traitement des données.</span>
        </p>
      </div>

      {/* Success Notification Banner */}
      {submittedSuccess && (
        <Card className="border-emerald-500/40 bg-emerald-500/10 animate-in fade-in slide-in-from-top-2 duration-300">
          <CardContent className="p-4 flex items-center gap-3 text-emerald-400 text-xs font-medium">
            <span className="text-xl">✅</span>
            <div>
              <p className="font-bold text-sm">Secret transmis avec succès à Botardèche !</p>
              <p className="opacity-90">L&apos;info a été enregistrée dans sa mémoire. Il s&apos;en servira au meilleur moment dans le chat 😈.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Secret Submission Form */}
      <Card className="border-red-500/30 shadow-xl bg-gradient-to-b from-card to-red-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-red-400">
            <span>💣</span> Transmettre une pépite / dossier
          </CardTitle>
          <CardDescription className="text-xs">
            Sélectionne la personne concernée et écris librement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Cible (sur qui est ce secret / dossier ?) *</Label>
              <Select value={targetId} onValueChange={setTargetId} required>
                <SelectTrigger className="bg-background">
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
              <Label className="text-xs font-semibold">L&apos;information / l&apos;anecdote secret *</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Ex: En 2018 à la plage, Charly est resté coincé 20min dans une bouée flamant rose... (Écris tout ce que tu veux, l'IA s'occupe de tout comprendre et retenir !)"
                rows={5}
                className="bg-background"
                required
              />
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl flex items-center gap-2.5 text-xs text-emerald-400">
              <span className="text-lg">🔒</span>
              <div>
                <span className="font-bold">Confidentialité & Supervision Éthique</span>
                <p className="text-[11px] opacity-80 mt-0.5">Aucune identité n&apos;est affichée dans le chat. L&apos;administrateur a un droit de regard sur le traitement et la mémoire générée pour la sécurité du groupe.</p>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting || !targetId || !content.trim()}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-11 text-sm shadow-lg shadow-red-600/20 gap-2"
            >
              {submitting ? (
                "Transmission en cours..."
              ) : (
                <>
                  <span>💣</span> Transmettre secrètement à Botardèche
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Mimo Synthesis Notice Banner */}
      {synthesizedNotice && (
        <Card className="border-purple-500/40 bg-purple-500/10 animate-in fade-in slide-in-from-top-2 duration-300">
          <CardContent className="p-4 flex items-center gap-3 text-purple-300 text-xs font-medium">
            <Sparkles className="w-5 h-5 text-purple-400 shrink-0" />
            <div>
              <p className="font-bold text-sm text-purple-200">Synthèse Mimo API terminée !</p>
              <p className="opacity-90">{synthesizedNotice}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Secret Admin Moderation Panel (Visible ONLY to Niels / Admin) */}
      {isUserAdmin && (
        <Card className="border-amber-500/40 bg-amber-500/5 mt-8">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <CardTitle className="text-sm font-bold text-amber-400">
                🔒 Espace Modération Admin ({dossiers.length})
              </CardTitle>
            </div>
            <Badge variant="outline" className="border-amber-400/40 text-amber-400 text-[10px]">
              Invisible pour les participants
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <p className="text-[11px] text-muted-foreground">
              Voici toutes les informations transmises secrètement par les participants pour Botardèche. Tu peux les relire, les synthétiser avec Mimo (✨), les modifier (✏️) ou les supprimer (🗑️).
            </p>
            {dossiers.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Aucune information enregistrée pour le moment.</p>
            ) : (
              <div className="grid gap-3">
                {dossiers.map((dos) => (
                  <Card key={dos.id} className="p-3.5 border-border/60 bg-background/80">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="text-xs font-bold text-red-400">
                            Cible : {dos.target?.emoji_avatar || "👤"} {dos.target?.pseudo || dos.target?.name || "Inconnu"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            ({new Date(dos.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })})
                          </span>
                          {dos.synthesized_at ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded-full">
                              <Sparkles className="w-3 h-3 text-purple-400" /> Synthétisé par Mimo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full border border-border/40">
                              ⏳ Non synthétisé
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-foreground font-normal leading-relaxed italic">
                          &quot;{dos.content}&quot;
                        </p>
                        {Array.isArray(dos.synthesized_facts) && dos.synthesized_facts.length > 0 && (
                          <div className="mt-2 p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[11px] space-y-1">
                            <p className="font-bold flex items-center gap-1.5 text-purple-200">
                              <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                              Fait(s) synthétisé(s) & mémorisé(s) par Botardèche :
                            </p>
                            <ul className="list-disc list-inside space-y-0.5 pl-1 opacity-95">
                              {dos.synthesized_facts.map((fact, idx) => (
                                <li key={idx} className="leading-snug">{fact}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => triggerMimoSynthesis(dos.id)}
                          disabled={synthesizingId === dos.id}
                          className="text-purple-400 hover:text-purple-300 p-1.5 transition-colors disabled:opacity-50"
                          title="Synthétiser avec Mimo API pour Botardèche"
                        >
                          {synthesizingId === dos.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => openEditModal(dos)}
                          className="text-muted-foreground hover:text-amber-400 p-1.5 transition-colors"
                          title="Modifier cette info"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(dos.id)}
                          className="text-muted-foreground hover:text-red-400 p-1.5 transition-colors"
                          title="Supprimer cette info"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Modal (Admin Only) */}
      <Dialog open={!!editingDossier} onOpenChange={(open) => !open && setEditingDossier(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <span>✏️</span> Modifier l&apos;info (Admin)
            </DialogTitle>
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
    </div>
  );
}
