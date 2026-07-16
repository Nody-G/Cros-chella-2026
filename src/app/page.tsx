"use client";

import { useEffect, useState } from "react";
import { HeroSection } from "@/components/landing/hero-section";
import { AttendanceSection } from "@/components/landing/attendance-section";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getPushSubscription, subscribeToPush } from "@/lib/push-utils";

export default function Home() {
  const { currentParticipant } = useAuth();
  const [showPushBanner, setShowPushBanner] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      getPushSubscription().then((sub) => {
        if (!sub && Notification.permission !== "denied") {
          const dismissed = sessionStorage.getItem("cros-chella-dismissed-push-banner-home");
          if (!dismissed) {
            setShowPushBanner(true);
          }
        }
      });
    }
  }, []);

  const handleEnablePush = async () => {
    if (!currentParticipant) return;
    const success = await subscribeToPush(currentParticipant.id);
    if (success) {
      setShowPushBanner(false);
    }
  };

  const handleDismissBanner = () => {
    setShowPushBanner(false);
    sessionStorage.setItem("cros-chella-dismissed-push-banner-home", "true");
  };

  return (
    <main className="pb-20">
      {/* Push Notification Banner */}
      {showPushBanner && currentParticipant && (
        <div className="mx-4 mt-4 p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col gap-3 relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 max-w-lg sm:mx-auto">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-purple-500/10 to-orange-500/10 opacity-30 pointer-events-none" />
          <button 
            onClick={handleDismissBanner}
            className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-white/5 transition"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex gap-3 items-start">
            <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
              <span className="text-xl">🔔</span>
            </div>
            <div className="flex-1 pr-6">
              <h3 className="text-sm font-semibold text-foreground">Active les notifications push !</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Ne rate aucun message important du chat, aucun changement de planning ou nouvelle photo du festival. Reçois des alertes directes sur ton téléphone.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 z-10">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDismissBanner}
              className="text-xs hover:bg-white/5 h-8"
            >
              Plus tard
            </Button>
            <Button 
              size="sm" 
              onClick={handleEnablePush}
              className="text-xs bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow-lg shadow-primary/20 h-8"
            >
              Activer
            </Button>
          </div>
        </div>
      )}

      <HeroSection />
      <AttendanceSection />
      <MobileNav />
    </main>
  );
}
