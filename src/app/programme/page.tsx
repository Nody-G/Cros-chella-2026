"use client";

import { useEffect, useState, useRef } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Loader2, Clock, Plus, Trash2, X, Sparkles, Camera, Heart, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  getProgramWithResponsible,
  createProgram,
  deleteProgram,
  getProgramProposals,
  updateProposal,
  deleteProposal,
  uploadProposalImage,
  deleteProposalImage,
  voteProposal,
  getProposalVoters,
} from "@/lib/supabase-queries";
import type { Program, ProgramDay, ProgramProposal } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { compressImage, readFileAsDataURL } from "@/lib/image-utils";
import { ProposalComments } from "@/components/programme/proposal-comments";
import { ProgramComments } from "@/components/programme/program-comments";

const DAY_CONFIG: Record<ProgramDay, { label: string; emoji: string; date: string }> = {
  thursday: { label: "Jeudi", emoji: "🌙", date: "30 juillet" },
  friday: { label: "Vendredi", emoji: "🎉", date: "31 juillet" },
  saturday: { label: "Samedi", emoji: "☀️", date: "1 août" },
  sunday: { label: "Dimanche", emoji: "🌊", date: "2 août" },
};

export default function ProgrammePage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [proposals, setProposals] = useState<ProgramProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentParticipant } = useAuth();
  const isAdmin = currentParticipant?.is_admin || false;

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<string[]>([]);
  const [expandedProgramComments, setExpandedProgramComments] = useState<string[]>([]);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null);
  const [proposalForm, setProposalForm] = useState({
    title: "", description: "", emoji: "💡", day: "friday" as ProgramDay,
    start_time: "", end_time: "", location: "",
  });
  const [proposalImagePreview, setProposalImagePreview] = useState<string | null>(null);
  const [proposalImageFile, setProposalImageFile] = useState<File | null>(null);
  const [proposalExistingImageUrl, setProposalExistingImageUrl] = useState<string | null>(null);
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [proposalSuccess, setProposalSuccess] = useState<string | null>(null);
  const [deletingProposalId, setDeletingProposalId] = useState<string | null>(null);
  const proposalFileInputRef = useRef<HTMLInputElement>(null);
  const programListRef = useRef<HTMLDivElement>(null);

  const [votersProposalId, setVotersProposalId] = useState<string | null>(null);
  const [votersList, setVotersList] = useState<{ id: string; pseudo: string | null; name: string; emoji_avatar: string | null }[]>([]);
  const [loadingVoters, setLoadingVoters] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const fetchData = async () => {
    const [progData, propData] = await Promise.all([getProgramWithResponsible(), getProgramProposals()]);
    setPrograms(progData);
    setProposals(propData);
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    async function fetchInitial() {
      const [progData, propData] = await Promise.all([getProgramWithResponsible(), getProgramProposals()]);
      if (mounted) { setPrograms(progData); setProposals(propData); setLoading(false); }
    }
    fetchInitial();

    const existingCh1 = supabase.getChannels().find((ch) => ch.topic === "realtime:program-realtime");
    if (existingCh1) supabase.removeChannel(existingCh1);
    const existingCh2 = supabase.getChannels().find((ch) => ch.topic === "realtime:proposals-realtime");
    if (existingCh2) supabase.removeChannel(existingCh2);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const programChannel = (supabase as any).channel("program-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "program" }, () => { if (mounted) fetchInitial(); })
      .subscribe();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proposalsChannel = (supabase as any).channel("proposals-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "program_proposals" }, () => { if (mounted) fetchInitial(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "program_proposal_votes" }, () => { if (mounted) fetchInitial(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "proposal_comments" }, () => { if (mounted) fetchInitial(); })
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(programChannel); supabase.removeChannel(proposalsChannel); };
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const success = await deleteProgram(id);
    if (success) await fetchData();
    setDeletingId(null);
  };

  const resetProposalForm = () => {
    setProposalForm({ title: "", description: "", emoji: "💡", day: "friday", start_time: "", end_time: "", location: "" });
    setProposalImagePreview(null);
    setProposalImageFile(null);
    setProposalExistingImageUrl(null);
    setEditingProposalId(null);
  };

  const handleProposalFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file, "proposal");
    const dataUrl = await readFileAsDataURL(compressed);
    setProposalImagePreview(dataUrl);
    setProposalImageFile(compressed);
  };

  const handleRemoveProposalImage = () => {
    setProposalImagePreview(null);
    setProposalImageFile(null);
    setProposalExistingImageUrl(null);
    if (proposalFileInputRef.current) proposalFileInputRef.current.value = "";
  };

  const handleEditProposal = (prop: ProgramProposal) => {
    setEditingProposalId(prop.id);
    setProposalForm({
      title: prop.title, description: prop.description || "", emoji: prop.emoji,
      day: prop.day, start_time: prop.start_time || "", end_time: prop.end_time || "", location: prop.location || "",
    });
    if (prop.image_url) { setProposalExistingImageUrl(prop.image_url); setProposalImagePreview(prop.image_url); }
    setShowProposalForm(true);
  };

  const handleSubmitProposal = async () => {
    if (!proposalForm.title.trim()) return;
    setSubmittingProposal(true);

    if (editingProposalId) {
      await updateProposal(editingProposalId, {
        title: proposalForm.title.trim(),
        description: proposalForm.description.trim() || undefined,
        emoji: proposalForm.emoji, day: proposalForm.day,
        start_time: proposalForm.start_time || undefined,
        end_time: proposalForm.end_time || undefined,
        location: proposalForm.location || undefined,
      });
      if (proposalImageFile && proposalImagePreview !== proposalExistingImageUrl) {
        const imageUrl = await uploadProposalImage(editingProposalId, proposalImageFile);
        if (imageUrl) await updateProposal(editingProposalId, { image_url: imageUrl });
      } else if (!proposalImagePreview && proposalExistingImageUrl) {
        await deleteProposalImage(editingProposalId);
        await updateProposal(editingProposalId, { image_url: null });
      }
      await fetchData();
      setShowProposalForm(false);
      setProposalSuccess(proposalForm.title.trim());
      resetProposalForm();
      setTimeout(() => programListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      setTimeout(() => setProposalSuccess(null), 4000);
    } else {
      const programSuccess = await createProgram({
        title: proposalForm.title.trim(),
        description: proposalForm.description.trim() || undefined,
        emoji: proposalForm.emoji, day: proposalForm.day,
        start_time: proposalForm.start_time || undefined,
        end_time: proposalForm.end_time || undefined,
        location: proposalForm.location || undefined,
      });
      if (programSuccess) {
        await fetchData();
        setShowProposalForm(false);
        setProposalSuccess(proposalForm.title.trim());
        resetProposalForm();
        setTimeout(() => programListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
        setTimeout(() => setProposalSuccess(null), 4000);
      }
    }
    setSubmittingProposal(false);
  };

  const handleDeleteProposal = async (proposalId: string) => {
    setDeletingProposalId(proposalId);
    await deleteProposalImage(proposalId);
    await deleteProposal(proposalId);
    await fetchData();
    setDeletingProposalId(null);
  };

  const handleVoteProposal = async (proposalId: string) => {
    if (!currentParticipant) return;
    await voteProposal(proposalId, currentParticipant.id);
    await fetchData();
  };

  const handleShowVoters = async (proposalId: string) => {
    if (votersProposalId === proposalId) { setVotersProposalId(null); return; }
    setVotersProposalId(proposalId);
    setLoadingVoters(true);
    const voters = await getProposalVoters(proposalId);
    setVotersList(voters);
    setLoadingVoters(false);
  };

  const toggleComments = (proposalId: string) => {
    setExpandedComments((prev) => prev.includes(proposalId) ? prev.filter((id) => id !== proposalId) : [...prev, proposalId]);
  };

  const toggleProgramComments = (programId: string) => {
    setExpandedProgramComments((prev) => prev.includes(programId) ? prev.filter((id) => id !== programId) : [...prev, programId]);
  };

  const grouped = (["thursday", "friday", "saturday", "sunday"] as ProgramDay[]).map((day) => ({
    ...DAY_CONFIG[day], day, events: programs.filter((p) => p.day === day),
  }));

  const pendingProposals = proposals.filter((p) => p.status === "pending");

  return (
    <main className="pb-20 min-h-screen">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-2">
          <CalendarDays className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Programme 📅</h1>
        </div>
        <p className="text-muted-foreground text-sm mb-4">Vendredi soir → Dimanche : le planning du carnage</p>

        {/* PROPOSER BUTTON — TOP */}
        <div className="mb-6">
          <Button
            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-purple-500/20"
            onClick={() => {
              setShowProposalForm(!showProposalForm);
              if (showProposalForm) resetProposalForm();
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            {showProposalForm ? "Fermer" : "💡 Proposer une activité"}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : programs.length === 0 && !isAdmin ? (
          <div className="p-8 rounded-2xl bg-card border border-border text-center">
            <span className="text-4xl block mb-3">📋</span>
            <p className="text-muted-foreground text-sm">Le programme arrive. Patience !</p>
          </div>
        ) : (
          <div ref={programListRef} className="space-y-8">
            {grouped.map((dayGroup) => (
              <div key={dayGroup.day}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{dayGroup.emoji}</span>
                  <h2 className="text-lg font-bold">{dayGroup.label}</h2>
                  <span className="text-xs text-muted-foreground">{dayGroup.date}</span>
                </div>
                <div className="relative pl-6 border-l-2 border-primary/20 space-y-3">
                  {dayGroup.events.map((event) => (
                    <div key={event.id} className="relative">
                      <div className="absolute -left-[31px] top-4 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                      <Card className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <span className="text-xl">{event.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <h3 className="font-bold text-sm">{event.title}</h3>
                                {isAdmin && (
                                  <button onClick={() => handleDelete(event.id)} disabled={deletingId === event.id}
                                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                                    {deletingId === event.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                  </button>
                                )}
                              </div>
                              {event.description && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{event.description}</p>}
                              <div className="flex items-center gap-3 mt-2 flex-wrap">
                                {event.start_time && (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <Clock className="w-3 h-3" />{event.start_time}{event.end_time ? ` — ${event.end_time}` : ""}
                                  </span>
                                )}
                                {event.location && <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">📍 {event.location}</span>}
                                <button
                                  onClick={() => toggleProgramComments(event.id)}
                                  className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                                >
                                  <MessageCircle className="w-3 h-3" />Commenter
                                </button>
                              </div>
                            </div>
                          </div>
                          {expandedProgramComments.includes(event.id) && (
                            <ProgramComments programId={event.id} currentParticipant={currentParticipant} isAdmin={isAdmin} />
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                  {dayGroup.events.length === 0 && <p className="text-xs text-muted-foreground italic pl-2 py-4">Rien de prévu pour l&apos;instant...</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PROPOSALS SECTION */}
        <div className="mt-10 pt-8 border-t border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold">💡 Propositions</h2>
              <p className="text-xs text-muted-foreground">Propose des activités pour le programme</p>
            </div>
          </div>

          {showProposalForm && (
            <Card className="mb-4 card-glow-violet overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm">{editingProposalId ? "Modifier la proposition" : "Nouvelle proposition"}</h3>
                  <button onClick={() => { setShowProposalForm(false); resetProposalForm(); }} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase mb-1 block">Jour</label>
                    <select value={proposalForm.day} onChange={(e) => setProposalForm({ ...proposalForm, day: e.target.value as ProgramDay })} className="w-full h-9 rounded-md bg-card border border-border text-sm px-2">
                      <option value="thursday">🌙 Jeudi</option>
                      <option value="friday">🎉 Vendredi</option>
                      <option value="saturday">☀️ Samedi</option>
                      <option value="sunday">🌊 Dimanche</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase mb-1 block">Emoji</label>
                    <Input value={proposalForm.emoji} onChange={(e) => setProposalForm({ ...proposalForm, emoji: e.target.value })} className="bg-card border-border h-9 text-center text-lg" maxLength={2} />
                  </div>
                </div>
                <Input placeholder="Titre de l'activité *" value={proposalForm.title} onChange={(e) => setProposalForm({ ...proposalForm, title: e.target.value })} className="bg-card border-border" />
                <Textarea placeholder="Détails (optionnel)" value={proposalForm.description} onChange={(e) => setProposalForm({ ...proposalForm, description: e.target.value })} className="bg-card border-border min-h-[50px]" />

                <div>
                  <label className="text-[10px] text-muted-foreground uppercase mb-1.5 block">Photo (optionnel)</label>
                  <input ref={proposalFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleProposalFileSelect} />
                  {proposalImagePreview ? (
                    <div className="relative">
                      <img src={proposalImagePreview} alt="Preview" className="w-full max-h-64 object-contain rounded-lg border border-border" />
                      <button onClick={handleRemoveProposalImage} className="absolute top-2 right-2 bg-black/70 rounded-full p-1.5 hover:bg-black/90">
                        <Trash2 className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => proposalFileInputRef.current?.click()} className="w-full h-24 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors">
                      <Camera className="w-5 h-5" /><span className="text-[10px]">Ajouter une photo</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-[10px] text-muted-foreground uppercase mb-1 block">Début</label><Input type="time" value={proposalForm.start_time} onChange={(e) => setProposalForm({ ...proposalForm, start_time: e.target.value })} className="bg-card border-border h-9" /></div>
                  <div><label className="text-[10px] text-muted-foreground uppercase mb-1 block">Fin</label><Input type="time" value={proposalForm.end_time} onChange={(e) => setProposalForm({ ...proposalForm, end_time: e.target.value })} className="bg-card border-border h-9" /></div>
                </div>
                <div><label className="text-[10px] text-muted-foreground uppercase mb-1 block">Lieu</label><Input placeholder="Où ça se passe ?" value={proposalForm.location} onChange={(e) => setProposalForm({ ...proposalForm, location: e.target.value })} className="bg-card border-border h-9" /></div>

                <Button onClick={handleSubmitProposal} disabled={submittingProposal || !proposalForm.title.trim()} className="w-full" variant="secondary">
                  {submittingProposal ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  {editingProposalId ? "Modifier" : "Soumettre la proposition"}
                </Button>
              </CardContent>
            </Card>
          )}

          {proposalSuccess && (
            <div className="mb-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-center animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-green-400 text-sm font-medium">✅ &quot;{proposalSuccess}&quot; ajouté au programme !</p>
            </div>
          )}

          {pendingProposals.length === 0 ? (
            <div className="p-6 rounded-xl bg-card border border-border text-center">
              <p className="text-muted-foreground text-xs">Aucune proposition en attente. Sois le premier à proposer quelque chose ! 💡</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingProposals.map((prop) => {
                const isMyProposal = currentParticipant?.id === prop.proposer_id;
                const hasVoted = prop.voter_ids?.includes(currentParticipant?.id || "");
                return (
                  <Card key={prop.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      {prop.image_url && (
                        <div className="mb-3 -mx-4 -mt-4 cursor-pointer" onClick={() => setFullscreenImage(prop.image_url!)}>
                          <img src={prop.image_url} alt={prop.title} className="w-full max-h-64 object-contain" />
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        <span className="text-xl">{prop.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm">{prop.title}</h3>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-accent/10 text-accent border-accent/20">
                              {DAY_CONFIG[prop.day]?.emoji} {DAY_CONFIG[prop.day]?.label}
                            </Badge>
                          </div>
                          {prop.description && <p className="text-xs text-muted-foreground mt-1">{prop.description}</p>}
                          <div className="flex items-center gap-2 mt-1">
                            {prop.start_time && <span className="text-[10px] text-muted-foreground">⏰ {prop.start_time}</span>}
                            {prop.location && <span className="text-[10px] text-muted-foreground">📍 {prop.location}</span>}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">Proposé par {prop.proposer?.pseudo || prop.proposer?.name || "Quelqu'un"}</p>

                          <div className="flex items-center gap-2 mt-3 flex-wrap">
                            <Button size="sm" variant={hasVoted ? "secondary" : "outline"}
                              className={`h-7 text-[10px] px-2 ${hasVoted ? "bg-pink-500/10 text-pink-400 border-pink-500/20" : ""}`}
                              onClick={() => handleVoteProposal(prop.id)}>
                              <Heart className={`w-3 h-3 mr-1 ${hasVoted ? "fill-pink-400" : ""}`} />
                              {prop.vote_count} like{prop.vote_count > 1 ? "s" : ""}
                            </Button>

                            {prop.vote_count > 0 && (
                              <button onClick={() => handleShowVoters(prop.id)} className="text-[10px] text-muted-foreground hover:text-primary transition-colors">
                                Voir qui
                              </button>
                            )}

                            {isMyProposal && (
                              <>
                                <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2 text-muted-foreground" onClick={() => handleEditProposal(prop)}>
                                  ✏️ Modifier
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteProposal(prop.id)} disabled={deletingProposalId === prop.id}>
                                  {deletingProposalId === prop.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <>🗑️ Supprimer</>}
                                </Button>
                              </>
                            )}

                            <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2 text-muted-foreground" onClick={() => toggleComments(prop.id)}>
                              <MessageCircle className="w-3 h-3 mr-1" />Commenter
                            </Button>
                          </div>

                          {votersProposalId === prop.id && (
                            <div className="mt-2 p-2 rounded-lg bg-muted/50 border border-border">
                              {loadingVoters ? <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" /> :
                                votersList.length === 0 ? <p className="text-[10px] text-muted-foreground italic">Personne encore</p> :
                                  <div className="flex flex-wrap gap-1.5">
                                    {votersList.map((v) => (
                                      <span key={v.id} className="inline-flex items-center gap-1 text-[10px] bg-background rounded-full px-2 py-0.5 border border-border">
                                        {v.emoji_avatar || "👤"} {v.pseudo || v.name}
                                      </span>
                                    ))}
                                  </div>
                              }
                            </div>
                          )}

                          {expandedComments.includes(prop.id) && (
                            <ProposalComments proposalId={prop.id} currentParticipant={currentParticipant} isAdmin={isAdmin} />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {fullscreenImage && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={() => setFullscreenImage(null)}>
          <button onClick={() => setFullscreenImage(null)} className="absolute top-4 right-4 text-white/80 hover:text-white z-10"><X className="w-6 h-6" /></button>
          <img src={fullscreenImage} alt="Photo plein écran" className="max-w-full max-h-full object-contain" />
        </div>
      )}

      <MobileNav />
    </main>
  );
}
