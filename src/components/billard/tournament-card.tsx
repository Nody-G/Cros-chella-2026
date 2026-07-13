"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2, Trophy, X, Users, ChevronDown, ChevronUp, Swords } from "lucide-react";
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
  const [pickingMatch, setPickingMatch] = useState<string | null>(null);
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

  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    };
  }, []);

  // ── Player name lookup ──
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

  // ── Players already in a team (for filtering dropdowns) ──
  const assignedPlayerIds = useMemo(() => {
    const ids = new Set<string>();
    for (const t of teams) {
      ids.add(t.player1_id);
      ids.add(t.player2_id);
    }
    return ids;
  }, [teams]);

  // Available participants = not already in a team (except the currently selected slot)
  const availableForSlot = useCallback((excludeId: string, otherSelectedId: string) => {
    return participants.filter((p) => {
      if (p.id === otherSelectedId) return false; // can't pick same as other slot
      if (p.id === excludeId) return true; // keep current selection visible
      return !assignedPlayerIds.has(p.id); // exclude if already in a team
    });
  }, [participants, assignedPlayerIds]);

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
    if (pickingMatch) return; // prevent double-click
    setPickingMatch(matchId);
    await recordBillardResult(matchId, winnerTeamId);
    await fetchData();
    setPickingMatch(null);
  };

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

  // ── Group matches by round (ascending: round 8 → 4 → 2) ──
  const roundMap = new Map<number, BillardMatch[]>();
  matches.forEach((m) => {
    if (!roundMap.has(m.round)) roundMap.set(m.round, []);
    roundMap.get(m.round)!.push(m);
  });
  const rounds = Array.from(roundMap.entries()).sort(([a], [b]) => b - a); // highest round first (qualifiers → finale)

  const roundLabels: Record<number, string> = {};
  const maxRound = rounds.length > 0 ? rounds[0][0] : 0;
  rounds.forEach(([r]) => {
    if (r === 2) roundLabels[r] = "🏆 Finale";
    else if (r === 4) roundLabels[r] = "🥉 Demi-finale";
    else if (r === maxRound && r > 4) roundLabels[r] = "🎯 Qualifications";
    else roundLabels[r] = `📐 1/${r}`;
  });

  // Winner
  const winnerTeam = tournament.winner_team_id
    ? teams.find((t) => t.id === tournament.winner_team_id)
    : null;

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
            {isAdmin && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteClick(); }}
                className={`p-2 rounded-lg transition-colors ${
                  confirmDelete ? "bg-red-600 text-white" : "text-white/30 hover:text-red-400 hover:bg-white/10"
                }`}
                title={confirmDelete ? "Cliquez encore pour confirmer" : "Supprimer le tournoi"}
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

            {/* ── SETUP: Teams management ── */}
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
                      onClick={() => { setShowAddTeam(!showAddTeam); setPlayer1Id(""); setPlayer2Id(""); }}
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
                      <option value="">🏱 Joueur 1</option>
                      {availableForSlot(player1Id, player2Id).map((p) => (
                        <option key={p.id} value={p.id}>{p.emoji_avatar || "👤"} {p.pseudo || p.name}</option>
                      ))}
                    </select>
                    <p className="text-center text-white/30 text-xs">+</p>
                    <select
                      value={player2Id}
                      onChange={(e) => setPlayer2Id(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
                    >
                      <option value="">🏱 Joueur 2</option>
                      {availableForSlot(player2Id, player1Id).map((p) => (
                        <option key={p.id} value={p.id}>{p.emoji_avatar || "👤"} {p.pseudo || p.name}</option>
                      ))}
                    </select>
                    {player1Id && player2Id && player1Id === player2Id && (
                      <p className="text-red-400 text-xs text-center">⚠️ Deux joueurs différents requis</p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleAddTeam}
                        disabled={!player1Id || !player2Id || player1Id === player2Id}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-40"
                      >
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
                    {starting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Swords className="w-4 h-4 mr-2" />}
                    Lancer le tournoi ({teams.length} équipes)
                  </Button>
                )}
              </div>
            )}

            {/* ── ACTIVE / DONE: Bracket ── */}
            {tournament.status !== "setup" && rounds.length > 0 && (
              <div className="space-y-4">
                {rounds.map(([roundNum, roundMatches]) => (
                  <div key={roundNum}>
                    <h4 className="text-sm font-semibold text-white/70 mb-2">{roundLabels[roundNum] || `Round ${roundNum}`}</h4>
                    <div className="space-y-2">
                      {roundMatches
                        .sort((a, b) => a.match_order - b.match_order)
                        .map((match) => (
                          <MatchCard
                            key={match.id}
                            match={match}
                            teamName={teamName}
                            isAdmin={isAdmin}
                            onPickWinner={handlePickWinner}
                            picking={pickingMatch === match.id}
                          />
                        ))}
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

// ── Match Card sub-component ──
function MatchCard({
  match,
  teamName,
  isAdmin,
  onPickWinner,
  picking,
}: {
  match: BillardMatch;
  teamName: (t: BillardTeam | undefined | null) => string;
  isAdmin: boolean;
  onPickWinner: (matchId: string, teamId: string) => void;
  picking: boolean;
}) {
  const isDone = match.status === "done" || match.status === "bye";
  const isWaiting = match.status === "waiting";
  const isBye = match.status === "bye";
  const t1Name = teamName(match.team1);
  const t2Name = teamName(match.team2);
  const t1Winner = match.winner_team_id === match.team1_id;
  const t2Winner = match.winner_team_id === match.team2_id;

  return (
    <div className={`rounded-lg border overflow-hidden ${
      isDone ? "bg-white/5 border-white/10" : isWaiting ? "bg-white/[0.02] border-white/5" : "bg-white/5 border-purple-500/30"
    }`}>
      {/* Match header */}
      {isBye && (
        <div className="px-3 py-1 bg-yellow-600/10 border-b border-yellow-500/20">
          <p className="text-[10px] text-yellow-400/70 text-center">⚡ Bye — qualification automatique</p>
        </div>
      )}
      {isWaiting && (
        <div className="px-3 py-1 bg-white/[0.02] border-b border-white/5">
          <p className="text-[10px] text-white/30 text-center">⏳ En attente des résultats précédents</p>
        </div>
      )}

      <div className="p-3 space-y-1">
        {/* Team 1 */}
        <button
          onClick={() => !isDone && !isWaiting && match.team1_id && !picking && onPickWinner(match.id, match.team1_id)}
          disabled={isDone || isWaiting || !match.team1_id || picking}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
            t1Winner
              ? "bg-green-600/20 border border-green-500/40"
              : !isDone && match.team1_id
              ? "bg-white/5 hover:bg-white/10 border border-transparent cursor-pointer"
              : "bg-white/[0.02] border border-transparent"
          }`}
        >
          <span className={`text-sm ${t1Winner ? "text-green-300 font-bold" : match.team1_id ? "text-white" : "text-white/30 italic"}`}>
            {t1Winner && "🏆 "}{t1Name}
          </span>
          {t1Winner && <span className="text-green-400 text-xs">GAGNANT</span>}
        </button>

        <p className="text-center text-white/20 text-[10px] font-medium">VS</p>

        {/* Team 2 */}
        <button
          onClick={() => !isDone && !isWaiting && match.team2_id && !picking && onPickWinner(match.id, match.team2_id)}
          disabled={isDone || isWaiting || !match.team2_id || picking}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
            t2Winner
              ? "bg-green-600/20 border border-green-500/40"
              : !isDone && match.team2_id
              ? "bg-white/5 hover:bg-white/10 border border-transparent cursor-pointer"
              : "bg-white/[0.02] border border-transparent"
          }`}
        >
          <span className={`text-sm ${t2Winner ? "text-green-300 font-bold" : match.team2_id ? "text-white" : "text-white/30 italic"}`}>
            {t2Winner && "🏆 "}{t2Name}
          </span>
          {t2Winner && <span className="text-green-400 text-xs">GAGNANT</span>}
        </button>
      </div>

      {/* Pick winner hint */}
      {!isDone && !isWaiting && match.team1_id && match.team2_id && isAdmin && (
        <div className="px-3 pb-2">
          <p className="text-[10px] text-purple-400/50 text-center">👆 Tapez sur l&apos;équipe gagnante</p>
        </div>
      )}
      {picking && (
        <div className="px-3 pb-2 flex items-center justify-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
          <span className="text-[10px] text-purple-400">Enregistrement...</span>
        </div>
      )}
    </div>
  );
}
