"use client";

import { useEffect, useState, useRef } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageIcon, Loader2, Camera, Upload, Trash2, X } from "lucide-react";
import { getPhotos } from "@/lib/supabase-queries";
import type { Photo } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { compressImage, readFileAsDataURL } from "@/lib/image-utils";
import { supabase } from "@/lib/supabase";

export default function GaleriePage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const { currentParticipant } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetch() {
      const data = await getPhotos();
      setPhotos(data);
      setLoading(false);
    }
    fetch();

    // Realtime subscription for new photos
    const channel = supabase
      .channel("photos-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "photos" },
        async (payload) => {
          const newPhoto = payload.new as Photo;
          // Fetch author info
          const { data: author } = await supabase
            .from("participants")
            .select("*")
            .eq("id", newPhoto.author_id)
            .single();
          setPhotos((prev) => [{ ...newPhoto, author: author || undefined }, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "photos" },
        (payload) => {
          const oldPhoto = payload.old as Photo;
          setPhotos((prev) => prev.filter((p) => p.id !== oldPhoto.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, "gallery");
      setSelectedFile(compressed);
      const dataUrl = await readFileAsDataURL(compressed);
      setPreview(dataUrl);
    } catch (err) {
      console.error("Image compression error:", err);
      setSelectedFile(file);
      const dataUrl = await readFileAsDataURL(file);
      setPreview(dataUrl);
    }
    e.target.value = "";
  };

  const handleUpload = async () => {
    if (!selectedFile || !currentParticipant) return;
    setUploading(true);

    const fileName = `${currentParticipant.id}_${Date.now()}.jpg`;
    const filePath = `gallery/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, selectedFile, { contentType: "image/jpeg" });

    if (uploadError) {
      console.error("Error uploading photo:", uploadError);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const { error: dbError } = await supabase
      .from("photos")
      .insert({
        author_id: currentParticipant.id,
        url: urlData.publicUrl,
        caption: caption.trim() || null,
      });

    if (dbError) {
      console.error("Error saving photo record:", dbError);
    }

    // Reset
    setSelectedFile(null);
    setPreview(null);
    setCaption("");
    setUploading(false);
  };

  const handleDeletePhoto = async (photoId: string) => {
    const { error } = await supabase
      .from("photos")
      .delete()
      .eq("id", photoId);

    if (error) {
      console.error("Error deleting photo:", error);
    }
  };

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

        {/* Upload section */}
        {currentParticipant && (
          <div className="mb-6 p-4 rounded-xl bg-card border border-border">
            {preview ? (
              <div className="space-y-3">
                <div className="relative">
                  <img src={preview} alt="Preview" className="w-full max-h-64 object-cover rounded-lg" />
                  <button
                    onClick={() => { setPreview(null); setSelectedFile(null); setCaption(""); }}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Ajouter une légende... (optionnel)"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full text-sm bg-muted border border-border rounded-lg px-3 py-2"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="flex-1"
                  >
                    {uploading ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Upload...</>
                    ) : (
                      <><Upload className="w-4 h-4 mr-2" /> Publier</>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => { setPreview(null); setSelectedFile(null); setCaption(""); }}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  📁 Importer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  📸 Caméra
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            )}
          </div>
        )}

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
              Sois le premier à poster une photo !
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {photos.map((photo) => (
              <Card key={photo.id} className="overflow-hidden group">
                <CardContent className="p-0">
                  <div className="aspect-square bg-muted flex items-center justify-center relative">
                    <img
                      src={photo.url}
                      alt={photo.caption || "Photo"}
                      className="w-full h-full object-cover"
                    />
                    {currentParticipant?.is_admin && (
                      <button
                        onClick={() => handleDeletePhoto(photo.id)}
                        className="absolute top-1 right-1 w-6 h-6 bg-destructive/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3 text-white" />
                      </button>
                    )}
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
