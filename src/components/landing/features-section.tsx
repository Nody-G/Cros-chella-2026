"use client";

import { Users, Gamepad2, CalendarDays, Droplets, BarChart3, MessageCircle, ImageIcon, UserCircle } from "lucide-react";

const features = [
  {
    icon: UserCircle,
    title: "Mon Profil",
    desc: "Personnalise ton identité de festival.",
    emoji: "🎭",
    href: "/profil",
    glow: "gold" as const,
  },
  {
    icon: Users,
    title: "Qui vient ?",
    desc: "La liste des participants, leurs pseudos débiles et leur statut.",
    emoji: "👥",
    href: "/participants",
    glow: "violet" as const,
  },
  {
    icon: Gamepad2,
    title: "Jeux mystères",
    desc: "Chacun prépare un jeu secret. Bonne chance.",
    emoji: "🎮",
    href: "/jeux",
    glow: "gold" as const,
  },
  {
    icon: CalendarDays,
    title: "Programme",
    desc: "Vendredi soir → Dimanche : le planning du carnage.",
    emoji: "📅",
    href: "/programme",
    glow: "violet" as const,
  },
  {
    icon: Droplets,
    title: "Spots de baignade",
    desc: "Les meilleurs coins pour se jeter à l&apos;eau.",
    emoji: "🏊",
    href: "/spots",
    glow: "gold" as const,
  },
  {
    icon: BarChart3,
    title: "Sondages",
    desc: "Votez pour les vraies questions importantes.",
    emoji: "📊",
    href: "/sondages",
    glow: "violet" as const,
  },
  {
    icon: MessageCircle,
    title: "Chat",
    desc: "Le mur de discussion. Préparez-vous au spam.",
    emoji: "💬",
    href: "/chat",
    glow: "gold" as const,
  },
  {
    icon: ImageIcon,
    title: "Galerie",
    desc: "Photos du week-end. Souvenirs garantis (ou pas).",
    emoji: "📸",
    href: "/galerie",
    glow: "violet" as const,
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
        {features.map((feature, idx) => (
          <a
            key={feature.title}
            href={feature.href}
            className={`group flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all duration-300 opacity-0 animate-fade-in-up stagger-${idx + 1}`}
            style={{
              boxShadow: feature.glow === "gold"
                ? "0 0 0 1px hsl(35 85% 58% / 0.05)"
                : "0 0 0 1px hsl(280 65% 58% / 0.05)",
            }}
          >
            <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
              feature.glow === "gold"
                ? "bg-primary/10 group-hover:bg-primary/20"
                : "bg-accent/10 group-hover:bg-accent/20"
            } transition-colors`}>
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
            <div className="text-muted-foreground/30 group-hover:text-primary/60 transition-colors">
              →
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
