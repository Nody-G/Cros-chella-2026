"use client";

import { useEffect, useState } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Loader2, MapPin, Clock } from "lucide-react";
import { getProgram } from "@/lib/supabase-queries";
import type { Program, ProgramDay } from "@/lib/types";

const DAY_CONFIG: Record<ProgramDay, { label: string; emoji: string; date: string }> = {
  friday: { label: "Vendredi", emoji: "🎉", date: "31 juillet" },
  saturday: { label: "Samedi", emoji: "☀️", date: "1 août" },
  sunday: { label: "Dimanche", emoji: "🌊", date: "2 août" },
};

export default function ProgrammePage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const data = await getProgram();
      setPrograms(data);
      setLoading(false);
    }
    fetch();
  }, []);

  const grouped = (["friday", "saturday", "sunday"] as ProgramDay[]).map((day) => ({
    ...DAY_CONFIG[day],
    day,
    events: programs.filter((p) => p.day === day),
  }));

  return (
    <main className="pb-20 min-h-screen">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-2">
          <CalendarDays className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Programme 📅</h1>
        </div>
        <p className="text-muted-foreground text-sm mb-6">
          Vendredi soir → Dimanche : le planning du carnage
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : programs.length === 0 ? (
          <div className="p-8 rounded-2xl bg-card border border-border text-center">
            <span className="text-4xl block mb-3">📋</span>
            <p className="text-muted-foreground text-sm">
              Le programme arrive. Exécute le SQL dans Supabase !
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
                  {dayGroup.events.map((event) => (
                    <div key={event.id} className="relative">
                      {/* Timeline dot */}
                      <div className="absolute -left-[31px] top-4 w-3 h-3 rounded-full bg-primary border-2 border-background" />

                      <Card className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <span className="text-xl">{event.emoji}</span>
                            <div className="flex-1">
                              <h3 className="font-bold text-sm">{event.title}</h3>
                              {event.description && (
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                  {event.description}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-2 flex-wrap">
                                {event.start_time && (
                                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="w-3 h-3" />
                                    {event.start_time}{event.end_time ? ` — ${event.end_time}` : ""}
                                  </span>
                                )}
                                {event.location && (
                                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                    <MapPin className="w-3 h-3" />
                                    {event.location}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <MobileNav />
    </main>
  );
}
