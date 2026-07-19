"use client";

import { useEffect, useState } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarChart3, Loader2, Plus, X, Trash2, Lock, Unlock } from "lucide-react";
import { getPolls, getPollVotes, votePoll, createPoll, deletePoll, togglePollCloseStatus } from "@/lib/supabase-queries";
import { supabase } from "@/lib/supabase";
import type { Poll, PollVote } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";

export default function SondagesPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [votesMap, setVotesMap] = useState<Record<string, PollVote[]>>({});
  const [loading, setLoading] = useState(true);
  const { currentParticipant, participants, isAdmin } = useAuth();
  const selectedParticipant = currentParticipant?.id || "";

  // Create poll form
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [submitting, setSubmitting] = useState(false);

  const fetchInitial = async () => {
    const pollsData = await getPolls();
    setPolls(pollsData);

    const votes: Record<string, PollVote[]> = {};
    for (const poll of pollsData) {
      votes[poll.id] = await getPollVotes(poll.id);
    }
    setVotesMap(votes);
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;

    fetchInitial().then(() => {
      if (!mounted) return;
    });

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
          fetchInitial();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "polls" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
        (_payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
          if (!mounted) return;
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

  const handleCreatePoll = async () => {
    if (!question.trim() || !selectedParticipant) return;
    const validOptions = options.filter((o) => o.trim());
    if (validOptions.length < 2) return;

    setSubmitting(true);
    const success = await createPoll(question.trim(), validOptions, selectedParticipant);
    if (success) {
      setQuestion("");
      setOptions(["", ""]);
      setShowForm(false);
      await fetchInitial();
    }
    setSubmitting(false);
  };

  const handleDeletePoll = async (pollId: string) => {
    await deletePoll(pollId);
    await fetchInitial();
  };

  const addOption = () => {
    if (options.length < 6) setOptions([...options, ""]);
  };

  const removeOption = (idx: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== idx));
  };

  const updateOption = (idx: number, value: string) => {
    const updated = [...options];
    updated[idx] = value;
    setOptions(updated);
  };

  const getVoteCount = (pollId: string, optionIndex: number) => {
    return (votesMap[pollId] || []).filter((v) => v.option_index === optionIndex).length;
  };

  const getTotalVotes = (pollId: string) => {
    return (votesMap[pollId] || []).length;
  };

  const hasVoted = (pollId: string) => {
    if (!selectedParticipant) return false;
    return (votesMap[pollId] || []).some((v) => v.participant_id === selectedParticipant);
  };

  return (
    <main className="pb-20 min-h-screen">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Sondages 📊</h1>
          </div>
        </div>
        <p className="text-muted-foreground text-sm mb-4">
          Votez pour les vraies questions importantes
        </p>

        {/* CREATE POLL BUTTON */}
        <div className="mb-6">
          <Button
            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-purple-500/20"
            onClick={() => {
              setShowForm(!showForm);
              if (showForm) { setQuestion(""); setOptions(["", ""]); }
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            {showForm ? "Fermer" : "🗳️ Créer un sondage"}
          </Button>
        </div>

        {/* CREATE FORM */}
        {showForm && (
          <Card className="mb-6 card-glow-violet overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm">Nouveau sondage</h3>
                <button onClick={() => { setShowForm(false); setQuestion(""); setOptions(["", ""]); }} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <Input
                placeholder="Ta question..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="bg-card border-border"
              />

              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChange={(e) => updateOption(idx, e.target.value)}
                      className="bg-card border-border flex-1"
                    />
                    {options.length > 2 && (
                      <button onClick={() => removeOption(idx)} className="text-muted-foreground hover:text-red-400 p-1">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {options.length < 6 && (
                <button
                  onClick={addOption}
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  + Ajouter une option
                </button>
              )}

              <Button
                onClick={handleCreatePoll}
                disabled={submitting || !question.trim() || options.filter((o) => o.trim()).length < 2}
                className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold rounded-xl"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {submitting ? "Création..." : "Créer le sondage 🗳️"}
              </Button>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : polls.length === 0 ? (
          <div className="p-8 rounded-2xl bg-card border border-border text-center">
            <span className="text-4xl block mb-3">🗳️</span>
            <p className="text-muted-foreground text-sm">
              Aucun sondage pour l&apos;instant.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Crée le premier sondage ! 👆
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {polls.map((poll) => {
              const total = getTotalVotes(poll.id);
              const voted = hasVoted(poll.id);
              const isCreator = poll.created_by === selectedParticipant;
              return (
                <Card key={poll.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm leading-snug">{poll.question}</h3>
                        <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                          <span>Proposé par</span>
                          <span className="font-semibold text-foreground inline-flex items-center gap-1">
                            {poll.creator?.emoji_avatar || "👤"} {poll.creator?.pseudo || poll.creator?.name || "Quelqu'un"}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 ml-2">
                        {isAdmin && (
                          <button
                            onClick={async () => {
                              const nextClosed = !poll.is_closed;
                              const ok = await togglePollCloseStatus(poll.id, nextClosed);
                              if (ok) {
                                setPolls((prev) =>
                                  prev.map((item) => (item.id === poll.id ? { ...item, is_closed: nextClosed } : item))
                                );
                              }
                            }}
                            className={`p-1 transition-colors ${
                              poll.is_closed ? "text-red-400 hover:text-emerald-400" : "text-muted-foreground hover:text-red-400"
                            }`}
                            title={poll.is_closed ? "Rouvrir le sondage" : "Clôturer le sondage (Admin)"}
                          >
                            {poll.is_closed ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        {(isCreator || isAdmin) && (
                          <button
                            onClick={() => handleDeletePoll(poll.id)}
                            className="text-muted-foreground hover:text-red-400 transition-colors p-1"
                            title="Supprimer ce sondage"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {poll.is_closed && (
                      <div className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        <span>Ce sondage est clôturé. Les votes sont désormais fermés.</span>
                      </div>
                    )}
                    <div className="space-y-2">
                      {poll.options.map((option, idx) => {
                        const count = getVoteCount(poll.id, idx);
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        const myVote = (votesMap[poll.id] || []).find((v) => v.participant_id === selectedParticipant);
                        const isSelected = myVote?.option_index === idx;

                        const optionVotes = (votesMap[poll.id] || []).filter((v) => v.option_index === idx);
                        const optionVoters = optionVotes
                          .map((v) => participants.find((p) => p.id === v.participant_id))
                          .filter((p): p is typeof participants[0] => Boolean(p));

                        return (
                          <button
                            key={idx}
                            onClick={() => handleVote(poll.id, idx)}
                            className="w-full text-left"
                          >
                            <div
                              className={`relative overflow-hidden rounded-lg border p-3 transition-all ${
                                isSelected
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:border-primary/30"
                              }`}
                            >
                              {/* Background bar */}
                              <div
                                className="absolute inset-y-0 left-0 bg-primary/10 transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                              <div className="relative flex items-center justify-between">
                                <span className="text-sm font-semibold">
                                  {isSelected && "✓ "}{option}
                                </span>
                                <span className="text-xs text-muted-foreground font-medium shrink-0 ml-2">
                                  {count} vote{count !== 1 ? "s" : ""} ({pct}%)
                                </span>
                              </div>

                              {/* Voters List at a glance */}
                              {optionVoters.length > 0 && (
                                <div className="relative mt-2 pt-2 border-t border-border/30 flex flex-wrap items-center gap-1.5">
                                  {optionVoters.map((voter) => (
                                    <span
                                      key={voter.id}
                                      className="inline-flex items-center gap-1 bg-background/80 hover:bg-background border border-border/50 text-foreground text-[10px] px-2 py-0.5 rounded-full shadow-sm"
                                      title={voter.pseudo || voter.name}
                                    >
                                      <span className="text-xs">{voter.emoji_avatar || "👤"}</span>
                                      <span className="font-semibold">{voter.pseudo || voter.name}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[10px] text-muted-foreground">
                        {total > 0 ? `${total} vote${total !== 1 ? "s" : ""} au total` : "Sois le premier à voter !"}
                      </p>
                      {voted && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-400">
                          ✓ Tu as voté
                        </span>
                      )}
                      {total > 0 && !voted && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary animate-pulse">
                          📊 {total} vote{total !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
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
