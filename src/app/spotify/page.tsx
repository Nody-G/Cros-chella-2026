"use client";

import { MobileNav } from "@/components/layout/mobile-nav";
import { Music } from "lucide-react";

const SPOTIFY_PLAYLIST_ID = "2DqmhZTuP8dhiZqCrx0D8f";

export default function SpotifyPage() {
  return (
    <main className="pb-20 min-h-screen">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-2">
          <Music className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Playlist 🎵</h1>
        </div>
        <p className="text-muted-foreground text-sm mb-6">
          La playlist officielle du Cros-Chella. Ajoute tes sons préférés !
        </p>

        <div className="rounded-2xl overflow-hidden border border-border mb-6">
          <iframe
            src={`https://open.spotify.com/embed/playlist/${SPOTIFY_PLAYLIST_ID}?utm_source=generator&theme=0`}
            width="100%"
            height="452"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            style={{ borderRadius: "12px" }}
          />
        </div>

        <a
          href={`https://open.spotify.com/playlist/${SPOTIFY_PLAYLIST_ID}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors group"
        >
          <span className="text-2xl">🎧</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium group-hover:text-primary transition-colors">Ouvrir dans Spotify</p>
            <p className="text-[10px] text-muted-foreground">Ajoute tes morceaux directement dans l&apos;app Spotify</p>
          </div>
          <span className="text-muted-foreground text-xs">↗</span>
        </a>
      </div>

      <MobileNav />
    </main>
  );
}
