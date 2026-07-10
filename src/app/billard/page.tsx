"use client";

import { useEffect, useState, useCallback } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2, Trophy, Swords, ChevronDown, ChevronUp, X, Play } from "lucide-react";
import {
  getBillardTournaments,
  createBillardTournament,
  deleteBillardTournament,
  getBillardTeams,
  createBillardTeam,
  deleteBillardTeam,
  getBillardMatches,
  generateBillardBracket,
  recordBillardResult,
} from "@/lib/supabase-queries";
import { supabase } from "@/lib/supabase";
import type { BillardTournament, BillardTeam, BillardMatch } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";

export default function BillardPage() {
  const [tournaments, setTournaments] = useState<BillardTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentParticipant, participants, isAdmin } = useAuth();

  // Create tournament form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("Tournoi de Billard 🎱");
  const [newGameType, setNewGameType] = useState<"8ball" | "9ball">("8ball");

  useEffect(() => {
    let mounted = true;

    async function fetch() {
      const data = await getBillardTournaments();
      if (!mounted) return;
      setTournaments(data);
      setLoading(false);
    }
    fetch();

    // Realtime
    const existingChannel = supabase.getChannels().find(
      (ch) => ch.topic === "realtime:billard-realtime"
    );
    if (existingChannel) supabase.removeChannel(existingChannel);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (supabase as any)
      .channel("billard-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "billard_tournaments" },
        () => { if (mounted) fetch(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "billard_teams" },
        () => { if (mounted) fetch(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "billard_matches" },
        () => { if (mounted) fetch(); }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const id = await createBillardTournament(newName.trim(), newGameType);
    if (id) {
      setShowCreate(false);
      setNewName("Tournoi de Billard 🎱");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce tournoi et toutes ses données ?")) return;
    await deleteBillardTournament(id);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold">🎱 Billard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Tournois en doubles — que le meilleur binôme gagne !
          </p>
        </div>

        {/* Admin: Create tournament */}
        {isAdmin && !showCreate && (
          <Button
            onClick={() => setShowCreate(true)}
            className="w-full mb-6 bg-gradient-to-r from-primary to-accent text-primary-foreground"
          >
            <Plus className="w-4 h-4 mr-2" />
            Créer un tournoi
          </Button>
        )}

        {isAdmin && showCreate && (
          <Card className="mb-6 glass border-primary/30">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">🎱 Nouveau tournoi</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Nom</label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={50} />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Type de jeu</label>
                <div className="flex gap-2">
                  <Button
                    variant={newGameType === "8ball" ? "default" : "outline"}
                    onClick={() => setNewGameType("8ball")}
                    className={newGameType === "8ball" ? "bg-primary text-primary-foreground" : ""}
                  >
                    8-Ball
                  </Button>
                  <Button
                    variant={newGameType === "9ball" ? "default" : "outline"}
                    onClick={() => setNewGameType("9ball")}
                    className={newGameType === "9ball" ? "bg-primary text-primary-foreground" : ""}
                  >
                    9-Ball
                  </Button>
                </div>
              </div>
              <Button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground"
              >
                Créer le tournoi
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Tournament list */}
        {tournaments.length === 0 ? (
          <Card className="glass">
            <CardContent className="p-8 text-center">
              <span className="text-4xl mb-3 block">🎱</span>
              <p className="text-muted-foreground">Aucun tournoi pour l&apos;instant</p>
              {isAdmin && (
                <p className="text-xs text-muted-foreground mt-1">Crée le premier tournoi ci-dessus !</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {tournaments.map((t) => (
              <TournamentCard
                key={t.id}
                tournament={t}
                participants={participants}
                isAdmin={isAdmin}
                currentParticipant={currentParticipant}
                onDelete={() => handleDelete(t.id)}
              />
            ))}
          </div>
        )}
      </div>

      <MobileNav />
    </div>
  );
}

// ============================================
// Tournament Card (expandable)
// ============================================

function TournamentCard({
  tournament,
  participants,
  isAdmin,
  onDelete,
}: {
  tournament: BillardTournament;
  participants: { id: string; name: string; pseudo: string | null; emoji_avatar: string | null }[];
  isAdmin: boolean;
  currentParticipant: { id: string } | null;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [teams, setTeams] = useState<BillardTeam[]>([]);
  const [matches, setMatches] = useState<BillardMatch[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Team creation
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [player1, setPlayer1] = useState("");
  const [player2, setPlayer2] = useState("");
  const [teamName, setTeamName] = useState("");

  // Score input
  const [scoringMatch, setScoringMatch] = useState<string | null>(null);
  const [score1, setScore1] = useState("");
  const [score2, setScore2] = useState("");

  const loadData = useCallback(async () => {
    setLoadingData(true);
    const [t, m] = await Promise.all([
      getBillardTeams(tournament.id),
      getBillardMatches(tournament.id),
    ]);
    setTeams(t);
    setMatches(m);
    setLoadingData(false);
  }, [tournament.id]);

  useEffect(() => {
    if (expanded) loadData();
  }, [expanded, loadData]);

  // Also reload when tournament data changes (realtime)
  useEffect(() => {
    if (expanded) loadData();
  }, [tournament.updated_at, expanded, loadData]);

  const handleAddTeam = async () => {
    if (!player1 || !player2 || player1 === player2) return;
    await createBillardTeam(tournament.id, player1, player2, teamName.trim() || undefined);
    setPlayer1("");
    setPlayer2("");
    setTeamName("");
    setShowTeamForm(false);
    await loadData();
  };

  const handleDeleteTeam = async (teamId: string) => {
    await deleteBillardTeam(teamId);
    await loadData();
  };

  const handleStartTournament = async () => {
    if (teams.length < 2) return;
    if (!confirm(`Lancer le tournoi avec ${teams.length} équipes ? Le bracket sera généré aléatoirement.`)) return;
    await generateBillardBracket(tournament.id);
    await loadData();
  };

  const handleSubmitScore = async (matchId: string) => {
    const s1 = parseInt(score1);
    const s2 = parseInt(score2);
    if (isNaN(s1) || isNaN(s2) || s1 === s2) return;
    await recordBillardResult(matchId, s1, s2);
    setScoringMatch(null);
    setScore1("");
    setScore2("");
    await loadData();
  };

  const statusLabel = {
    setup: "⚙️ Configuration",
    active: "🔴 En cours",
    done: "🏆 Terminé",
  }[tournament.status];

  const statusColor = {
    setup: "text-muted-foreground",
    active: "text-primary",
    done: "text-green-400",
  }[tournament.status];

  // Group matches by round for bracket display
  const rounds = new Map<number, BillardMatch[]>();
  for (const m of matches) {
    const existing = rounds.get(m.round) || [];
    existing.push(m);
    rounds.set(m.round, existing);
  }
  const sortedRounds = Array.from(rounds.entries()).sort(([a], [b]) => b - a); // largest round first (finale = 1)

  // Find winner team
  const winnerTeam = tournament.winner_team_id
    ? teams.find((t) => t.id === tournament.winner_team_id)
    : null;

  // Available players (not already in a team for this tournament)
  const assignedPlayerIds = new Set(teams.flatMap((t) => [t.player1_id, t.player2_id]));
  const availablePlayers = participants;

  return (
    <Card className="glass overflow-hidden">
      <CardContent className="p-0">
        {/* Header (always visible) */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-secondary/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎱</span>
            <div>
              <h3 className="font-bold">{tournament.name}</h3>
              <p className="text-xs text-muted-foreground">
                {tournament.game_type === "8ball" ? "8-Ball" : "9-Ball"} • {teams.length} équipe{teams.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {/* Expanded content */}
        {expanded && (
          <div className="border-t border-border p-4 space-y-4">
            {loadingData ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Winner banner */}
                {tournament.status === "done" && winnerTeam && (
                  <div className="text-center py-4 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-xl border border-primary/20">
                    <Trophy className="w-10 h-10 mx-auto text-primary mb-2" />
                    <p className="text-lg font-bold">🏆 Champions !</p>
                    <p className="text-sm text-muted-foreground">
                      {winnerTeam.team_name || `${winnerTeam.player1?.pseudo || winnerTeam.player1?.name} & ${winnerTeam.player2?.pseudo || winnerTeam.player2?.name}`}
                    </p>
                  </div>
                )}

                {/* Teams section */}
                {tournament.status === "setup" && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-sm">👥 Équipes ({teams.length})</h4>
                      {isAdmin && (
                        <Button variant="outline" size="sm" onClick={() => setShowTeamForm(!showTeamForm)}>
                          <Plus className="w-3 h-3 mr-1" />
                          Équipe
                        </Button>
                      )}
                    </div>

                    {/* Add team form */}
                    {showTeamForm && (
                      <Card className="mb-3 bg-secondary/40">
                        <CardContent className="p-3 space-y-2">
                          <Input
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            placeholder="Nom de l'équipe (optionnel)"
                            maxLength={30}
                          />
                          <select
                            value={player1}
                            onChange={(e) => setPlayer1(e.target.value)}
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                          >
                            <option value="">Joueur 1...</option>
                            {availablePlayers.map((p) => (
                              <option key={p.id} value={p.id} disabled={p.id === player2 || assignedPlayerIds.has(p.id)}>
                                {p.emoji_avatar || "👤"} {p.pseudo || p.name}
                                {assignedPlayerIds.has(p.id) ? " (déjà pris)" : ""}
                              </option>
                            ))}
                          </select>
                          <select
                            value={player2}
                            onChange={(e) => setPlayer2(e.target.value)}
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                          >
                            <option value="">Joueur 2...</option>
                            {availablePlayers.map((p) => (
                              <option key={p.id} value={p.id} disabled={p.id === player1 || assignedPlayerIds.has(p.id)}>
                                {p.emoji_avatar || "👤"} {p.pseudo || p.name}
                                {assignedPlayerIds.has(p.id) ? " (déjà pris)" : ""}
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <Button
                              onClick={handleAddTeam}
                              disabled={!player1 || !player2 || player1 === player2}
                              size="sm"
                              className="flex-1 bg-primary text-primary-foreground"
                            >
                              Ajouter
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setShowTeamForm(false)}>
                              Annuler
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Team list */}
                    {teams.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic text-center py-2">
                        Aucune équipe — ajoutez-en pour commencer !
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {teams.map((team) => (
                          <div key={team.id} className="flex items-center justify-between bg-secondary/40 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Swords className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">
                                  {team.team_name || `${team.player1?.emoji_avatar || "👤"} ${team.player1?.pseudo || team.player1?.name} & ${team.player2?.emoji_avatar || "👤"} ${team.player2?.pseudo || team.player2?.name}`}
                                </p>
                                {team.team_name && (
                                  <p className="text-xs text-muted-foreground">
                                    {team.player1?.pseudo || team.player1?.name} & {team.player2?.pseudo || team.player2?.name}
                                  </p>
                                )}
                              </div>
                            </div>
                            {isAdmin && (
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteTeam(team.id)}>
                                <Trash2 className="w-3 h-3 text-muted-foreground" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Start tournament button */}
                    {isAdmin && teams.length >= 2 && (
                      <Button
                        onClick={handleStartTournament}
                        className="w-full mt-3 bg-gradient-to-r from-primary to-accent text-primary-foreground"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Lancer le tournoi ({teams.length} équipes)
                      </Button>
                    )}
                  </div>
                )}

                {/* Bracket (active or done) */}
                {(tournament.status === "active" || tournament.status === "done") && (
                  <div>
                    <h4 className="font-bold text-sm mb-3">🏆 Bracket</h4>
                    <div className="space-y-4">
                      {sortedRounds.map(([round, roundMatches]) => {
                        const roundLabel = round === 1 ? "🏆 Finale" :
                          round === 2 ? "⚡ Demi-finales" :
                          round === 4 ? "📋 Quarts de finale" :
                          `📋 1/${round}èmes`;

                        return (
                          <div key={round}>
                            <p className="text-xs font-bold text-primary mb-2 uppercase tracking-wide">
                              {roundLabel}
                            </p>
                            <div className="space-y-2">
                              {roundMatches.map((match) => (
                                <MatchCard
                                  key={match.id}
                                  match={match}
                                  isAdmin={isAdmin}
                                  scoringMatch={scoringMatch}
                                  setScoringMatch={setScoringMatch}
                                  score1={score1}
                                  setScore1={setScore1}
                                  score2={score2}
                                  setScore2={setScore2}
                                  onSubmitScore={handleSubmitScore}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Admin: delete tournament */}
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDelete}
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Supprimer le tournoi
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Match Card
// ============================================

function MatchCard({
  match,
  isAdmin,
  scoringMatch,
  setScoringMatch,
  score1,
  setScore1,
  score2,
  setScore2,
  onSubmitScore,
}: {
  match: BillardMatch;
  isAdmin: boolean;
  scoringMatch: string | null;
  setScoringMatch: (id: string | null) => void;
  score1: string;
  setScore1: (v: string) => void;
  score2: string;
  setScore2: (v: string) => void;
  onSubmitScore: (matchId: string) => void;
}) {
  const isBye = match.status === "bye";
  const isDone = match.status === "done";
  const isPending = match.status === "pending";
  const isScoring = scoringMatch === match.id;

  const team1Name = match.team1
    ? `${match.team1.player1?.emoji_avatar || "👤"} ${match.team1.team_name || match.team1.player1?.pseudo || match.team1.player1?.name} & ${match.team1.player2?.pseudo || match.team1.player2?.name}`
    : "TBD";

  const team2Name = match.team2
    ? `${match.team2.player1?.emoji_avatar || "👤"} ${match.team2.team_name || match.team2.player1?.pseudo || match.team2.player1?.name} & ${match.team2.player2?.pseudo || match.team2.player2?.name}`
    : isBye ? "Bye" : "TBD";

  const team1Won = match.winner_team_id === match.team1_id;
  const team2Won = match.winner_team_id === match.team2_id;

  return (
    <div className={`rounded-lg border p-3 ${
      isDone ? "border-green-500/30 bg-green-500/5" :
      isBye ? "border-muted-foreground/20 bg-secondary/20" :
      "border-border bg-secondary/30"
    }`}>
      {/* Team 1 */}
      <div className={`flex items-center justify-between py-1 ${team1Won ? "font-bold" : ""}`}>
        <span className={`text-sm ${team1Won ? "text-green-400" : isDone && !team1Won ? "text-muted-foreground line-through" : ""}`}>
          {team1Name}
        </span>
        {isDone && <span className="text-sm font-mono font-bold">{match.team1_score}</span>}
      </div>

      {/* VS divider */}
      <div className="text-center text-[10px] text-muted-foreground py-0.5">VS</div>

      {/* Team 2 */}
      <div className={`flex items-center justify-between py-1 ${team2Won ? "font-bold" : ""}`}>
        <span className={`text-sm ${team2Won ? "text-green-400" : isDone && !team2Won ? "text-muted-foreground line-through" : isBye ? "text-muted-foreground italic" : ""}`}>
          {team2Name}
        </span>
        {isDone && <span className="text-sm font-mono font-bold">{match.team2_score}</span>}
      </div>

      {/* Score input (admin, pending match with both teams) */}
      {isAdmin && isPending && match.team1_id && match.team2_id && !isScoring && (
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2 text-xs"
          onClick={() => {
            setScoringMatch(match.id);
            setScore1("");
            setScore2("");
          }}
        >
          Saisir le score
        </Button>
      )}

      {isScoring && (
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              value={score1}
              onChange={(e) => setScore1(e.target.value)}
              placeholder="Score"
              className="w-20 text-center"
            />
            <span className="text-xs text-muted-foreground">-</span>
            <Input
              type="number"
              min="0"
              value={score2}
              onChange={(e) => setScore2(e.target.value)}
              placeholder="Score"
              className="w-20 text-center"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 bg-primary text-primary-foreground"
              onClick={() => onSubmitScore(match.id)}
              disabled={!score1 || !score2 || parseInt(score1) === parseInt(score2)}
            >
              Valider
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScoringMatch(null)}
            >
              Annuler
            </Button>
          </div>
        </div>
      )}

      {/* Bye label */}
      {isBye && (
        <p className="text-[10px] text-muted-foreground text-center mt-1 italic">Exempt (bye)</p>
      )}
    </div>
  );
}
