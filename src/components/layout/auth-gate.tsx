"use client";

import { useAuth } from "@/hooks/use-auth";
import { LoginScreen } from "@/components/layout/login-screen";
import { Loader2 } from "lucide-react";
import { MobileNav } from "@/components/layout/mobile-nav";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { currentParticipant, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentParticipant) {
    return <LoginScreen />;
  }

  return (
    <>
      {children}
      <MobileNav />
    </>
  );
}
