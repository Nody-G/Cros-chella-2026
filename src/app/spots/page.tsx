"use client";

import { useEffect, useState } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Droplets, Loader2, ExternalLink, Shield, ShieldAlert, ShieldCheck, Skull } from "lucide-react";
import { getSpots } from "@/lib/supabase-queries";
import type { Spot, DangerLevel } from "@/lib/types";

const DANGER_CONFIG: Record<DangerLevel, { label: string; icon: React.ElementType; color: string; emoji: string }> = {
  easy: { label: "Tranquille", icon: ShieldCheck, color: "bg-green-500/10 text-green-600 border-green-500/20", emoji: "😊" },
  normal: { label: "Normal", icon: Shield, color: "bg-blue-500/10 text-blue-600 border-blue-500/20", emoji: "😎" },
  hard: { label: "Costaud", icon: ShieldAlert, color: "bg-orange-500/10 text-orange-600 border-orange-500/20", emoji: "😬" },
  extreme: { label: "Extrême", icon: Skull, color: "bg-red-500/10 text-red-600 border-red-500/20", emoji: "💀" },
};

export default function SpotsPage() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const data = await getSpots();
      setSpots(data);
      setLoading(false);
    }
    fetch();
  }, []);

  return (
    <main className="pb-20 min-h-screen">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-2">
          <Droplets className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Spots de Baignade 🏊</h1>
        </div>
        <p className="text-muted-foreground text-sm mb-6">
          Les meilleurs coins pour se jeter à l&apos;eau en Ardèche
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : spots.length === 0 ? (
          <div className="p-8 rounded-2xl bg-card border border-border text-center">
            <span className="text-4xl block mb-3">🌊</span>
            <p className="text-muted-foreground text-sm">
              Les spots arrivent. Exécute le SQL dans Supabase !
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {spots.map((spot) => {
              const danger = DANGER_CONFIG[spot.danger_level];
              return (
                <Card key={spot.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">🏊</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-sm">{spot.name}</h3>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${danger.color}`}>
                            {danger.emoji} {danger.label}
                          </Badge>
                        </div>
                        {spot.description && (
                          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                            {spot.description}
                          </p>
                        )}
                        {spot.maps_url && (
                          <a
                            href={spot.maps_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 mt-3 text-xs text-primary hover:underline font-medium"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Voir sur Google Maps
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Global maps link */}
        <div className="mt-6 p-4 rounded-xl bg-muted/50 border border-border text-center">
          <p className="text-xs text-muted-foreground mb-2">
            📍 Tous les spots sur la carte de Niels
          </p>
          <a
            href="https://maps.app.goo.gl/hP4hV3Z3ZEYzVV5m8"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
          >
            <ExternalLink className="w-4 h-4" />
            Ouvrir la carte Google Maps
          </a>
        </div>
      </div>
      <MobileNav />
    </main>
  );
}
