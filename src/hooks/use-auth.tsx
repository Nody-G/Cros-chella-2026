"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { getParticipants } from "@/lib/supabase-queries";
import { supabase } from "@/lib/supabase";
import type { Participant } from "@/lib/types";

interface AuthContextType {
  currentParticipant: Participant | null;
  participants: Participant[];
  login: (participantId: string) => void;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentParticipant: null,
  participants: [],
  login: () => {},
  logout: () => {},
  refreshAuth: async () => {},
  isAdmin: false,
  loading: true,
});

const STORAGE_KEY = "cros-chella-user-id";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  const init = async () => {
    const data = await getParticipants();
    setParticipants(data);

    const savedId = localStorage.getItem(STORAGE_KEY);
    if (savedId) {
      const found = data.find((p) => p.id === savedId);
      if (found) setCurrentParticipant(found);
    }
    setLoading(false);
  };

  useEffect(() => {
    init();

    // Realtime subscription for participant changes (profile photos, etc.)
    const channel = supabase
      .channel("participants-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participants" },
        (payload) => {
          const eventType = payload.eventType;
          const newRecord = payload.new as Participant | null;
          const oldRecord = payload.old as Participant | null;

          setParticipants((prev) => {
            let updated = [...prev];

            if (eventType === "INSERT" && newRecord) {
              if (!updated.find((p) => p.id === newRecord.id)) {
                updated.push(newRecord);
              }
            } else if (eventType === "UPDATE" && newRecord) {
              updated = updated.map((p) =>
                p.id === newRecord.id ? { ...p, ...newRecord } : p
              );
            } else if (eventType === "DELETE" && oldRecord) {
              updated = updated.filter((p) => p.id !== oldRecord.id);
            }

            return updated;
          });

          // Also update currentParticipant if it's the one that changed
          if (newRecord && eventType === "UPDATE") {
            setCurrentParticipant((prev) => {
              if (prev && prev.id === newRecord.id) {
                return { ...prev, ...newRecord };
              }
              return prev;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const refreshAuth = useCallback(async () => {
    const data = await getParticipants();
    setParticipants(data);
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (savedId) {
      const found = data.find((p) => p.id === savedId);
      if (found) setCurrentParticipant(found);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentParticipant,
        participants,
        login,
        logout,
        refreshAuth,
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
