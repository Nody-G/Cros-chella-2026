import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/hooks/use-auth";
import { AuthGate } from "@/components/layout/auth-gate";
import { SwRegister } from "@/components/layout/sw-register";
import { FlashAnnouncementListener } from "@/components/layout/flash-announcement-listener";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Cros-Chella 🎪",
  description:
    "Le week-end le plus barré de l'été — 31 juillet au 2 août 2026, Ardèche",
  openGraph: {
    title: "Cros-Chella 🎪",
    description:
      "Le week-end le plus barré de l'été — 31 juillet au 2 août 2026, Ardèche",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={cn("dark font-sans", inter.variable)}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AuthProvider>
          <SwRegister />
          <FlashAnnouncementListener />
          <AuthGate>{children}</AuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}
