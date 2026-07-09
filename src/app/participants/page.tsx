"use client";

import { useEffect, useState } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Crown, Bed, Loader2 } from "lucide-react";
import { getParticipants, updatePassword } from "@/lib/supabase-queries";
import type { Participant } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { KeyRound } from "lucide-react";

const STATUS_CONFIG = {
  confirmed: { label: "Confirmé ✅", color: "bg-green-500/10 text-green-400 border-green-500/20" },
  pending: { label: "Pas sûr 🤔", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  declined: { label: "Pas dispo ❌", color: "bg-red-500/10 text-red-400 border-red-500/20" },
};

const ALCOHOL_LABELS: Record<string, { label: string; emoji: string }> = {
  biere_blonde: { label: "Blonde", emoji: "🍺" }, biere_blanche: { label: "Blanche", emoji: "🍺" },
  biere_ambree: { label: "Ambrée", emoji: "🍺" }, biere_brune: { label: "Brune", emoji: "🍺" },
  biere_ipa: { label: "IPA", emoji: "🍺" }, biere_stout: { label: "Stout", emoji: "🍺" },
  biere_pils: { label: "Pils", emoji: "🍺" }, biere_wheat: { label: "Weissbier", emoji: "🍺" },
  biere_sour: { label: "Sour/Gose", emoji: "🍺" }, biere_lager: { label: "Lager", emoji: "🍺" },
  cider: { label: "Cidre", emoji: "🍏" },
  vin_rouge: { label: "Rouge", emoji: "🍷" }, vin_blanc: { label: "Blanc", emoji: "🍷" },
  vin_rose: { label: "Rosé", emoji: "🍷" }, vin_petillant: { label: "Pétillant", emoji: "🍷" },
  champagne: { label: "Champagne", emoji: "🥂" }, prosecco: { label: "Prosecco", emoji: "🥂" },
  porto: { label: "Porto", emoji: "🍷" }, sangria: { label: "Sangria", emoji: "🍷" },
  vodka: { label: "Vodka", emoji: "🍸" }, rhum_blanc: { label: "Rhum blanc", emoji: "🥃" },
  rhum_ambre: { label: "Rhum ambré", emoji: "🥃" }, whisky: { label: "Whisky", emoji: "🥃" },
  gin: { label: "Gin", emoji: "🍸" }, tequila: { label: "Tequila", emoji: "🌵" },
  mezcal: { label: "Mezcal", emoji: "🌵" }, cognac: { label: "Cognac", emoji: "🥃" },
  calvados: { label: "Calvados", emoji: "🥃" }, pastis: { label: "Pastis", emoji: "🫗" },
  absinthe: { label: "Absinthe", emoji: "🫗" }, sake: { label: "Saké", emoji: "🍶" },
  marc: { label: "Marc", emoji: "🥃" }, eau_de_vie: { label: "Eau-de-vie", emoji: "🥃" },
  limoncello: { label: "Limoncello", emoji: "🍋" }, baileys: { label: "Baileys", emoji: "🥛" },
  kahlua: { label: "Kahlúa", emoji: "☕" }, amaretto: { label: "Amaretto", emoji: "🍒" },
  cointreau: { label: "Cointreau", emoji: "🍊" }, aperol: { label: "Aperol", emoji: "🟧" },
  campari: { label: "Campari", emoji: "🟥" }, jagermeister: { label: "Jägermeister", emoji: "🦌" },
  sambuca: { label: "Sambuca", emoji: "🫗" }, chartreuse: { label: "Chartreuse", emoji: "🫗" },
  herbes: { label: "Herbes", emoji: "🌿" }, creme_cassis: { label: "Cassis", emoji: "🫐" },
  mojito: { label: "Mojito", emoji: "🍹" }, pina_colada: { label: "Piña Colada", emoji: "🍹" },
  margarita: { label: "Margarita", emoji: "🍹" }, spritz: { label: "Spritz", emoji: "🍹" },
  caipirinha: { label: "Caipirinha", emoji: "🍹" }, daiquiri: { label: "Daiquiri", emoji: "🍹" },
  cosmopolitan: { label: "Cosmo", emoji: "🍹" }, long_island: { label: "Long Island", emoji: "🍹" },
  negroni: { label: "Negroni", emoji: "🍹" }, gin_tonic: { label: "Gin Tonic", emoji: "🍹" },
  bloody_mary: { label: "Bloody Mary", emoji: "🍅" }, espresso_martini: { label: "Espresso Martini", emoji: "☕" },
  sex_on_beach: { label: "Sex on the Beach", emoji: "🍹" }, tequila_sunrise: { label: "Tequila Sunrise", emoji: "🌅" },
  mojito_fraise: { label: "Mojito Fraise", emoji: "🍓" },
  bierre_sans_alcool: { label: "Sans alcool", emoji: "🚫" }, virgin_mojito: { label: "Virgin Mojito", emoji: "🚫" },
  jus_fruit: { label: "Jus de fruits", emoji: "🧃" }, soda: { label: "Soda", emoji: "🥤" },
  eau: { label: "Eau", emoji: "💧" },
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

  const handleGenerateTempPassword = async (id: string) => {
    // Generate a simple readable code, e.g. CROS-4321
    const randomCode = `CROS-${Math.floor(1000 + Math.random() * 9000)}`;
    const success = await updatePassword(id, randomCode);
    if (success) {
      const data = await getParticipants();
      setParticipants(data);
    }
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
                        <Avatar className="h-12 w-12 flex-shrink-0">
                          <AvatarFallback className="text-xl bg-primary/10">
                            {p.emoji_avatar || getEmoji(p.name)}
                          </AvatarFallback>
                        </Avatar>

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
                                  {p.alcohol_preferences.map((val) => ALCOHOL_LABELS[val]?.emoji || "🍺").join(" ")}
                                  {p.favorite_alcohol && ALCOHOL_LABELS[p.favorite_alcohol] && (
                                    <span className="text-amber-300 ml-1">
                                      ⭐ {ALCOHOL_LABELS[p.favorite_alcohol].label}
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
                            {p.password ? (
                              <span 
                                onClick={() => copyToClipboard(p.password || "", p.id)}
                                className="text-xs font-mono bg-muted px-2 py-0.5 rounded cursor-pointer hover:bg-muted/80 select-all"
                                title="Cliquer pour copier"
                              >
                                {p.password} {copiedId === p.id ? "✅ Copié" : ""}
                              </span>
                            ) : (
                              <span className="text-xs text-red-500 italic">Non configuré</span>
                            )}
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleGenerateTempPassword(p.id)}
                            className="text-xs h-7 px-2"
                          >
                            Générer code 🔑
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
