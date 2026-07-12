"use client";

import { useEffect, useState } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Crown, Bed, Loader2, X, Wine, Zap, Target, Skull, Quote, Music, Sparkles, Cigarette, ChevronDown, UserPlus, Trash2 } from "lucide-react";
import { getParticipants, updateAdminCode, updateParticipant, addParticipant, deleteParticipant, getAllBadges } from "@/lib/supabase-queries";
import { supabase } from "@/lib/supabase";
import type { Participant, CustomBadge } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { KeyRound } from "lucide-react";
import { ALCOHOL_MAP, ALCOHOL_LIST, ALCOHOL_GROUPS } from "@/lib/alcohol-data";
import { getSmokingLabel, getSmokingEmoji } from "@/lib/smoking-data";

const BED_OPTIONS = [
  "Chambre 1 — Lit king size",
  "Chambre 2 — Lit 2 places A",
  "Chambre 2 — Lit 2 places B",
  "Chambre 2 — Lit superposé haut",
  "Chambre 2 — Lit superposé bas",
  "Chambre 3 — Lit 2 places",
  "Chambre 4 — Lit 2 places",
  "Chambre 4 — Lit 1 place",
  "Chambre 5 — Le lit de la mama",
  "Salon — Canapé-lit",
  "Matelas supplémentaire",
];

const STATUS_CONFIG = {
  confirmed: { label: "Confirmé ✅", color: "bg-green-500/10 text-green-400 border-green-500/20" },
  pending: { label: "Pas sûr 🤔", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  declined: { label: "Pas dispo ❌", color: "bg-red-500/10 text-red-400 border-red-500/20" },
};

const EMOJIS = ["😎", "🤪", "🗿", "🦊", "🌶️", "🎸", "💀", "🤡", "🦄", "🐸", "👑", "🍕"];

function getEmoji(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return EMOJIS[Math.abs(hash) % EMOJIS.length];
}

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentParticipant } = useAuth();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [badgesMap, setBadgesMap] = useState<Record<string, CustomBadge[]>>({});

  // Fetch badges for all participants
  useEffect(() => {
    getAllBadges().then((badges) => {
      const map: Record<string, CustomBadge[]> = {};
      badges.forEach((b) => {
        if (!map[b.participant_id]) map[b.participant_id] = [];
        map[b.participant_id].push(b);
      });
      setBadgesMap(map);
    });
  }, []);

  // Compute alcohol/smoking compatibility with current user
  const getCompatibility = (p: Participant) => {
    if (!currentParticipant) return null;
    if (p.id === currentParticipant.id) return null;
    const myAlcos = currentParticipant.alcohol_preferences || [];
    const theirAlcos = p.alcohol_preferences || [];
    const mySmokes = currentParticipant.smoking_preferences || [];
    const theirSmokes = p.smoking_preferences || [];
    if (myAlcos.length === 0 && theirAlcos.length === 0 && mySmokes.length === 0 && theirSmokes.length === 0) return null;
    const sharedAlcos = myAlcos.filter((a) => theirAlcos.includes(a));
    const sharedSmokes = mySmokes.filter((s) => theirSmokes.includes(s));
    const sameFav = currentParticipant.favorite_alcohol && p.favorite_alcohol && currentParticipant.favorite_alcohol === p.favorite_alcohol;
    return { sharedAlcos, sharedSmokes, sameFav, hasAlcos: myAlcos.length > 0 && theirAlcos.length > 0, hasSmokes: mySmokes.length > 0 && theirSmokes.length > 0 };
  };

  useEffect(() => {
    let mounted = true;
    
    async function fetchData() {
      const data = await getParticipants();
      if (mounted) {
        setParticipants(data);
        setLoading(false);
      }
    }
    fetchData();

    // Realtime subscription for live status/hype updates
    const existingChannel = supabase.getChannels().find(
      (ch) => ch.topic === "realtime:participants-realtime"
    );
    if (existingChannel) {
      supabase.removeChannel(existingChannel);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (supabase as any)
      .channel("participants-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participants" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: { eventType: string; new: Record<string, unknown> }) => {
          if (!mounted) return;
          if (payload.eventType === "UPDATE" && payload.new) {
            const updated = payload.new as unknown as Participant;
            // If soft-deleted, remove from list
            if (updated.deleted_at) {
              setParticipants((prev) => prev.filter((p) => p.id !== updated.id));
              setSelectedParticipant((prev) =>
                prev && prev.id === updated.id ? null : prev
              );
            } else {
              setParticipants((prev) =>
                prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
              );
              setSelectedParticipant((prev) =>
                prev && prev.id === updated.id ? { ...prev, ...updated } : prev
              );
            }
          } else if (payload.eventType === "INSERT" && payload.new) {
            setParticipants((prev) => [...prev, payload.new as unknown as Participant]);
          }
        }
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Realtime participants connecté");
        }
      });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<{id: string, code: string} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assigningBed, setAssigningBed] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPseudo, setAddPseudo] = useState("");
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingParticipant, setDeletingParticipant] = useState<string | null>(null);

  const handleDeleteParticipant = async (participantId: string) => {
    setDeletingParticipant(participantId);
    const success = await deleteParticipant(participantId);
    if (success) {
      setParticipants(prev => prev.filter(p => p.id !== participantId));
      setDeleteConfirmId(null);
    }
    setDeletingParticipant(null);
  };

  const handleBedAssignment = async (participantId: string, bed: string) => {
    setAssigningBed(participantId);
    const success = await updateParticipant(participantId, { bed_assignment: bed || null } as Partial<Participant>);
    if (success) {
      setParticipants(prev => prev.map(p => p.id === participantId ? { ...p, bed_assignment: bed || null } : p));
    }
    setAssigningBed(null);
  };

  const handleAddParticipant = async () => {
    if (!addName.trim()) return;
    setAddingParticipant(true);
    setError(null);
    try {
      const newP = await addParticipant(addName, addPseudo);
      if (newP) {
        setParticipants(prev => [...prev, newP]);
        setAddName("");
        setAddPseudo("");
        setShowAddForm(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'ajout du participant.";
      setError(msg);
    }
    setAddingParticipant(false);
  };

  const handleGenerateTempPassword = async (id: string) => {
    setGeneratingId(id);
    setLastGenerated(null);
    setError(null);
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const success = await updateAdminCode(id, randomCode);
    if (success) {
      setParticipants(prev => prev.map(p => p.id === id ? { ...p, admin_code: randomCode } : p));
      setLastGenerated({ id, code: randomCode });
      const data = await getParticipants();
      setParticipants(data);
    } else {
      setError("Erreur: impossible de sauvegarder le code. Vérifie que la colonne admin_code existe dans Supabase (exécute migration-advanced.sql)");
    }
    setGeneratingId(null);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const confirmed = participants.filter((p) => {
    const effectiveStatus = p.attendance === "yes" ? "confirmed" : p.attendance === "maybe" ? "pending" : p.attendance === "no" ? "declined" : p.status;
    return effectiveStatus === "confirmed";
  }).length;
  const pending = participants.filter((p) => {
    const effectiveStatus = p.attendance === "yes" ? "confirmed" : p.attendance === "maybe" ? "pending" : p.attendance === "no" ? "declined" : p.status;
    return effectiveStatus === "pending";
  }).length;
  const isCurrentUserAdmin = currentParticipant?.is_admin || false;

  return (
    <main className="pb-20 min-h-screen">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Les Participants 👥</h1>
        </div>
        <p className="text-muted-foreground text-sm mb-6">
          {loading ? "Chargement..." : `${confirmed} confirmés, ${pending} en attente`}
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            ⚠️ {error}
          </div>
        )}

        {/* Admin: Add participant */}
        {isCurrentUserAdmin && (
          <div className="mb-4">
            {!showAddForm ? (
              <Button
                onClick={() => setShowAddForm(true)}
                variant="outline"
                className="w-full border-dashed border-primary/40 text-primary hover:bg-primary/10"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Ajouter un participant
              </Button>
            ) : (
              <div className="p-4 rounded-2xl bg-card border border-primary/30 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <UserPlus className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold text-primary">Nouveau participant</span>
                </div>
                <input
                  type="text"
                  placeholder="Prénom (obligatoire)"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  maxLength={50}
                  className="w-full text-sm bg-muted border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="Pseudo (optionnel)"
                  value={addPseudo}
                  onChange={(e) => setAddPseudo(e.target.value)}
                  maxLength={50}
                  className="w-full text-sm bg-muted border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleAddParticipant}
                    disabled={!addName.trim() || addingParticipant}
                    className="flex-1"
                  >
                    {addingParticipant ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <UserPlus className="w-4 h-4 mr-2" />
                    )}
                    Ajouter
                  </Button>
                  <Button
                    onClick={() => { setShowAddForm(false); setAddName(""); setAddPseudo(""); }}
                    variant="ghost"
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : participants.length === 0 ? (
          <div className="p-8 rounded-2xl bg-card border border-border text-center">
            <span className="text-4xl block mb-3">🤷</span>
            <p className="text-muted-foreground text-sm">
              Aucun participant trouvé. Exécute le SQL dans Supabase !
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {participants.map((p) => {
              // Use attendance (set by participant on landing) as primary status, fallback to admin status
              const attendanceKey = p.attendance === "yes" ? "confirmed" : p.attendance === "maybe" ? "pending" : p.attendance === "no" ? "declined" : null;
              const status = STATUS_CONFIG[(attendanceKey || p.status) as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
              const alcos = Array.isArray(p.alcohol_preferences) ? p.alcohol_preferences : [];
              const smokes = Array.isArray(p.smoking_preferences) ? p.smoking_preferences : [];
              const hasProfile = p.bio || p.festival_role || p.special_skill || p.superpower || p.weakness || p.catchphrase || p.theme_song || alcos.length > 0 || smokes.length > 0;
              const isExpanded = expandedId === p.id;
              return (
                <Card
                  key={p.id}
                  className="overflow-hidden hover:border-primary/40 transition-colors"
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3">
                      {/* Clickable header area */}
                      <div
                        className="flex items-start gap-3 cursor-pointer"
                        onClick={() => {
                          if (hasProfile) {
                            setExpandedId(isExpanded ? null : p.id);
                          }
                        }}
                      >
                        {/* Avatar */}
                        <div
                          className="h-12 w-12 flex-shrink-0 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedParticipant(p);
                          }}
                        >
                          {p.avatar_url ? (
                            <img
                              src={p.avatar_url}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xl">{p.emoji_avatar || getEmoji(p.name)}</span>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-base">{p.name}</h3>
                            {p.is_admin && (
                              <Crown className="w-3.5 h-3.5 text-yellow-500" />
                            )}
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${status.color}`}>
                              {status.label}
                            </Badge>
                            {hasProfile && (
                              <ChevronDown className={`w-4 h-4 text-muted-foreground ml-auto transition-transform duration-200 flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                            )}
                            {isCurrentUserAdmin && p.id !== currentParticipant?.id && (
                              deleteConfirmId === p.id ? (
                                <div className="flex items-center gap-1 ml-1 flex-shrink-0">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteParticipant(p.id); }}
                                    disabled={deletingParticipant === p.id}
                                    className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
                                  >
                                    {deletingParticipant === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirmer"}
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }}
                                    className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border hover:bg-muted/80 transition-colors"
                                  >
                                    Non
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(p.id); }}
                                  className="ml-1 p-1 rounded-md text-muted-foreground/50 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                                  title="Retirer ce participant"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )
                            )}
                          </div>

                          {p.pseudo && (
                            <p className="text-sm text-primary font-medium mt-0.5">
                              aka &ldquo;{p.pseudo}&rdquo;
                            </p>
                          )}

                          {p.fun_title && (
                            <p className="text-[11px] text-accent font-medium mt-0.5">
                              {p.fun_title}
                            </p>
                          )}

                          {p.tagline && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              &ldquo;{p.tagline}&rdquo;
                            </p>
                          )}

                          {/* Alcohol emojis preview */}
                          {alcos.length > 0 && (
                            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                              {alcos.slice(0, 6).map((val: string) => (
                                <span
                                  key={val}
                                  title={ALCOHOL_MAP[val]?.label || val}
                                  className="cursor-help text-sm"
                                >
                                  {ALCOHOL_MAP[val]?.emoji || "🍺"}
                                </span>
                              ))}
                              {alcos.length > 6 && (
                                <span className="text-[10px] text-muted-foreground">+{alcos.length - 6}</span>
                              )}
                              {p.favorite_alcohol && ALCOHOL_MAP[p.favorite_alcohol] && (
                                <span className="text-amber-300 text-sm ml-0.5">
                                  ⭐
                                </span>
                              )}
                            </div>
                          )}

                          {/* Smoking emojis preview */}
                          {smokes.length > 0 && (
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {smokes.map((val: string) => (
                                <span key={val} className="text-sm" title={getSmokingLabel(val)}>
                                  {getSmokingEmoji(val)}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Badges */}
                          {badgesMap[p.id] && badgesMap[p.id].length > 0 && (
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                              {badgesMap[p.id].map((badge) => (
                                <span
                                  key={badge.id}
                                  title={`${badge.title}${badge.description ? " — " + badge.description : ""}`}
                                  className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-300 cursor-help"
                                >
                                  {badge.emoji} {badge.title}
                                </span>
                              ))}
                            </div>
                          )}

                          {p.bed_assignment && (
                            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                              <Bed className="w-3 h-3" />
                              <span>{p.bed_assignment}</span>
                            </div>
                          )}

                          {/* Compatibility badge */}
                          {(() => {
                            const compat = getCompatibility(p);
                            if (!compat) return null;
                            const alcoMatch = compat.sharedAlcos.length;
                            const smokeMatch = compat.sharedSmokes.length;
                            if (alcoMatch === 0 && smokeMatch === 0 && !compat.sameFav) return null;
                            return (
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {compat.sameFav && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-500/15 border border-amber-500/30 text-amber-300">
                                    ⭐ Même alcool favori
                                  </span>
                                )}
                                {alcoMatch > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-green-500/15 border border-green-500/30 text-green-300">
                                    🍻 {alcoMatch} alcool{alcoMatch > 1 ? "s" : ""} en commun
                                  </span>
                                )}
                                {smokeMatch > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-blue-500/15 border border-blue-500/30 text-blue-300">
                                    💨 {smokeMatch} en commun
                                  </span>
                                )}
                              </div>
                            );
                          })()}

                          {(p.hype_level ?? 0) > 0 && (
                            <div className="mt-1 text-xs">
                              <span className="text-muted-foreground">Hype : </span>
                              <span>
                                {"🔥".repeat(p.hype_level ?? 0)}
                              </span>
                            </div>
                          )}

                        </div>
                      </div>

                      {/* ===== EXPANDED PROFILE DETAILS ===== */}
                      {isExpanded && hasProfile && (
                        <div className="pt-3 mt-1 border-t border-border space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">

                          {/* Bio */}
                          {p.bio && (
                            <div className="p-3 rounded-xl bg-muted/30 border border-border">
                              <p className="text-sm text-foreground leading-relaxed">{p.bio}</p>
                            </div>
                          )}

                          {/* Festival Profile */}
                          {(p.festival_role || p.special_skill || p.superpower || p.weakness || p.catchphrase || p.theme_song) && (
                            <div className="space-y-2">
                              <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">🎪 Profil Festival</h4>
                              {p.festival_role && (
                                <div className="flex items-start gap-2">
                                  <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="text-[10px] text-muted-foreground">Rôle</p>
                                    <p className="text-xs text-foreground">{p.festival_role}</p>
                                  </div>
                                </div>
                              )}
                              {p.special_skill && (
                                <div className="flex items-start gap-2">
                                  <Zap className="w-3.5 h-3.5 text-yellow-400 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="text-[10px] text-muted-foreground">Spécialité</p>
                                    <p className="text-xs text-foreground">{p.special_skill}</p>
                                  </div>
                                </div>
                              )}
                              {p.superpower && (
                                <div className="flex items-start gap-2">
                                  <Target className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="text-[10px] text-muted-foreground">Super-pouvoir</p>
                                    <p className="text-xs text-foreground">{p.superpower}</p>
                                  </div>
                                </div>
                              )}
                              {p.weakness && (
                                <div className="flex items-start gap-2">
                                  <Skull className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="text-[10px] text-muted-foreground">Faiblesse</p>
                                    <p className="text-xs text-foreground">{p.weakness}</p>
                                  </div>
                                </div>
                              )}
                              {p.catchphrase && (
                                <div className="flex items-start gap-2">
                                  <Quote className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="text-[10px] text-muted-foreground">Phrase fétiche</p>
                                    <p className="text-xs text-foreground italic">&ldquo;{p.catchphrase}&rdquo;</p>
                                  </div>
                                </div>
                              )}
                              {p.theme_song && (
                                <div className="flex items-start gap-2">
                                  <Music className="w-3.5 h-3.5 text-purple-400 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="text-[10px] text-muted-foreground">Hymne</p>
                                    <p className="text-xs text-foreground">{p.theme_song}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Alcohol detail */}
                          {alcos.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                <Wine className="w-3.5 h-3.5 inline mr-1" />
                                Alcool
                              </h4>
                              <div className="space-y-2">
                                {ALCOHOL_GROUPS.map((groupName) => {
                                  const groupItems = ALCOHOL_LIST.filter((item) => item.group === groupName && alcos.includes(item.value));
                                  if (groupItems.length === 0) return null;
                                  return (
                                    <div key={groupName}>
                                      <p className="text-[10px] text-muted-foreground mb-1">{groupItems[0].emoji} {groupName}</p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {groupItems.map((item) => {
                                          const isFav = p.favorite_alcohol === item.value;
                                          return (
                                            <span
                                              key={item.value}
                                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border ${
                                                isFav
                                                  ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                                                  : "bg-muted/50 border-border text-foreground"
                                              }`}
                                            >
                                              <span>{item.emoji}</span>
                                              <span>{item.label}</span>
                                              {isFav && <span>⭐</span>}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              {p.favorite_alcohol && ALCOHOL_MAP[p.favorite_alcohol] && (
                                <p className="text-[11px] text-amber-300">
                                  ❤️ Alcool de cœur : {ALCOHOL_MAP[p.favorite_alcohol].emoji} {ALCOHOL_MAP[p.favorite_alcohol].label}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Smoking detail */}
                          {smokes.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                <Cigarette className="w-3.5 h-3.5 inline mr-1" />
                                Fumeur
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {smokes.map((val: string) => (
                                  <span
                                    key={val}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border bg-muted/50 border-border text-foreground"
                                  >
                                    <span>{getSmokingEmoji(val)}</span>
                                    <span>{getSmokingLabel(val)}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}


                        </div>
                      )}

                      {/* Admin section for managing user passwords */}
                      {isCurrentUserAdmin && (
                        <div
                          className="mt-2 pt-3 border-t border-dashed border-border flex items-center justify-between flex-wrap gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-2">
                            <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs font-semibold text-muted-foreground">Code :</span>
                            {(p.admin_code || lastGenerated?.id === p.id) ? (
                              <span 
                                onClick={() => copyToClipboard(p.admin_code || lastGenerated?.code || "", p.id)}
                                className="text-xs font-mono bg-muted px-2 py-0.5 rounded cursor-pointer hover:bg-muted/80 select-all"
                                title="Cliquer pour copier"
                              >
                                {p.admin_code || lastGenerated?.code} {copiedId === p.id ? "✅ Copié" : "📋"}
                              </span>
                            ) : (
                              <span className="text-xs text-red-500 italic">Non configuré</span>
                            )}
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleGenerateTempPassword(p.id)}
                            disabled={generatingId === p.id}
                            className="text-xs h-7 px-2"
                          >
                            {generatingId === p.id ? (
                              <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Génération...</>
                            ) : (
                              <>Générer code 🔑</>
                            )}
                          </Button>
                        </div>
                      )}

                      {/* Admin bed assignment */}
                      {isCurrentUserAdmin && (
                        <div
                          className="mt-2 pt-2 border-t border-dashed border-border"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <Bed className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs font-semibold text-muted-foreground">Lit :</span>
                          </div>
                          <select
                            value={p.bed_assignment || ""}
                            onChange={(e) => handleBedAssignment(p.id, e.target.value)}
                            disabled={assigningBed === p.id}
                            className="w-full text-xs bg-muted border border-border rounded-lg px-2 py-1.5 text-foreground"
                          >
                            <option value="">— Non assigné —</option>
                            {BED_OPTIONS.map((bed) => (
                              <option key={bed} value={bed}>{bed}</option>
                            ))}
                          </select>
                          {assigningBed === p.id && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
                              Assignation...
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Photo Modal (for big photo view) */}
      {selectedParticipant && (
        <PhotoModal
          participant={selectedParticipant}
          onClose={() => setSelectedParticipant(null)}
        />
      )}

      <MobileNav />
    </main>
  );
}

function PhotoModal({ participant: p, onClose }: { participant: Participant; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="rounded-2xl overflow-hidden">
          {p.avatar_url ? (
            <img src={p.avatar_url} alt={p.name} className="w-full h-auto" />
          ) : (
            <div className="w-full aspect-square bg-muted flex items-center justify-center">
              <span className="text-8xl">{p.emoji_avatar || getEmoji(p.name)}</span>
            </div>
          )}
          <div className="bg-card p-4 text-center">
            <p className="font-bold text-lg">{p.name}</p>
            {p.pseudo && <p className="text-primary text-sm">aka &ldquo;{p.pseudo}&rdquo;</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
