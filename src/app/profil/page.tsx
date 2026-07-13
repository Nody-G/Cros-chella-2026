"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserCircle, Loader2, Save, CheckCircle2, Camera, Trash2, ImageIcon, Eye, EyeOff, ZoomIn, RotateCw } from "lucide-react";
import { updateParticipant, uploadProfilePhoto, deleteProfilePhoto } from "@/lib/supabase-queries";
import { useAuth } from "@/hooks/use-auth";
import { ALCOHOL_LIST } from "@/lib/alcohol-data";
import { SMOKING_LIST } from "@/lib/smoking-data";
import { compressImage, getCroppedImage } from "@/lib/image-utils";
import Cropper from "react-easy-crop";
import type { Point, Area } from "react-easy-crop";

const EMOJI_CHOICES = [
  "😎", "🤪", "🗿", "🦊", "🌶️", "🎸", "💀", "🤡", "🦄", "🐸",
  "👑", "🍕", "🔥", "😈", "🤠", "🧙", "🧛", "🧜", "👽", "🤖",
  "🎃", "🦁", "🐼", "🐨", "🦋", "🌈", "⚡", "🎪", "🎭",
  "🌮", "🍔", "🍩", "🍺", "🍷", "🎯", "🎲", "🃏", "🎰",
];

const FESTIVAL_ROLES = [
  { value: "dj", label: "🎧 DJ officiel", desc: "Tu gères la playlist" },
  { value: "bartender", label: "🍹 Barman/Barmaid", desc: "Les cocktails c'est ton truc" },
  { value: "photographer", label: "📸 Photographe", desc: "Tu captures tout" },
  { value: "chef", label: "👨‍🍳 Chef du BBQ", desc: "Tu nourris la troupe" },
  { value: "hype", label: "📣 Hype Man/Woman", desc: "Tu mets l'ambiance" },
  { value: "chill", label: "🧘 Responsable Chill", desc: "Tu gères les vibes" },
  { value: "games", label: "🎮 Maître du jeu", desc: "Tu organises les activités" },
  { value: "chaos", label: "🌪️ Agent du chaos", desc: "Tu déstabilises tout" },
  { value: "moral", label: "🛡️ Boussole morale", desc: "Tu veilles sur tous" },
  { value: "wildcard", label: "🃏 Joker", desc: "Imprévisible" },
];

export default function ProfilPage() {
  const { currentParticipant, refreshAuth } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Profile fields
  const [pseudo, setPseudo] = useState("");
  const [emojiAvatar, setEmojiAvatar] = useState("😎");
  const [tagline, setTagline] = useState("");
  const [funTitle, setFunTitle] = useState("");
  const [specialSkill, setSpecialSkill] = useState("");
  const [festivalRole, setFestivalRole] = useState("");
  const [catchphrase, setCatchphrase] = useState("");
  const [themeSong, setThemeSong] = useState("");
  const [superpower, setSuperpower] = useState("");
  const [weakness, setWeakness] = useState("");
  const [bio, setBio] = useState("");
  const [alcoholPreferences, setAlcoholPreferences] = useState<string[]>([]);
  const [favoriteAlcohol, setFavoriteAlcohol] = useState("");
  const [smokingPreferences, setSmokingPreferences] = useState<string[]>([]);
  const [personalCode, setPersonalCode] = useState("");
  const [showPersonalCode, setShowPersonalCode] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Crop modal state
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [cropping, setCropping] = useState(false);

  useEffect(() => {
    if (currentParticipant) {
      setPseudo(currentParticipant.pseudo || "");
      setEmojiAvatar(currentParticipant.emoji_avatar || "😎");
      setTagline(currentParticipant.tagline || "");
      setFunTitle(currentParticipant.fun_title || "");
      setSpecialSkill(currentParticipant.special_skill || "");
      const rawRole = currentParticipant.festival_role || "";
      setFestivalRole(FESTIVAL_ROLES.find(r => r.label === rawRole)?.value || rawRole);
      setCatchphrase(currentParticipant.catchphrase || "");
      setThemeSong(currentParticipant.theme_song || "");
      setSuperpower(currentParticipant.superpower || "");
      setWeakness(currentParticipant.weakness || "");
      setBio(currentParticipant.bio || "");
      setAlcoholPreferences(currentParticipant.alcohol_preferences || []);
      setFavoriteAlcohol(currentParticipant.favorite_alcohol || "");
      setSmokingPreferences(currentParticipant.smoking_preferences || []);
      setPersonalCode(currentParticipant.password || "");
      setAvatarUrl(currentParticipant.avatar_url || null);
    }
  }, [currentParticipant]);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowPhotoMenu(false);

    // Read file as data URL for the cropper
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setCroppedAreaPixels(null);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropConfirm = async () => {
    if (!cropSrc || !croppedAreaPixels || !currentParticipant) return;
    setCropping(true);
    try {
      // Generate cropped image blob
      const croppedBlob = await getCroppedImage(cropSrc, croppedAreaPixels, rotation);
      const croppedFile = new File([croppedBlob], "profile.jpg", { type: "image/jpeg" });

      // Compress the cropped result
      const compressed = await compressImage(croppedFile, "profile");

      // Upload
      setUploading(true);
      const url = await uploadProfilePhoto(currentParticipant.id, compressed);
      if (url) {
        setAvatarUrl(url);
        await updateParticipant(currentParticipant.id, { avatar_url: url });
        await refreshAuth();
      }
    } catch (err) {
      console.error("Crop/upload error:", err);
    }
    setUploading(false);
    setCropping(false);
    setCropSrc(null);
  };

  const handleCropCancel = () => {
    setCropSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedAreaPixels(null);
  };

  const handleDeletePhoto = async () => {
    if (!currentParticipant) return;
    setUploading(true);
    setShowPhotoMenu(false);
    const success = await deleteProfilePhoto(currentParticipant.id);
    if (success) {
      setAvatarUrl(null);
      await refreshAuth();
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!currentParticipant) {
      console.error("[Profil] No currentParticipant");
      return;
    }
    setSaving(true);
    setSaveError(null);
    const updates = {
      pseudo: pseudo || null,
      emoji_avatar: emojiAvatar,
      tagline: tagline || null,
      fun_title: funTitle || null,
      special_skill: specialSkill || null,
      festival_role: festivalRole ? (FESTIVAL_ROLES.find(r => r.value === festivalRole)?.label || festivalRole) : null,
      catchphrase: catchphrase || null,
      theme_song: themeSong || null,
      superpower: superpower || null,
      weakness: weakness || null,
      bio: bio || null,
      alcohol_preferences: alcoholPreferences.length > 0 ? alcoholPreferences : null,
      favorite_alcohol: favoriteAlcohol || null,
      smoking_preferences: smokingPreferences.length > 0 ? smokingPreferences : null,
      password: personalCode || null,
    };
    console.log("[Profil] Saving with id:", currentParticipant.id, "updates:", updates);
    const success = await updateParticipant(currentParticipant.id, updates);
    console.log("[Profil] Save result:", success);
    if (success) {
      await refreshAuth();
      setSaved(true);
      setSaveError(null);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setSaveError("❌ La sauvegarde a échoué. Vérifie la console (F12) pour les détails.");
    }
    setSaving(false);
  };

  if (!currentParticipant) {
    return (
      <main className="pb-20 min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="pb-20 min-h-screen">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <UserCircle className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Mon Profil 🎭</h1>
        </div>
        <p className="text-muted-foreground text-sm mb-6">
          Personnalise ton identité de festival. Sois créatif. Ou pas.
        </p>

        {/* Preview card */}
        <Card className="mb-6 card-glow-gold">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="relative group shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={currentParticipant.name}
                    className="w-20 h-20 rounded-xl object-cover border-2 border-primary/30"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-primary/10 border-2 border-dashed border-primary/30 flex items-center justify-center text-4xl">
                    {emojiAvatar}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowPhotoMenu(!showPhotoMenu)}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                >
                  {uploading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                  ) : (
                    <Camera className="w-5 h-5 text-white" />
                  )}
                </button>
                {showPhotoMenu && (
                  <div className="absolute top-full left-0 mt-2 z-50 bg-card border border-border rounded-lg shadow-xl p-1 min-w-[180px]">
                    <button
                      type="button"
                      onClick={() => { fileInputRef.current?.click(); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-left"
                    >
                      <ImageIcon className="w-4 h-4 text-primary" />
                      📁 Importer une photo
                    </button>
                    <button
                      type="button"
                      onClick={() => { cameraInputRef.current?.click(); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-left"
                    >
                      <Camera className="w-4 h-4 text-accent" />
                      📸 Prendre une photo
                    </button>
                    {avatarUrl && (
                      <>
                        <button
                          type="button"
                          onClick={handleDeletePhoto}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-destructive/10 transition-colors text-left text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                          🗑️ Supprimer la photo
                        </button>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-lg">{currentParticipant.name}</h2>
                  {pseudo && (
                    <span className="text-sm text-muted-foreground">&quot;{pseudo}&quot;</span>
                  )}
                </div>
                {funTitle && (
                  <p className="text-xs text-primary font-medium mt-0.5">{funTitle}</p>
                )}
                {tagline && (
                  <p className="text-xs text-muted-foreground mt-1 italic">&quot;{tagline}&quot;</p>
                )}
                {festivalRole && (
                  <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/20">
                    {FESTIVAL_ROLES.find(r => r.value === festivalRole)?.label || festivalRole}
                  </span>
                )}
              </div>
            </div>
            {(superpower || weakness || catchphrase || alcoholPreferences.length > 0) && (
              <div className="mt-4 pt-4 border-t border-border space-y-1.5">
                {superpower && (
                  <p className="text-xs"><span className="text-primary">⚡ Super-pouvoir :</span> {superpower}</p>
                )}
                {weakness && (
                  <p className="text-xs"><span className="text-destructive">💀 Faiblesse :</span> {weakness}</p>
                )}
                {catchphrase && (
                  <p className="text-xs"><span className="text-accent">🗣️ Phrase fétiche :</span> &quot;{catchphrase}&quot;</p>
                )}
                {alcoholPreferences.length > 0 && (
                  <div className="text-xs">
                    <span className="text-amber-400">🍻 Alcools :</span>{" "}
                    {alcoholPreferences.map((val) => {
                      const item = ALCOHOL_LIST.find((a) => a.value === val);
                      return item?.emoji;
                    }).join(" ")}
                    {favoriteAlcohol && (
                      <span className="ml-1 text-amber-300">
                        ⭐ {ALCOHOL_LIST.find((a) => a.value === favoriteAlcohol)?.label}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Emoji selector */}
        <div className="space-y-6">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Ton emoji avatar
            </label>
            <div className="grid grid-cols-10 gap-1.5">
              {EMOJI_CHOICES.map((emoji, idx) => (
                <button
                  key={`${emoji}-${idx}`}
                  onClick={() => setEmojiAvatar(emoji)}
                  className={`w-full aspect-square rounded-lg flex items-center justify-center text-lg transition-all ${
                    emojiAvatar === emoji
                      ? "bg-primary/20 border-2 border-primary scale-110"
                      : "bg-card border border-border hover:border-primary/30 hover:bg-card/80"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Photo hint */}
          <div className="text-xs text-muted-foreground text-center py-2">
            👆 Tape sur ton avatar ci-dessus pour ajouter ou changer ta photo
          </div>

          {/* Pseudo */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Pseudo
            </label>
            <Input
              placeholder="Un pseudo débile ou pas"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              className="bg-card border-border"
            />
          </div>

          {/* Fun title */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Titre fun <span className="normal-case text-muted-foreground/60">(ex: &quot;Le Roi du Apéro&quot;)</span>
            </label>
            <Input
              placeholder="Donne-toi un titre"
              value={funTitle}
              onChange={(e) => setFunTitle(e.target.value)}
              className="bg-card border-border"
            />
          </div>

          {/* Tagline */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Ta tagline <span className="normal-case text-muted-foreground/60">(une phrase qui te résume)</span>
            </label>
            <Input
              placeholder="Ex: &quot;Je viens pour la bouffe&quot;"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="bg-card border-border"
            />
          </div>

          {/* Festival role */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Ton rôle au festival
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FESTIVAL_ROLES.map((role) => (
                <button
                  key={role.value}
                  onClick={() => setFestivalRole(festivalRole === role.value ? "" : role.value)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    festivalRole === role.value
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <span className="text-sm font-medium">{role.label}</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{role.desc}</p>
                </button>
              ))}
            </div>
            {/* Custom role input */}
            <div className="mt-3">
              <p className="text-[10px] text-muted-foreground mb-1.5">Ou crée ton propre rôle :</p>
              <Input
                placeholder="Ex: 🧙‍♂️ Sorcier de la biouze"
                value={FESTIVAL_ROLES.some(r => r.value === festivalRole) ? "" : festivalRole}
                onChange={(e) => setFestivalRole(e.target.value)}
                className="bg-card border-border text-sm"
              />
            </div>
          </div>

          {/* Special skill */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Ta spécialité 🎯
            </label>
            <Input
              placeholder="Ex: Ouvrir les bières avec les dents"
              value={specialSkill}
              onChange={(e) => setSpecialSkill(e.target.value)}
              className="bg-card border-border"
            />
          </div>

          {/* Superpower */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Ton super-pouvoir ⚡
            </label>
            <Input
              placeholder="Ex: Ne jamais être saoul"
              value={superpower}
              onChange={(e) => setSuperpower(e.target.value)}
              className="bg-card border-border"
            />
          </div>

          {/* Weakness */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Ta faiblesse 💀
            </label>
            <Input
              placeholder="Ex: Le shots de tequila"
              value={weakness}
              onChange={(e) => setWeakness(e.target.value)}
              className="bg-card border-border"
            />
          </div>

          {/* Catchphrase */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Ta phrase fétiche 🗣️
            </label>
            <Input
              placeholder="Ex: &quot;C&apos;est pas moi c&apos;est le vent&quot;"
              value={catchphrase}
              onChange={(e) => setCatchphrase(e.target.value)}
              className="bg-card border-border"
            />
          </div>

          {/* Theme song */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Ton hymne 🎵
            </label>
            <Input
              placeholder="Ex: Darude - Sandstorm"
              value={themeSong}
              onChange={(e) => setThemeSong(e.target.value)}
              className="bg-card border-border"
            />
          </div>

          {/* Alcohol preferences */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Tes préférences alcool 🍻
            </label>
            <p className="text-[11px] text-muted-foreground mb-3">
              Clique pour sélectionner, clique sur ⭐ pour ton favori
            </p>
            <div className="space-y-3">
              {/* Badge grid grouped by type */}
              {Object.entries(
                ALCOHOL_LIST.reduce((acc, item) => {
                  if (!acc[item.group]) acc[item.group] = [];
                  acc[item.group].push(item);
                  return acc;
                }, {} as Record<string, typeof ALCOHOL_LIST>)
              ).map(([group, items]) => (
                <div key={group}>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1.5">
                    {group}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((item) => {
                      const isSelected = alcoholPreferences.includes(item.value);
                      const isFav = favoriteAlcohol === item.value;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setAlcoholPreferences((prev) => prev.filter((v) => v !== item.value));
                              if (favoriteAlcohol === item.value) setFavoriteAlcohol("");
                            } else {
                              setAlcoholPreferences((prev) => [...prev, item.value]);
                            }
                          }}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-all ${
                            isFav
                              ? "bg-amber-500/25 border-amber-500/50 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.2)]"
                              : isSelected
                              ? "bg-amber-400/10 border-amber-400/40 text-amber-300"
                              : "bg-card border-border text-muted-foreground hover:border-amber-400/30 hover:text-foreground"
                          }`}
                        >
                          {item.emoji} {item.label}
                          {isFav && " ⭐"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Favorite alcohol selector — only from selected */}
              {alcoholPreferences.length > 0 && (
                <div className="pt-2 border-t border-border/50">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    ⭐ Ton alcool préféré (optionnel)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {alcoholPreferences.map((val) => {
                      const item = ALCOHOL_LIST.find((a) => a.value === val);
                      const isFav = favoriteAlcohol === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setFavoriteAlcohol(isFav ? "" : val)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-all ${
                            isFav
                              ? "bg-amber-500/30 border-amber-500/60 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                              : "bg-card border-border text-muted-foreground hover:border-amber-400/40"
                          }`}
                        >
                          {item?.emoji} {item?.label} {isFav ? "⭐" : "☆"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Smoking preferences */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Tabac / Vape 🚬
            </label>
            <p className="text-[11px] text-muted-foreground mb-3">
              Clique pour sélectionner / désélectionner
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SMOKING_LIST.map((item) => {
                const isSelected = smokingPreferences.includes(item.value);
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSmokingPreferences((prev) => prev.filter((v) => v !== item.value));
                      } else {
                        setSmokingPreferences((prev) => [...prev, item.value]);
                      }
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs border transition-all ${
                      isSelected
                        ? "bg-primary/15 border-primary/40 text-primary"
                        : "bg-card border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    {item.emoji} {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Ta bio 📝
            </label>
            <div className="relative">
              <textarea
                placeholder="Raconte ta vie (ou pas)"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={1000}
                className="w-full min-h-[120px] rounded-md border border-border bg-card px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <span className="absolute bottom-2 right-2 text-[10px] text-muted-foreground">
                {bio.length}/1000
              </span>
            </div>
          </div>

          {/* Personal code */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Code secret 🔒
            </label>
            <div className="relative">
              <Input
                placeholder="Ton code personnel"
                value={personalCode}
                onChange={(e) => setPersonalCode(e.target.value)}
                className="bg-card border-border pr-10"
                type={showPersonalCode ? "text" : "password"}
              />
              <button
                type="button"
                onClick={() => setShowPersonalCode(!showPersonalCode)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPersonalCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Ton code secret personnel. Garde-le pour toi, c&apos;est sacré. 🔒
            </p>
          </div>

          {/* Save error */}
          {saveError && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
              {saveError}
            </div>
          )}

          {/* Save button */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 text-base font-semibold"
            size="lg"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sauvegarde...
              </>
            ) : saved ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Sauvegardé ! 🎉
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder mon profil
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Crop Modal */}
      {cropSrc && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0">
            <button
              onClick={handleCropCancel}
              className="text-white/80 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              Annuler
            </button>
            <span className="text-white font-semibold text-sm">Recadre ta photo 📸</span>
            <button
              onClick={handleCropConfirm}
              disabled={cropping}
              className="text-primary font-semibold text-sm px-3 py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 transition-colors disabled:opacity-50"
            >
              {cropping ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "OK ✓"
              )}
            </button>
          </div>

          {/* Cropper area */}
          <div className="relative flex-1 min-h-0">
            <Cropper
              image={cropSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              style={{
                containerStyle: { borderRadius: 0 },
                cropAreaStyle: {
                  border: "3px solid rgba(255, 255, 255, 0.8)",
                  borderRadius: "50%",
                },
              }}
            />
          </div>

          {/* Controls */}
          <div className="px-6 py-4 space-y-4 shrink-0 bg-black/60 backdrop-blur-sm">
            {/* Zoom slider */}
            <div className="flex items-center gap-3">
              <ZoomIn className="w-4 h-4 text-white/60 shrink-0" />
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-primary h-1.5"
              />
              <span className="text-white/60 text-xs w-8 text-right">{zoom.toFixed(1)}×</span>
            </div>

            {/* Rotation slider */}
            <div className="flex items-center gap-3">
              <RotateCw className="w-4 h-4 text-white/60 shrink-0" />
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="flex-1 accent-primary h-1.5"
              />
              <span className="text-white/60 text-xs w-8 text-right">{rotation}°</span>
            </div>

            <p className="text-white/40 text-[10px] text-center">
              Pince-zoom pour agrandir · Glisse pour positionner
            </p>
          </div>
        </div>
      )}

      <MobileNav />
    </main>
  );
}
