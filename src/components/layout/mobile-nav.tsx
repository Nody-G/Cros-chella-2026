"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Gamepad2, CalendarDays, MoreHorizontal, LogOut, UserCircle, Award, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Droplets, BarChart3, MessageCircle, ImageIcon, Music, KeyRound, Check, X, Wine, Megaphone } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { FeedbackButton } from "@/components/layout/feedback-button";
import { updatePassword } from "@/lib/supabase-queries";
import { Input } from "@/components/ui/input";

const mainNavItems = [
  { href: "/", icon: Home, label: "Accueil" },
  { href: "/profil", icon: UserCircle, label: "Mon Profil" },
  { href: "/participants", icon: Users, label: "Potes" },
  { href: "/chat", icon: MessageCircle, label: "Chat" },
  { href: "/programme", icon: CalendarDays, label: "Programme" },
];

const moreNavItems = [
  { href: "/jeux", icon: Gamepad2, label: "Jeux", emoji: "🎮" },
  { href: "/depenses", icon: Wallet, label: "Dépenses", emoji: "💰" },
  { href: "/alcool", icon: Wine, label: "Alcool", emoji: "🍻" },
  { href: "/spots", icon: Droplets, label: "Baignade", emoji: "🏊" },
  { href: "/sondages", icon: BarChart3, label: "Sondages", emoji: "📊" },
  { href: "/galerie", icon: ImageIcon, label: "Galerie", emoji: "📸" },
  { href: "/spotify", icon: Music, label: "Playlist", emoji: "🎵" },
  { href: "/billard", icon: Gamepad2, label: "Billard", emoji: "🎱" },
  { href: "/badges", icon: Award, label: "Badges", emoji: "🏅" },
  { href: "/updates", icon: Megaphone, label: "Mises à jour", emoji: "📢" },
];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { currentParticipant, logout, refreshAuth, isAdmin } = useAuth();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [updating, setUpdating] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [hasNewChatMessages, setHasNewChatMessages] = useState(false);
  const [hasNewPhotos, setHasNewPhotos] = useState(false);
  const [hasNewGames, setHasNewGames] = useState(false);
  const [hasNewExpenses, setHasNewExpenses] = useState(false);
  const [hasNewPolls, setHasNewPolls] = useState(false);
  const [hasNewBadges, setHasNewBadges] = useState(false);
  const [hasNewProgram, setHasNewProgram] = useState(false);

  // Check for new chat messages
  useEffect(() => {
    if (!currentParticipant) return;

    const checkNewMessages = async () => {
      const lastVisit = localStorage.getItem("chatLastVisit");
      if (!lastVisit) {
        // Never visited chat → show badge if any messages exist
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .is("deleted_at", null);
        setHasNewChatMessages((count || 0) > 0);
        return;
      }
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null)
        .gt("created_at", lastVisit);
      setHasNewChatMessages((count || 0) > 0);
    };

    checkNewMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel("nav-chat-badge")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const newMsg = payload.new as { created_at: string; author_id: string };
        // Don't show badge for own messages
        if (newMsg.author_id === currentParticipant.id) return;
        const lastVisit = localStorage.getItem("chatLastVisit");
        if (!lastVisit || newMsg.created_at > lastVisit) {
          setHasNewChatMessages(true);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentParticipant]);

  // Clear badge when visiting /chat
  useEffect(() => {
    if (pathname === "/chat") {
      localStorage.setItem("chatLastVisit", new Date().toISOString());
      setHasNewChatMessages(false);
    }
  }, [pathname]);

  // Check for new photos (galerie)
  useEffect(() => {
    if (!currentParticipant) return;

    const checkNewPhotos = async () => {
      const lastVisit = localStorage.getItem("galerieLastVisit");
      if (!lastVisit) {
        const { count } = await supabase
          .from("photos")
          .select("*", { count: "exact", head: true })
          .is("deleted_at", null);
        setHasNewPhotos((count || 0) > 0);
        return;
      }
      const { count } = await supabase
        .from("photos")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null)
        .gt("created_at", lastVisit);
      setHasNewPhotos((count || 0) > 0);
    };

    checkNewPhotos();

    const channel = supabase
      .channel("nav-gallery-badge")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "photos" }, (payload) => {
        const newPhoto = payload.new as { created_at: string; author_id: string };
        if (newPhoto.author_id === currentParticipant.id) return;
        const lastVisit = localStorage.getItem("galerieLastVisit");
        if (!lastVisit || newPhoto.created_at > lastVisit) {
          setHasNewPhotos(true);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentParticipant]);

  // Clear badge when visiting /galerie
  useEffect(() => {
    if (pathname === "/galerie") {
      localStorage.setItem("galerieLastVisit", new Date().toISOString());
      setHasNewPhotos(false);
    }
  }, [pathname]);

  // Check for new games
  useEffect(() => {
    if (!currentParticipant) return;

    const checkNewGames = async () => {
      const lastVisit = localStorage.getItem("jeuxLastVisit");
      if (!lastVisit) {
        const { count } = await supabase
          .from("games")
          .select("*", { count: "exact", head: true });
        setHasNewGames((count || 0) > 0);
        return;
      }
      const { count } = await supabase
        .from("games")
        .select("*", { count: "exact", head: true })
        .gt("created_at", lastVisit);
      setHasNewGames((count || 0) > 0);
    };

    checkNewGames();

    const channel = supabase
      .channel("nav-games-badge")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "games" }, (payload) => {
        const newGame = payload.new as { created_at: string; author_id: string };
        if (newGame.author_id === currentParticipant.id) return;
        const lastVisit = localStorage.getItem("jeuxLastVisit");
        if (!lastVisit || newGame.created_at > lastVisit) {
          setHasNewGames(true);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentParticipant]);

  // Clear badge when visiting /jeux
  useEffect(() => {
    if (pathname === "/jeux") {
      localStorage.setItem("jeuxLastVisit", new Date().toISOString());
      setHasNewGames(false);
    }
  }, [pathname]);

  // Check for new expenses
  useEffect(() => {
    if (!currentParticipant) return;

    const checkNewExpenses = async () => {
      const lastVisit = localStorage.getItem("depensesLastVisit");
      if (!lastVisit) {
        const { count } = await supabase
          .from("expenses")
          .select("*", { count: "exact", head: true });
        setHasNewExpenses((count || 0) > 0);
        return;
      }
      const { count } = await supabase
        .from("expenses")
        .select("*", { count: "exact", head: true })
        .gt("created_at", lastVisit);
      setHasNewExpenses((count || 0) > 0);
    };

    checkNewExpenses();

    const channel = supabase
      .channel("nav-expenses-badge")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "expenses" }, (payload) => {
        const newExpense = payload.new as { created_at: string; paid_by: string };
        if (newExpense.paid_by === currentParticipant.id) return;
        const lastVisit = localStorage.getItem("depensesLastVisit");
        if (!lastVisit || newExpense.created_at > lastVisit) {
          setHasNewExpenses(true);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentParticipant]);

  // Clear badge when visiting /depenses
  useEffect(() => {
    if (pathname === "/depenses") {
      localStorage.setItem("depensesLastVisit", new Date().toISOString());
      setHasNewExpenses(false);
    }
  }, [pathname]);

  // Check for new polls
  useEffect(() => {
    if (!currentParticipant) return;
    const checkNewPolls = async () => {
      const lastVisit = localStorage.getItem("sondagesLastVisit");
      if (!lastVisit) {
        const { count } = await supabase.from("polls").select("*", { count: "exact", head: true });
        setHasNewPolls((count || 0) > 0);
        return;
      }
      const { count } = await supabase.from("polls").select("*", { count: "exact", head: true }).gt("created_at", lastVisit);
      setHasNewPolls((count || 0) > 0);
    };
    checkNewPolls();
    const channel = supabase.channel("nav-polls-badge")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "polls" }, (payload) => {
        const newPoll = payload.new as { created_at: string; created_by: string };
        if (newPoll.created_by === currentParticipant.id) return;
        const lastVisit = localStorage.getItem("sondagesLastVisit");
        if (!lastVisit || newPoll.created_at > lastVisit) setHasNewPolls(true);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentParticipant]);

  useEffect(() => {
    if (pathname === "/sondages") {
      localStorage.setItem("sondagesLastVisit", new Date().toISOString());
      setHasNewPolls(false);
    }
  }, [pathname]);

  // Check for new badges
  useEffect(() => {
    if (!currentParticipant) return;
    const checkNewBadges = async () => {
      const lastVisit = localStorage.getItem("badgesLastVisit");
      if (!lastVisit) {
        const { count } = await supabase.from("custom_badges").select("*", { count: "exact", head: true });
        setHasNewBadges((count || 0) > 0);
        return;
      }
      const { count } = await supabase.from("custom_badges").select("*", { count: "exact", head: true }).gt("created_at", lastVisit);
      setHasNewBadges((count || 0) > 0);
    };
    checkNewBadges();
    const channel = supabase.channel("nav-badges-badge")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "custom_badges" }, (payload) => {
        const newBadge = payload.new as { created_at: string; awarded_by: string };
        if (newBadge.awarded_by === currentParticipant.id) return;
        const lastVisit = localStorage.getItem("badgesLastVisit");
        if (!lastVisit || newBadge.created_at > lastVisit) setHasNewBadges(true);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentParticipant]);

  useEffect(() => {
    if (pathname === "/badges") {
      localStorage.setItem("badgesLastVisit", new Date().toISOString());
      setHasNewBadges(false);
    }
  }, [pathname]);

  // Check for new program items
  useEffect(() => {
    if (!currentParticipant) return;
    const checkNewProgram = async () => {
      const lastVisit = localStorage.getItem("programLastVisit");
      if (!lastVisit) {
        const { count } = await supabase.from("program").select("*", { count: "exact", head: true });
        setHasNewProgram((count || 0) > 0);
        return;
      }
      const { count } = await supabase.from("program").select("*", { count: "exact", head: true }).gt("updated_at", lastVisit);
      setHasNewProgram((count || 0) > 0);
    };
    checkNewProgram();
    const channel = supabase.channel("nav-program-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "program" }, () => {
        const lastVisit = localStorage.getItem("programLastVisit");
        if (!lastVisit) { setHasNewProgram(true); return; }
        setHasNewProgram(true);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentParticipant]);

  useEffect(() => {
    if (pathname === "/programme") {
      localStorage.setItem("programLastVisit", new Date().toISOString());
      setHasNewProgram(false);
    }
  }, [pathname]);

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
          const showBadge = item.href === "/chat" && hasNewChatMessages;
          const showProgramBadge = item.href === "/programme" && hasNewProgram;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors relative",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <item.icon className="w-5 h-5" />
                {(showBadge || showProgramBadge) && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background animate-pulse" />
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}

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
                const showBadge =
                  (item.href === "/galerie" && hasNewPhotos) ||
                  (item.href === "/jeux" && hasNewGames) ||
                  (item.href === "/depenses" && hasNewExpenses) ||
                  (item.href === "/sondages" && hasNewPolls) ||
                  (item.href === "/badges" && hasNewBadges);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all relative",
                      isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/30 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span className="text-2xl">{item.emoji}</span>
                    {showBadge && (
                      <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background animate-pulse" />
                    )}
                    <span className="text-xs font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
            {/* Feedback button */}
            <div className="mt-2 flex justify-center">
              <FeedbackButton />
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
