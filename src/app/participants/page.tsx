"use client";

import { useEffect, useState } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Crown, Bed, Loader2 } from "lucide-react";
import { getParticipants, updateAdminCode } from "@/lib/supabase-queries";
import type { Participant } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { KeyRound } from "lucide-react";
import { ALCOHOL_MAP } from "@/lib/alcohol-data";

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

  useEffect(() => {
    async function fetch() {
      const data = await getParticipants();
      setParticipants(data);
      setLoading(false);
    }
    fetch();
  }, []);

  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<{id: string, code: string} | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateTempPassword = async (id: string) => {
    setGeneratingId(id);
    setLastGenerated(null);
    setError(null);
    const randomCode = `CROS-${Math.floor(1000 + Math.random() * 9000)}`;
    const success = await updateAdminCode(id, randomCode);
    if (success) {
      // Update local state immediately for instant display
      setParticipants(prev => prev.map(p => p.id === id ? { ...p, admin_code: randomCode } : p));
      setLastGenerated({ id, code: randomCode });
      // Also re-fetch from DB to be sure
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
              const status = STATUS_CONFIG[p.status];
              return (
                <Card key={p.id} className="overflow-hidden">
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

                          {p.bio && (
                            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                              {p.bio}
                            </p>
                          )}

                          {/* Festival profile details */}
                          {(p.festival_role || p.special_skill || p.superpower || p.catchphrase) && (
                            <div className="mt-2 space-y-1">
                              {p.festival_role && (
                                <p className="text-[10px] text-muted-foreground">🎪 Rôle : <span className="text-foreground">{p.festival_role}</span></p>
                              )}
                              {p.special_skill && (
                                <p className="text-[10px] text-muted-foreground">🎯 Spécialité : <span className="text-foreground">{p.special_skill}</span></p>
                              )}
                              {p.superpower && (
                                <p className="text-[10px] text-muted-foreground">⚡ Super-pouvoir : <span className="text-primary">{p.superpower}</span></p>
                              )}
                              {p.weakness && (
                                <p className="text-[10px] text-muted-foreground">💀 Faiblesse : <span className="text-destructive">{p.weakness}</span></p>
                              )}
                              {p.catchphrase && (
                                <p className="text-[10px] text-muted-foreground">🗣️ &ldquo;{p.catchphrase}&rdquo;</p>
                              )}
                              {p.theme_song && (
                                <p className="text-[10px] text-muted-foreground">🎵 Hymne : <span className="text-foreground">{p.theme_song}</span></p>
                              )}
                              {p.alcohol_preferences && p.alcohol_preferences.length > 0 && (
                                <p className="text-[10px] text-muted-foreground">
                                  🍻 Alcools :{" "}
                                  {p.alcohol_preferences.map((val) => ALCOHOL_MAP[val]?.emoji || "🍺").join(" ")}
                                  {p.favorite_alcohol && ALCOHOL_MAP[p.favorite_alcohol] && (
                                    <span className="text-amber-300 ml-1">
                                      ⭐ {ALCOHOL_MAP[p.favorite_alcohol].label}
                                    </span>
                                  )}
                                </p>
                              )}
                            </div>
                          )}

                          {p.bed_assignment && (
                            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                              <Bed className="w-3 h-3" />
                              <span>{p.bed_assignment}</span>
                            </div>
                          )}

                          {p.hype_level > 0 && (
                            <div className="mt-2 text-xs">
                              <span className="text-muted-foreground">Hype : </span>
                              <span>
                                {"🔥".repeat(p.hype_level)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Admin section for managing user passwords */}
                      {isCurrentUserAdmin && (
                        <div className="mt-2 pt-3 border-t border-dashed border-border flex items-center justify-between flex-wrap gap-2">
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
              🏠 Capacité : ~14-15 personnes • 4 chambres + canapé-lit + matelas
            </p>
          </div>
        )}
      </div>
      <MobileNav />
    </main>
  );
}
