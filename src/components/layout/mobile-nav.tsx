"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Gamepad2, CalendarDays, MoreHorizontal, LogOut, UserCircle, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Droplets, BarChart3, MessageCircle, ImageIcon, Music, KeyRound, Check, X, Wine } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { FeedbackButton } from "@/components/layout/feedback-button";
import { updatePassword } from "@/lib/supabase-queries";
import { Input } from "@/components/ui/input";

const mainNavItems = [
  { href: "/", icon: Home, label: "Accueil" },
  { href: "/participants", icon: Users, label: "Potes" },
  { href: "/jeux", icon: Gamepad2, label: "Jeux" },
  { href: "/programme", icon: CalendarDays, label: "Programme" },
];

const moreNavItems = [
  { href: "/profil", icon: UserCircle, label: "Mon Profil", emoji: "🎭" },
  { href: "/alcool", icon: Wine, label: "Alcool", emoji: "🍻" },
  { href: "/spots", icon: Droplets, label: "Baignade", emoji: "🏊" },
  { href: "/sondages", icon: BarChart3, label: "Sondages", emoji: "📊" },
  { href: "/chat", icon: MessageCircle, label: "Chat", emoji: "💬" },
  { href: "/galerie", icon: ImageIcon, label: "Galerie", emoji: "📸" },
  { href: "/spotify", icon: Music, label: "Playlist", emoji: "🎵" },
  { href: "/billard", icon: Gamepad2, label: "Billard", emoji: "🎱" },
  { href: "/badges", icon: Award, label: "Badges", emoji: "🏅" },
];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { currentParticipant, logout, refreshAuth, isAdmin } = useAuth();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [updating, setUpdating] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const handleChangePassword = async () => {
    if (!currentParticipant || !newPassword.trim()) return;
    setUpdating(true);
    setStatusMsg("");
    const success = await updatePassword(currentParticipant.id, newPassword.trim());
    if (success) {
      await refreshAuth();
      setStatusMsg("Mot de passe mis à jour ! ✅");
      setNewPassword("");
      setTimeout(() => {
        setShowPasswordForm(false);
        setStatusMsg("");
      }, 2000);
    } else {
      setStatusMsg("Erreur lors de la mise à jour ❌");
    }
    setUpdating(false);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-heavy border-t border-border safe-area-inset-bottom">
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

        <FeedbackButton />

        <Sheet open={open} onOpenChange={(val) => { setOpen(val); if(!val) { setShowPasswordForm(false); setStatusMsg(""); setNewPassword(""); } }}>
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
                return (
                  <Link
                    key={item.href}
                    href={item.href}
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
                  </Link>
                );
              })}
            </div>
            {/* Admin link */}
            {isAdmin && (
              <div className="mt-2">
                <Link
                  href="/admin/feedback"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border transition-all",
                    pathname === "/admin/feedback"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-primary/20 hover:border-primary/40 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="text-2xl">📋</span>
                  <div>
                    <span className="text-xs font-medium">Feedback Admin</span>
                    <p className="text-[10px] text-muted-foreground">Bugs & idées des potes</p>
                  </div>
                </Link>
              </div>
            )}
            {/* User info + logout / change password */}
            {currentParticipant && (
              <div className="flex flex-col gap-3 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
                      {currentParticipant.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{currentParticipant.name}</p>
                      {currentParticipant.pseudo && (
                        <p className="text-[10px] text-muted-foreground">{currentParticipant.pseudo}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowPasswordForm(!showPasswordForm)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-border"
                    >
                      <KeyRound className="w-3 h-3" />
                      Code
                    </button>
                    <button
                      onClick={() => { logout(); setOpen(false); }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors border border-border"
                    >
                      <LogOut className="w-3 h-3" />
                      Changer
                    </button>
                  </div>
                </div>

                {showPasswordForm && (
                  <div className="p-3 bg-muted/50 rounded-xl border border-border space-y-2 mt-2">
                    <label className="text-xs font-semibold text-muted-foreground block">
                      Définir ton mot de passe personnel :
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        placeholder="Nouveau code..."
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={updating}
                        className="bg-background h-9 text-xs"
                      />
                      <button
                        onClick={handleChangePassword}
                        disabled={updating || !newPassword.trim()}
                        className="bg-primary text-primary-foreground p-2 rounded-lg hover:opacity-90 disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setShowPasswordForm(false); setStatusMsg(""); setNewPassword(""); }}
                        disabled={updating}
                        className="bg-muted text-muted-foreground p-2 rounded-lg hover:bg-muted/80 border border-border"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {statusMsg && (
                      <p className="text-[10px] font-semibold text-primary">{statusMsg}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
