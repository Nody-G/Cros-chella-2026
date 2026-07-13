"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Loader2, Plus, Swords } from "lucide-react";
import {
  getBillardTournaments,
  createBillardTournament,
  deleteBillardTournament,
} from "@/lib/supabase-queries";
import { supabase } from "@/lib/supabase";
import type { BillardTournament } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { TournamentCard } from "@/components/billard/tournament-card";

export default function BillardPage() {
  const [tournaments, setTournaments] = useState<BillardTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const { participants, isAdmin } = useAuth();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("Tournoi de Billard 🎱");
  const [newGameType, setNewGameType] = useState<"8ball" | "9ball">("8ball");
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchTournaments = async () => {
    const data = await getBillardTournaments();
    setTournaments(data);
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    fetchTournaments();

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
        () => { if (mounted) { fetchTournaments(); setRefreshKey((k) => k + 1); } }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "billard_teams" },
        () => { if (mounted) { fetchTournaments(); setRefreshKey((k) => k + 1); } }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "billard_matches" },
        () => { if (mounted) { fetchTournaments(); setRefreshKey((k) => k + 1); } }
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
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold">🎱 Billard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Tournois en doubles — 1 match = 1 partie, cliquez le vainqueur !
          </p>
        </div>

        {isAdmin && !showCreate && (
          <Button
            onClick={() => setShowCreate(true)}
            className="w-full mb-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau tournoi
          </Button>
        )}

        {isAdmin && showCreate && (
          <div className="mb-4 bg-black/40 border border-purple-500/30 rounded-xl p-4 space-y-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nom du tournoi"
              className="w-full px-3 py-2 bg-black/40 border border-purple-500/30 rounded-lg text-white placeholder:text-gray-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setNewGameType("8ball")}
                className={"flex-1 py-2 rounded-lg text-sm font-medium transition-all " +
                  (newGameType === "8ball"
                    ? "bg-purple-600 text-white"
                    : "bg-black/40 text-gray-400 border border-purple-500/20")
                }
              >
                🎱 8-Ball
              </button>
              <button
                onClick={() => setNewGameType("9ball")}
                className={"flex-1 py-2 rounded-lg text-sm font-medium transition-all " +
                  (newGameType === "9ball"
                    ? "bg-purple-600 text-white"
                    : "bg-black/40 text-gray-400 border border-purple-500/20")
                }
              >
                🎱 9-Ball
              </button>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} className="flex-1 bg-green-600 hover:bg-green-700">
                Créer
              </Button>
              <Button onClick={() => setShowCreate(false)} variant="outline" className="flex-1 border-purple-500/30">
                Annuler
              </Button>
            </div>
          </div>
        )}

        {tournaments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Swords className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucun tournoi pour l&apos;instant</p>
            {isAdmin && <p className="text-xs mt-1">Crée le premier tournoi !</p>}
          </div>
        ) : (
          <div className="space-y-4">
            {tournaments.map((t) => (
              <TournamentCard
                key={t.id}
                tournament={t}
                isAdmin={isAdmin}
                participants={participants}
                onDelete={handleDelete}
                refreshKey={refreshKey}
              />
            ))}
          </div>
        )}
      </div>
      <MobileNav />
    </div>
  );
}
