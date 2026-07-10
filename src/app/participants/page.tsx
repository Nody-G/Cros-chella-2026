"use client";

import { useEffect, useState } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Crown, Bed, Loader2, X, Wine, Zap, Target, Skull, Quote, Music, Sparkles, Cigarette, ChevronDown } from "lucide-react";
import { getParticipants, updateAdminCode, updateParticipant } from "@/lib/supabase-queries";
import { supabase } from "@/lib/supabase";
import type { Participant } from "@/lib/types";
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
            setParticipants((prev) =>
              prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
            );
            // Also update the modal if it's showing this participant
            setSelectedParticipant((prev) =>
              prev && prev.id === updated.id ? { ...prev, ...updated } : prev
            );
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

  const handleBedAssignment = async (participantId: string, bed: string) => {
    setAssigningBed(participantId);
    const success = await updateParticipant(participantId, { bed_assignment: bed || null } as Partial<Participant>);
    if (success) {
      setParticipants(prev => prev.map(p => p.id === participantId ? { ...p, bed_assignment: bed || null } : p));
    }
    setAssigningBed(null);
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

  const confirmed = participants.filter((p) => p.status === "confirmed").length;
  const pending = participants.filter((p) => p.status === "pending").length;
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
              const status = STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
              return (
                <Card
                  key={p.id}
                  className="overflow-hidden cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => setSelectedParticipant(p)}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="h-12 w-12 flex-shrink-0 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
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
                          {(() => {
                            const alcos = Array.isArray(p.alcohol_preferences) ? p.alcohol_preferences : [];
                            return alcos.length > 0 && (
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
                            );
                          })()}

                          {p.bed_assignment && (
                            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                              <Bed className="w-3 h-3" />
                              <span>{p.bed_assignment}</span>
                            </div>
                          )}

                          {(p.hype_level ?? 0) > 0 && (
                            <div className="mt-1 text-xs">
                              <span className="text-muted-foreground">Hype : </span>
                              <span>
                                {"🔥".repeat(p.hype_level ?? 0)}
                              </span>
                            </div>
                          )}

                          {p.attendance && (
                            <div className="mt-1 text-xs">
                              <span className="text-muted-foreground">Présence : </span>
                              <span>
                                {p.attendance === "yes" ? "✅ Viens" : p.attendance === "maybe" ? "🤔 Peut-être" : "❌ Pas dispo"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

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
                          <div className="flex items-center gap-2">
                            <Bed className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs font-semibold text-muted-foreground">Lit :</span>
                            <div className="relative flex-1">
                              <select
                                value={p.bed_assignment || ""}
                                onChange={(e) => handleBedAssignment(p.id, e.target.value)}
                                disabled={assigningBed === p.id}
                                className="w-full text-xs bg-muted border border-border rounded-md px-2 py-1 appearance-none cursor-pointer hover:border-primary/30 transition-colors disabled:opacity-50"
                              >
                                <option value="">Non assigné</option>
                                {BED_OPTIONS.map((bed) => (
                                  <option key={bed} value={bed}>{bed}</option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                            </div>
                            {assigningBed === p.id && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Capacity info */}
        {!loading && participants.length > 0 && (
          <div className="mt-8 p-4 rounded-xl bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground text-center">
              🏠 Capacité max : ~14-15 personnes • {participants.length} inscrits
            </p>
          </div>
        )}
      </div>

      {/* Profile Detail Modal */}
      {selectedParticipant && (
        <ProfileModal
          participant={selectedParticipant}
          onClose={() => setSelectedParticipant(null)}
        />
      )}

      <MobileNav />
    </main>
  );
}

function ProfileModal({ participant: p, onClose }: { participant: Participant; onClose: () => void }) {
  const status = STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  const alcos = Array.isArray(p.alcohol_preferences) ? p.alcohol_preferences : [];

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className="relative w-full sm:max-w-md max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-card border border-border shadow-2xl animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:fade-in duration-300">
        {/* Header with gradient */}
        <div className="sticky top-0 z-10 bg-gradient-to-b from-primary/20 to-card border-b border-border">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Big photo */}
          <div className="w-full aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
            {p.avatar_url ? (
              <img src={p.avatar_url} alt={p.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-7xl">{p.emoji_avatar || getEmoji(p.name)}</span>
            )}
          </div>

          <div className="px-5 pb-4 pt-3">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-xl">{p.name}</h2>
              {p.is_admin && <Crown className="w-4 h-4 text-yellow-500" />}
            </div>
            {p.pseudo && (
              <p className="text-primary font-medium text-sm">aka &ldquo;{p.pseudo}&rdquo;</p>
            )}
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 mt-1 ${status.color}`}>
              {status.label}
            </Badge>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Fun title & tagline */}
          {p.fun_title && (
            <div className="text-center">
              <span className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium">
                {p.fun_title}
              </span>
            </div>
          )}

          {p.tagline && (
            <p className="text-center text-muted-foreground italic text-sm">
              &ldquo;{p.tagline}&rdquo;
            </p>
          )}

          {/* Bio */}
          {p.bio && (
            <div className="p-3 rounded-xl bg-muted/30 border border-border">
              <p className="text-sm text-foreground leading-relaxed">{p.bio}</p>
            </div>
          )}

          {/* Festival Profile */}
          {(p.festival_role || p.special_skill || p.superpower || p.weakness || p.catchphrase || p.theme_song) && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                🎪 Profil Festival
              </h3>
              {p.festival_role && (
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Rôle</p>
                    <p className="text-sm text-foreground">{p.festival_role}</p>
                  </div>
                </div>
              )}
              {p.special_skill && (
                <div className="flex items-start gap-2.5">
                  <Target className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Spécialité</p>
                    <p className="text-sm text-foreground">{p.special_skill}</p>
                  </div>
                </div>
              )}
              {p.superpower && (
                <div className="flex items-start gap-2.5">
                  <Zap className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Super-pouvoir</p>
                    <p className="text-sm text-primary font-medium">{p.superpower}</p>
                  </div>
                </div>
              )}
              {p.weakness && (
                <div className="flex items-start gap-2.5">
                  <Skull className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Faiblesse</p>
                    <p className="text-sm text-red-400">{p.weakness}</p>
                  </div>
                </div>
              )}
              {p.catchphrase && (
                <div className="flex items-start gap-2.5">
                  <Quote className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Phrase fétiche</p>
                    <p className="text-sm text-foreground italic">&ldquo;{p.catchphrase}&rdquo;</p>
                  </div>
                </div>
              )}
              {p.theme_song && (
                <div className="flex items-start gap-2.5">
                  <Music className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Hymne</p>
                    <p className="text-sm text-foreground">{p.theme_song}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Alcools — grouped by type */}
          {alcos.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Wine className="w-3.5 h-3.5 inline mr-1" />
                Alcools favoris
              </h3>
              <div className="space-y-2">
                {ALCOHOL_GROUPS.map((group) => {
                  const groupItems = ALCOHOL_LIST.filter(
                    (a) => a.group === group && alcos.includes(a.value)
                  );
                  if (groupItems.length === 0) return null;
                  return (
                    <div key={group}>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">
                        {group}
                      </p>
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
                <p className="text-xs text-amber-300">
                  ❤️ Alcool de cœur : {ALCOHOL_MAP[p.favorite_alcohol].emoji} {ALCOHOL_MAP[p.favorite_alcohol].label}
                </p>
              )}
            </div>
          )}

          {/* Smoking */}
          {Array.isArray(p.smoking_preferences) && p.smoking_preferences.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Cigarette className="w-3.5 h-3.5 inline mr-1" />
                Fumeur
              </h3>
              <div className="flex flex-wrap gap-2">
                {p.smoking_preferences.map((val: string) => (
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

          {/* Bed assignment */}
          {p.bed_assignment && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 border border-border">
              <Bed className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-[10px] text-muted-foreground">Chambre</p>
                <p className="text-sm text-foreground">{p.bed_assignment}</p>
              </div>
            </div>
          )}

          {/* Hype */}
          {(p.hype_level ?? 0) > 0 && (
            <div className="text-center py-2">
              <span className="text-2xl">{"🔥".repeat(p.hype_level ?? 0)}</span>
              <p className="text-xs text-muted-foreground mt-1">
                Niveau de hype : {p.hype_level}/5
              </p>
            </div>
          )}

          {/* Attendance */}
          {p.attendance && (
            <div className="text-center py-2">
              <span className="text-2xl">
                {p.attendance === "yes" ? "✅" : p.attendance === "maybe" ? "🤔" : "❌"}
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                {p.attendance === "yes" ? "Viens !" : p.attendance === "maybe" ? "Peut-être" : "Pas dispo"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
