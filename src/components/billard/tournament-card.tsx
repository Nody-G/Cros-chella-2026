"use client";

import { useEffect, useState, useCallback } from "react";
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
}

export function TournamentCard({ tournament, isAdmin, participants, onDelete }: TournamentCardProps) {
  const [teams, setTeams] = useState<BillardTeam[]>([]);
  const [matches, setMatches] = useState<BillardMatch[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [player1Id, setPlayer1Id] = useState("");
  const [player2Id, setPlayer2Id] = useState("");
  const [starting, setStarting] = useState(false);

  const fetch = useCallback(async () => {
    const [t, m] = await Promise.all([
      getBillardTeams(tournament.id),
      getBillardMatches(tournament.id),
    ]);
    setTeams(t);
    setMatches(m);
  }, [tournament.id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Re-fetch every 3s for realtime
  useEffect(() => {
    const interval = setInterval(fetch, 3000);
    return () => clearInterval(interval);
  }, [fetch]);

  const handleAddTeam = async () => {
    if (!player1Id || !player2Id || player1Id === player2Id) return;
    await createBillardTeam(tournament.id, player1Id, player2Id);
    setPlayer1Id("");
    setPlayer2Id("");
    setShowAddTeam(false);
    await fetch();
  };

  const handleDeleteTeam = async (teamId: string) => {
    await deleteBillardTeam(teamId);
    await fetch();
  };

  const handleStart = async () => {
    if (teams.length < 2) return;
    setStarting(true);
    await generateBillardBracket(tournament.id);
    await fetch();
    setStarting(false);
  };

  const handlePickWinner = async (matchId: string, winnerTeamId: string) => {
    await recordBillardResult(matchId, winnerTeamId);
    await fetch();
  };

  const statusLabel = tournament.status === "done" ? "🏆 Terminé" : tournament.status === "active" ? "⚡ En cours" : "⏳ Préparation";

  // Group matches by round
  const roundMap = new Map<number, BillardMatch[]>();
  matches.forEach((m) => {
    if (!roundMap.has(m.round)) roundMap.set(m.round, []);
    roundMap.get(m.round)!.push(m);
  });
  const rounds = Array.from(roundMap.entries()).sort(([a], [b]) => b - a);
  const totalRounds = rounds.length;

  // Find winner team name
  const winnerTeam = tournament.winner_team_id
    ? teams.find((t) => t.id === tournament.winner_team_id)
    : null;

  // Get player name helper
  const pname = (id: string) => {
    const p = participants.find((pp) => pp.id === id);
    return p ? (p.pseudo || p.name) : "?";
  };

  // Team display name helper
  const teamName = (team: BillardTeam | undefined | null) => {
    if (!team) return "❓ À définir";
    if (team.team_name) return team.team_name;
    return pname(team.player1_id) + " & " + pname(team.player2_id);
  };

  // Already selected player IDs across all teams
  const usedPlayerIds = new Set(teams.flatMap((t) => [t.player1_id, t.player2_id]));

  // Round labels
  const roundLabel = (round: number) => {
    if (round === 2) return "🏆 Finale";
    if (round === 4) return "⚔️ Demi-finale";
    if (round === 8) return " Quart de finale";
    return "Phase " + (totalRounds - Math.log2(round) + 1);
  };

  return (
    <Card className="bg-black/40 border-purple-500/20 overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
        >
          <div className="text-left">
            <h3 className="font-bold text-lg">{tournament.name}</h3>
            <p className="text-xs text-muted-foreground">
              {tournament.game_type === "8ball" ? "🎱 8-Ball" : "🎱 9-Ball"} · {statusLabel} · {teams.length} équipes
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(tournament.id); }}
                className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </div>
        </button>

        {expanded && (
          <div className="px-4 pb-4 space-y-4">
            {/* Winner banner */}
            {tournament.status === "done" && winnerTeam && (
              <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-xl p-4 text-center">
                <Trophy className="w-10 h-10 mx-auto mb-2 text-yellow-400" />
                <p className="text-yellow-300 font-bold text-lg">
                  🏆 {teamName(winnerTeam)}
                </p>
                <p className="text-yellow-400/70 text-xs mt-1">Vainqueurs du tournoi !</p>
              </div>
            )}

            {/* Teams section (only in preparation) */}
            {tournament.status === "setup" && (
              <>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-1.5">
                    <Users className="w-4 h-4" /> Équipes ({teams.length})
                  </h4>
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAddTeam(!showAddTeam)}
                      className="border-purple-500/30 text-xs h-7"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Ajouter
                    </Button>
                  )}
                </div>

                {/* Add team form */}
                {showAddTeam && isAdmin && (
                  <div className="bg-black/30 rounded-lg p-3 space-y-2 border border-purple-500/10">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Joueur 1</label>
                        <select
                          value={player1Id}
                          onChange={(e) => setPlayer1Id(e.target.value)}
                          className="w-full px-2 py-1.5 bg-black/40 border border-purple-500/30 rounded-lg text-white text-sm"
                        >
                          <option value="">Choisir...</option>
                          {participants
                            .filter((p) => !usedPlayerIds.has(p.id) || p.id === player1Id)
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.emoji_avatar || "👤"} {p.pseudo || p.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Joueur 2</label>
                        <select
                          value={player2Id}
                          onChange={(e) => setPlayer2Id(e.target.value)}
                          className="w-full px-2 py-1.5 bg-black/40 border border-purple-500/30 rounded-lg text-white text-sm"
                        >
                          <option value="">Choisir...</option>
                          {participants
                            .filter((p) => !usedPlayerIds.has(p.id) || p.id === player2Id)
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.emoji_avatar || "👤"} {p.pseudo || p.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddTeam} className="flex-1 bg-green-600 hover:bg-green-700 h-8">
                        Valider
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowAddTeam(false)} className="flex-1 border-purple-500/30 h-8">
                        Annuler
                      </Button>
                    </div>
                  </div>
                )}

                {/* Team list */}
                {teams.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-3">Aucune équipe inscrite</p>
                ) : (
                  <div className="space-y-2">
                    {teams.map((team, i) => (
                      <div key={team.id} className="flex items-center justify-between bg-black/20 rounded-lg px-3 py-2 border border-purple-500/10">
                        <div className="flex items-center gap-2">
                          <span className="text-purple-400 font-bold text-sm">#{i + 1}</span>
                          <span className="text-sm">{teamName(team)}</span>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteTeam(team.id)}
                            className="p-1 rounded hover:bg-red-500/20 text-red-400"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Start button */}
                {isAdmin && teams.length >= 2 && (
                  <Button
                    onClick={handleStart}
                    disabled={starting}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    {starting ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    Lancer le tournoi ({teams.length} équipes)
                  </Button>
                )}
              </>
            )}

            {/* Bracket (only when active or done) */}
            {(tournament.status === "active" || tournament.status === "done") && rounds.length > 0 && (
              <div className="space-y-4">
                {rounds.map(([round, roundMatches]) => {
                  // Filter out matches that are still "waiting" with no teams
                  const playableMatches = roundMatches.filter(
                    (m) => m.team1_id || m.team2_id
                  );
                  if (playableMatches.length === 0) return null;

                  return (
                    <div key={round}>
                      <h4 className="text-sm font-semibold text-purple-300 mb-2">
                        {roundLabel(round)}
                      </h4>
                      <div className="space-y-2">
                        {playableMatches.map((m) => {
                          const t1name = teamName(m.team1 as BillardTeam);
                          const t2name = teamName(m.team2 as BillardTeam);

                          const isDone = m.status === "done" || m.status === "bye";
                          const isBye = m.status === "bye";
                          const canPlay = !isDone && m.team1_id && m.team2_id;
                          const t1Won = m.winner_team_id === m.team1_id;
                          const t2Won = m.winner_team_id === m.team2_id;

                          return (
                            <div
                              key={m.id}
                              className={
                                "rounded-xl border overflow-hidden " +
                                (isDone
                                  ? "border-green-500/20 bg-green-500/5"
                                  : canPlay
                                  ? "border-yellow-500/30 bg-yellow-500/5"
                                  : "border-gray-600/20 bg-black/20")
                              }
                            >
                              {isBye ? (
                                <div className="px-3 py-2 flex items-center justify-between">
                                  <span className="text-sm">{t1name}</span>
                                  <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                                    Exempt
                                  </span>
                                </div>
                              ) : canPlay ? (
                                <div className="p-2 space-y-1.5">
                                  <p className="text-center text-yellow-400/70 text-xs uppercase tracking-wider">
                                    Qui a gagné ? Cliquez sur le vainqueur
                                  </p>
                                  <button
                                    onClick={() => handlePickWinner(m.id, m.team1_id!)}
                                    className="w-full text-left px-3 py-2.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/20 hover:border-purple-400/40 transition-all text-sm font-medium"
                                  >
                                    🏆 {t1name}
                                  </button>
                                  <div className="text-center text-xs text-gray-500">VS</div>
                                  <button
                                    onClick={() => handlePickWinner(m.id, m.team2_id!)}
                                    className="w-full text-left px-3 py-2.5 rounded-lg bg-pink-600/20 hover:bg-pink-600/40 border border-pink-500/20 hover:border-pink-400/40 transition-all text-sm font-medium"
                                  >
                                    🏆 {t2name}
                                  </button>
                                </div>
                              ) : isDone ? (
                                <div className="px-3 py-2 space-y-1">
                                  <div className={"flex items-center justify-between text-sm " + (t1Won ? "text-green-400 font-bold" : "text-gray-500 line-through")}>
                                    <span>{t1Won && "🏆 "}{t1name}</span>
                                    {t1Won && <span className="text-xs bg-green-500/20 px-2 py-0.5 rounded-full">Gagnant</span>}
                                  </div>
                                  <div className={"flex items-center justify-between text-sm " + (t2Won ? "text-green-400 font-bold" : "text-gray-500 line-through")}>
                                    <span>{t2Won && "🏆 "}{t2name}</span>
                                    {t2Won && <span className="text-xs bg-green-500/20 px-2 py-0.5 rounded-full">Gagnant</span>}
                                  </div>
                                </div>
                              ) : (
                                <div className="px-3 py-2 text-center text-xs text-gray-500">
                                  En attente des équipes précédentes...
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
