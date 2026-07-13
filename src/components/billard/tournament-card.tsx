"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2, Trophy, X, Play, Users, ChevronDown, ChevronUp } from "lucide-react";
import {
  getBillardTeams,
  createBillardTeam,
  deleteBillardTeam,
  getBillardMatches,
  generateBillardBracket,
  recordBillardResult,
} from "@/lib/supabase-queries";
import type { BillardTournament, BillardTeam, BillardMatch } from "@/lib/types";

interface TournamentCardProps {
  tournament: BillardTournament;
  isAdmin: boolean;
  participants: { id: string; name: string; pseudo: string | null; emoji_avatar: string | null }[];
  onDelete: (id: string) => void;
  refreshKey?: number;
}

export function TournamentCard({ tournament, isAdmin, participants, onDelete, refreshKey }: TournamentCardProps) {
  const [teams, setTeams] = useState<BillardTeam[]>([]);
  const [matches, setMatches] = useState<BillardMatch[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [player1Id, setPlayer1Id] = useState("");
  const [player2Id, setPlayer2Id] = useState("");
  const [starting, setStarting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    const [t, m] = await Promise.all([
      getBillardTeams(tournament.id),
      getBillardMatches(tournament.id),
    ]);
    if (mountedRef.current) {
      setTeams(t);
      setMatches(m);
    }
  }, [tournament.id]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => { mountedRef.current = false; };
  }, [fetchData]);

  // Re-fetch when parent signals a realtime change
  const prevRefreshKey = useRef(refreshKey);
  useEffect(() => {
    if (refreshKey && refreshKey !== prevRefreshKey.current) {
      prevRefreshKey.current = refreshKey;
      fetchData();
    }
  }, [refreshKey, fetchData]);

  // Cleanup confirm timer on unmount
  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    };
  }, []);

  const handleAddTeam = async () => {
    if (!player1Id || !player2Id || player1Id === player2Id) return;
    await createBillardTeam(tournament.id, player1Id, player2Id);
    setPlayer1Id("");
    setPlayer2Id("");
    setShowAddTeam(false);
    await fetchData();
  };

  const handleDeleteTeam = async (teamId: string) => {
    await deleteBillardTeam(teamId);
    await fetchData();
  };

  const handleStart = async () => {
    if (teams.length < 2) return;
    setStarting(true);
    await generateBillardBracket(tournament.id);
    await fetchData();
    setStarting(false);
  };

  const handlePickWinner = async (matchId: string, winnerTeamId: string) => {
    await recordBillardResult(matchId, winnerTeamId);
    await fetchData();
  };

  // Double-tap delete (mobile-friendly, no confirm())
  const handleDeleteClick = () => {
    if (confirmDelete) {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      setConfirmDelete(false);
      onDelete(tournament.id);
    } else {
      setConfirmDelete(true);
      confirmTimerRef.current = setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  const statusLabel = tournament.status === "done" ? "🏆 Terminé" : tournament.status === "active" ? "⚡ En cours" : "⏳ Préparation";

  // Group matches by round
  const roundMap = new Map<number, BillardMatch[]>();
  matches.forEach((m) => {
    if (!roundMap.has(m.round)) roundMap.set(m.round, []);
    roundMap.get(m.round)!.push(m);
  });
  const rounds = Array.from(roundMap.entries()).sort(([a], [b]) => b - a);
  // Find winner team name
  const winnerTeam = tournament.winner_team_id
    ? teams.find((t) => t.id === tournament.winner_team_id)
    : null;

  // Memoize player name lookup
  const participantMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of participants) {
      map.set(p.id, p.pseudo || p.name);
    }
    return map;
  }, [participants]);

  const pname = useCallback((id: string) => participantMap.get(id) || "?", [participantMap]);

  const teamName = useCallback((team: BillardTeam | undefined | null) => {
    if (!team) return "❓ À définir";
    if (team.team_name) return team.team_name;
    return pname(team.player1_id) + " & " + pname(team.player2_id);
  }, [pname]);

  const roundLabels: Record<number, string> = {};
  rounds.forEach(([r]) => {
    if (r === 2) roundLabels[r] = "🏆 Finale";
    else if (r === 4) roundLabels[r] = "🥉 Demi-finale";
    else roundLabels[r] = `📐 Round ${Math.log2(r)}`;
  });

  return (
    <Card className="bg-white/5 border-white/10 overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3 text-left">
            <span className="text-2xl">{tournament.game_type === "9ball" ? "9️⃣" : "8️⃣"}</span>
            <div>
              <h3 className="font-semibold text-white">{tournament.name}</h3>
              <p className="text-xs text-white/50">{statusLabel} · {teams.length} équipe{teams.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && tournament.status === "setup" && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteClick(); }}
                className={`p-2 rounded-lg transition-colors ${
                  confirmDelete ? "bg-red-600 text-white" : "text-white/30 hover:text-red-400 hover:bg-white/10"
                }`}
                title={confirmDelete ? "Cliquez encore pour confirmer" : "Supprimer"}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            {expanded ? <ChevronUp className="w-5 h-5 text-white/40" /> : <ChevronDown className="w-5 h-5 text-white/40" />}
          </div>
        </button>

        {expanded && (
          <div className="px-4 pb-4 space-y-4">
            {/* Winner banner */}
            {tournament.status === "done" && winnerTeam && (
              <div className="bg-gradient-to-r from-yellow-600/20 to-amber-600/20 border border-yellow-500/30 rounded-xl p-4 text-center">
                <Trophy className="w-8 h-8 mx-auto text-yellow-400 mb-2" />
                <p className="text-yellow-200 font-bold text-lg">{teamName(winnerTeam)}</p>
                <p className="text-yellow-400/70 text-sm">Champion(s) du tournoi ! 🎉</p>
              </div>
            )}

            {/* Teams */}
            {tournament.status === "setup" && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-white/70 flex items-center gap-1.5">
                    <Users className="w-4 h-4" /> Équipes ({teams.length})
                  </h4>
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowAddTeam(!showAddTeam)}
                      className="text-white/60 hover:text-white h-7 px-2"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Ajouter
                    </Button>
                  )}
                </div>

                {showAddTeam && (
                  <div className="mb-3 p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
                    <select
                      value={player1Id}
                      onChange={(e) => setPlayer1Id(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
                    >
                      <option value="">Joueur 1</option>
                      {participants
                        .filter((p) => p.id !== player2Id)
                        .map((p) => (
                          <option key={p.id} value={p.id}>{p.emoji_avatar || "👤"} {p.pseudo || p.name}</option>
                        ))}
                    </select>
                    <p className="text-center text-white/30 text-xs">+</p>
                    <select
                      value={player2Id}
                      onChange={(e) => setPlayer2Id(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
                    >
                      <option value="">Joueur 2</option>
                      {participants
                        .filter((p) => p.id !== player1Id)
                        .map((p) => (
                          <option key={p.id} value={p.id}>{p.emoji_avatar || "👤"} {p.pseudo || p.name}</option>
                        ))}
                    </select>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddTeam} className="flex-1 bg-purple-600 hover:bg-purple-700">
                        Créer l&apos;équipe
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowAddTeam(false)} className="text-white/60">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {teams.length === 0 ? (
                  <p className="text-white/30 text-sm text-center py-3">Pas encore d&apos;équipes</p>
                ) : (
                  <div className="space-y-2">
                    {teams.map((team) => (
                      <div key={team.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/10">
                        <div>
                          <p className="text-white text-sm font-medium">{teamName(team)}</p>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteTeam(team.id)}
                            className="text-white/30 hover:text-red-400 transition-colors p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {isAdmin && teams.length >= 2 && (
                  <Button
                    onClick={handleStart}
                    disabled={starting}
                    className="w-full mt-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    {starting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    Lancer le tournoi ({teams.length} équipes)
                  </Button>
                )}
              </div>
            )}

            {/* Bracket / Matches */}
            {tournament.status !== "setup" && (
              <div>
                {rounds.map(([round, roundMatches]) => (
                  <div key={round} className="mb-4">
                    <h4 className="text-sm font-semibold text-white/60 mb-2">{roundLabels[round] || `Round ${round}`}</h4>
                    <div className="space-y-2">
                      {roundMatches.map((match) => {
                        const isClickable = isAdmin && match.status === "pending" && match.team1_id && match.team2_id;
                        const isDone = match.status === "done" || match.status === "bye";

                        return (
                          <div
                            key={match.id}
                            className={`rounded-lg border overflow-hidden ${
                              isDone
                                ? "border-green-500/20 bg-green-50/5"
                                : match.status === "pending"
                                ? "border-yellow-500/20 bg-yellow-50/5"
                                : "border-white/10 bg-white/5"
                            }`}
                          >
                            <div className="p-3">
                              <div className="flex items-center justify-between text-xs text-white/40 mb-2">
                                <span>
                                  {match.status === "bye"
                                    ? "🆓 Bye"
                                    : match.status === "waiting"
                                    ? "⏳ En attente"
                                    : match.status === "done"
                                    ? "✅ Terminé"
                                    : "🎮 À jouer"}
                                </span>
                              </div>

                              <div className="space-y-1.5">
                                {/* Team 1 */}
                                <button
                                  onClick={() => isClickable && handlePickWinner(match.id, match.team1_id!)}
                                  disabled={!isClickable}
                                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-all ${
                                    match.winner_team_id === match.team1_id
                                      ? "bg-green-600/20 border border-green-500/30"
                                      : isClickable
                                      ? "bg-white/5 hover:bg-white/10 border border-transparent cursor-pointer"
                                      : "bg-white/5 border border-transparent"
                                  }`}
                                >
                                  <span className={`text-sm ${match.winner_team_id === match.team1_id ? "text-green-300 font-semibold" : "text-white/80"}`}>
                                    {teamName(teams.find((t) => t.id === match.team1_id))}
                                  </span>
                                  {match.winner_team_id === match.team1_id && <Trophy className="w-4 h-4 text-yellow-400" />}
                                </button>

                                <p className="text-center text-white/20 text-xs">VS</p>

                                {/* Team 2 */}
                                <button
                                  onClick={() => isClickable && handlePickWinner(match.id, match.team2_id!)}
                                  disabled={!isClickable || !match.team2_id}
                                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-all ${
                                    match.winner_team_id === match.team2_id
                                      ? "bg-green-600/20 border border-green-500/30"
                                      : isClickable
                                      ? "bg-white/5 hover:bg-white/10 border border-transparent cursor-pointer"
                                      : "bg-white/5 border border-transparent"
                                  }`}
                                >
                                  <span className={`text-sm ${match.winner_team_id === match.team2_id ? "text-green-300 font-semibold" : "text-white/80"}`}>
                                    {match.team2_id ? teamName(teams.find((t) => t.id === match.team2_id)) : "❓ À définir"}
                                  </span>
                                  {match.winner_team_id === match.team2_id && <Trophy className="w-4 h-4 text-yellow-400" />}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
