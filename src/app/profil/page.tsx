"use client";

import { useEffect, useState, useRef } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserCircle, Loader2, Save, CheckCircle2, Camera, Trash2, ImageIcon, ZoomIn, ZoomOut, Eye, EyeOff } from "lucide-react";
import { updateParticipant, uploadProfilePhoto, deleteProfilePhoto } from "@/lib/supabase-queries";
import { useAuth } from "@/hooks/use-auth";
import { ALCOHOL_LIST } from "@/lib/alcohol-data";
import { SMOKING_LIST } from "@/lib/smoking-data";
import { compressImage, readFileAsDataURL, getCroppedImage, CropArea } from "@/lib/image-utils";
import Cropper from "react-easy-crop";

const EMOJI_CHOICES = [
  "😎", "🤪", "🗿", "🦊", "🌶️", "🎸", "💀", "🤡", "🦄", "🐸",
  "👑", "🍕", "🔥", "😈", "🤠", "🧙", "🧛", "🧜", "👽", "🤖",
  "🎃", "💀", "🦁", "🐼", "🐨", "🦋", "🌈", "⚡", "🎪", "🎭",
  "🍕", "🌮", "🍔", "🍩", "🍺", "🍷", "🎯", "🎲", "🃏", "🎰",
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
  const [showAlcoholPicker, setShowAlcoholPicker] = useState(false);
  const [smokingPreferences, setSmokingPreferences] = useState<string[]>([]);
  const [personalCode, setPersonalCode] = useState("");
  const [showPersonalCode, setShowPersonalCode] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Crop state
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);

  const onCropComplete = (_croppedArea: CropArea, croppedPixels: CropArea) => {
    setCroppedAreaPixels(croppedPixels);
  };

  useEffect(() => {
    if (currentParticipant) {
      setPseudo(currentParticipant.pseudo || "");
      setEmojiAvatar(currentParticipant.emoji_avatar || "😎");
      setTagline(currentParticipant.tagline || "");
      setFunTitle(currentParticipant.fun_title || "");
      setSpecialSkill(currentParticipant.special_skill || "");
      setFestivalRole(currentParticipant.festival_role || "");
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

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setShowPhotoMenu(false);
    const dataUrl = await readFileAsDataURL(file);
    setCropSrc(dataUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);

    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleRecropPhoto = async () => {
    if (!avatarUrl) return;
    setShowPhotoMenu(false);
    try {
      // Fetch the remote image as blob to avoid CORS issues with canvas
      const response = await fetch(avatarUrl);
      const blob = await response.blob();
      const dataUrl = await readFileAsDataURL(new File([blob], "photo.jpg", { type: blob.type }));
      setCropSrc(dataUrl);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    } catch (err) {
      console.error("Failed to load photo for recrop:", err);
      // Fallback: try direct URL
      setCropSrc(avatarUrl);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
  };

  const handleCropConfirm = async () => {
    if (!cropSrc || !croppedAreaPixels || !currentParticipant) return;

    setUploading(true);
    try {
      const croppedFile = await getCroppedImage(cropSrc, croppedAreaPixels, 400);
      const compressed = await compressImage(croppedFile, "profile");
      const url = await uploadProfilePhoto(currentParticipant.id, compressed);
      if (url) {
        setAvatarUrl(url);
        await updateParticipant(currentParticipant.id, { avatar_url: url });
        await refreshAuth();
      }
    } catch (err) {
      console.error("Photo upload error:", err);
    }
    setUploading(false);
    setCropSrc(null);
  };

  const handleCropCancel = () => {
    setCropSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
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
    if (!currentParticipant) return;
    setSaving(true);
    const success = await updateParticipant(currentParticipant.id, {
      pseudo: pseudo || null,
      emoji_avatar: emojiAvatar,
      tagline: tagline || null,
      fun_title: funTitle || null,
      special_skill: specialSkill || null,
      festival_role: festivalRole || null,
      catchphrase: catchphrase || null,
      theme_song: themeSong || null,
      superpower: superpower || null,
      weakness: weakness || null,
      bio: bio || null,
      alcohol_preferences: alcoholPreferences.length > 0 ? alcoholPreferences : null,
      favorite_alcohol: favoriteAlcohol || null,
      smoking_preferences: smokingPreferences.length > 0 ? smokingPreferences : null,
      password: personalCode || null,
    });
    if (success) {
      await refreshAuth();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
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
                        <div className="border-t border-border my-1" />
                        <button
                          type="button"
                          onClick={handleRecropPhoto}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-left"
                        >
                          <ZoomIn className="w-4 h-4 text-primary" />
                          ✂️ Recadrer / Ajuster
                        </button>
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
                  <span className="text-sm font-medium block">{role.label}</span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">{role.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Special skill */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Ta spécialité <span className="normal-case text-muted-foreground/60">(ex: &quot;Ouverture de bière avec les dents&quot;)</span>
            </label>
            <Input
              placeholder="Quelque chose d'unique"
              value={specialSkill}
              onChange={(e) => setSpecialSkill(e.target.value)}
              className="bg-card border-border"
            />
          </div>

          {/* Superpower */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              ⚡ Ton super-pouvoir
            </label>
            <Input
              placeholder="Ex: &quot;Ne jamais être saoul&quot;"
              value={superpower}
              onChange={(e) => setSuperpower(e.target.value)}
              className="bg-card border-border"
            />
          </div>

          {/* Weakness */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              💀 Ta faiblesse
            </label>
            <Input
              placeholder="Ex: &quot;Le fromage. Tout le fromage.&quot;"
              value={weakness}
              onChange={(e) => setWeakness(e.target.value)}
              className="bg-card border-border"
            />
          </div>

          {/* Alcohol Preferences */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              🍻 Tes alcools préférés <span className="normal-case text-muted-foreground/60">(choisis-en plusieurs)</span>
            </label>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between mb-2"
              onClick={() => setShowAlcoholPicker(!showAlcoholPicker)}
            >
              <span className="text-sm truncate">
                {alcoholPreferences.length === 0
                  ? "Sélectionne tes alcools..."
                  : `${alcoholPreferences.length} sélectionné${alcoholPreferences.length > 1 ? "s" : ""}`}
              </span>
              <span>{showAlcoholPicker ? "▲" : "▼"}</span>
            </Button>

            {showAlcoholPicker && (
              <Card className="border-border max-h-[350px] overflow-y-auto">
                <CardContent className="p-3 space-y-3">
                  {Object.entries(
                    ALCOHOL_LIST.reduce((acc, item) => {
                      if (!acc[item.group]) acc[item.group] = [];
                      acc[item.group].push(item);
                      return acc;
                    }, {} as Record<string, typeof ALCOHOL_LIST>)
                  ).map(([group, items]) => (
                    <div key={group}>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                        {group}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {items.map((item) => {
                          const selected = alcoholPreferences.includes(item.value);
                          return (
                            <button
                              key={item.value}
                              type="button"
                              onClick={() => {
                                setAlcoholPreferences((prev) =>
                                  selected
                                    ? prev.filter((v) => v !== item.value)
                                    : [...prev, item.value]
                                );
                              }}
                              className={`px-2 py-1 rounded-full text-xs border transition-all ${
                                selected
                                  ? "border-primary bg-primary/15 text-primary"
                                  : "border-border hover:border-primary/30 text-muted-foreground"
                              }`}
                            >
                              {item.emoji} {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Selected tags */}
            {alcoholPreferences.length > 0 && !showAlcoholPicker && (
              <div className="flex flex-wrap gap-1 mt-2">
                {alcoholPreferences.map((val) => {
                  const item = ALCOHOL_LIST.find((a) => a.value === val);
                  return (
                    <span
                      key={val}
                      className="px-2 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary border border-primary/20"
                    >
                      {item?.emoji} {item?.label || val}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Favorite alcohol (single) */}
          {alcoholPreferences.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                ⭐ Ton alcool N°1 <span className="normal-case text-muted-foreground/60">(parmi tes sélections)</span>
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
                      className={`px-2.5 py-1.5 rounded-full text-xs border transition-all ${
                        isFav
                          ? "border-amber-400 bg-amber-400/15 text-amber-300 font-bold shadow-sm shadow-amber-400/20"
                          : "border-border hover:border-amber-400/30 text-muted-foreground"
                      }`}
                    >
                      {item?.emoji} {item?.label || val}
                      {isFav ? " ⭐" : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Smoking Preferences */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              🚬 Tu fumes quoi ? <span className="normal-case text-muted-foreground/60">(choisis tout ce qui s&apos;applique)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {SMOKING_LIST.map((item) => {
                const selected = smokingPreferences.includes(item.value);
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      setSmokingPreferences((prev) =>
                        selected
                          ? prev.filter((v) => v !== item.value)
                          : [...prev, item.value]
                      );
                    }}
                    className={`px-3 py-2 rounded-xl text-sm border transition-all ${
                      selected
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border hover:border-primary/30 text-muted-foreground"
                    }`}
                  >
                    {item.emoji} {item.label}
                  </button>
                );
              })}
            </div>
            {smokingPreferences.length === 0 && (
              <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                Non-fumeur ? Laisse vide, on respecte 🙌
              </p>
            )}
          </div>

          {/* Catchphrase */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              🗣️ Ta phrase fétiche
            </label>
            <Input
              placeholder="Ex: &quot;C'est pas moi c'est le vent&quot;"
              value={catchphrase}
              onChange={(e) => setCatchphrase(e.target.value)}
              className="bg-card border-border"
            />
          </div>

          {/* Theme song */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              🎵 Ton hymne
            </label>
            <Input
              placeholder="Ex: &quot;Darude - Sandstorm&quot;"
              value={themeSong}
              onChange={(e) => setThemeSong(e.target.value)}
              className="bg-card border-border"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Bio <span className="normal-case text-muted-foreground/60">(décris-toi en quelques mots)</span>
            </label>
            <Textarea
              placeholder="Qui es-tu vraiment ?"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="bg-card border-border min-h-[80px]"
              maxLength={300}
            />
            <p className="text-[10px] text-muted-foreground mt-1 text-right">{bio.length}/300</p>
          </div>

          {/* Personal code */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              🔑 Mon code secret
            </label>
            <div className="relative">
              <Input
                placeholder="Ex: CROS-1234 ou ton propre code"
                value={personalCode}
                onChange={(e) => setPersonalCode(e.target.value)}
                className="bg-card border-border font-mono pr-10"
                maxLength={20}
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
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center">
          <div className="w-full max-w-lg px-4">
            <h2 className="text-lg font-bold text-white text-center mb-3">
              📸 Ajuste ta photo de profil
            </h2>
            <p className="text-xs text-white/60 text-center mb-4">
              Pince pour zoomer, glisse pour déplacer
            </p>

            {/* Cropper container */}
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden border-2 border-primary/40 mb-4">
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            {/* Zoom slider */}
            <div className="flex items-center gap-3 mb-6 px-2">
              <ZoomOut className="w-4 h-4 text-white/60 shrink-0" />
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <ZoomIn className="w-4 h-4 text-white/60 shrink-0" />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleCropCancel}
                className="flex-1 h-12 text-base border-white/20 text-white hover:bg-white/10"
                disabled={uploading}
              >
                Annuler
              </Button>
              <Button
                onClick={handleCropConfirm}
                className="flex-1 h-12 text-base font-semibold"
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Upload...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Valider ✨
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <MobileNav />
    </main>
  );
}
