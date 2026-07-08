"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Gamepad2, CalendarDays, MoreHorizontal, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Droplets, BarChart3, MessageCircle, ImageIcon, Music } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const mainNavItems = [
  { href: "/", icon: Home, label: "Accueil" },
  { href: "/participants", icon: Users, label: "Potes" },
  { href: "/jeux", icon: Gamepad2, label: "Jeux" },
  { href: "/programme", icon: CalendarDays, label: "Programme" },
];

const moreNavItems = [
  { href: "/spots", icon: Droplets, label: "Baignade", emoji: "🏊" },
  { href: "/sondages", icon: BarChart3, label: "Sondages", emoji: "📊" },
  { href: "/chat", icon: MessageCircle, label: "Chat", emoji: "💬" },
  { href: "/galerie", icon: ImageIcon, label: "Galerie", emoji: "📸" },
  { href: "https://open.spotify.com/playlist/2DqmhZTuP8dhiZqCrx0D8f", icon: Music, label: "Playlist", emoji: "🎵", external: true },
];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { currentParticipant, logout } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border safe-area-inset-bottom">
      <div className="flex items-center justify-around max-w-lg mx-auto h-16">
        {mainNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
                moreNavItems.some((i) => i.href === pathname)
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MoreHorizontal className="w-5 h-5" />
              <span className="text-[10px] font-medium">Plus</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl max-w-lg mx-auto">
            <SheetHeader className="text-left">
              <SheetTitle className="text-lg">Navigation 🎪</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-3 mt-6 pb-4">
              {moreNavItems.map((item) => {
                const isActive = pathname === item.href;
                const Wrapper = item.external ? "a" : Link;
                return (
                  <Wrapper
                    key={item.href}
                    href={item.href}
                    {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                      isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/30 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span className="text-2xl">{item.emoji}</span>
                    <span className="text-xs font-medium">{item.label}</span>
                  </Wrapper>
                );
              })}
            </div>
            {/* User info + logout */}
            {currentParticipant && (
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm">
                    {currentParticipant.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{currentParticipant.name}</p>
                    {currentParticipant.pseudo && (
                      <p className="text-[10px] text-muted-foreground">{currentParticipant.pseudo}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => { logout(); setOpen(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Changer
                </button>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
