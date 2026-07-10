"use client";

import { useEffect, useState } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Loader2 } from "lucide-react";
import { getPolls, getPollVotes, votePoll } from "@/lib/supabase-queries";
import { supabase } from "@/lib/supabase";
import type { Poll, PollVote } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";

export default function SondagesPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [votesMap, setVotesMap] = useState<Record<string, PollVote[]>>({});
  const [loading, setLoading] = useState(true);
  const { currentParticipant } = useAuth();
  const selectedParticipant = currentParticipant?.id || "";

  useEffect(() => {
    let mounted = true;

    async function fetchInitial() {
      const pollsData = await getPolls();
      if (!mounted) return;
      setPolls(pollsData);

      const votes: Record<string, PollVote[]> = {};
      for (const poll of pollsData) {
        votes[poll.id] = await getPollVotes(poll.id);
      }
      if (!mounted) return;
      setVotesMap(votes);
      setLoading(false);
    }
    fetchInitial();

    // Realtime subscription for poll votes
    const existingChannel = supabase.getChannels().find(
      (ch) => ch.topic === "realtime:polls-realtime"
    );
    if (existingChannel) supabase.removeChannel(existingChannel);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (supabase as any)
      .channel("polls-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "poll_votes" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
        (_payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
          if (!mounted) return;
          // Re-fetch all votes to update bars in real-time
          fetchInitial();
        }
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Realtime polls connecté");
        }
      });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const handleVote = async (pollId: string, optionIndex: number) => {
    if (!selectedParticipant) return;
    await votePoll(pollId, selectedParticipant, optionIndex);
    const updated = await getPollVotes(pollId);
    setVotesMap((prev) => ({ ...prev, [pollId]: updated }));
  };

  const getVoteCount = (pollId: string, optionIndex: number) => {
    return (votesMap[pollId] || []).filter((v) => v.option_index === optionIndex).length;
  };

  const getTotalVotes = (pollId: string) => {
    return (votesMap[pollId] || []).length;
  };

  return (
    <main className="pb-20 min-h-screen">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Sondages 📊</h1>
        </div>
        <p className="text-muted-foreground text-sm mb-6">
          Votez pour les vraies questions importantes
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : polls.length === 0 ? (
          <div className="p-8 rounded-2xl bg-card border border-border text-center">
            <span className="text-4xl block mb-3">🗳️</span>
            <p className="text-muted-foreground text-sm">
              Aucun sondage pour l&apos;instant. Bientôt !
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              (Les sondages seront créés par l&apos;admin)
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {polls.map((poll) => {
              const total = getTotalVotes(poll.id);
              return (
                <Card key={poll.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <h3 className="font-bold text-sm mb-3">{poll.question}</h3>
                    <div className="space-y-2">
                      {poll.options.map((option, idx) => {
                        const count = getVoteCount(poll.id, idx);
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        return (
                          <button
                            key={idx}
                            onClick={() => handleVote(poll.id, idx)}
                            className="w-full text-left"
                          >
                            <div className="relative overflow-hidden rounded-lg border border-border p-3 hover:border-primary/30 transition-colors">
                              {/* Background bar */}
                              <div
                                className="absolute inset-y-0 left-0 bg-primary/10 transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                              <div className="relative flex items-center justify-between">
                                <span className="text-sm">{option}</span>
                                <span className="text-xs text-muted-foreground font-medium">
                                  {count} vote{count !== 1 ? "s" : ""} ({pct}%)
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 text-right">
                      {total} vote{total !== 1 ? "s" : ""} au total
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <MobileNav />
    </main>
  );
}
