"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BellRing, X } from "lucide-react";

interface FlashEvent {
  id: string;
  title: string;
  message: string;
  emoji?: string;
  created_at: string;
}

export function FlashAnnouncementListener() {
  const [currentAnnouncement, setCurrentAnnouncement] = useState<FlashEvent | null>(null);

  useEffect(() => {
    // Listen to live broadcast channel for flash announcements
    const channel = supabase.channel("croschella_live_events", {
      config: { broadcast: { self: true } },
    });

    channel
      .on("broadcast", { event: "flash_announcement" }, (payload) => {
        if (payload?.payload) {
          const evt = payload.payload as FlashEvent;
          setCurrentAnnouncement(evt);

          // Play sound alert if supported
          try {
            const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
            gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.5);
          } catch {
            // Audio context fallback
          }

          // Vibrate if supported
          if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!currentAnnouncement) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[92%] max-w-lg animate-in fade-in slide-in-from-top-5 duration-300">
      <Card className="border-2 border-amber-400 bg-gradient-to-r from-red-950/95 via-background/95 to-amber-950/95 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400 animate-pulse" />
        <CardContent className="p-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="text-3xl shrink-0 animate-bounce">
              {currentAnnouncement.emoji || "📢"}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/40 px-2 py-0.5 rounded-full">
                  <BellRing className="w-3 h-3" /> ALERTE FESTIVAL
                </span>
                <span className="text-[10px] text-muted-foreground">En direct</span>
              </div>
              <h4 className="text-sm font-extrabold text-amber-400 leading-snug">
                {currentAnnouncement.title}
              </h4>
              <p className="text-xs text-foreground font-medium leading-relaxed">
                {currentAnnouncement.message}
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setCurrentAnnouncement(null)}
            className="text-muted-foreground hover:text-foreground p-1 h-auto shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
