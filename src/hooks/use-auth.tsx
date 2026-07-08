"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getParticipants } from "@/lib/supabase-queries";
import type { Participant } from "@/lib/types";

interface AuthContextType {
  currentParticipant: Participant | null;
  participants: Participant[];
  login: (participantId: string) => void;
  logout: () => void;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentParticipant: null,
  participants: [],
  login: () => {},
  logout: () => {},
  isAdmin: false,
  loading: true,
});

const STORAGE_KEY = "cros-chella-user-id";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const data = await getParticipants();
      setParticipants(data);

      const savedId = localStorage.getItem(STORAGE_KEY);
      if (savedId) {
        const found = data.find((p) => p.id === savedId);
        if (found) setCurrentParticipant(found);
      }
      setLoading(false);
    }
    init();
  }, []);

  const login = (participantId: string) => {
    const found = participants.find((p) => p.id === participantId);
    if (found) {
      setCurrentParticipant(found);
      localStorage.setItem(STORAGE_KEY, found.id);
    }
  };

  const logout = () => {
    setCurrentParticipant(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        currentParticipant,
        participants,
        login,
        logout,
        isAdmin: currentParticipant?.is_admin || false,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
