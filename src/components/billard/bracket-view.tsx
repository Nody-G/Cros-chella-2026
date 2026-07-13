"use client";

import { useMemo } from "react";
import { Loader2, Trophy } from "lucide-react";
import type { BillardTeam, BillardMatch } from "@/lib/types";

interface BracketViewProps {
  matches: BillardMatch[];
  teams: BillardTeam[];
  teamName: (t: BillardTeam | undefined | null) => string;
  isAdmin: boolean;
  onPickWinner: (matchId: string, teamId: string) => void;
  pickingMatch: string | null;
}

interface RoundData {
  round: number;
  label: string;
  matches: BillardMatch[];
}

export function BracketView({ matches, teamName, isAdmin, onPickWinner, pickingMatch }: BracketViewProps) {
  // Group matches by round, sorted descending (qualifiers left → finale right)
  const rounds = useMemo(() => {
    const roundMap = new Map<number, BillardMatch[]>();
    matches.forEach((m) => {
      if (!roundMap.has(m.round)) roundMap.set(m.round, []);
      roundMap.get(m.round)!.push(m);
    });

    const maxRound = Math.max(...Array.from(roundMap.keys()), 0);
    const result: RoundData[] = [];

    const sorted = Array.from(roundMap.entries()).sort(([a], [b]) => b - a);
    for (const [roundNum, roundMatches] of sorted) {
      let label: string;
      if (roundNum === 2) label = "🏆 Finale";
      else if (roundNum === 4) label = "Demi";
      else if (roundNum === maxRound && roundNum > 4) label = "Qualif.";
      else label = `1/${roundNum}`;
      result.push({ round: roundNum, label, matches: roundMatches.sort((a, b) => a.match_order - b.match_order) });
    }

    return result;
  }, [matches]);

  if (rounds.length === 0) return null;

  // Calculate match height + gap for connector alignment
  const matchH = 72; // px per match card
  const gap = 12;    // px gap between matches in same round
  const roundGap = 40; // px gap between rounds (for connectors)

  return (
    <div className="overflow-x-auto pb-2 -mx-1 px-1">
      <div className="flex items-stretch" style={{ gap: `${roundGap}px`, minWidth: "max-content" }}>
        {rounds.map((roundData, roundIdx) => {
          // Each round: matches are stacked vertically
          // For bracket effect, each subsequent round has fewer matches
          // and they're vertically centered relative to their feeder matches
          return (
            <div key={roundData.round} className="flex flex-col" style={{ minWidth: "180px" }}>
              {/* Round label */}
              <div className="text-center mb-3">
                <span className="text-xs font-semibold text-purple-300/70 uppercase tracking-wider">
                  {roundData.label}
                </span>
              </div>

              {/* Matches container — centered vertically */}
              <div className="flex flex-col justify-center flex-1" style={{ gap: `${gap}px` }}>
                {roundData.matches.map((match, matchIdx) => {
                  const isDone = match.status === "done" || match.status === "bye";
                  const isWaiting = match.status === "waiting";
                  const isBye = match.status === "bye";
                  const isPicking = pickingMatch === match.id;
                  const t1Winner = match.winner_team_id === match.team1_id;
                  const t2Winner = match.winner_team_id === match.team2_id;

                  return (
                    <div key={match.id} className="relative" style={{ height: `${matchH}px` }}>
                      {/* Right connector (line going to next round) */}
                      {roundIdx < rounds.length - 1 && matchIdx % 2 === 0 && (
                        <ConnectorLine matchH={matchH} gap={gap} />
                      )}

                      {/* Match card */}
                      <div
                        className={`h-full rounded-lg border overflow-hidden flex flex-col ${
                          isDone
                            ? "bg-white/5 border-white/10"
                            : isWaiting
                            ? "bg-white/[0.02] border-white/5"
                            : "bg-white/5 border-purple-500/30"
                        }`}
                      >
                        {/* Bye badge */}
                        {isBye && (
                          <div className="px-2 py-0.5 bg-yellow-600/10 border-b border-yellow-500/20">
                            <p className="text-[9px] text-yellow-400/70 text-center">Bye</p>
                          </div>
                        )}
                        {isWaiting && (
                          <div className="px-2 py-0.5 bg-white/[0.02] border-b border-white/5">
                            <p className="text-[9px] text-white/30 text-center">⏳ En attente</p>
                          </div>
                        )}

                        {/* Team rows */}
                        <div className="flex-1 flex flex-col justify-center px-2 py-1 gap-0.5">
                          <TeamRow
                            name={teamName(match.team1)}
                            isWinner={t1Winner}
                            hasTeam={!!match.team1_id}
                            isActive={!isDone && !isWaiting && !!match.team1_id && !isPicking}
                            onClick={() => {
                              if (!isDone && !isWaiting && match.team1_id && !isPicking) {
                                onPickWinner(match.id, match.team1_id);
                              }
                            }}
                            isAdmin={isAdmin}
                          />
                          <div className="text-center text-white/15 text-[8px] font-bold leading-none">VS</div>
                          <TeamRow
                            name={teamName(match.team2)}
                            isWinner={t2Winner}
                            hasTeam={!!match.team2_id}
                            isActive={!isDone && !isWaiting && !!match.team2_id && !isPicking}
                            onClick={() => {
                              if (!isDone && !isWaiting && match.team2_id && !isPicking) {
                                onPickWinner(match.id, match.team2_id);
                              }
                            }}
                            isAdmin={isAdmin}
                          />
                        </div>

                        {/* Pick hint / loading */}
                        {!isDone && !isWaiting && match.team1_id && match.team2_id && isAdmin && !isPicking && (
                          <p className="text-[8px] text-purple-400/40 text-center pb-1">👆 Tapez le gagnant</p>
                        )}
                        {isPicking && (
                          <div className="flex items-center justify-center gap-1 pb-1">
                            <Loader2 className="w-2.5 h-2.5 animate-spin text-purple-400" />
                            <span className="text-[8px] text-purple-400">...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Champion column */}
        {rounds.length > 0 && (() => {
          const finale = rounds[rounds.length - 1];
          const finaleMatch = finale.matches[0];
          if (!finaleMatch || finaleMatch.status !== "done") return null;
          const winner = finaleMatch.winner_team_id === finaleMatch.team1_id
            ? finaleMatch.team1
            : finaleMatch.winner_team_id === finaleMatch.team2_id
            ? finaleMatch.team2
            : null;
          if (!winner) return null;

          return (
            <div className="flex flex-col items-center justify-center" style={{ minWidth: "120px" }}>
              <div className="text-center mb-3">
                <span className="text-xs font-semibold text-yellow-400/70 uppercase tracking-wider">Champion</span>
              </div>
              <div className="bg-gradient-to-br from-yellow-600/20 to-amber-600/20 border border-yellow-500/30 rounded-xl p-4 text-center">
                <Trophy className="w-8 h-8 mx-auto text-yellow-400 mb-2" />
                <p className="text-yellow-200 font-bold text-sm">{teamName(winner)}</p>
                <p className="text-yellow-400/60 text-[10px]">🎉 Champions !</p>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ── Team row inside a match ──
function TeamRow({
  name,
  isWinner,
  hasTeam,
  isActive,
  onClick,
  isAdmin,
}: {
  name: string;
  isWinner: boolean;
  hasTeam: boolean;
  isActive: boolean;
  onClick: () => void;
  isAdmin: boolean;
}) {
  const canClick = isActive && isAdmin;
  return (
    <button
      onClick={onClick}
      disabled={!canClick}
      className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-left transition-all ${
        isWinner
          ? "bg-green-600/20 border border-green-500/40"
          : canClick
          ? "bg-white/5 hover:bg-white/10 border border-transparent cursor-pointer"
          : "bg-white/[0.02] border border-transparent"
      }`}
    >
      <span className={`text-[11px] truncate ${isWinner ? "text-green-300 font-bold" : hasTeam ? "text-white" : "text-white/30 italic"}`}>
        {isWinner && "🏆 "}{name}
      </span>
      {isWinner && <span className="text-green-400 text-[9px] ml-1 shrink-0">WIN</span>}
    </button>
  );
}

// ── SVG connector line between rounds ──
function ConnectorLine({ matchH, gap }: { matchH: number; gap: number }) {
  // Connects two vertically stacked matches to the next round's single match
  // The connector goes from the right edge of this match pair to the left edge of the next match
  const pairHeight = 2 * matchH + gap;
  const midY = pairHeight / 2;

  return (
    <svg
      className="absolute pointer-events-none"
      style={{
        left: "100%",
        top: "0",
        width: `${40}px`,
        height: `${pairHeight}px`,
        overflow: "visible",
      }}
      viewBox={`0 0 40 ${pairHeight}`}
      fill="none"
    >
      {/* Horizontal line from top match to mid */}
      <line x1="0" y1={matchH / 2} x2="20" y2={matchH / 2} stroke="rgba(168,85,247,0.25)" strokeWidth="1.5" />
      {/* Horizontal line from bottom match to mid */}
      <line x1="0" y1={matchH + gap + matchH / 2} x2="20" y2={matchH + gap + matchH / 2} stroke="rgba(168,85,247,0.25)" strokeWidth="1.5" />
      {/* Vertical line connecting them */}
      <line x1="20" y1={matchH / 2} x2="20" y2={matchH + gap + matchH / 2} stroke="rgba(168,85,247,0.25)" strokeWidth="1.5" />
      {/* Horizontal line from mid to next round */}
      <line x1="20" y1={midY} x2="40" y2={midY} stroke="rgba(168,85,247,0.25)" strokeWidth="1.5" />
    </svg>
  );
}
