"use client";

import { useState } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Megaphone, ChevronDown, ChevronUp, Sparkles, Bug, Wrench, Rocket } from "lucide-react";
import updates from "@/data/updates.json";

type UpdateTag = "feature" | "fix" | "improvement" | "launch";

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

function groupByDate(items: typeof updates) {
  const groups: { date: string; items: typeof updates }[] = [];
  let current = "";
  for (const item of items) {
    if (item.date !== current) {
      current = item.date;
      groups.push({ date: current, items: [] });
    }
    groups[groups.length - 1].items.push(item);
  }
  return groups;
}

export default function UpdatesPage() {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const grouped = groupByDate(updates);

  const toggle = (idx: number) => {
    setExpanded((prev) => ({ ...prev, [idx]: !prev[idx] }));
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
          Ce qui a changé dans l&apos;app. Nouvelles features, corrections, améliorations…
        </p>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[18px] top-0 bottom-0 w-px bg-border" />

          {grouped.map((group, gi) => (
            <div key={group.date} className="mb-6">
              {/* Date header */}
              <button
                onClick={() => toggle(gi)}
                className="relative flex items-center gap-3 w-full text-left group mb-3"
              >
                <div className="relative z-10 w-9 h-9 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center shrink-0">
                  <span className="text-xs">📅</span>
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">{formatDate(group.date)}</span>
                  <span className="text-muted-foreground">
                    {expanded[gi] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </span>
                </div>
              </button>

              {/* Items */}
              <div className="ml-[18px] pl-7 border-l-0 space-y-2">
                {group.items.map((item, ii) => {
                  const tag = TAG_CONFIG[item.tag as UpdateTag] || TAG_CONFIG.feature;
                  const TagIcon = tag.icon;
                  return (
                    <div
                      key={ii}
                      className="p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="text-xl shrink-0 mt-0.5">{item.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-sm font-semibold text-foreground">{item.title}</span>
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${tag.bg} ${tag.color}`}>
                              <TagIcon className="w-2.5 h-2.5" />
                              {tag.label}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 p-4 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground">
            💡 Tu veux une feature ? Utilise le bouton <strong>Feedback</strong> dans le menu !
          </p>
        </div>
      </div>

      <MobileNav />
    </main>
  );
}
