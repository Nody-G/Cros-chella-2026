"use client";

import { useState } from "react";
import { Megaphone, ChevronDown, ChevronUp, Sparkles, Bug, Wrench, Rocket } from "lucide-react";
import updates from "@/data/updates.json";

type UpdateTag = "feature" | "fix" | "improvement" | "launch";

interface UpdateItem {
  date: string;
  tag: string;
  emoji: string;
  title: string;
  description: string;
  details?: string;
}

const TAG_CONFIG: Record<UpdateTag, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  feature: { label: "Nouveau", color: "text-green-400", bg: "bg-green-500/10 border-green-500/30", icon: Sparkles },
  fix: { label: "Bug fix", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30", icon: Bug },
  improvement: { label: "Amélioration", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30", icon: Wrench },
  launch: { label: "Lancement", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30", icon: Rocket },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function groupByDate(items: UpdateItem[]) {
  const map = new Map<string, UpdateItem[]>();
  for (const item of items) {
    if (!map.has(item.date)) map.set(item.date, []);
    map.get(item.date)!.push(item);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({ date, items }));
}

export default function UpdatesPage() {
  const [expandedGroup, setExpandedGroup] = useState<Record<number, boolean>>({});
  const [expandedItem, setExpandedItem] = useState<Record<string, boolean>>({});
  const grouped = groupByDate(updates as UpdateItem[]);

  const toggleGroup = (idx: number) => {
    setExpandedGroup((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const toggleItem = (key: string) => {
    setExpandedItem((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <main className="pb-20 min-h-screen">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Megaphone className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Mises à jour 📢</h1>
        </div>
        <p className="text-muted-foreground text-sm mb-6">
          Ce qui a changé dans l&apos;app. Clique sur une mise à jour pour déplier les détails.
        </p>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[18px] top-0 bottom-0 w-px bg-border" />

          {grouped.map((group, gi) => (
            <div key={group.date} className="mb-6">
              {/* Date header */}
              <button
                onClick={() => toggleGroup(gi)}
                className="relative flex items-center gap-3 w-full text-left group mb-3"
              >
                <div className="relative z-10 w-9 h-9 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center shrink-0">
                  <span className="text-xs">📅</span>
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">{formatDate(group.date)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {group.items.length} mise{group.items.length > 1 ? "s" : ""} à jour
                    </span>
                    <span className="text-muted-foreground transition-transform duration-200">
                      {expandedGroup[gi] !== false ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </div>
                </div>
              </button>

              {/* Items */}
              {expandedGroup[gi] !== false && (
                <div className="ml-[18px] pl-7 border-l-0 space-y-3">
                  {group.items.map((item, ii) => {
                    const tag = TAG_CONFIG[item.tag as UpdateTag] || TAG_CONFIG.feature;
                    const TagIcon = tag.icon;
                    const itemKey = `${gi}-${ii}`;
                    const isItemExpanded = expandedItem[itemKey] || false;
                    const hasDetails = Boolean(item.details && item.details.trim() !== item.description.trim());

                    return (
                      <div key={ii}>
                        <button
                          onClick={() => hasDetails && toggleItem(itemKey)}
                          className={`w-full text-left ${hasDetails ? "cursor-pointer" : "cursor-default"}`}
                        >
                          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-card/60 border border-border/80 hover:border-primary/40 transition-all shadow-sm">
                            <span className="text-xl mt-0.5 shrink-0">{item.emoji}</span>
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm text-foreground">{item.title}</span>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${tag.bg} ${tag.color}`}
                                >
                                  <TagIcon className="w-2.5 h-2.5" />
                                  {tag.label}
                                </span>
                              </div>
                              {/* Untruncated full description */}
                              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                                {item.description}
                              </p>
                            </div>
                            {hasDetails && (
                              <span className="text-muted-foreground shrink-0 mt-1 transition-transform duration-300">
                                {isItemExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-primary" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </span>
                            )}
                          </div>
                        </button>

                        {/* Smooth fluid accordion drawer */}
                        <div
                          className={`grid transition-all duration-300 ease-in-out ${
                            isItemExpanded && hasDetails
                              ? "grid-rows-[1fr] opacity-100 mt-2"
                              : "grid-rows-[0fr] opacity-0 mt-0"
                          }`}
                        >
                          <div className="overflow-hidden">
                            <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-xs text-foreground/90 leading-relaxed whitespace-pre-line shadow-inner">
                              {item.details}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-muted-foreground">
          <p>🎪 Cros-Chella — {updates.length} mises à jour au total</p>
        </div>
      </div>
    </main>
  );
}
