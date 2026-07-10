"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageIcon, Loader2, Camera, Upload, Trash2, X, Pencil, Send, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { getPhotos, updatePhotoCaption, deletePhoto, getPhotoComments, addPhotoComment, deletePhotoComment } from "@/lib/supabase-queries";
import type { Photo, PhotoComment } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { compressImage, readFileAsDataURL, getCroppedImage, CropArea } from "@/lib/image-utils";
import { supabase } from "@/lib/supabase";
import Cropper from "react-easy-crop";

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

  // Crop state
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);

  // Full screen viewer
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // Edit caption
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");

  // Comments
  const [commentsPhotoId, setCommentsPhotoId] = useState<string | null>(null);
  const [comments, setComments] = useState<PhotoComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  const onCropComplete = useCallback((_croppedArea: CropArea, croppedAreaPixels: CropArea) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const fetchPhotos = async () => {
    const data = await getPhotos();
    setPhotos(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPhotos();

    // Realtime — clean existing channels first
    const existingCh = supabase.getChannels().find((ch) => ch.topic === "realtime:photos-realtime");
    if (existingCh) supabase.removeChannel(existingCh);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (supabase as any)
      .channel("photos-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "photos" },
        () => { fetchPhotos(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "photo_comments" },
        () => {
          // Refresh comments if viewing
          if (commentsPhotoId) loadComments(commentsPhotoId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadComments = async (photoId: string) => {
    setLoadingComments(true);
    const data = await getPhotoComments(photoId);
    setComments(data);
    setLoadingComments(false);
  };

  const handleOpenComments = async (photoId: string) => {
    setCommentsPhotoId(photoId);
    setNewComment("");
    await loadComments(photoId);
  };

  const handleSendComment = async () => {
    if (!currentParticipant || !commentsPhotoId || !newComment.trim()) return;
    setSendingComment(true);
    await addPhotoComment(commentsPhotoId, currentParticipant.id, newComment.trim());
    setNewComment("");
    await loadComments(commentsPhotoId);
    setSendingComment(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    await deletePhotoComment(commentId);
    if (commentsPhotoId) await loadComments(commentsPhotoId);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataURL(file);
      setCropSrc(dataUrl);
    } catch (err) {
      console.error("Error reading file:", err);
    }
    e.target.value = "";
  };

  const handleCropConfirm = async () => {
    if (!cropSrc || !croppedAreaPixels) return;
    try {
      const croppedBlob = await getCroppedImage(cropSrc, croppedAreaPixels);
      const croppedFile = new File([croppedBlob], "photo.jpg", { type: "image/jpeg" });
      const compressed = await compressImage(croppedFile, "gallery");
      setSelectedFile(compressed);
      const dataUrl = await readFileAsDataURL(compressed);
      setPreview(dataUrl);
      setCropSrc(null);
    } catch (err) {
      console.error("Error cropping:", err);
    }
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

    setSelectedFile(null);
    setPreview(null);
    setCaption("");
    setUploading(false);
  };

  const handleStartEditCaption = (photo: Photo) => {
    setEditingPhotoId(photo.id);
    setEditCaption(photo.caption || "");
  };

  const handleSaveCaption = async (photoId: string) => {
    await updatePhotoCaption(photoId, editCaption);
    setEditingPhotoId(null);
    await fetchPhotos();
  };

  const handleDeletePhoto = async (photoId: string) => {
    await deletePhoto(photoId);
    if (viewerIndex !== null) {
      setViewerIndex(null);
    }
    await fetchPhotos();
  };

  // Viewer navigation
  const currentPhoto = viewerIndex !== null ? photos[viewerIndex] : null;
  const handlePrevPhoto = () => { if (viewerIndex !== null && viewerIndex > 0) setViewerIndex(viewerIndex - 1); };
  const handleNextPhoto = () => { if (viewerIndex !== null && viewerIndex < photos.length - 1) setViewerIndex(viewerIndex + 1); };

  return (
    <main className="pb-20 min-h-screen">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <ImageIcon className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Galerie 📸</h1>
          </div>
        </div>
        <p className="text-muted-foreground text-sm mb-4">
          Photos du week-end. Souvenirs garantis (ou pas).
        </p>

        {/* Google Drive link */}
        <a
          href="https://drive.google.com/drive/folders/1NeWMAAouEcHn1E6dfE8ZRTqgqILbuzzJ?usp=drive_link"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors group"
        >
          <span className="text-2xl">📁</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium group-hover:text-primary transition-colors">Google Drive — Photos & Vidéos HD</p>
            <p className="text-[10px] text-muted-foreground">Stocke tes photos et vidéos en pleine qualité ici</p>
          </div>
          <span className="text-muted-foreground text-xs">↗</span>
        </a>

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

        {/* Crop modal */}
        {cropSrc && (
          <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
            <div className="p-4 flex items-center justify-between">
              <h3 className="text-white font-bold text-sm">Ajuster la photo</h3>
              <button onClick={() => setCropSrc(null)} className="text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 relative">
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={4 / 3}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <ZoomOut className="w-4 h-4 text-white" />
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1"
                />
                <ZoomIn className="w-4 h-4 text-white" />
              </div>
              <Button onClick={handleCropConfirm} className="w-full">
                Valider
              </Button>
            </div>
          </div>
        )}

        {/* Photo grid */}
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
            {photos.map((photo, idx) => {
              const isOwner = currentParticipant?.id === photo.author_id;
              return (
                <Card key={photo.id} className="overflow-hidden group">
                  <CardContent className="p-0">
                    <div
                      className="aspect-square bg-muted flex items-center justify-center relative cursor-pointer"
                      onClick={() => setViewerIndex(idx)}
                    >
                      <img
                        src={photo.url}
                        alt={photo.caption || "Photo"}
                        className="w-full h-full object-cover"
                      />
                      {(isOwner || currentParticipant?.is_admin) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo.id); }}
                          className="absolute top-1 right-1 w-6 h-6 bg-destructive/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3 text-white" />
                        </button>
                      )}
                    </div>
                    <div className="p-2">
                      {editingPhotoId === photo.id ? (
                        <div className="flex gap-1 mb-1">
                          <input
                            autoFocus
                            value={editCaption}
                            onChange={(e) => setEditCaption(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleSaveCaption(photo.id); if (e.key === "Escape") setEditingPhotoId(null); }}
                            className="flex-1 text-xs bg-muted border border-border rounded px-2 py-1"
                            placeholder="Légende..."
                          />
                          <button onClick={() => handleSaveCaption(photo.id)} className="text-primary">
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 mb-1">
                          {photo.caption && (
                            <p className="text-xs text-foreground line-clamp-2 flex-1">{photo.caption}</p>
                          )}
                          {isOwner && (
                            <button
                              onClick={() => handleStartEditCaption(photo)}
                              className="text-muted-foreground hover:text-primary shrink-0"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">
                          {photo.author?.pseudo || photo.author?.name || "Anonyme"}
                        </span>
                        <button
                          onClick={() => handleOpenComments(photo.id)}
                          className="text-[10px] text-muted-foreground hover:text-primary"
                        >
                          💬
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Full screen viewer */}
      {currentPhoto && viewerIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between p-4">
            <button onClick={() => setViewerIndex(null)} className="text-white">
              <X className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-white/70 text-xs">
                {currentPhoto.author?.pseudo || "Anonyme"}
              </span>
              {(currentParticipant?.id === currentPhoto.author_id || currentParticipant?.is_admin) && (
                <button
                  onClick={() => { handleDeletePhoto(currentPhoto.id); }}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Image */}
          <div className="flex-1 flex items-center justify-center relative px-4">
            {viewerIndex > 0 && (
              <button
                onClick={handlePrevPhoto}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/20 rounded-full p-2 hover:bg-white/30"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
            )}
            <img
              src={currentPhoto.url}
              alt={currentPhoto.caption || "Photo"}
              className="max-h-full max-w-full object-contain"
            />
            {viewerIndex < photos.length - 1 && (
              <button
                onClick={handleNextPhoto}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/20 rounded-full p-2 hover:bg-white/30"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            )}
          </div>

          {/* Caption + comments */}
          <div className="bg-black/80 backdrop-blur-sm max-h-[40vh] flex flex-col">
            {currentPhoto.caption && (
              <p className="text-white text-sm px-4 pt-3">{currentPhoto.caption}</p>
            )}

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 min-h-0">
              {loadingComments ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-white/50" />
                </div>
              ) : comments.length > 0 ? (
                comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2 group/comment">
                    <span className="text-xs text-white/50 shrink-0 font-medium">
                      {c.author?.pseudo || "Anon"}
                    </span>
                    <p className="text-xs text-white/80 flex-1">{c.content}</p>
                    {(c.author_id === currentParticipant?.id || currentParticipant?.is_admin) && (
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="text-white/30 hover:text-red-400 shrink-0 opacity-0 group-hover/comment:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-white/30 text-xs text-center py-2">Pas encore de commentaire</p>
              )}
            </div>

            {/* Comment input */}
            {currentParticipant && (
              <div className="flex gap-2 px-4 pb-4 pt-2 border-t border-white/10">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSendComment(); }}
                  placeholder="Commenter..."
                  className="flex-1 bg-white/10 text-white text-sm rounded-full px-4 py-2 placeholder:text-white/30 border-none outline-none"
                />
                <Button
                  size="sm"
                  className="rounded-full h-9 w-9 p-0"
                  disabled={sendingComment || !newComment.trim()}
                  onClick={handleSendComment}
                >
                  {sendingComment ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <MobileNav />
    </main>
  );
}
