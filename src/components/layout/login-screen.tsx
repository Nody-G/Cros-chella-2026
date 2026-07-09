import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, KeyRound, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Participant } from "@/lib/types";

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
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center festival-gradient">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  const handleSelect = (p: Participant) => {
    setSelectedParticipant(p);
    setPasswordInput("");
    setErrorMsg("");
  };

  const handleVerifyPassword = () => {
    if (!selectedParticipant) return;
    
    // Check both admin_code and password (admin_code takes priority)
    const dbAdminCode = selectedParticipant.admin_code;
    const dbPassword = selectedParticipant.password;
    const input = passwordInput.trim();
    
    if (!dbAdminCode && !dbPassword) {
      setErrorMsg("Aucun code d'accès n'est configuré pour ce profil. Demande à Niels (l'admin) de t'en générer un !");
      return;
    }

    // Check admin_code first, then password as fallback
    if ((dbAdminCode && input === dbAdminCode.trim()) || (dbPassword && input === dbPassword.trim())) {
      login(selectedParticipant.id);
    } else {
      setErrorMsg("Code incorrect ❌ Réessaie ou demande à Niels de te générer un code.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleVerifyPassword();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 festival-gradient">
      <div className="max-w-sm w-full text-center space-y-6">
        <div>
          <span className="text-5xl block mb-4">🎪</span>
          <h1 className="text-2xl font-bold text-white mb-2">CROS-CHELLA</h1>
          <p className="text-white/70 text-sm">Le festival de ton été</p>
        </div>

        {!selectedParticipant ? (
          <>
            <p className="text-white/70 text-sm font-semibold">Qui es-tu ?</p>
            <div className="grid grid-cols-2 gap-2">
              {participants.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/20 hover:border-white/20 transition-all active:scale-95 text-center flex flex-col items-center justify-center"
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
          </>
        ) : (
          <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/15 text-left space-y-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedParticipant(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/70 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex-1">
                <h3 className="font-bold text-white text-sm">Connexion : {selectedParticipant.name}</h3>
                {selectedParticipant.pseudo && (
                  <p className="text-white/50 text-xs">aka {selectedParticipant.pseudo}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/70 block">
                Mot de passe ou Code d&apos;accès
              </label>
              <div className="relative">
                <Input
                  type="password"
                  placeholder="Entre ton code..."
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pl-10 focus-visible:ring-primary focus-visible:border-primary"
                />
                <KeyRound className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg leading-relaxed">
                {errorMsg}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <Button 
                variant="ghost" 
                onClick={() => setSelectedParticipant(null)}
                className="flex-1 text-white hover:bg-white/5"
              >
                Retour
              </Button>
              <Button 
                onClick={handleVerifyPassword}
                disabled={!selectedParticipant.password && !passwordInput}
                className="flex-1 bg-primary text-primary-foreground font-bold hover:opacity-90"
              >
                Valider
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
