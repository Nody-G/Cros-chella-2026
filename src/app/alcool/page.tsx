"use client";

import { useEffect, useState, useMemo } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wine, Loader2, Users, Star, Heart, Sparkles, ChevronDown, ChevronUp, Cigarette } from "lucide-react";
import { getParticipants } from "@/lib/supabase-queries";
import { supabase } from "@/lib/supabase";
import type { Participant } from "@/lib/types";
import { ALCOHOL_MAP, ALCOHOL_LIST, ALCOHOL_GROUPS } from "@/lib/alcohol-data";
import { getSmokingLabel, getSmokingEmoji } from "@/lib/smoking-data";
import { useAuth } from "@/hooks/use-auth";

interface Compatibility {
  participant: Participant;
  score: number; // 0-100
  sharedFavorites: boolean; // même favori !
  sharedCount: number; // nombre d'alcools en commun
  totalMine: number;
  sharedAlcohols: string[]; // values en commun
}

function getEmoji(name: string): string {
  const map: Record<string, string> = {
    Niels: "🗿", Nelly: "🦊", Alva: "🦄", Charly: "🤡",
    Ludo: "🌶️", Xav: "🗿", Hervé: "🤠", Célis: "🗿",
    Botardèche: "🤖",
  };
  return map[name] || "🎪";
}

export default function AlcoolPage() {
  const { currentParticipant } = useAuth();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      const data = await getParticipants();
      if (mounted) {
        setParticipants(data);
        setLoading(false);
      }
    }
    fetchData();

    // Realtime subscription for live alcohol preference updates
    const existingChannel = supabase.getChannels().find(
      (ch) => ch.topic === "realtime:alcool-realtime"
    );
    if (existingChannel) {
      supabase.removeChannel(existingChannel);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (supabase as any)
      .channel("alcool-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participants" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
          if (!mounted) return;
          if (payload.eventType === "UPDATE" && payload.new) {
            const updated = payload.new as unknown as Participant;
            setParticipants((prev) =>
              prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
            );
          } else if (payload.eventType === "INSERT" && payload.new) {
            setParticipants((prev) => [...prev, payload.new as unknown as Participant]);
          }
        }
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Realtime alcool connecté");
        }
      });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Current user's data
  const me = useMemo(() => {
    if (!currentParticipant) return null;
    return participants.find((p) => p.id === currentParticipant.id) || null;
  }, [currentParticipant, participants]);

  const myFavorites = useMemo(() => me?.alcohol_preferences || [], [me]);
  const myTopPick = useMemo(() => me?.favorite_alcohol || null, [me]);

  // Calculate compatibility with each other participant
  const compatibilities = useMemo((): Compatibility[] => {
    if (!me || myFavorites.length === 0) return [];

    return participants
      .filter((p) => p.id !== me.id && p.alcohol_preferences && p.alcohol_preferences.length > 0)
      .map((p) => {
        const theirFavorites = p.alcohol_preferences || [];
        const theirTopPick = p.favorite_alcohol || null;

        // Shared alcohols
        const shared = myFavorites.filter((a) => theirFavorites.includes(a));
        const union = new Set([...myFavorites, ...theirFavorites]);
        const score = Math.round((shared.length / union.size) * 100);

        // Same favorite?
        const sharedFavorites = myTopPick !== null && theirTopPick === myTopPick;

        return {
          participant: p,
          score,
          sharedFavorites,
          sharedCount: shared.length,
          totalMine: myFavorites.length,
          sharedAlcohols: shared,
        };
      })
      .sort((a, b) => {
        // Favorites match first, then by score
        if (a.sharedFavorites && !b.sharedFavorites) return -1;
        if (!a.sharedFavorites && b.sharedFavorites) return 1;
        return b.score - a.score;
      });
  }, [me, participants, myFavorites, myTopPick]);

  // Stats
  const stats = useMemo(() => {
    if (!me) return null;
    const superCount = compatibilities.filter((c) => c.sharedFavorites).length;
    const highCount = compatibilities.filter((c) => c.score >= 50 && !c.sharedFavorites).length;
    const medCount = compatibilities.filter((c) => c.score >= 20 && c.score < 50).length;
    return { superCount, highCount, medCount, total: compatibilities.length };
  }, [compatibilities, me]);

  // Most popular alcohols among all participants
  const popularAlcohols = useMemo(() => {
    const counts: Record<string, number> = {};
    participants.forEach((p) => {
      (p.alcohol_preferences || []).forEach((a) => {
        counts[a] = (counts[a] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [participants]);

  // Has anyone filled their profile?
  const hasData = participants.some(
    (p) => p.alcohol_preferences && p.alcohol_preferences.length > 0
  );

  // Smoking stats
  const smokingStats = useMemo(() => {
    const counts: Record<string, number> = {};
    let smokerCount = 0;
    let nonSmokerCount = 0;
    participants.forEach((p) => {
      if (p.smoking_preferences && p.smoking_preferences.length > 0) {
        smokerCount++;
        p.smoking_preferences.forEach((s) => {
          counts[s] = (counts[s] || 0) + 1;
        });
      } else {
        nonSmokerCount++;
      }
    });
    const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return { ranked, smokerCount, nonSmokerCount };
  }, [participants]);

  if (loading) {
    return (
      <main className="pb-20 min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="pb-20 min-h-screen">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🍻</div>
          <h1 className="text-2xl font-bold text-foreground">
            Compatibilité <span className="text-primary">Alcool</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Découvre qui partage tes goûts (ou pas) pour le week-end 🍸
          </p>
        </div>

        {/* No data yet */}
        {!hasData && (
          <Card className="mb-6">
            <CardContent className="p-6 text-center">
              <Wine className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">
                Personne n&apos;a encore rempli ses préférences alcool... 😢
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Va sur <a href="/profil" className="text-primary underline">ton profil</a> pour choisir tes alcools favoris !
              </p>
            </CardContent>
          </Card>
        )}

        {/* Current user not filled */}
        {hasData && myFavorites.length === 0 && (
          <Card className="mb-6 border-primary/30">
            <CardContent className="p-5 text-center">
              <p className="text-sm text-foreground mb-2">
                🍺 Tu n&apos;as pas encore choisi tes alcools favoris !
              </p>
              <a
                href="/profil"
                className="inline-block mt-2 px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
              >
                Remplir mon profil →
              </a>
            </CardContent>
          </Card>
        )}

        {/* My favorites summary — grouped by type */}
        {myFavorites.length > 0 && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Tes goûts à toi</h2>
              </div>
              <div className="space-y-2">
                {ALCOHOL_GROUPS.map((group) => {
                  const groupItems = ALCOHOL_LIST.filter(
                    (a) => a.group === group && myFavorites.includes(a.value)
                  );
                  if (groupItems.length === 0) return null;
                  return (
                    <div key={group}>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">
                        {group}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {groupItems.map((item) => {
                          const isFav = item.value === myTopPick;
                          return (
                            <span
                              key={item.value}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border ${
                                isFav
                                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                                  : "bg-card border-border text-foreground"
                              }`}
                            >
                              {item.emoji} {item.label}
                              {isFav && " ⭐"}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        {stats && stats.total > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-6">
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-amber-400">{stats.superCount}</div>
                <div className="text-[10px] text-muted-foreground">⭐ Même favori</div>
              </CardContent>
            </Card>
            <Card className="border-green-500/20 bg-green-500/5">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-green-400">{stats.highCount}</div>
                <div className="text-[10px] text-muted-foreground">🔥 50%+</div>
              </CardContent>
            </Card>
            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-blue-400">{stats.medCount}</div>
                <div className="text-[10px] text-muted-foreground">🍻 20%+</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Compatibility list */}
        {compatibilities.length > 0 && (
          <div className="space-y-3 mb-8">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Tes compatibilités
            </h2>

            {compatibilities.map((c) => {
              const p = c.participant;
              const isExpanded = expandedId === p.id;
              const theirFavorites = p.alcohol_preferences || [];
              const theirTopPick = p.favorite_alcohol;

              return (
                <Card
                  key={p.id}
                  className={`overflow-hidden transition-all duration-300 ${c.sharedFavorites
                    ? "border-amber-500/40 bg-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.1)]"
                    : c.score >= 50
                      ? "border-green-500/20 bg-green-500/5"
                      : ""
                    }`}
                >
                  <CardContent className="p-4">
                    {/* Header row */}
                    <div
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : p.id)}
                    >
                      {/* Avatar */}
                      <div className="text-2xl flex-shrink-0">
                        {p.emoji_avatar || getEmoji(p.name)}
                      </div>

                      {/* Name + score */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-foreground truncate">
                            {p.name}
                          </h3>
                          {c.sharedFavorites && (
                            <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-300 border-amber-500/30">
                              ⭐ MÊME FAVORI
                            </Badge>
                          )}
                        </div>
                        {p.pseudo && (
                          <p className="text-[11px] text-muted-foreground truncate">
                            aka &ldquo;{p.pseudo}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* Score */}
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div
                          className={`text-lg font-bold ${c.sharedFavorites
                            ? "text-amber-400"
                            : c.score >= 50
                              ? "text-green-400"
                              : c.score >= 20
                                ? "text-blue-400"
                                : "text-muted-foreground"
                            }`}
                        >
                          {c.score}%
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {c.sharedCount}/{new Set([...myFavorites, ...theirFavorites]).size}
                        </div>
                      </div>

                      {/* Expand arrow */}
                      <div className="text-muted-foreground/50 flex-shrink-0">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>

                    {/* Compatibility bar */}
                    <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${c.sharedFavorites
                          ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                          : c.score >= 50
                            ? "bg-gradient-to-r from-green-500 to-emerald-400"
                            : c.score >= 20
                              ? "bg-gradient-to-r from-blue-500 to-cyan-400"
                              : "bg-muted-foreground/30"
                          }`}
                        style={{ width: `${Math.max(c.score, 3)}%` }}
                      />
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="mt-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                        {/* SUPER compatible banner */}
                        {c.sharedFavorites && myTopPick && (
                          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center">
                            <div className="text-2xl mb-1">🍻⭐🍻</div>
                            <p className="text-xs text-amber-300 font-medium">
                              Vous avez le MÊME alcool favori :{" "}
                              <span className="font-bold">
                                {ALCOHOL_MAP[myTopPick]?.emoji} {ALCOHOL_MAP[myTopPick]?.label}
                              </span>
                            </p>
                            <p className="text-[10px] text-amber-400/70 mt-1">
                              C&apos;est ce qu&apos;on appelle une connexion spiritueux-elle 🥃
                            </p>
                          </div>
                        )}

                        {/* Shared alcohols — grouped by type */}
                        {c.sharedAlcohols.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                              <Heart className="w-3 h-3 text-red-400" />
                              Alcools en commun ({c.sharedAlcohols.length})
                            </p>
                            <div className="space-y-1.5">
                              {ALCOHOL_GROUPS.map((group) => {
                                const groupItems = ALCOHOL_LIST.filter(
                                  (a) => a.group === group && c.sharedAlcohols.includes(a.value)
                                );
                                if (groupItems.length === 0) return null;
                                return (
                                  <div key={group}>
                                    <p className="text-[9px] text-muted-foreground/70 font-medium uppercase tracking-wider mb-0.5">
                                      {group}
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {groupItems.map((item) => {
                                        const isBothFav = item.value === myTopPick && item.value === theirTopPick;
                                        return (
                                          <span
                                            key={item.value}
                                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] border ${
                                              isBothFav
                                                ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                                                : "bg-green-500/10 border-green-500/20 text-green-300"
                                            }`}
                                          >
                                            {item.emoji} {item.label}
                                            {isBothFav && " ⭐"}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Their favorites (not in common) — grouped by type */}
                        {theirFavorites.filter((a) => !myFavorites.includes(a)).length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-purple-400" />
                              Ses goûts à lui/elle (pas les tiens)
                            </p>
                            <div className="space-y-1.5">
                              {ALCOHOL_GROUPS.map((group) => {
                                const groupItems = ALCOHOL_LIST.filter(
                                  (a) => a.group === group && theirFavorites.includes(a.value) && !myFavorites.includes(a.value)
                                );
                                if (groupItems.length === 0) return null;
                                return (
                                  <div key={group}>
                                    <p className="text-[9px] text-muted-foreground/70 font-medium uppercase tracking-wider mb-0.5">
                                      {group}
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {groupItems.map((item) => {
                                        const isTheirFav = item.value === theirTopPick;
                                        return (
                                          <span
                                            key={item.value}
                                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] border ${
                                              isTheirFav
                                                ? "bg-purple-500/15 border-purple-500/30 text-purple-300"
                                                : "bg-card border-border text-foreground"
                                            }`}
                                          >
                                            {item.emoji} {item.label}
                                            {isTheirFav && " ⭐"}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Fun message */}
                        <div className="text-center pt-2">
                          {c.sharedFavorites && c.score >= 50 && (
                            <p className="text-xs text-amber-400 italic">
                              &ldquo;Vous êtes faits pour boire ensemble&rdquo; 🥂
                            </p>
                          )}
                          {c.sharedFavorites && c.score < 50 && (
                            <p className="text-xs text-amber-400 italic">
                              &ldquo;Même favori, mais des goûts différents sur le reste... intrigue&rdquo; 🤔
                            </p>
                          )}
                          {!c.sharedFavorites && c.score >= 50 && (
                            <p className="text-xs text-green-400 italic">
                              &ldquo;Beaucoup en commun ! Préparez une dégustation&rdquo; 🍷
                            </p>
                          )}
                          {!c.sharedFavorites && c.score >= 20 && c.score < 50 && (
                            <p className="text-xs text-blue-400 italic">
                              &ldquo;Quelques points communs, ça peut le faire&rdquo; 🍻
                            </p>
                          )}
                          {!c.sharedFavorites && c.score < 20 && (
                            <p className="text-xs text-muted-foreground italic">
                              &ldquo;Pas beaucoup en commun... mais l&apos;opposé s&apos;attire non ?&rdquo; 🤷
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Popular alcohols ranking */}
        {popularAlcohols.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
              <Wine className="w-5 h-5 text-primary" />
              Top alcools du groupe
            </h2>
            <Card>
              <CardContent className="p-4 space-y-2">
                {popularAlcohols.map(([value, count], idx) => {
                  const item = ALCOHOL_MAP[value];
                  if (!item) return null;
                  const maxCount = popularAlcohols[0][1];
                  return (
                    <div key={value} className="flex items-center gap-3">
                      <div className="text-sm font-bold text-muted-foreground w-5 text-right">
                        {idx + 1}
                      </div>
                      <div className="text-lg">{item.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">
                            {item.label}
                          </span>
                          {value === myTopPick && (
                            <Badge className="text-[9px] px-1 py-0 bg-amber-500/20 text-amber-300 border-0">
                              ton fav
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                            style={{ width: `${(count / maxCount) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground flex-shrink-0">
                        {count} {count > 1 ? "potes" : "pote"}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Smoking section */}
        {smokingStats.ranked.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-2">
              <Cigarette className="w-5 h-5 text-primary" />
              Section Fumeur 🚬
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              {smokingStats.smokerCount} fumeur{smokingStats.smokerCount > 1 ? "s" : ""} • {smokingStats.nonSmokerCount} non-fumeur{smokingStats.nonSmokerCount > 1 ? "s" : ""}
            </p>
            <Card>
              <CardContent className="p-4 space-y-2">
                {smokingStats.ranked.map(([value, count], idx) => {
                  const maxCount = smokingStats.ranked[0][1];
                  return (
                    <div key={value} className="flex items-center gap-3">
                      <div className="text-sm font-bold text-muted-foreground w-5 text-right">
                        {idx + 1}
                      </div>
                      <div className="text-lg">{getSmokingEmoji(value)}</div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-foreground">
                          {getSmokingLabel(value)}
                        </span>
                        <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all"
                            style={{ width: `${(count / maxCount) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground flex-shrink-0">
                        {count} {count > 1 ? "potes" : "pote"}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Who smokes what */}
            <div className="mt-4 space-y-2">
              {participants
                .filter((p) => p.smoking_preferences && p.smoking_preferences.length > 0)
                .map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="text-sm">{getEmoji(p.name)}</span>
                    <span className="font-medium text-foreground">{p.name}</span>
                    <span>→</span>
                    <span>
                      {p.smoking_preferences!.map((s) => `${getSmokingEmoji(s)} ${getSmokingLabel(s)}`).join(", ")}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Fun footer */}
        {compatibilities.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-xs text-muted-foreground italic">
              &ldquo;L&apos;alcool c&apos;est mal m&apos;voyez... mais la compatibilité c&apos;est beau&rdquo; 🍻
            </p>
            <p className="text-[10px] text-muted-foreground/50 mt-1">
              Buvez responsable les ruyas. Ou pas. C&apos;est l&apos;Ardèche.
            </p>
          </div>
        )}
      </div>

      <MobileNav />
    </main>
  );
}
