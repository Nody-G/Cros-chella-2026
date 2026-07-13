"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  const mountedRef = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchTournaments = useCallback(async () => {
    const data = await getBillardTournaments();
    if (mountedRef.current) {
      setTournaments(data);
      setLoading(false);
    }
  }, []);

  // Debounced refresh: batch multiple realtime events into one fetch
  const debouncedRefresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (mountedRef.current) {
        fetchTournaments();
        setRefreshKey((k) => k + 1);
      }
    }, 300);
  }, [fetchTournaments]);

  useEffect(() => {
    mountedRef.current = true;
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
        debouncedRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "billard_teams" },
        debouncedRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "billard_matches" },
        debouncedRefresh
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [fetchTournaments, debouncedRefresh]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const id = await createBillardTournament(newName.trim(), newGameType);
    if (id) {
      setShowCreate(false);
      setNewName("Tournoi de Billard 🎱");
    }
  };

  const handleDelete = async (id: string) => {
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
          <div className="mb-4 p-4 rounded-xl border border-white/10 bg-white/5">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nom du tournoi"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm mb-3"
            />
            <div className="flex gap-2 mb-3">
              {(["8ball", "9ball"] as const).map((gt) => (
                <button
                  key={gt}
                  onClick={() => setNewGameType(gt)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    newGameType === gt
                      ? "bg-purple-600 text-white"
                      : "bg-white/10 text-white/60 hover:bg-white/20"
                  }`}
                >
                  {gt === "8ball" ? "8️⃣ 8-Ball" : "9️⃣ 9-Ball"}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} className="flex-1 bg-purple-600 hover:bg-purple-700">
                Créer
              </Button>
              <Button onClick={() => setShowCreate(false)} variant="ghost" className="flex-1 text-white/60">
                Annuler
              </Button>
            </div>
          </div>
        )}

        {tournaments.length === 0 ? (
          <div className="text-center py-16">
            <Swords className="w-12 h-12 mx-auto text-white/20 mb-3" />
            <p className="text-white/40">Aucun tournoi pour l&apos;instant</p>
            <p className="text-white/25 text-sm mt-1">L&apos;admin peut en créer un !</p>
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
