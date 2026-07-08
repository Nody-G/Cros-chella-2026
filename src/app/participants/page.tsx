"use client";

import { useEffect, useState } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Crown, Bed, Loader2 } from "lucide-react";
import { getParticipants } from "@/lib/supabase-queries";
import type { Participant } from "@/lib/types";

const STATUS_CONFIG = {
  confirmed: { label: "Confirmé ✅", color: "bg-green-500/10 text-green-600 border-green-500/20" },
  pending: { label: "Pas sûr 🤔", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  declined: { label: "Pas dispo ❌", color: "bg-red-500/10 text-red-600 border-red-500/20" },
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

  useEffect(() => {
    async function fetch() {
      const data = await getParticipants();
      setParticipants(data);
      setLoading(false);
    }
    fetch();
  }, []);

  const confirmed = participants.filter((p) => p.status === "confirmed").length;
  const pending = participants.filter((p) => p.status === "pending").length;

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
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <Avatar className="h-12 w-12 flex-shrink-0">
                        <AvatarFallback className="text-xl bg-primary/10">
                          {getEmoji(p.name)}
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

                        {p.bio && (
                          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                            {p.bio}
                          </p>
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
