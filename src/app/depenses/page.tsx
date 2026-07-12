"use client";

import { useEffect, useState, useCallback } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Wallet,
  Plus,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Check,
  X,
  Receipt,
  PiggyBank,
  Users,
} from "lucide-react";
import {
  getExpenses,
  createExpense,
  deleteExpense,
  getParticipants,
  computeBalances,
  computeOptimalSettlements,
  createSettlement,
  confirmSettlement,
  deleteSettlement,
  getSettlements,
} from "@/lib/supabase-queries";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import type { Participant, Expense, ExpenseCategory, ParticipantBalance, Settlement } from "@/lib/types";
import { EXPENSE_CATEGORIES } from "@/lib/types";

// Helper: format cents to euros
function formatEuros(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

// Helper: get category info
function getCategoryInfo(cat: ExpenseCategory) {
  return EXPENSE_CATEGORIES.find((c) => c.value === cat) || EXPENSE_CATEGORIES[5];
}

export default function DepensesPage() {
  const { currentParticipant } = useAuth();
  const selectedParticipant = currentParticipant?.id || "";

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [balances, setBalances] = useState<ParticipantBalance[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);

  // Add expense form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState<ExpenseCategory>("food");
  const [splitAmong, setSplitAmong] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // UI state
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null);
  const [showBalances, setShowBalances] = useState(true);
  const [showSettlements, setShowSettlements] = useState(false);

  const fetchData = useCallback(async () => {
    const [expensesData, participantsData, balancesData, settlementsData] = await Promise.all([
      getExpenses(),
      getParticipants(),
      computeBalances(),
      getSettlements(),
    ]);
    setExpenses(expensesData);
    setParticipants(participantsData);
    setBalances(balancesData);
    setSettlements(settlementsData);
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    fetchData();

    // Realtime
    const existingChannel = supabase.getChannels().find((ch) => ch.topic === "realtime:tricount-realtime");
    if (existingChannel) supabase.removeChannel(existingChannel);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (supabase as any)
      .channel("tricount-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => {
        if (mounted) fetchData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "expense_splits" }, () => {
        if (mounted) fetchData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "settlements" }, () => {
        if (mounted) fetchData();
      })
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") console.log("✅ Realtime tricount connecté");
      });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  // Initialize split among all participants
  useEffect(() => {
    if (participants.length > 0 && splitAmong.length === 0) {
      setSplitAmong(participants.map((p) => p.id));
    }
  }, [participants, splitAmong.length]);

  const handleAddExpense = async () => {
    if (!selectedParticipant || !newTitle.trim() || !newAmount || splitAmong.length === 0) return;

    const amountCents = Math.round(parseFloat(newAmount.replace(",", ".")) * 100);
    if (isNaN(amountCents) || amountCents <= 0) return;

    setSubmitting(true);
    await createExpense(selectedParticipant, newTitle, amountCents, newCategory, splitAmong);
    setNewTitle("");
    setNewAmount("");
    setNewCategory("food");
    setSplitAmong(participants.map((p) => p.id));
    setShowAddForm(false);
    setSubmitting(false);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm("Supprimer cette dépense ?")) return;
    await deleteExpense(expenseId);
  };

  const handleCreateSettlement = async (fromId: string, toId: string, amount: number) => {
    await createSettlement(fromId, toId, amount);
  };

  const handleConfirmSettlement = async (settlementId: string) => {
    await confirmSettlement(settlementId);
  };

  const handleDeleteSettlement = async (settlementId: string) => {
    if (!confirm("Supprimer ce règlement ?")) return;
    await deleteSettlement(settlementId);
  };

  const toggleSplitParticipant = (id: string) => {
    setSplitAmong((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const getParticipantName = (id: string) => {
    const p = participants.find((p) => p.id === id);
    return p ? (p.pseudo || p.name) : "???";
  };

  const getParticipantEmoji = (id: string) => {
    const p = participants.find((p) => p.id === id);
    return p?.emoji_avatar || "👤";
  };

  // Stats
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const myExpenses = expenses.filter((e) => e.paid_by === selectedParticipant);
  const myTotalPaid = myExpenses.reduce((sum, e) => sum + e.amount, 0);
  const myBalance = balances.find((b) => b.participant_id === selectedParticipant);

  // Optimal settlements
  const optimalSettlements = computeOptimalSettlements(balances);

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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Wallet className="w-7 h-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Dépenses 💰</h1>
              <p className="text-sm text-muted-foreground">Qui doit quoi à qui</p>
            </div>
          </div>
          <Button
            onClick={() => setShowAddForm(true)}
            size="sm"
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            Ajouter
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card className="bg-gradient-to-br from-violet-900/40 to-purple-900/40 border-white/10">
            <CardContent className="p-4 text-center">
              <PiggyBank className="w-6 h-6 mx-auto mb-1 text-violet-400" />
              <p className="text-xs text-muted-foreground">Total dépenses</p>
              <p className="text-xl font-bold text-white">{formatEuros(totalExpenses)}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 border-white/10">
            <CardContent className="p-4 text-center">
              <Receipt className="w-6 h-6 mx-auto mb-1 text-blue-400" />
              <p className="text-xs text-muted-foreground">Mes dépenses</p>
              <p className="text-xl font-bold text-white">{formatEuros(myTotalPaid)}</p>
            </CardContent>
          </Card>
        </div>

        {/* My Balance */}
        {myBalance && (
          <Card
            className={`mb-6 border-2 ${
              myBalance.net_balance > 0
                ? "border-green-500/50 bg-green-900/20"
                : myBalance.net_balance < 0
                ? "border-red-500/50 bg-red-900/20"
                : "border-white/10 bg-white/5"
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {myBalance.net_balance > 0 ? (
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  ) : myBalance.net_balance < 0 ? (
                    <TrendingDown className="w-5 h-5 text-red-400" />
                  ) : (
                    <Check className="w-5 h-5 text-gray-400" />
                  )}
                  <span className="font-medium">Ma balance</span>
                </div>
                <span
                  className={`text-xl font-bold ${
                    myBalance.net_balance > 0
                      ? "text-green-400"
                      : myBalance.net_balance < 0
                      ? "text-red-400"
                      : "text-gray-400"
                  }`}
                >
                  {myBalance.net_balance > 0 ? "+" : ""}
                  {formatEuros(myBalance.net_balance)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {myBalance.net_balance > 0
                  ? "On te doit des sous 🤑"
                  : myBalance.net_balance < 0
                  ? "Tu dois de l'argent 😬"
                  : "T'es carré ✨"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Balances Section */}
        <div className="mb-6">
          <button
            onClick={() => setShowBalances(!showBalances)}
            className="flex items-center gap-2 w-full text-left mb-3"
          >
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Soldes de chacun</h2>
            {showBalances ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showBalances && (
            <div className="space-y-2">
              {balances
                .filter((b) => b.net_balance !== 0)
                .sort((a, b) => b.net_balance - a.net_balance)
                .map((b) => (
                  <div
                    key={b.participant_id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getParticipantEmoji(b.participant_id)}</span>
                      <span className="font-medium text-sm">{getParticipantName(b.participant_id)}</span>
                    </div>
                    <span
                      className={`font-bold text-sm ${
                        b.net_balance > 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {b.net_balance > 0 ? "+" : ""}
                      {formatEuros(b.net_balance)}
                    </span>
                  </div>
                ))}
              {balances.filter((b) => b.net_balance !== 0).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Tout le monde est carré ! ✨
                </p>
              )}
            </div>
          )}
        </div>

        {/* Optimal Settlements */}
        {optimalSettlements.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setShowSettlements(!showSettlements)}
              className="flex items-center gap-2 w-full text-left mb-3"
            >
              <ArrowRight className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-semibold">Règlements optimaux</h2>
              <Badge variant="secondary" className="ml-1 text-xs">
                {optimalSettlements.length}
              </Badge>
              {showSettlements ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showSettlements && (
              <div className="space-y-2">
                {optimalSettlements.map((s, i) => {
                  // Check if this settlement already exists
                  const existing = settlements.find(
                    (st) =>
                      st.from_participant === s.from &&
                      st.to_participant === s.to &&
                      Math.abs(st.amount - s.amount) < 10
                  );

                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-xl bg-amber-900/20 border border-amber-500/20"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <span>{getParticipantEmoji(s.from)}</span>
                        <span className="font-medium">{getParticipantName(s.from)}</span>
                        <ArrowRight className="w-4 h-4 text-amber-400" />
                        <span>{getParticipantEmoji(s.to)}</span>
                        <span className="font-medium">{getParticipantName(s.to)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-400">{formatEuros(s.amount)}</span>
                        {existing ? (
                          existing.is_confirmed ? (
                            <Badge className="bg-green-600 text-white text-xs">Payé ✓</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-400">
                              En attente
                            </Badge>
                          )
                        ) : (
                          selectedParticipant === s.from && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 border-amber-500/50 text-amber-400 hover:bg-amber-500/20"
                              onClick={() => handleCreateSettlement(s.from, s.to, s.amount)}
                            >
                              Marquer payé
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Pending Settlements */}
        {settlements.filter((s) => !s.is_confirmed).length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">⏳ Règlements en attente</h3>
            <div className="space-y-2">
              {settlements
                .filter((s) => !s.is_confirmed)
                .map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span>{getParticipantEmoji(s.from_participant)}</span>
                      <span className="font-medium">{getParticipantName(s.from_participant)}</span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <span>{getParticipantEmoji(s.to_participant)}</span>
                      <span className="font-medium">{getParticipantName(s.to_participant)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{formatEuros(s.amount)}</span>
                      {selectedParticipant === s.to_participant && (
                        <Button
                          size="sm"
                          className="text-xs h-7 bg-green-600 hover:bg-green-700"
                          onClick={() => handleConfirmSettlement(s.id)}
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                      )}
                      <button
                        className="text-red-400 hover:text-red-300 p-1"
                        onClick={() => handleDeleteSettlement(s.id)}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Expenses List */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-3">📋 Dépenses ({expenses.length})</h2>
        </div>

        {expenses.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-8 text-center">
              <Wallet className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">Aucune dépense pour l&apos;instant</p>
              <p className="text-sm text-muted-foreground mt-1">Ajoute la première ! 🎉</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {expenses.map((expense) => {
              const catInfo = getCategoryInfo(expense.category);
              const isExpanded = expandedExpense === expense.id;
              const isMine = expense.paid_by === selectedParticipant;

              return (
                <Card
                  key={expense.id}
                  className={`border transition-all ${
                    isMine
                      ? "bg-gradient-to-r from-violet-900/30 to-purple-900/30 border-violet-500/30"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  <CardContent className="p-4">
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedExpense(isExpanded ? null : expense.id)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{catInfo.emoji}</span>
                        <div>
                          <p className="font-medium text-sm">{expense.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Payé par{" "}
                            <span className={isMine ? "text-violet-400 font-medium" : ""}>
                              {isMine ? "toi" : getParticipantName(expense.paid_by)}
                            </span>
                            {" · "}
                            {new Date(expense.created_at).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{formatEuros(expense.amount)}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {isExpanded && expense.splits && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-xs text-muted-foreground mb-2">Répartition :</p>
                        <div className="space-y-1">
                          {expense.splits.map((split) => (
                            <div key={split.id} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span>{getParticipantEmoji(split.participant_id)}</span>
                                <span>
                                  {split.participant_id === expense.paid_by
                                    ? `${getParticipantName(split.participant_id)} (payeur)`
                                    : getParticipantName(split.participant_id)}
                                </span>
                              </div>
                              <span className="text-muted-foreground">{formatEuros(split.amount)}</span>
                            </div>
                          ))}
                        </div>
                        {isMine && (
                          <div className="mt-3 flex justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 border-red-500/50 text-red-400 hover:bg-red-500/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteExpense(expense.id);
                              }}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Supprimer
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Add Expense Sheet */}
        <Sheet open={showAddForm} onOpenChange={setShowAddForm}>
          <SheetContent side="bottom" className="bg-[#1a0a3e] border-white/10 rounded-t-3xl">
            <SheetHeader>
              <SheetTitle className="text-center">Nouvelle dépense 💸</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-4 pb-6">
              <div>
                <label className="text-sm font-medium mb-1 block">Titre</label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Courses Carrefour, Uber, Bières..."
                  className="bg-white/10 border-white/20"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Montant (€)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="25.50"
                  className="bg-white/10 border-white/20"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Catégorie</label>
                <Select value={newCategory} onValueChange={(v) => setNewCategory(v as ExpenseCategory)}>
                  <SelectTrigger className="bg-white/10 border-white/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a0a3e] border-white/20">
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.emoji} {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Répartir entre ({splitAmong.length}/{participants.length})
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {participants.map((p) => (
                    <label
                      key={p.id}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                        splitAmong.includes(p.id)
                          ? "bg-violet-600/30 border border-violet-500/50"
                          : "bg-white/5 border border-white/10"
                      }`}
                      onClick={() => toggleSplitParticipant(p.id)}
                    >
                      <div
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          splitAmong.includes(p.id)
                            ? "bg-violet-500 border-violet-500"
                            : "border-white/30 bg-transparent"
                        }`}
                      >
                        {splitAmong.includes(p.id) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-sm">
                        {p.emoji_avatar || "👤"} {p.pseudo || p.name}
                      </span>
                    </label>
                  ))}
                </div>
                {splitAmong.length > 0 && newAmount && (
                  <p className="text-xs text-muted-foreground mt-2">
                    = {formatEuros(Math.round(parseFloat(newAmount.replace(",", ".")) * 100) / splitAmong.length)} par
                    personne
                  </p>
                )}
              </div>

              <Button
                onClick={handleAddExpense}
                disabled={!newTitle.trim() || !newAmount || splitAmong.length === 0 || submitting}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Ajouter la dépense
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <MobileNav />
    </main>
  );
}
