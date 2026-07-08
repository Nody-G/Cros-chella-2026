"use client";

import { Users, Gamepad2, CalendarDays, Droplets, BarChart3, MessageCircle, ImageIcon } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Qui vient ?",
    desc: "La liste des participants, leurs pseudos débiles et leur statut.",
    emoji: "👥",
    href: "/participants",
  },
  {
    icon: Gamepad2,
    title: "Jeux mystères",
    desc: "Chacun prépare un jeu secret. Bonne chance.",
    emoji: "🎮",
    href: "/jeux",
  },
  {
    icon: CalendarDays,
    title: "Programme",
    desc: "Vendredi soir → Dimanche : le planning du carnage.",
    emoji: "📅",
    href: "/programme",
  },
  {
    icon: Droplets,
    title: "Spots de baignade",
    desc: "Les meilleurs coins pour se jeter à l&apos;eau.",
    emoji: "🏊",
    href: "/spots",
  },
  {
    icon: BarChart3,
    title: "Sondages",
    desc: "Votez pour les vraies questions importantes.",
    emoji: "📊",
    href: "/sondages",
  },
  {
    icon: MessageCircle,
    title: "Chat",
    desc: "Le mur de discussion. Préparez-vous au spam.",
    emoji: "💬",
    href: "/chat",
  },
  {
    icon: ImageIcon,
    title: "Galerie",
    desc: "Photos du week-end. Souvenirs garantis (ou pas).",
    emoji: "📸",
    href: "/galerie",
  },
];

export function FeaturesSection() {
  return (
    <section className="px-4 py-16 max-w-lg mx-auto" id="features">
      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Tout ce qu&apos;il te faut 🎪
        </h2>
        <p className="text-muted-foreground text-sm">
          (Et plein de trucs dont t&apos;as pas besoin, mais c&apos;est drôle)
        </p>
      </div>

      <div className="grid gap-3">
        {features.map((feature) => (
          <a
            key={feature.title}
            href={feature.href}
            className="group flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">
              {feature.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {feature.desc}
              </p>
            </div>
            <div className="text-muted-foreground/50 group-hover:text-primary/50 transition-colors">
              →
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
