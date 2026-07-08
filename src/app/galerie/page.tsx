"use client";

import { useEffect, useState } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { ImageIcon, Loader2, Camera } from "lucide-react";
import { getPhotos } from "@/lib/supabase-queries";
import type { Photo } from "@/lib/types";

export default function GaleriePage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const data = await getPhotos();
      setPhotos(data);
      setLoading(false);
    }
    fetch();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <main className="pb-20 min-h-screen">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <ImageIcon className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Galerie 📸</h1>
          </div>
        </div>
        <p className="text-muted-foreground text-sm mb-6">
          Photos du week-end. Souvenirs garantis (ou pas).
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : photos.length === 0 ? (
          <div className="p-8 rounded-2xl bg-card border border-border text-center">
            <span className="text-4xl block mb-3">📷</span>
            <p className="text-muted-foreground text-sm">
              Aucune photo pour l&apos;instant.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Les photos apparaîtront ici pendant et après le week-end.
            </p>
            <div className="mt-6 p-4 rounded-xl bg-muted/50 border border-dashed border-border">
              <Camera className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                📸 Upload de photos bientôt disponible
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {photos.map((photo) => (
              <Card key={photo.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="aspect-square bg-muted flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                  <div className="p-2">
                    {photo.caption && (
                      <p className="text-xs text-foreground line-clamp-2 mb-1">{photo.caption}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">
                        {photo.author?.pseudo || photo.author?.name || "Anonyme"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(photo.created_at)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <MobileNav />
    </main>
  );
}
