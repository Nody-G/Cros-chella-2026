"use client";

import { useCountdown } from "@/hooks/use-countdown";

export function Countdown() {
  const { days, hours, minutes, seconds, isOver } = useCountdown();

  if (isOver) {
    return (
      <div className="text-center">
        <p className="text-3xl font-bold text-festival-gradient animate-pulse">
          🔥 C&apos;EST MAINTENANT ! 🔥
        </p>
      </div>
    );
  }

  const blocks = [
    { value: days, label: "Jours" },
    { value: hours, label: "Heures" },
    { value: minutes, label: "Minutes" },
    { value: seconds, label: "Secondes" },
  ];

  return (
    <div className="flex gap-3 justify-center">
      {blocks.map((block) => (
        <div
          key={block.label}
          className="flex flex-col items-center"
        >
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-card/80 backdrop-blur-sm border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
            <span className="text-2xl sm:text-3xl font-bold text-primary tabular-nums">
              {String(block.value).padStart(2, "0")}
            </span>
          </div>
          <span className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 font-medium uppercase tracking-wider">
            {block.label}
          </span>
        </div>
      ))}
    </div>
  );
}
