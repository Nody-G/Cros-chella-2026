"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Loader2, MapPin, Clock, Plus, Pencil, Trash2, X, Check, HandHeart, CheckCircle2, Sparkles, Camera, ZoomIn, ZoomOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  getProgramWithResponsible,
  createProgram,
  updateProgram,
  deleteProgram,
  volunteerForTask,
  markTaskDone,
  unassignTask,
  getProgramProposals,
  submitProposal,
  updateProposal,
  deleteProposal,
  uploadProposalImage,
  deleteProposalImage,
  voteProposal,
  approveProposal,
  rejectProposal,
} from "@/lib/supabase-queries";
import type { Program, ProgramDay, ProgramProposal } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { compressImage, readFileAsDataURL, getCroppedImage, CropArea } from "@/lib/image-utils";
import Cropper from "react-easy-crop";

const DAY_CONFIG: Record<ProgramDay, { label: string; emoji: string; date: string }> = {
  friday: { label: "Vendredi", emoji: "🎉", date: "31 juillet" },
  saturday: { label: "Samedi", emoji: "☀️", date: "1 août" },
  sunday: { label: "Dimanche", emoji: "🌊", date: "2 août" },
};

const EMOJI_OPTIONS = ["🏠", "🎉", "☕", "🏊", "🎮", "🔥", "☀️", "🍕", "🍺", "🎵", "💤", "🏖️", "🎯", "📸", "🧘", "🎪", "🎶", "🌅", "🧹", "🚗"];

const TASK_STATUS_CONFIG = {
  pending: { label: "À prendre", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", emoji: "🙋" },
  accepted: { label: "Pris en charge", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", emoji: "🤝" },
  done: { label: "Fait !", color: "bg-green-500/10 text-green-400 border-green-500/20", emoji: "✅" },
};

interface ProgramFormData {
  title: string;
  description: string;
  emoji: string;
  day: ProgramDay;
  start_time: string;
  end_time: string;
  location: string;
}

const EMPTY_FORM: ProgramFormData = {
  title: "",
  description: "",
  emoji: "📌",
  day: "friday",
  start_time: "",
  end_time: "",
  location: "",
};

export default function ProgrammePage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [proposals, setProposals] = useState<ProgramProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentParticipant } = useAuth();
  const isAdmin = currentParticipant?.is_admin || false;

  // Admin CRUD state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProgramFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Proposal state
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null);
  const [proposalForm, setProposalForm] = useState({
    title: "",
    description: "",
    emoji: "💡",
    day: "friday" as ProgramDay,
    start_time: "",
    end_time: "",
    location: "",
  });
  const [proposalImagePreview, setProposalImagePreview] = useState<string | null>(null);
  const [proposalImageFile, setProposalImageFile] = useState<File | null>(null);
  const [proposalExistingImageUrl, setProposalExistingImageUrl] = useState<string | null>(null);
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [deletingProposalId, setDeletingProposalId] = useState<string | null>(null);
  const proposalFileInputRef = useRef<HTMLInputElement>(null);

  // Proposal crop state
  const [proposalCropSrc, setProposalCropSrc] = useState<string | null>(null);
  const [proposalCrop, setProposalCrop] = useState({ x: 0, y: 0 });
  const [proposalZoom, setProposalZoom] = useState(1);
  const [proposalCroppedAreaPixels, setProposalCroppedAreaPixels] = useState<CropArea | null>(null);

  const onProposalCropComplete = useCallback((_croppedArea: CropArea, croppedAreaPixels: CropArea) => {
    setProposalCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const fetchData = async () => {
    const [progData, propData] = await Promise.all([
      getProgramWithResponsible(),
      getProgramProposals(),
    ]);
    setPrograms(progData);
    setProposals(propData);
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;

    async function fetchInitial() {
      const [progData, propData] = await Promise.all([
        getProgramWithResponsible(),
        getProgramProposals(),
      ]);
      if (mounted) {
        setPrograms(progData);
        setProposals(propData);
        setLoading(false);
      }
    }
    fetchInitial();

    // Realtime subscription for program + proposals
    const existingCh1 = supabase.getChannels().find(
      (ch) => ch.topic === "realtime:program-realtime"
    );
    if (existingCh1) supabase.removeChannel(existingCh1);
    const existingCh2 = supabase.getChannels().find(
      (ch) => ch.topic === "realtime:proposals-realtime"
    );
    if (existingCh2) supabase.removeChannel(existingCh2);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const programChannel = (supabase as any)
      .channel("program-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "program" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
        (_payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
          if (!mounted) return;
          // Re-fetch to get responsible names (JOIN data)
          fetchInitial();
        }
      )
      .subscribe();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proposalsChannel = (supabase as any)
      .channel("proposals-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "program_proposals" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
        (_payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
          if (!mounted) return;
          fetchInitial();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "program_proposal_votes" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
        (_payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
          if (!mounted) return;
          fetchInitial();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(programChannel);
      supabase.removeChannel(proposalsChannel);
    };
  }, []);

  // === ADMIN CRUD ===
  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const success = await createProgram({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      emoji: form.emoji,
      day: form.day,
      start_time: form.start_time || undefined,
      end_time: form.end_time || undefined,
      location: form.location || undefined,
    });
    if (success) {
      await fetchData();
      setShowForm(false);
      setForm(EMPTY_FORM);
    }
    setSaving(false);
  };

  const handleEdit = (prog: Program) => {
    setEditingId(prog.id);
    setForm({
      title: prog.title,
      description: prog.description || "",
      emoji: prog.emoji,
      day: prog.day,
      start_time: prog.start_time || "",
      end_time: prog.end_time || "",
      location: prog.location || "",
    });
    setShowForm(true);
  };

  const handleUpdate = async () => {
    if (!editingId || !form.title.trim()) return;
    setSaving(true);
    const success = await updateProgram(editingId, {
      title: form.title.trim(),
      description: form.description.trim() || null,
      emoji: form.emoji,
      day: form.day,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      location: form.location || null,
    });
    if (success) {
      await fetchData();
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const success = await deleteProgram(id);
    if (success) {
      await fetchData();
    }
    setDeletingId(null);
  };

  // === VOLUNTEER ===
  const handleVolunteer = async (programId: string) => {
    if (!currentParticipant) return;
    await volunteerForTask(programId, currentParticipant.id);
    await fetchData();
  };

  const handleMarkDone = async (programId: string) => {
    await markTaskDone(programId);
    await fetchData();
  };

  const handleUnassign = async (programId: string) => {
    await unassignTask(programId);
    await fetchData();
  };

  // === PROPOSALS ===
  const resetProposalForm = () => {
    setProposalForm({ title: "", description: "", emoji: "💡", day: "friday", start_time: "", end_time: "", location: "" });
    setProposalImagePreview(null);
    setProposalImageFile(null);
    setProposalExistingImageUrl(null);
    setEditingProposalId(null);
    setProposalCropSrc(null);
    setProposalZoom(1);
  };

  const handleProposalFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataURL(file);
      setProposalCropSrc(dataUrl);
    } catch (err) {
      console.error("Error reading file:", err);
    }
    e.target.value = "";
  };

  const handleProposalCropConfirm = async () => {
    if (!proposalCropSrc || !proposalCroppedAreaPixels) return;
    try {
      const croppedBlob = await getCroppedImage(proposalCropSrc, proposalCroppedAreaPixels);
      const croppedFile = new File([croppedBlob], "proposal.jpg", { type: "image/jpeg" });
      const compressed = await compressImage(croppedFile, "gallery");
      const preview = await readFileAsDataURL(compressed);
      setProposalImagePreview(preview);
      setProposalImageFile(compressed);
      setProposalCropSrc(null);
    } catch (err) {
      console.error("Error cropping:", err);
    }
  };

  const handleRemoveProposalImage = () => {
    setProposalImagePreview(null);
    setProposalImageFile(null);
    setProposalExistingImageUrl(null);
  };

  const handleEditProposal = (prop: ProgramProposal) => {
    setEditingProposalId(prop.id);
    setProposalForm({
      title: prop.title,
      description: prop.description || "",
      emoji: prop.emoji,
      day: prop.day,
      start_time: prop.start_time || "",
      end_time: prop.end_time || "",
      location: prop.location || "",
    });
    if (prop.image_url) {
      setProposalExistingImageUrl(prop.image_url);
      setProposalImagePreview(prop.image_url);
    }
    setShowProposalForm(true);
  };

  const handleSubmitProposal = async () => {
    if (!currentParticipant || !proposalForm.title.trim()) return;
    setSubmittingProposal(true);

    if (editingProposalId) {
      // Update existing
      const success = await updateProposal(editingProposalId, {
        title: proposalForm.title.trim(),
        description: proposalForm.description.trim() || undefined,
        emoji: proposalForm.emoji,
        day: proposalForm.day,
        start_time: proposalForm.start_time || undefined,
        end_time: proposalForm.end_time || undefined,
        location: proposalForm.location || undefined,
      });
      if (success) {
        // Handle image changes
        if (proposalImageFile) {
          // Upload new image
          const url = await uploadProposalImage(editingProposalId, proposalImageFile);
          if (url) await updateProposal(editingProposalId, { image_url: url });
        } else if (!proposalExistingImageUrl && !proposalImagePreview) {
          // Image was removed
          await deleteProposalImage(editingProposalId);
          await updateProposal(editingProposalId, { image_url: null });
        }
        await fetchData();
        setShowProposalForm(false);
        resetProposalForm();
      }
    } else {
      // Create new
      const success = await submitProposal({
        proposer_id: currentParticipant.id,
        title: proposalForm.title.trim(),
        description: proposalForm.description.trim() || undefined,
        emoji: proposalForm.emoji,
        day: proposalForm.day,
        start_time: proposalForm.start_time || undefined,
        end_time: proposalForm.end_time || undefined,
        location: proposalForm.location || undefined,
      });
      if (success) {
        // Upload image if provided — need to get the new proposal ID
        if (proposalImageFile) {
          const { data: latest } = await supabase
            .from("program_proposals")
            .select("id")
            .eq("proposer_id", currentParticipant.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
          if (latest) {
            const url = await uploadProposalImage(latest.id, proposalImageFile);
            if (url) await updateProposal(latest.id, { image_url: url });
          }
        }
        await fetchData();
        setShowProposalForm(false);
        resetProposalForm();
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

  const handleApproveProposal = async (proposal: ProgramProposal) => {
    // Create program entry from proposal
    await createProgram({
      title: proposal.title,
      description: proposal.description || undefined,
      emoji: proposal.emoji,
      day: proposal.day,
      start_time: proposal.start_time || undefined,
      end_time: proposal.end_time || undefined,
      location: proposal.location || undefined,
    });
    await approveProposal(proposal.id);
    await fetchData();
  };

  const grouped = (["friday", "saturday", "sunday"] as ProgramDay[]).map((day) => ({
    ...DAY_CONFIG[day],
    day,
    events: programs.filter((p) => p.day === day),
  }));

  const pendingProposals = proposals.filter((p) => p.status === "pending");

  return (
    <main className="pb-20 min-h-screen">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <CalendarDays className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Programme 📅</h1>
          </div>
          {isAdmin && (
            <Button
              size="sm"
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY_FORM);
                setShowForm(!showForm);
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Ajouter
            </Button>
          )}
        </div>
        <p className="text-muted-foreground text-sm mb-6">
          Vendredi soir → Dimanche : le planning du carnage
        </p>

        {/* Admin form */}
        {isAdmin && showForm && (
          <Card className="mb-6 card-glow-gold overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm">
                  {editingId ? "Modifier l&apos;activité" : "Nouvelle activité"}
                </h3>
                <button
                  onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase mb-1 block">Jour</label>
                  <select
                    value={form.day}
                    onChange={(e) => setForm({ ...form, day: e.target.value as ProgramDay })}
                    className="w-full h-9 rounded-md bg-card border border-border text-sm px-2"
                  >
                    <option value="friday">Vendredi</option>
                    <option value="saturday">Samedi</option>
                    <option value="sunday">Dimanche</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase mb-1 block">Emoji</label>
                  <div className="flex flex-wrap gap-1">
                    {EMOJI_OPTIONS.slice(0, 10).map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => setForm({ ...form, emoji: e })}
                        className={`w-7 h-7 rounded flex items-center justify-center text-sm ${
                          form.emoji === e ? "bg-primary/20 border border-primary" : "bg-card border border-border"
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Input
                placeholder="Titre de l&apos;activité"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="bg-card border-border"
              />

              <Textarea
                placeholder="Description (optionnel)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="bg-card border-border min-h-[60px]"
              />

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase mb-1 block">Début</label>
                  <Input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    className="bg-card border-border text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase mb-1 block">Fin</label>
                  <Input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    className="bg-card border-border text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase mb-1 block">Lieu</label>
                  <Input
                    placeholder="Lieu"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="bg-card border-border text-sm"
                  />
                </div>
              </div>

              <Button
                onClick={editingId ? handleUpdate : handleCreate}
                disabled={saving || !form.title.trim()}
                className="w-full"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                {editingId ? "Mettre à jour" : "Ajouter au programme"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : programs.length === 0 && !isAdmin ? (
          <div className="p-8 rounded-2xl bg-card border border-border text-center">
            <span className="text-4xl block mb-3">📋</span>
            <p className="text-muted-foreground text-sm">
              Le programme arrive. Patience !
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map((dayGroup) => (
              <div key={dayGroup.day}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{dayGroup.emoji}</span>
                  <h2 className="text-lg font-bold">{dayGroup.label}</h2>
                  <span className="text-xs text-muted-foreground">{dayGroup.date}</span>
                </div>

                <div className="relative pl-6 border-l-2 border-primary/20 space-y-3">
                  {dayGroup.events.map((event) => {
                    const taskStatus = TASK_STATUS_CONFIG[event.task_status || "pending"];
                    const isMyTask = event.responsible_id === currentParticipant?.id;
                    return (
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
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => handleEdit(event)}
                                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDelete(event.id)}
                                        disabled={deletingId === event.id}
                                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                      >
                                        {deletingId === event.id ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <Trash2 className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {event.description && (
                                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    {event.description}
                                  </p>
                                )}

                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                  {event.start_time && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                      <Clock className="w-3 h-3" />
                                      {event.start_time}{event.end_time ? ` — ${event.end_time}` : ""}
                                    </span>
                                  )}
                                  {event.location && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                      <MapPin className="w-3 h-3" />
                                      {event.location}
                                    </span>
                                  )}
                                </div>

                                {/* Task assignment section */}
                                <div className="mt-3 pt-3 border-t border-border">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${taskStatus.color}`}>
                                        {taskStatus.emoji} {taskStatus.label}
                                      </Badge>
                                      {event.responsible && (
                                        <span className="text-[10px] text-muted-foreground">
                                          → {event.responsible.pseudo || event.responsible.name}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {event.task_status === "pending" && !isAdmin && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 text-[10px] px-2"
                                          onClick={() => handleVolunteer(event.id)}
                                        >
                                          <HandHeart className="w-3 h-3 mr-1" />
                                          Je m&apos;en charge !
                                        </Button>
                                      )}
                                      {isMyTask && event.task_status === "accepted" && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 text-[10px] px-2"
                                          onClick={() => handleMarkDone(event.id)}
                                        >
                                          <CheckCircle2 className="w-3 h-3 mr-1" />
                                          C&apos;est fait !
                                        </Button>
                                      )}
                                      {(isAdmin || isMyTask) && event.task_status !== "pending" && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 text-[10px] px-2 text-muted-foreground"
                                          onClick={() => handleUnassign(event.id)}
                                        >
                                          Libérer
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                  {event.volunteer_note && (
                                    <p className="text-[10px] text-muted-foreground mt-1 italic">
                                      &quot;{event.volunteer_note}&quot;
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}

                  {dayGroup.events.length === 0 && (
                    <p className="text-xs text-muted-foreground italic pl-2 py-4">
                      Rien de prévu pour l&apos;instant...
                    </p>
                  )}
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
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowProposalForm(!showProposalForm)}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Proposer
            </Button>
          </div>

          {/* Proposal form */}
          {showProposalForm && (
            <Card className="mb-4 card-glow-violet overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm">{editingProposalId ? "Modifier la proposition" : "Nouvelle proposition"}</h3>
                  <button
                    onClick={() => { setShowProposalForm(false); resetProposalForm(); }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase mb-1 block">Jour</label>
                    <select
                      value={proposalForm.day}
                      onChange={(e) => setProposalForm({ ...proposalForm, day: e.target.value as ProgramDay })}
                      className="w-full h-9 rounded-md bg-card border border-border text-sm px-2"
                    >
                      <option value="friday">Vendredi</option>
                      <option value="saturday">Samedi</option>
                      <option value="sunday">Dimanche</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase mb-1 block">Début</label>
                    <Input
                      type="time"
                      value={proposalForm.start_time}
                      onChange={(e) => setProposalForm({ ...proposalForm, start_time: e.target.value })}
                      className="bg-card border-border text-sm"
                    />
                  </div>
                </div>

                <Input
                  placeholder="Qu&apos;est-ce qu&apos;on fait ?"
                  value={proposalForm.title}
                  onChange={(e) => setProposalForm({ ...proposalForm, title: e.target.value })}
                  className="bg-card border-border"
                />

                <Textarea
                  placeholder="Détails (optionnel)"
                  value={proposalForm.description}
                  onChange={(e) => setProposalForm({ ...proposalForm, description: e.target.value })}
                  className="bg-card border-border min-h-[50px]"
                />

                {/* Photo picker */}
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase mb-1.5 block">Photo (optionnel)</label>
                  <input
                    ref={proposalFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProposalFileSelect}
                  />
                  {proposalImagePreview ? (
                    <div className="relative">
                      <img
                        src={proposalImagePreview}
                        alt="Preview"
                        className="w-full h-40 object-cover rounded-lg border border-border"
                      />
                      <button
                        onClick={handleRemoveProposalImage}
                        className="absolute top-2 right-2 bg-black/70 rounded-full p-1.5 hover:bg-black/90"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => proposalFileInputRef.current?.click()}
                      className="w-full h-24 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Camera className="w-5 h-5" />
                      <span className="text-[10px]">Ajouter une photo</span>
                    </button>
                  )}
                </div>

                <Button
                  onClick={handleSubmitProposal}
                  disabled={submittingProposal || !proposalForm.title.trim()}
                  className="w-full"
                  variant="secondary"
                >
                  {submittingProposal ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  {editingProposalId ? "Modifier" : "Soumettre la proposition"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Crop modal for proposals */}
          {proposalCropSrc && (
            <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
              <div className="p-4 flex items-center justify-between">
                <h3 className="text-white font-bold text-sm">Ajuster la photo</h3>
                <button onClick={() => setProposalCropSrc(null)} className="text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 relative">
                <Cropper
                  image={proposalCropSrc}
                  crop={proposalCrop}
                  zoom={proposalZoom}
                  aspect={16 / 9}
                  onCropChange={setProposalCrop}
                  onZoomChange={setProposalZoom}
                  onCropComplete={onProposalCropComplete}
                />
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <ZoomOut className="w-4 h-4 text-white" />
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.1}
                    value={proposalZoom}
                    onChange={(e) => setProposalZoom(Number(e.target.value))}
                    className="flex-1"
                  />
                  <ZoomIn className="w-4 h-4 text-white" />
                </div>
                <Button onClick={handleProposalCropConfirm} className="w-full">
                  <Check className="w-4 h-4 mr-2" />
                  Valider
                </Button>
              </div>
            </div>
          )}

          {/* Proposals list */}
          {pendingProposals.length === 0 ? (
            <div className="p-6 rounded-xl bg-card border border-border text-center">
              <p className="text-muted-foreground text-xs">
                Aucune proposition en attente. Sois le premier à proposer quelque chose ! 💡
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingProposals.map((prop) => {
                const isMyProposal = currentParticipant?.id === prop.proposer_id;
                return (
                  <Card key={prop.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      {prop.image_url && (
                        <div className="mb-3 -mx-4 -mt-4">
                          <img
                            src={prop.image_url}
                            alt={prop.title}
                            className="w-full h-40 object-cover"
                          />
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
                          {prop.description && (
                            <p className="text-xs text-muted-foreground mt-1">{prop.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {prop.start_time && (
                              <span className="text-[10px] text-muted-foreground">⏰ {prop.start_time}</span>
                            )}
                            {prop.location && (
                              <span className="text-[10px] text-muted-foreground">📍 {prop.location}</span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Proposé par {prop.proposer?.pseudo || prop.proposer?.name || "Quelqu'un"}
                          </p>

                          <div className="flex items-center gap-2 mt-3 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] px-2"
                              onClick={() => handleVoteProposal(prop.id)}
                            >
                              👍 {prop.vote_count} vote{prop.vote_count > 1 ? "s" : ""}
                            </Button>
                            {isMyProposal && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[10px] px-2"
                                  onClick={() => handleEditProposal(prop)}
                                >
                                  <Pencil className="w-3 h-3 mr-1" />
                                  Modifier
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-7 text-[10px] px-2"
                                  disabled={deletingProposalId === prop.id}
                                  onClick={() => handleDeleteProposal(prop.id)}
                                >
                                  {deletingProposalId === prop.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3 h-3 mr-1" />
                                  )}
                                  Supprimer
                                </Button>
                              </>
                            )}
                            {isAdmin && (
                              <>
                                <Button
                                  size="sm"
                                  className="h-7 text-[10px] px-2"
                                  onClick={() => handleApproveProposal(prop)}
                                >
                                  <Check className="w-3 h-3 mr-1" />
                                  Approuver
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-7 text-[10px] px-2"
                                  onClick={() => { rejectProposal(prop.id); fetchData(); }}
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Rejeter
                                </Button>
                              </>
                            )}
                          </div>
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
      <MobileNav />
    </main>
  );
}
