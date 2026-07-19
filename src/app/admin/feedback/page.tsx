"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bug, Lightbulb, Trash2, ChevronDown, ChevronUp, CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getFeedback, updateFeedbackStatus, deleteFeedback } from "@/lib/supabase-queries";
import type { Feedback, FeedbackStatus } from "@/lib/types";

const STATUS_CONFIG: Record<FeedbackStatus, { label: string; color: string; icon: typeof Bug }> = {
  open: { label: "Ouvert", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Clock },
  in_progress: { label: "En cours", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Loader2 },
  done: { label: "Traité", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle2 },
  dismissed: { label: "Ignoré", color: "bg-gray-500/20 text-gray-400 border-gray-500/30", icon: XCircle },
};

export default function AdminFeedbackPage() {
  const { isAdmin } = useAuth();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | FeedbackStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "bug" | "idea">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const data = await getFeedback();
      setFeedback(data);
      setLoading(false);
    };
    fetch();
  }, []);

  const handleStatusChange = async (id: string, status: FeedbackStatus) => {
    setUpdatingId(id);
    const success = await updateFeedbackStatus(id, status);
    if (success) {
      setFeedback((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status, updated_at: new Date().toISOString() } : f))
      );
    } else {
      // Re-fetch to ensure UI is in sync with DB
      const data = await getFeedback();
      setFeedback(data);
    }
    setUpdatingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce feedback ?")) return;
    const success = await deleteFeedback(id);
    if (success) {
      setFeedback((prev) => prev.filter((f) => f.id !== id));
    }
  };

  const filtered = feedback.filter((f) => {
    if (filter !== "all" && f.status !== filter) return false;
    if (typeFilter !== "all" && f.type !== typeFilter) return false;
    return true;
  });

  const counts = {
    all: feedback.length,
    open: feedback.filter((f) => f.status === "open").length,
    in_progress: feedback.filter((f) => f.status === "in_progress").length,
    done: feedback.filter((f) => f.status === "done").length,
    dismissed: feedback.filter((f) => f.status === "dismissed").length,
  };

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-background pb-24">
        <div className="px-4 pt-6 max-w-lg mx-auto text-center">
          <span className="text-4xl block mb-3">🔒</span>
          <p className="text-muted-foreground">Accès réservé à l&apos;admin</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-24">
      <div className="px-4 pt-6 max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            Feedback 📋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Bugs signalés et idées des potes
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {(["all", "open", "in_progress", "done", "dismissed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all ${
                filter === s
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40"
              }`}
            >
              {s === "all" ? `Tous (${counts.all})` : `${STATUS_CONFIG[s].label} (${counts[s]})`}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          {(["all", "bug", "idea"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                typeFilter === t
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40"
              }`}
            >
              {t === "all" ? "Tous" : t === "bug" ? "🐛 Bugs" : "💡 Idées"}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 rounded-2xl bg-card border border-border text-center">
            <span className="text-4xl block mb-3">🎉</span>
            <p className="text-muted-foreground text-sm">
              {filter === "all" ? "Aucun feedback pour l'instant !" : "Aucun feedback avec ce filtre"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((f) => {
              const statusConf = STATUS_CONFIG[f.status];
              const isExpanded = expandedId === f.id;
              const StatusIcon = statusConf.icon;
              return (
                <Card key={f.id} className="overflow-hidden hover:border-primary/40 transition-colors">
                  <CardContent className="p-4">
                    {/* Header */}
                    <div
                      className="flex items-start gap-3 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : f.id)}
                    >
                      <div className={`h-10 w-10 flex-shrink-0 rounded-full flex items-center justify-center ${
                        f.type === "bug" ? "bg-red-500/15" : "bg-yellow-500/15"
                      }`}>
                        {f.type === "bug" ? (
                          <Bug className="w-5 h-5 text-red-400" />
                        ) : (
                          <Lightbulb className="w-5 h-5 text-yellow-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-sm text-foreground truncate">{f.title}</h3>
                          <Badge variant="outline" className={`text-[10px] ${statusConf.color}`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConf.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>
                            {f.author?.emoji_avatar || "👤"} {f.author?.pseudo || f.author?.name || "Anonyme"}
                          </span>
                          <span>·</span>
                          <span>{new Date(f.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </div>

                      <div className="flex-shrink-0 text-muted-foreground">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>

                    {/* Expanded */}
                    {isExpanded && (
                      <div className="mt-4 space-y-3 border-t border-border pt-3">
                        {f.description && (
                          <div className="bg-muted/30 rounded-xl p-3">
                            <p className="text-sm text-foreground whitespace-pre-wrap">{f.description}</p>
                          </div>
                        )}

                        {/* Status actions */}
                        <div className="flex flex-wrap gap-2">
                          {(["open", "in_progress", "done", "dismissed"] as const).map((s) => (
                            <button
                              key={s}
                              onClick={() => handleStatusChange(f.id, s)}
                              disabled={updatingId === f.id}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                                f.status === s
                                  ? STATUS_CONFIG[s].color + " border-current"
                                  : "border-border text-muted-foreground hover:border-primary/40"
                              }`}
                            >
                              {STATUS_CONFIG[s].label}
                            </button>
                          ))}
                        </div>

                        {/* Delete */}
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(f.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
