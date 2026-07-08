"use client";

import Image from "next/image";
import { Countdown } from "./countdown";
import { PartyPopper, MapPin, Calendar, Music } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 festival-gradient opacity-90" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(0.7_0.18_50_/_0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,oklch(0.75_0.18_290_/_0.15),transparent_50%)]" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 max-w-lg mx-auto text-center">
        {/* Logo */}
        <div className="animate-float">
          <Image
            src="/logo.png"
            alt="Cros-Chella"
            width={280}
            height={280}
            className="drop-shadow-2xl"
            priority
          />
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
            CROS-CHELLA
          </h1>
          <p className="text-lg sm:text-xl text-white/80 font-medium">
            Le week-end le plus barré de l&apos;été 🔥
          </p>
        </div>

        {/* Info pills */}
        <div className="flex flex-wrap gap-2 justify-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm border border-white/10">
            <Calendar className="w-3.5 h-3.5" />
            31 juil. — 2 août 2026
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm border border-white/10">
            <MapPin className="w-3.5 h-3.5" />
            Ardèche 🏊
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm border border-white/10">
            <PartyPopper className="w-3.5 h-3.5" />
            8+ potes
          </span>
        </div>

        {/* Countdown */}
        <div className="w-full max-w-sm">
          <p className="text-xs text-white/50 uppercase tracking-widest mb-3 font-medium">
            ⏰ Temps restant avant le carnage
          </p>
          <Countdown />
        </div>

        {/* Teaser */}
        <div className="space-y-4 w-full">
          <div className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 text-left">
            <p className="text-white/90 text-sm leading-relaxed">
              <span className="text-lg mr-1">🎮</span>{" "}
              <strong>Des jeux mystères</strong> préparés par chaque participant vous attendent...
              Personne ne sait ce que les autres ont prévu.{" "}
              <span className="text-white/60">(Bon courage.)</span>
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 text-left">
            <p className="text-white/90 text-sm leading-relaxed">
              <span className="text-lg mr-1">🏊</span>{" "}
              <strong>Baignade, apéro, fête</strong> — on a les spots, la playlist, et zéro excuse pour pas venir.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 text-left">
            <p className="text-white/90 text-sm leading-relaxed">
              <span className="text-lg mr-1">🏠</span>{" "}
              <strong>La maison d&apos;Ardèche de Niels</strong> — 4 chambres, canapé-lit, matelas au sol, hamac pour les plus courageux.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <a
            href="#hype"
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-base shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <PartyPopper className="w-4 h-4" />
            Je suis chaud 🔥
          </a>
          <a
            href="https://open.spotify.com/playlist/2DqmhZTuP8dhiZqCrx0D8f"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 backdrop-blur-sm text-white font-bold text-base border border-white/20 hover:bg-white/15 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Music className="w-4 h-4" />
            La Playlist 🎵
          </a>
        </div>

        {/* Scroll hint */}
        <div className="animate-bounce text-white/40 text-2xl mt-4">↓</div>
      </div>
    </section>
  );
}
