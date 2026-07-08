"use client";

import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

const EMOJIS = ["😎", "🤪", "🗿", "🦊", "🌶️", "🎸", "💀", "🤡", "🦄", "🐸", "👑", "🍕"];

function getEmoji(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return EMOJIS[Math.abs(hash) % EMOJIS.length];
}

export function LoginScreen() {
  const { participants, login, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center festival-gradient">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 festival-gradient">
      <div className="max-w-sm w-full text-center space-y-6">
        <div>
          <span className="text-5xl block mb-4">🎪</span>
          <h1 className="text-2xl font-bold text-white mb-2">CROS-CHELLA</h1>
          <p className="text-white/70 text-sm">Qui es-tu ?</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {participants.map((p) => (
            <button
              key={p.id}
              onClick={() => login(p.id)}
              className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/20 hover:border-white/20 transition-all active:scale-95"
            >
              <span className="text-2xl block mb-1">{getEmoji(p.name)}</span>
              <span className="text-white text-sm font-medium block">{p.name}</span>
              {p.pseudo && (
                <span className="text-white/50 text-[10px] block mt-0.5">
                  {p.pseudo}
                </span>
              )}
            </button>
          ))}
        </div>

        <p className="text-white/30 text-xs">
          Sélectionne ton profil pour accéder à l&apos;app
        </p>
      </div>
    </div>
  );
}
