"use client";

import { useEffect, useState, useRef } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageIcon, Loader2, Camera, Upload, Trash2, X, Pencil, Send, ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { getPhotos, updatePhotoCaption, deletePhoto, getPhotoComments, addPhotoComment, deletePhotoComment, togglePhotoLike, getPhotoLikeCount, hasLikedPhoto, getPhotoLikers } from "@/lib/supabase-queries";
import type { Photo, PhotoComment } from "@/lib/types";
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

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");

  const [commentsPhotoId, setCommentsPhotoId] = useState<string | null>(null);
  const [comments, setComments] = useState<PhotoComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  // Likes state
  const [photoLikes, setPhotoLikes] = useState<Record<string, { count: number; liked: boolean }>>({});
  const [likersPhotoId, setLikersPhotoId] = useState<string | null>(null);
  const [likersList, setLikersList] = useState<{ id: string; pseudo: string | null; name: string; emoji_avatar: string | null }[]>([]);

  const loadLikesForAll = async (photoList: Photo[]) => {
    if (!currentParticipant) return;
    const likesMap: Record<string, { count: number; liked: boolean }> = {};
    await Promise.all(photoList.map(async (p) => {
      const [count, liked] = await Promise.all([
        getPhotoLikeCount(p.id),
        hasLikedPhoto(p.id, currentParticipant.id),
      ]);
      likesMap[p.id] = { count, liked };
    }));
    setPhotoLikes(likesMap);
  };

  const fetchPhotos = async () => {
    const data = await getPhotos();
    setPhotos(data);
    setLoading(false);
    loadLikesForAll(data);
  };

  useEffect(() => {
    fetchPhotos();
    const existingCh = supabase.getChannels().find((ch) => ch.topic === "realtime:photos-realtime");
    if (existingCh) supabase.removeChannel(existingCh);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (supabase as any).channel("photos-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "photos" }, () => { fetchPhotos(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "photo_comments" }, () => { if (commentsPhotoId) loadComments(commentsPhotoId); })
      .on("postgres_changes", { event: "*", schema: "public", table: "photo_likes" }, () => { fetchPhotos(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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

  const handleToggleLike = async (photoId: string) => {
    if (!currentParticipant) return;
    await togglePhotoLike(photoId, currentParticipant.id);
    const [count, liked] = await Promise.all([
      getPhotoLikeCount(photoId),
      hasLikedPhoto(photoId, currentParticipant.id),
    ]);
    setPhotoLikes((prev) => ({ ...prev, [photoId]: { count, liked } }));
  };

  const handleShowLikers = async (photoId: string) => {
    if (likersPhotoId === photoId) { setLikersPhotoId(null); return; }
    setLikersPhotoId(photoId);
    const likers = await getPhotoLikers(photoId);
    setLikersList(likers);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, "gallery");
      setSelectedFile(compressed);
      const dataUrl = await readFileAsDataURL(compressed);
      setPreview(dataUrl);
    } catch (err) {
      console.error("Error reading file:", err);
    }
    e.target.value = "";
  };

  const handleUpload = async () => {
    if (!selectedFile || !currentParticipant) return;
    setUploading(true);

    const fileName = `${currentParticipant.id}_${Date.now()}.jpg`;
    const filePath = `gallery/${fileName}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, selectedFile, { contentType: "image/jpeg" });
    if (uploadError) { console.error("Error uploading photo:", uploadError); setUploading(false); return; }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const { error: dbError } = await supabase.from("photos").insert({ author_id: currentParticipant.id, url: urlData.publicUrl, caption: caption.trim() || null });
    if (dbError) console.error("Error saving photo record:", dbError);

    setSelectedFile(null); setPreview(null); setCaption(""); setUploading(false);
  };

  const handleStartEditCaption = (photo: Photo) => { setEditingPhotoId(photo.id); setEditCaption(photo.caption || ""); };
  const handleSaveCaption = async (photoId: string) => { await updatePhotoCaption(photoId, editCaption); setEditingPhotoId(null); await fetchPhotos(); };
  const handleDeletePhoto = async (photoId: string) => { await deletePhoto(photoId); await fetchPhotos(); };

  const currentPhoto = viewerIndex !== null ? photos[viewerIndex] : null;

  // Sync commentsPhotoId when viewer opens or navigates
  useEffect(() => {
    if (currentPhoto) {
      setCommentsPhotoId(currentPhoto.id);
      loadComments(currentPhoto.id);
    } else {
      setCommentsPhotoId(null);
      setComments([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerIndex]);

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
        <p className="text-muted-foreground text-sm mb-4">Photos du week-end. Souvenirs garantis (ou pas).</p>

        <a href="https://drive.google.com/drive/folders/1NeWMAAouEcHn1E6dfE8ZRTqgqILbuzzJ?usp=drive_link" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors group">
          <span className="text-2xl">📁</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium group-hover:text-primary transition-colors">Google Drive — Photos & Vidéos HD</p>
            <p className="text-[10px] text-muted-foreground">Stocke tes photos et vidéos en pleine qualité ici</p>
          </div>
          <span className="text-muted-foreground text-xs">↗</span>
        </a>

        {currentParticipant && (
          <div className="mb-6 p-4 rounded-xl bg-card border border-border">
            {preview ? (
              <div className="space-y-3">
                <div className="relative">
                  <img src={preview} alt="Preview" className="w-full max-h-64 object-contain rounded-lg" />
                  <button onClick={() => { setPreview(null); setSelectedFile(null); setCaption(""); }} className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center">
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
                <input type="text" placeholder="Ajouter une légende... (optionnel)" value={caption} onChange={(e) => setCaption(e.target.value)} className="w-full text-sm bg-muted border border-border rounded-lg px-3 py-2" />
                <div className="flex gap-2">
                  <Button onClick={handleUpload} disabled={uploading} className="flex-1">
                    {uploading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Upload...</> : <><Upload className="w-4 h-4 mr-2" /> Publier</>}
                  </Button>
                  <Button variant="ghost" onClick={() => { setPreview(null); setSelectedFile(null); setCaption(""); }}>Annuler</Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1">
                  <Camera className="w-4 h-4 mr-2" />Choisir une photo
                </Button>
                <Button variant="outline" onClick={() => cameraInputRef.current?.click()}><Camera className="w-4 h-4" /></Button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : photos.length === 0 ? (
          <div className="p-8 rounded-2xl bg-card border border-border text-center">
            <span className="text-4xl block mb-3">📷</span>
            <p className="text-muted-foreground text-sm">Aucune photo pour l&apos;instant</p>
            <p className="text-xs text-muted-foreground mt-2">Sois le premier à poster une photo !</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {photos.map((photo, idx) => {
              const isOwner = currentParticipant?.id === photo.author_id;
              const likes = photoLikes[photo.id];
              return (
                <Card key={photo.id} className="overflow-hidden group">
                  <CardContent className="p-0">
                    <div className="aspect-square bg-muted flex items-center justify-center relative cursor-pointer" onClick={() => setViewerIndex(idx)}>
                      <img src={photo.url} alt={photo.caption || "Photo"} className="w-full h-full object-cover" />
                      {(isOwner || currentParticipant?.is_admin) && (
                        <button onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo.id); }}
                          className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-3 h-3 text-white" />
                        </button>
                      )}
                    </div>
                    <div className="p-2">
                      {editingPhotoId === photo.id ? (
                        <div className="flex gap-1">
                          <input value={editCaption} onChange={(e) => setEditCaption(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSaveCaption(photo.id); }} className="flex-1 text-xs bg-muted border border-border rounded px-2 py-1" autoFocus />
                          <button onClick={() => handleSaveCaption(photo.id)} className="text-green-400 text-xs">✓</button>
                          <button onClick={() => setEditingPhotoId(null)} className="text-muted-foreground text-xs">✕</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          {photo.caption ? <p className="text-xs text-foreground/80 truncate flex-1">{photo.caption}</p> : <p className="text-xs text-muted-foreground italic flex-1">Pas de légende</p>}
                          {isOwner && <button onClick={() => handleStartEditCaption(photo)} className="text-muted-foreground hover:text-primary"><Pencil className="w-3 h-3" /></button>}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-muted-foreground">{photo.author?.emoji_avatar || "👤"} {photo.author?.pseudo || photo.author?.name || "Anonyme"}</span>
                        <div className="flex items-center gap-2">
                          {/* Like button */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleLike(photo.id); }}
                            className="flex items-center gap-0.5 text-[10px] transition-colors"
                          >
                            <Heart className={`w-3 h-3 ${likes?.liked ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                            {likes && likes.count > 0 && (
                              <span
                                onClick={(e) => { e.stopPropagation(); handleShowLikers(photo.id); }}
                                className={`${likes.liked ? "text-red-500" : "text-muted-foreground"} hover:underline`}
                              >
                                {likes.count}
                              </span>
                            )}
                          </button>
                          <button onClick={() => handleOpenComments(photo.id)} className="text-[10px] text-muted-foreground hover:text-primary">💬 {photo.comment_count || 0}</button>
                        </div>
                      </div>
                      {/* Likers popover */}
                      {likersPhotoId === photo.id && likersList.length > 0 && (
                        <div className="mt-1.5 p-2 rounded-lg bg-muted/50 border border-border">
                          <p className="text-[10px] text-muted-foreground mb-1">❤️ {likersList.map((l) => l.pseudo || l.name).join(", ")}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Fullscreen viewer */}
      {currentPhoto && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
          <div className="flex items-center justify-between p-4">
            <button onClick={() => setViewerIndex(null)} className="text-white/80 hover:text-white"><X className="w-6 h-6" /></button>
            <span className="text-white/60 text-sm">{viewerIndex! + 1} / {photos.length}</span>
            <div className="w-6" />
          </div>
          <div className="flex-1 relative flex items-center justify-center min-h-0 px-2">
            {viewerIndex! > 0 && (
              <button onClick={handlePrevPhoto} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 z-10">
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
            )}
            <img src={currentPhoto.url} alt={currentPhoto.caption || "Photo"} className="max-w-full max-h-full object-contain" />
            {viewerIndex! < photos.length - 1 && (
              <button onClick={handleNextPhoto} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 z-10">
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            )}
          </div>
          <div className="bg-black/80 backdrop-blur-sm flex flex-col" style={{ maxHeight: "45vh", minHeight: "120px" }}>
            {/* Like bar in viewer */}
            <div className="flex items-center gap-3 px-4 pt-3 pb-1">
              <button
                onClick={() => handleToggleLike(currentPhoto.id)}
                className="flex items-center gap-1.5 transition-colors"
              >
                <Heart className={`w-5 h-5 ${photoLikes[currentPhoto.id]?.liked ? "fill-red-500 text-red-500" : "text-white/60 hover:text-white"}`} />
                {photoLikes[currentPhoto.id] && photoLikes[currentPhoto.id].count > 0 && (
                  <span className="text-white/80 text-sm">{photoLikes[currentPhoto.id].count}</span>
                )}
              </button>
              {currentPhoto.caption && <p className="text-white/80 text-sm flex-1 truncate">{currentPhoto.caption}</p>}
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 min-h-0">
              {loadingComments ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-white/50" /></div>
              ) : comments.length > 0 ? (
                comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2 group/comment">
                    <span className="text-xs text-white/50 shrink-0 font-medium">{c.author?.pseudo || "Anon"}</span>
                    <p className="text-xs text-white/80 flex-1">{c.content}</p>
                    {(c.author_id === currentParticipant?.id || currentParticipant?.is_admin) && (
                      <button onClick={() => handleDeleteComment(c.id)} className="text-white/30 hover:text-red-400 shrink-0 opacity-0 group-hover/comment:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-white/30 text-xs text-center py-2">Pas encore de commentaire</p>
              )}
            </div>
            {currentParticipant && (
              <div className="flex gap-2 px-4 pb-4 pt-2 border-t border-white/10">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSendComment(); }}
                  placeholder="Écrire un commentaire..."
                  className="flex-1 bg-white/15 text-white text-sm rounded-full px-4 py-2.5 placeholder:text-white/40 border border-white/20 outline-none focus:border-white/40 focus:bg-white/20 transition-colors"
                  style={{ fontSize: "16px" }} /* Prevent iOS zoom */
                />
                <Button
                  size="sm"
                  className="rounded-full h-10 w-10 p-0 shrink-0"
                  disabled={sendingComment || !newComment.trim()}
                  onClick={handleSendComment}
                >
                  {sendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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
