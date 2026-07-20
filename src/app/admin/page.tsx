"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  getParticipants,
  getAppSetting,
  saveAppSetting,
  updateParticipantAdminStatus,
  updateParticipantPasswordAdmin,
  updateParticipantArrivalStatus,
  updateParticipantProfile,
  togglePollCloseStatus,
  triggerCustomPushNotification,
  getPolls,
  getBotDossiers,
  getLiveAnalytics,
  broadcastFlashAnnouncement,
} from "@/lib/supabase-queries";
import {
  Participant,
  Poll,
  BotConfig,
  NotificationConfig,
  ModuleVisibility,
  FestivalConfig,
  PinnedChatMessage,
  CocktailConfig,
} from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  Users,
  Bot,
  Shield,
  Settings,
  Send,
  KeyRound,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Eye,
  EyeOff,
  Clock,
  Pin,
  Pencil,
  Trash2,
  BarChart3,
  Radio,
  Download,
  Wine,
  MessageSquare,
  DollarSign,
  Camera,
  Trophy,
  Sparkles,
  Copy,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AdminDashboardPage() {
  const { currentParticipant, isAdmin, loading: authLoading } = useAuth();

  // State
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<string>("");

  // Live Analytics
  const [analytics, setAnalytics] = useState({
    totalMessages: 0,
    totalPhotosCount: 0,
    totalExpensesCents: 0,
    totalBillardMatches: 0,
    totalConsoCount: 0,
  });

  // 1. Notifications Config
  const [notifConfig, setNotifConfig] = useState<NotificationConfig>({
    chat: true,
    program: true,
    polls: true,
    gallery: true,
    expenses: true,
    billard: true,
    badges: true,
    dossiers: true,
  });

  // Broadcast Notification Form
  const [pushTarget, setPushTarget] = useState<string>("all");
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [pushUrl, setPushUrl] = useState("/");
  const [sendingPush, setSendingPush] = useState(false);

  // Flash Popup Announcement Form
  const [flashTitle, setFlashTitle] = useState("");
  const [flashMessage, setFlashMessage] = useState("");
  const [flashEmoji, setFlashEmoji] = useState("🍻");
  const [alsoPush, setAlsoPush] = useState(true);
  const [sendingFlash, setSendingFlash] = useState(false);


  // 2. Bot Config
  const [botConfig, setBotConfig] = useState<BotConfig>({
    enabled: true,
    mood: "sauvage",
    randomness: 0.8,
    custom_instruction: "",
    target_focus_id: null,
  });

  // Bot Context Stats & Full Knowledge Inspection
  const [contextStats, setContextStats] = useState({
    chatCount: 0,
    dossiersCount: 0,
    estimatedTokens: 0,
    charLength: 0,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [botKnowledgeData, setBotKnowledgeData] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rawDbKnowledgeData, setRawDbKnowledgeData] = useState<any>(null);
  const [knowledgeViewMode, setKnowledgeViewMode] = useState<"cards" | "mergedJson" | "rawDbJson">("cards");
  const [loadingKnowledge, setLoadingKnowledge] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [batchSynthesizing, setBatchSynthesizing] = useState(false);
  const [batchNotice, setBatchNotice] = useState<string | null>(null);

  const fetchBotKnowledge = async () => {
    setLoadingKnowledge(true);
    try {
      const res = await fetch("/api/bot/knowledge");
      const data = await res.json();
      if (res.ok && data.success) {
        setBotKnowledgeData(data.mergedKnowledge || data.staticKnowledge);
        setRawDbKnowledgeData(data.dynamicKnowledge || null);
      }
    } catch (err) {
      console.error("Error fetching bot knowledge:", err);
    } finally {
      setLoadingKnowledge(false);
    }
  };

  const handleBatchSynthesize = async () => {
    setBatchSynthesizing(true);
    setBatchNotice(null);
    try {
      const res = await fetch("/api/dossiers/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ processPending: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const ghMsg = data.githubUpdated ? " et mis à jour sur GitHub !" : " (mis à jour en local/Supabase)";
        setBatchNotice(`✅ ${data.totalProcessed} dossier(s) synthétisé(s) par Mimo API${ghMsg}`);
        fetchBotKnowledge();
        setTimeout(() => setBatchNotice(null), 8000);
      } else {
        setBatchNotice(`⚠️ Erreur : ${data.error || "Échec de la synthèse"}`);
      }
    } catch (err) {
      console.error("Error batch synthesizing:", err);
      setBatchNotice("⚠️ Erreur lors du déclenchement de la synthèse.");
    } finally {
      setBatchSynthesizing(false);
    }
  };

  // 3. Module Visibility
  const [moduleVisibility, setModuleVisibility] = useState<ModuleVisibility>({
    billard: true,
    alcool: true,
    jeux: true,
    depenses: true,
    spots: true,
    galerie: true,
    spotify: true,
    badges: true,
    dossiers: true,
  });

  // 4. Festival Config & Cocktail
  const [festivalConfig, setFestivalConfig] = useState<FestivalConfig>({
    countdown_date: "2026-07-31T14:00:00.000Z",
    maintenance_mode: false,
    maintenance_message: "Le festival Cros-Chella fait une petite pause technique... 🎪✨",
  });

  const [cocktailConfig, setCocktailConfig] = useState<CocktailConfig>({
    name: "Mojito Ardéchois 🔥",
    emoji: "🍹",
    ingredients: "Rhum d'Ardèche, Menthe fraîche du jardin, Citron vert, Eau gazeuse",
    description: "Le remède officiel contre la chaleur du festival !",
  });

  // 5. Pinned Chat Message
  const [pinnedMsg, setPinnedMsg] = useState<PinnedChatMessage>({
    id: "",
    content: "",
    author_name: "Admin",
    created_at: "",
  });

  // Modal State: Reset Password & Profile Edit
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [editName, setEditName] = useState("");
  const [editPseudo, setEditPseudo] = useState("");
  const [editEmoji, setEditEmoji] = useState("");
  const [updatingUser, setUpdatingUser] = useState(false);

  useEffect(() => {
    async function loadAdminData() {
      const [
        parts,
        pols,
        dos,
        nConfig,
        bConfig,
        mVis,
        fConfig,
        pMsg,
        cConfig,
        liveStatsData,
      ] = await Promise.all([
        getParticipants(),
        getPolls(),
        getBotDossiers(),
        getAppSetting<NotificationConfig>("notification_config", {
          chat: true,
          program: true,
          polls: true,
          gallery: true,
          expenses: true,
          billard: true,
          badges: true,
          dossiers: true,
        }),
        getAppSetting<BotConfig>("bot_config", {
          enabled: true,
          mood: "sauvage",
          randomness: 0.8,
          custom_instruction: "",
          target_focus_id: null,
        }),
        getAppSetting<ModuleVisibility>("module_visibility", {
          billard: true,
          alcool: true,
          jeux: true,
          depenses: true,
          spots: true,
          galerie: true,
          spotify: true,
          badges: true,
          dossiers: true,
        }),
        getAppSetting<FestivalConfig>("festival_config", {
          countdown_date: "2026-07-31T14:00:00.000Z",
          maintenance_mode: false,
          maintenance_message: "Le festival Cros-Chella fait une petite pause technique... 🎪✨",
        }),
        getAppSetting<PinnedChatMessage>("pinned_chat_message", {
          id: "",
          content: "",
          author_name: "Admin",
          created_at: "",
        }),
        getAppSetting<CocktailConfig>("cocktail_of_the_day", {
          name: "Mojito Ardéchois 🔥",
          emoji: "🍹",
          ingredients: "Rhum, Menthe fraîche, Citron vert, Eau gazeuse",
          description: "Le cocktail signature officiel Cros-Chella !",
        }),
        getLiveAnalytics(),
      ]);

      setParticipants(parts);
      setPolls(pols);
      setNotifConfig(nConfig);
      setBotConfig(bConfig);
      setModuleVisibility(mVis);
      setFestivalConfig(fConfig);
      setPinnedMsg(pMsg);
      setCocktailConfig(cConfig);
      setAnalytics(liveStatsData);

      // Estimate bot context metrics
      const totalCharEst = liveStatsData.totalMessages * 80 + dos.length * 150 + parts.length * 200;
      setContextStats({
        chatCount: liveStatsData.totalMessages,
        dossiersCount: dos.length,
        charLength: totalCharEst,
        estimatedTokens: Math.round(totalCharEst / 4),
      });

      fetchBotKnowledge();

      setLoading(false);
    }

    if (isAdmin) {
      loadAdminData();
    }
  }, [isAdmin]);

  const showSaveToast = (msg: string) => {
    setSaveStatus(msg);
    setTimeout(() => setSaveStatus(""), 4000);
  };

  // Handlers for App Settings
  const handleSaveNotifs = async (updated: NotificationConfig) => {
    setNotifConfig(updated);
    const ok = await saveAppSetting("notification_config", updated);
    if (ok) showSaveToast("Paramètres de notifications enregistrés ! 🔔");
  };

  const handleSaveBotConfig = async (updated: BotConfig) => {
    setBotConfig(updated);
    const ok = await saveAppSetting("bot_config", updated);
    if (ok) showSaveToast("Configuration de Botardèche enregistrée ! 🤖");
  };

  const handleSaveModules = async (updated: ModuleVisibility) => {
    setModuleVisibility(updated);
    const ok = await saveAppSetting("module_visibility", updated);
    if (ok) showSaveToast("Visibilité des modules enregistrée ! 👁️");
  };

  const handleSaveFestivalConfig = async (updated: FestivalConfig) => {
    setFestivalConfig(updated);
    const ok = await saveAppSetting("festival_config", updated);
    if (ok) showSaveToast("Paramètres du festival enregistrés ! 🎪");
  };

  const handleSaveCocktailConfig = async (updated: CocktailConfig) => {
    setCocktailConfig(updated);
    const ok = await saveAppSetting("cocktail_of_the_day", updated);
    if (ok) showSaveToast("Cocktail du jour mis à jour ! 🍹");
  };

  const handleSavePinnedMessage = async () => {
    const updated = {
      ...pinnedMsg,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
    };
    setPinnedMsg(updated);
    const ok = await saveAppSetting("pinned_chat_message", updated);
    if (ok) showSaveToast("Message épinglé mis à jour dans le chat ! 📌");
  };

  // Trigger Flash Popup Announcement
  const handleSendFlashAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flashTitle.trim() || !flashMessage.trim()) return;

    setSendingFlash(true);

    // 1. Broadcast screen popup
    await broadcastFlashAnnouncement(flashTitle.trim(), flashMessage.trim(), flashEmoji);

    // 2. Optionally trigger push notification
    if (alsoPush) {
      await triggerCustomPushNotification(
        "all",
        `${flashEmoji} ${flashTitle.trim()}`,
        flashMessage.trim(),
        "/"
      );
    }

    setSendingFlash(false);
    showSaveToast("Alerte Flash diffusée en direct sur les écrans ! 🚨");
    setFlashTitle("");
    setFlashMessage("");
  };


  const handleSendCustomPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle.trim() || !pushBody.trim()) return;

    setSendingPush(true);
    const ok = await triggerCustomPushNotification(
      pushTarget,
      pushTitle.trim(),
      pushBody.trim(),
      pushUrl.trim() || "/"
    );
    setSendingPush(false);

    if (ok) {
      showSaveToast("Notification push envoyée avec succès ! 🚀");
      setPushTitle("");
      setPushBody("");
    } else {
      alert("Erreur lors de l'envoi de la notification push.");
    }
  };

  const handleTestPushSelf = async () => {
    if (!currentParticipant) return;
    setSendingPush(true);
    const ok = await triggerCustomPushNotification(
      currentParticipant.id,
      "⚡ Test Admin Notification",
      "Si tu vois ce message, les notifications push fonctionnent parfaitement sur ton appareil ! 🎯",
      "/admin"
    );
    setSendingPush(false);
    if (ok) showSaveToast("Notification de test envoyée à votre appareil ! 📲");
  };

  // Participant Admin Actions
  const handleToggleAdmin = async (p: Participant) => {
    const nextVal = !p.is_admin;
    const ok = await updateParticipantAdminStatus(p.id, nextVal);
    if (ok) {
      setParticipants((prev) => prev.map((item) => (item.id === p.id ? { ...item, is_admin: nextVal } : item)));
      showSaveToast(`Statut admin de ${p.name} mis à jour (${nextVal ? "Admin" : "Membre"}) !`);
    }
  };

  const handleArrivalChange = async (pId: string, status: string) => {
    const ok = await updateParticipantArrivalStatus(pId, status);
    if (ok) {
      setParticipants((prev) => prev.map((item) => (item.id === pId ? { ...item, arrival_status: status } : item)));
      showSaveToast("Statut de présence mis à jour !");
    }
  };

  const openUserEditModal = (p: Participant) => {
    setEditingParticipant(p);
    setEditName(p.name);
    setEditPseudo(p.pseudo || "");
    setEditEmoji(p.emoji_avatar || "👤");
    setNewPasswordInput("");
  };

  const handleSaveParticipantEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParticipant) return;

    setUpdatingUser(true);
    let success = true;

    // Update Profile
    const profileOk = await updateParticipantProfile(editingParticipant.id, {
      name: editName,
      pseudo: editPseudo,
      emoji_avatar: editEmoji,
    });
    if (!profileOk) success = false;

    // Reset Password if provided
    if (newPasswordInput.trim()) {
      const passOk = await updateParticipantPasswordAdmin(editingParticipant.id, newPasswordInput.trim());
      if (!passOk) success = false;
    }

    setUpdatingUser(false);

    if (success) {
      setParticipants((prev) =>
        prev.map((item) =>
          item.id === editingParticipant.id
            ? {
                ...item,
                name: editName,
                pseudo: editPseudo,
                emoji_avatar: editEmoji,
                ...(newPasswordInput.trim() ? { password: newPasswordInput.trim() } : {}),
              }
            : item
        )
      );
      setEditingParticipant(null);
      showSaveToast("Profil du participant mis à jour ! ✏️");
    }
  };

  // Poll Close/Open Handler
  const handleTogglePollClose = async (poll: Poll) => {
    const nextClosed = !poll.is_closed;
    const ok = await togglePollCloseStatus(poll.id, nextClosed);
    if (ok) {
      setPolls((prev) => prev.map((item) => (item.id === poll.id ? { ...item, is_closed: nextClosed } : item)));
      showSaveToast(`Sondage "${poll.question || poll.title}" ${nextClosed ? "clôturé 🔒" : "rouvert 🔓"} !`);
    }
  };

  // Purge Bot Memory Handler
  const handlePurgeBotMemory = async () => {
    if (!confirm("⚠️ Es-tu sûr de vouloir purger les conversations privées (DM) avec le bot ? L'historique du chat général restera intact.")) return;
    const { error } = await supabase.from("bot_conversations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (!error) {
      showSaveToast("Mémoire DM de Botardèche purgée avec succès ! 🧹");
    }
  };

  // Export Data Souvenirs
  const handleExportTricountData = async () => {
    const { data: exp } = await supabase.from("expenses").select("*, paid_by_user:participants!paid_by(name, pseudo)");
    if (!exp || exp.length === 0) {
      alert("Aucune dépense à exporter.");
      return;
    }
    const lines = ["ID;Titre;Montant(EUR);Payé Par;Date"];
    exp.forEach((e) => {
      const payer = e.paid_by_user?.pseudo || e.paid_by_user?.name || e.paid_by;
      lines.push(`${e.id};"${e.title}";${(e.amount / 100).toFixed(2)};"${payer}";${e.created_at}`);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Cros-Chella-Tricount-Export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    showSaveToast("Export Tricount télécharge avec succès ! 📥");
  };

  if (authLoading || loading) {
    return (
      <div className="container max-w-5xl mx-auto p-4 py-12 text-center text-muted-foreground">
        Chargement du panneau d&apos;administration...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container max-w-xl mx-auto p-6 py-16 text-center space-y-4">
        <div className="text-5xl">🔒</div>
        <h1 className="text-2xl font-bold text-red-400">Accès Réservé aux Administrateurs</h1>
        <p className="text-xs text-muted-foreground">
          Tu dois posséder les droits administrateur (Niels) pour accéder au panneau de contrôle Cros-Chella.
        </p>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto p-4 py-6 space-y-6 pb-24">
      {/* Toast Save Notification */}
      {saveStatus && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white font-semibold text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="bg-gradient-to-r from-red-950/60 via-background to-amber-950/60 p-6 rounded-2xl border border-red-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-red-400 flex items-center gap-2">
              <span>👑</span> Panel Administrateur
            </h1>
            <Badge variant="outline" className="border-red-500/40 text-red-400 bg-red-500/10">
              Contrôle Total ⚡
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            Gestion centrale du festival Cros-Chella : alertes flash live, push notifications, tirages au sort, Botardèche IA, participants & réglages.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleTestPushSelf}
            disabled={sendingPush}
            variant="outline"
            className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 text-xs gap-1.5"
          >
            <Bell className="w-3.5 h-3.5" />
            Test Push Appareil
          </Button>
        </div>
      </div>

      {/* Main Admin Tabs */}
      <Tabs defaultValue="stats" className="w-full">
        <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full bg-muted/40 p-1 rounded-xl h-auto gap-1">
          <TabsTrigger value="stats" className="text-xs gap-1.5 py-2">
            <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
            <span>Stats & Live</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs gap-1.5 py-2">
            <Bell className="w-3.5 h-3.5" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="participants" className="text-xs gap-1.5 py-2">
            <Users className="w-3.5 h-3.5" />
            <span>Potes</span>
          </TabsTrigger>
          <TabsTrigger value="bot" className="text-xs gap-1.5 py-2">
            <Bot className="w-3.5 h-3.5" />
            <span>Botardèche IA</span>
          </TabsTrigger>
          <TabsTrigger value="moderation" className="text-xs gap-1.5 py-2">
            <Shield className="w-3.5 h-3.5" />
            <span>Modération</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="text-xs gap-1.5 py-2">
            <Settings className="w-3.5 h-3.5" />
            <span>Festival</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 0: LIVE STATS, FLASH ALERTS & RANDOMIZER */}
        <TabsContent value="stats" className="space-y-6 pt-4">
          {/* Live Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="p-3.5 border-border/60 bg-muted/20 text-center">
              <MessageSquare className="w-5 h-5 mx-auto text-amber-400 mb-1" />
              <p className="text-[10px] text-muted-foreground">Messages Chat</p>
              <p className="text-xl font-bold text-foreground">{analytics.totalMessages}</p>
            </Card>
            <Card className="p-3.5 border-border/60 bg-muted/20 text-center">
              <Wine className="w-5 h-5 mx-auto text-red-400 mb-1" />
              <p className="text-[10px] text-muted-foreground">Verres Consommés</p>
              <p className="text-xl font-bold text-red-400">{analytics.totalConsoCount}</p>
            </Card>
            <Card className="p-3.5 border-border/60 bg-muted/20 text-center">
              <DollarSign className="w-5 h-5 mx-auto text-emerald-400 mb-1" />
              <p className="text-[10px] text-muted-foreground">Total Tricount (€)</p>
              <p className="text-xl font-bold text-emerald-400">{(analytics.totalExpensesCents / 100).toFixed(0)} €</p>
            </Card>
            <Card className="p-3.5 border-border/60 bg-muted/20 text-center">
              <Camera className="w-5 h-5 mx-auto text-sky-400 mb-1" />
              <p className="text-[10px] text-muted-foreground">Photos Galerie</p>
              <p className="text-xl font-bold text-foreground">{analytics.totalPhotosCount}</p>
            </Card>
            <Card className="p-3.5 border-border/60 bg-muted/20 text-center col-span-2 md:col-span-1">
              <Trophy className="w-5 h-5 mx-auto text-purple-400 mb-1" />
              <p className="text-[10px] text-muted-foreground">Matchs Billard</p>
              <p className="text-xl font-bold text-purple-400">{analytics.totalBillardMatches}</p>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Realtime Screen Flash Announcement Launcher */}
            <Card className="border-red-500/40 bg-gradient-to-b from-card to-red-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-400">
                  <Radio className="w-4 h-4 text-red-400 animate-pulse" />
                  🚨 Déclencher une Alerte Flash Écran (Temps Réel)
                </CardTitle>
                <CardDescription className="text-xs">
                  Fais surgir un bandeau pop-up vibrant sur l&apos;écran de tous les potes connectés.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Presets */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Raccourcis d&apos;Alerte Rapides</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { title: "🍻 L'Apéro est Servi !", msg: "Rejoignez le bar, la première tournée est servie !", emoji: "🍻" },
                      { title: "🥩 Le Barbecue est Prêt !", msg: "À table les potes, les grillades sont chaudes !", emoji: "🥩" },
                      { title: "🎱 Tournoi de Billard !", msg: "Le prochain match va commencer dans le salon !", emoji: "🎱" },
                      { title: "🥖 Mission Pain & Glaçons", msg: "Besoin d'un volontaire pour aller au village !", emoji: "🥖" },
                    ].map((p, idx) => (
                      <Button
                        key={idx}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFlashTitle(p.title);
                          setFlashMessage(p.msg);
                          setFlashEmoji(p.emoji);
                        }}
                        className="text-[11px] h-7 px-2 border-red-500/30 hover:bg-red-500/10"
                      >
                        {p.emoji} {p.title.split(" ")[0]}
                      </Button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSendFlashAnnouncement} className="space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    <div className="col-span-1 space-y-1">
                      <Label className="text-[11px]">Emoji</Label>
                      <Input
                        value={flashEmoji}
                        onChange={(e) => setFlashEmoji(e.target.value)}
                        className="bg-background text-center"
                        maxLength={4}
                      />
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label className="text-[11px]">Titre Pop-up *</Label>
                      <Input
                        value={flashTitle}
                        onChange={(e) => setFlashTitle(e.target.value)}
                        placeholder="Ex: ⚡ L'Apéro est servi !"
                        className="bg-background"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px]">Message de l&apos;Alerte *</Label>
                    <Textarea
                      value={flashMessage}
                      onChange={(e) => setFlashMessage(e.target.value)}
                      placeholder="Ex: Rendez-vous au bar dans 2 minutes !"
                      rows={2}
                      className="bg-background text-xs"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="alsoPush"
                      checked={alsoPush}
                      onChange={(e) => setAlsoPush(e.target.checked)}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                    />
                    <Label htmlFor="alsoPush" className="text-xs font-normal cursor-pointer">
                      Envoyer aussi une notification Push Mobile 📲
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    disabled={sendingFlash || !flashTitle.trim() || !flashMessage.trim()}
                    className="w-full bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-bold gap-2 text-xs h-10 shadow-lg shadow-red-500/20"
                  >
                    {sendingFlash ? (
                      "Diffusion en cours..."
                    ) : (
                      <>
                        <Radio className="w-4 h-4" />
                        🚀 Diffuser l&apos;Alerte Flash Pop-up en Direct !
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Exportation & Souvenirs Data */}
            <Card className="border-amber-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-400">
                  <Download className="w-4 h-4 text-amber-400" />
                  📦 Exportation & Souvenirs du Festival
                </CardTitle>
                <CardDescription className="text-xs">
                  Télécharge les comptes Tricount et données de l&apos;événement.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Exporte l&apos;intégralité des dépenses enregistrées sur le Tricount du festival au format CSV pour faire les comptes facilement.
                </p>

                <Button
                  variant="outline"
                  onClick={handleExportTricountData}
                  className="w-full text-xs font-semibold text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10 gap-2 h-10"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  Exporter le Récapitulatif Tricount (CSV) 📥
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 1: NOTIFICATIONS PUSH */}
        <TabsContent value="notifications" className="space-y-6 pt-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Toggles per event */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-400">
                  <Bell className="w-4 h-4" />
                  Déclencheurs Automatiques par Événement
                </CardTitle>
                <CardDescription className="text-xs">
                  Active ou désactive l&apos;envoi de push notifications pour chaque module.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: "chat", label: "💬 Nouveaux Messages Chat", desc: "Notification aux mentions et messages" },
                  { key: "program", label: "📅 Programme & Propositions", desc: "Ajout d'activités et propositions" },
                  { key: "polls", label: "📊 Sondages & Nouveaux Votes", desc: "Création de sondages et participations" },
                  { key: "gallery", label: "📸 Galerie Photos & Likes", desc: "Photos ajoutées, likes et commentaires" },
                  { key: "expenses", label: "💰 Dépenses / Tricount", desc: "Ajout de nouvelles dépenses partagées" },
                  { key: "billard", label: "🎱 Tournois & Matchs Billard", desc: "Lancement de tournois et résultats de matchs" },
                  { key: "badges", label: "🏅 Badges Décernés", desc: "Attribution de nouveaux badges" },
                  { key: "dossiers", label: "💣 Secrets & Dossiers Bot", desc: "Nouveaux secrets envoyés au bot" },
                ].map((item) => {
                  const isChecked = notifConfig[item.key as keyof NotificationConfig];
                  return (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/40"
                    >
                      <div>
                        <p className="text-xs font-semibold text-foreground">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) =>
                          handleSaveNotifs({
                            ...notifConfig,
                            [item.key]: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Custom Push Broadcaster */}
            <Card className="border-red-500/30 bg-gradient-to-b from-card to-red-950/10">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-400">
                  <Send className="w-4 h-4" />
                  Envoyer une Notification Push Personnalisée
                </CardTitle>
                <CardDescription className="text-xs">
                  Diffuses une alerte push instantanée à vos potes en direct.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendCustomPush} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Destinataires</Label>
                    <Select value={pushTarget} onValueChange={setPushTarget}>
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">🌐 Tous les participants ({participants.length})</SelectItem>
                        <SelectItem value="admins">👑 Uniquement les Admins</SelectItem>
                        {participants.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            👤 {p.emoji_avatar || "👤"} {p.pseudo || p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Titre de la Notification *</Label>
                    <Input
                      value={pushTitle}
                      onChange={(e) => setPushTitle(e.target.value)}
                      placeholder="Ex: 📢 Annonce du Grand Chef !"
                      className="bg-background"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Message / Contenu *</Label>
                    <Textarea
                      value={pushBody}
                      onChange={(e) => setPushBody(e.target.value)}
                      placeholder="Ex: Le tournoi de Billard va bientôt commencer dans le salon ! Préparez vos équipes !"
                      rows={3}
                      className="bg-background"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Lien / Redirection au clic</Label>
                    <Input
                      value={pushUrl}
                      onChange={(e) => setPushUrl(e.target.value)}
                      placeholder="Ex: /billard ou /programme"
                      className="bg-background"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={sendingPush || !pushTitle.trim() || !pushBody.trim()}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold gap-2"
                  >
                    {sendingPush ? (
                      "Envoi du push..."
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Envoyer le Push à {pushTarget === "all" ? "tous" : pushTarget === "admins" ? "les admins" : "ce participant"}
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: GESTION DES PARTICIPANTS */}
        <TabsContent value="participants" className="space-y-4 pt-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center justify-between text-amber-400">
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Gestion des Participants ({participants.length})
                </span>
              </CardTitle>
              <CardDescription className="text-xs">
                Modifie les profils, réinitialise les mots de passe, change les rôles admin et gère les arrivées.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {participants.map((p) => (
                  <Card key={p.id} className="p-3.5 border-border/50 bg-muted/20 hover:border-amber-500/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">{p.emoji_avatar || "👤"}</div>
                        <div>
                          <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <span>{p.name}</span>
                            {p.pseudo && <span className="text-amber-400 font-normal">({p.pseudo})</span>}
                            {p.is_admin && (
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/40 text-[9px]">
                                Admin 👑
                              </Badge>
                            )}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Mot de passe : <code className="bg-muted px-1.5 py-0.5 rounded text-amber-300 font-mono">{p.password}</code>
                          </p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openUserEditModal(p)}
                        className="text-muted-foreground hover:text-amber-400 p-1.5 h-auto"
                        title="Éditer profil & mot de passe"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-border/40 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-[11px] text-muted-foreground">Présence :</Label>
                        <Select
                          value={p.arrival_status || "a_venir"}
                          onValueChange={(val) => handleArrivalChange(p.id, val)}
                        >
                          <SelectTrigger className="h-7 text-[11px] bg-background w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sur_place">🎉 Sur place</SelectItem>
                            <SelectItem value="en_route">🚗 En route</SelectItem>
                            <SelectItem value="a_venir">📅 À venir</SelectItem>
                            <SelectItem value="absent">❌ Absent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        size="sm"
                        variant={p.is_admin ? "destructive" : "outline"}
                        onClick={() => handleToggleAdmin(p)}
                        className="h-7 text-[10px] px-2"
                      >
                        {p.is_admin ? "Rétrograder Membre" : "Nommer Admin 👑"}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: CONTRÔLE BOTARDÈCHE IA */}
        <TabsContent value="bot" className="space-y-6 pt-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Personality & Overrides */}
            <Card className="border-red-500/30">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center justify-between text-red-400">
                  <span className="flex items-center gap-2">
                    <Bot className="w-4 h-4" />
                    Réglages Botardèche IA
                  </span>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-normal">Actif</Label>
                    <input
                      type="checkbox"
                      checked={botConfig.enabled}
                      onChange={(e) =>
                        handleSaveBotConfig({
                          ...botConfig,
                          enabled: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                    />
                  </div>
                </CardTitle>
                <CardDescription className="text-xs">
                  Personnalise l&apos;humeur, la créativité et les consignes directes pour le bot.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Mood Selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Humeur / Style de Punchline</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "gentil", label: "Gentil 😇", color: "border-emerald-500/40 text-emerald-400" },
                      { value: "moqueur", label: "Moqueur 😈", color: "border-amber-500/40 text-amber-400" },
                      { value: "sauvage", label: "Sauvage 🔥", color: "border-red-500/40 text-red-400" },
                    ].map((m) => (
                      <Button
                        key={m.value}
                        type="button"
                        variant={botConfig.mood === m.value ? "default" : "outline"}
                        onClick={() =>
                          handleSaveBotConfig({
                            ...botConfig,
                            mood: m.value as "gentil" | "moqueur" | "sauvage",
                          })
                        }
                        className={`text-xs h-9 ${botConfig.mood === m.value ? "" : m.color}`}
                      >
                        {m.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Creativity / Temperature Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <Label>Créativité / Imprévisibilité</Label>
                    <span className="font-mono text-amber-400 font-bold">{botConfig.randomness}</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.0"
                    step="0.1"
                    value={botConfig.randomness}
                    onChange={(e) =>
                      handleSaveBotConfig({
                        ...botConfig,
                        randomness: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-red-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Précis (0.2)</span>
                    <span>Équilibré (0.8)</span>
                    <span>Total Folie (1.0)</span>
                  </div>
                </div>

                {/* Target Focus Selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Cible Prioritaire (Focus Roasts)</Label>
                  <Select
                    value={botConfig.target_focus_id || "none"}
                    onValueChange={(val) =>
                      handleSaveBotConfig({
                        ...botConfig,
                        target_focus_id: val === "none" ? null : val,
                      })
                    }
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Aucune cible prioritaire" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune cible (Équilibré)</SelectItem>
                      {participants.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          🎯 Cible : {p.emoji_avatar || "👤"} {p.pseudo || p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Live Custom System Instruction */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Instruction Spéciale en Direct (Consigne Admin)</Label>
                  <Textarea
                    value={botConfig.custom_instruction || ""}
                    onChange={(e) =>
                      setBotConfig({
                        ...botConfig,
                        custom_instruction: e.target.value,
                      })
                    }
                    onBlur={() => handleSaveBotConfig(botConfig)}
                    placeholder="Ex: Parle comme un commentateur sportif, ou fais semblant de croire qu'il pleut des cordes !"
                    rows={3}
                    className="bg-background text-xs"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleSaveBotConfig(botConfig)}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
                  >
                    Appliquer la consigne au bot ⚡
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Context & Memory Inspection */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-400">
                  <Zap className="w-4 h-4" />
                  Inspecteur de Mémoire & Contexte IA
                </CardTitle>
                <CardDescription className="text-xs">
                  Visualise les métriques de mémoire injectées dans Mimo v2.5 Pro.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted/30 border border-border/40 rounded-xl">
                    <p className="text-[10px] text-muted-foreground">Tokens estimées</p>
                    <p className="text-lg font-bold text-amber-400">~{contextStats.estimatedTokens.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-muted/30 border border-border/40 rounded-xl">
                    <p className="text-[10px] text-muted-foreground">Taille du contexte</p>
                    <p className="text-lg font-bold text-foreground">{(contextStats.charLength / 1024).toFixed(1)} KB</p>
                  </div>
                  <div className="p-3 bg-muted/30 border border-border/40 rounded-xl">
                    <p className="text-[10px] text-muted-foreground">Messages chat mémorisés</p>
                    <p className="text-lg font-bold text-red-400">{contextStats.chatCount}</p>
                  </div>
                  <div className="p-3 bg-muted/30 border border-border/40 rounded-xl">
                    <p className="text-[10px] text-muted-foreground">Secrets & Dossiers retenus</p>
                    <p className="text-lg font-bold text-emerald-400">{contextStats.dossiersCount}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/40 space-y-2">
                  <p className="text-xs font-semibold text-foreground">Actions de maintenance mémoire</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePurgeBotMemory}
                    className="w-full text-xs text-red-400 border-red-500/30 hover:bg-red-500/10 gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Purger la mémoire des conversations privées (DM)
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* FULL BOT KNOWLEDGE INSPECTOR & VIEWER */}
            <Card className="border-purple-500/40 bg-purple-500/5 md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-purple-400">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    Contenu Exact de la Mémoire Bot (`bot_knowledge`)
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Fiches personnelles complètes et anecdotes synthétisées par Mimo API pour nourrir Botardèche.
                  </CardDescription>
                </div>
                <div className="flex items-center flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={handleBatchSynthesize}
                    disabled={batchSynthesizing}
                    className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold gap-1.5 shadow-md shadow-purple-600/20"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {batchSynthesizing ? "Synthèse Mimo en cours..." : "🚀 Synthétiser les dossiers en attente"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={fetchBotKnowledge}
                    disabled={loadingKnowledge}
                    className="text-xs border-purple-500/40 text-purple-300 hover:bg-purple-500/20 gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    {loadingKnowledge ? "Rechargement..." : "Actualiser"}
                  </Button>
                  <div className="flex items-center rounded-lg bg-muted/40 p-0.5 border border-border/40 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setKnowledgeViewMode("cards")}
                      className={`px-2 py-1 rounded-md transition-colors ${knowledgeViewMode === "cards" ? "bg-purple-600 text-white font-bold" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      📇 Fiches
                    </button>
                    <button
                      type="button"
                      onClick={() => setKnowledgeViewMode("mergedJson")}
                      className={`px-2 py-1 rounded-md transition-colors ${knowledgeViewMode === "mergedJson" ? "bg-purple-600 text-white font-bold" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      🧠 JSON Fusionné
                    </button>
                    <button
                      type="button"
                      onClick={() => setKnowledgeViewMode("rawDbJson")}
                      className={`px-2 py-1 rounded-md transition-colors ${knowledgeViewMode === "rawDbJson" ? "bg-purple-600 text-white font-bold" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      🗄️ JSON Brut Supabase
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {batchNotice && (
                  <div className="p-3 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-200 text-xs font-semibold animate-in fade-in">
                    {batchNotice}
                  </div>
                )}
                {copiedNotice && (
                  <p className="text-xs text-emerald-400 font-medium">✅ JSON copié dans le presse-papier !</p>
                )}

                {knowledgeViewMode === "mergedJson" ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-muted-foreground font-mono">Savoir global fusionné (Fiches de base + Supabase)</p>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(botKnowledgeData, null, 2));
                          setCopiedNotice(true);
                          setTimeout(() => setCopiedNotice(false), 3000);
                        }}
                        className="text-xs gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copier JSON Fusionné
                      </Button>
                    </div>
                    <pre className="p-4 rounded-xl bg-black/80 border border-border/60 text-[11px] text-emerald-400 overflow-x-auto max-h-96 font-mono leading-relaxed">
                      {JSON.stringify(botKnowledgeData || {}, null, 2)}
                    </pre>
                  </div>
                ) : knowledgeViewMode === "rawDbJson" ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-purple-300 font-mono">Contenu brut en base Supabase (`app_settings` key: bot_knowledge)</p>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(rawDbKnowledgeData, null, 2));
                          setCopiedNotice(true);
                          setTimeout(() => setCopiedNotice(false), 3000);
                        }}
                        className="text-xs gap-1.5 border-purple-500/40 text-purple-200"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copier JSON Brut Supabase
                      </Button>
                    </div>
                    <pre className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/30 text-[11px] text-purple-300 overflow-x-auto max-h-96 font-mono leading-relaxed">
                      {JSON.stringify(rawDbKnowledgeData || {}, null, 2)}
                    </pre>
                  </div>
                ) : !botKnowledgeData?.participants ? (
                  <p className="text-xs text-muted-foreground italic py-4 text-center">
                    Chargement de la mémoire Botardèche...
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(botKnowledgeData.participants as Record<string, { prenom: string; pseudo?: string; infos?: string[]; fun_facts?: string[]; anecdotes?: string[] }>).map(([key, p]) => {
                      const stripNamePrefix = (text: string) => {
                        if (!text) return "";
                        let s = text.trim();
                        const p1 = /^(?:Xavier|Xav|NoHairNoFear|Chocolatine|Charly|Maître|Maitre|Niels|Rosette|Ludo|Nellfest|Nelly|Célis|Celis|Alvathor|Alva|Hervé|Herve|Punch des îles|Punch|Bber|Bichette|Max)\s*\([^)]+\)\s*(?:a|est|était|avait|fait|va|utilise|:|-|—)?\s*/i;
                        const p2 = /^(?:Xavier|Xav|NoHairNoFear|Chocolatine|Charly|Maître|Maitre|Niels|Rosette|Ludo|Nellfest|Nelly|Célis|Celis|Alvathor|Alva|Hervé|Herve|Punch des îles|Punch|Bber|Bichette|Max)\s*(?:a|est|était|avait|fait|va|utilise|:|-|—)?\s*/i;
                        s = s.replace(p1, "").replace(p2, "").trim();
                        if (/^Ier\s+/i.test(s)) s = s.replace(/^Ier\s+/i, "");
                        return s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : text;
                      };

                      const allItems = Array.from(
                        new Set([
                          ...(p.infos || []),
                          ...(p.fun_facts || []),
                          ...(p.anecdotes || []),
                        ])
                      ).map(stripNamePrefix).filter(Boolean);

                      return (
                        <Card key={key} className="p-3.5 border-border/60 bg-background/80 flex flex-col justify-between space-y-2">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between border-b border-border/40 pb-2">
                              <span className="font-bold text-sm text-foreground">
                                {p.prenom} {p.pseudo ? `(${p.pseudo})` : ""}
                              </span>
                              <Badge variant="outline" className="text-[10px] border-purple-500/40 text-purple-300">
                                {key}
                              </Badge>
                            </div>

                            {/* Unified knowledge items list */}
                            {allItems.length === 0 ? (
                              <p className="text-[11px] text-muted-foreground italic">Aucune information enregistrée</p>
                            ) : (
                              <ul className="list-disc list-inside text-[11px] text-muted-foreground space-y-1 pl-1 leading-relaxed">
                                {allItems.map((item: string, idx: number) => (
                                  <li key={idx}>{item}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 4: MODÉRATION & ÉPINGLES */}
        <TabsContent value="moderation" className="space-y-6 pt-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Pinned Message Chat */}
            <Card className="border-amber-500/30">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-400">
                  <Pin className="w-4 h-4" />
                  Message Épinglé en Haut du Chat
                </CardTitle>
                <CardDescription className="text-xs">
                  Affiche un bandeau d&apos;annonce officielle tout en haut du chat.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Texte de l&apos;Annonce Épinglée</Label>
                  <Textarea
                    value={pinnedMsg.content || ""}
                    onChange={(e) => setPinnedMsg({ ...pinnedMsg, content: e.target.value })}
                    placeholder="Ex: 📢 Rendez-vous à 19h autour du braséro pour le tournoi de Billard !"
                    rows={3}
                    className="bg-background text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSavePinnedMessage}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5"
                  >
                    <Pin className="w-3.5 h-3.5" />
                    Enregistrer & Épingler
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const cleared = { ...pinnedMsg, content: "" };
                      setPinnedMsg(cleared);
                      saveAppSetting("pinned_chat_message", cleared);
                      showSaveToast("Message épinglé retiré !");
                    }}
                    className="text-xs text-muted-foreground"
                  >
                    Retirer l&apos;épingle
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Poll Locking / Management */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Lock className="w-4 h-4 text-red-400" />
                  Clôture & Verrouillage des Sondages ({polls.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  Ferme les votes sur les sondages terminés.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 max-h-80 overflow-y-auto">
                {polls.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Aucun sondage créé.</p>
                ) : (
                  polls.map((poll) => (
                    <div
                      key={poll.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/40"
                    >
                      <div>
                        <p className="text-xs font-bold text-foreground">{poll.question || poll.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {poll.is_closed ? "🔒 Clôturé" : "🟢 Actif"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={poll.is_closed ? "outline" : "secondary"}
                        onClick={() => handleTogglePollClose(poll)}
                        className="text-xs h-7 gap-1"
                      >
                        {poll.is_closed ? (
                          <>
                            <Unlock className="w-3 h-3 text-emerald-400" /> Rouvrir
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3 text-red-400" /> Clôturer
                          </>
                        )}
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 5: FESTIVAL CONFIG & COCKTAIL */}
        <TabsContent value="config" className="space-y-6 pt-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Cocktail du Jour Config */}
            <Card className="border-amber-500/30">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-400">
                  <Wine className="w-4 h-4 text-amber-400" />
                  🍹 Cocktail / Boisson Officielle du Jour
                </CardTitle>
                <CardDescription className="text-xs">
                  Définit la boisson du jour affichée sur l&apos;accueil du festival.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-1 space-y-1">
                    <Label className="text-[11px]">Emoji</Label>
                    <Input
                      value={cocktailConfig.emoji}
                      onChange={(e) => setCocktailConfig({ ...cocktailConfig, emoji: e.target.value })}
                      className="bg-background text-center text-xs"
                      maxLength={4}
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Label className="text-[11px]">Nom du Cocktail *</Label>
                    <Input
                      value={cocktailConfig.name}
                      onChange={(e) => setCocktailConfig({ ...cocktailConfig, name: e.target.value })}
                      placeholder="Ex: Mojito Ardéchois 🔥"
                      className="bg-background text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px]">Ingrédients</Label>
                  <Input
                    value={cocktailConfig.ingredients}
                    onChange={(e) => setCocktailConfig({ ...cocktailConfig, ingredients: e.target.value })}
                    placeholder="Rhum, Menthe, Citron, Eau gazeuse..."
                    className="bg-background text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px]">Description / Note Fun</Label>
                  <Input
                    value={cocktailConfig.description}
                    onChange={(e) => setCocktailConfig({ ...cocktailConfig, description: e.target.value })}
                    placeholder="Ex: À consommer frais autour de la piscine !"
                    className="bg-background text-xs"
                  />
                </div>

                <Button
                  size="sm"
                  onClick={() => handleSaveCocktailConfig(cocktailConfig)}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs gap-1.5"
                >
                  <Wine className="w-3.5 h-3.5" />
                  Enregistrer le Cocktail du Jour
                </Button>
              </CardContent>
            </Card>

            {/* Module Visibility */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Eye className="w-4 h-4 text-emerald-400" />
                  Visibilité des Modules du Site
                </CardTitle>
                <CardDescription className="text-xs">
                  Masque ou affiche temporairement des fonctionnalités dans le menu navigation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: "billard", label: "🎱 Tournois de Billard" },
                  { key: "alcool", label: "🍻 Compteur Alcool" },
                  { key: "jeux", label: "🎮 Jeux du Festival" },
                  { key: "depenses", label: "💰 Dépenses / Tricount" },
                  { key: "spots", label: "🏊 Spots Baignade" },
                  { key: "galerie", label: "📸 Galerie Photos" },
                  { key: "spotify", label: "🎵 Playlist Spotify" },
                  { key: "badges", label: "🏅 Badges Décernés" },
                  { key: "dossiers", label: "💣 Coffre à Secrets Bot" },
                ].map((mod) => {
                  const isVisible = moduleVisibility[mod.key as keyof ModuleVisibility];
                  return (
                    <div
                      key={mod.key}
                      className="flex items-center justify-between p-2 rounded-xl bg-muted/30 border border-border/40"
                    >
                      <span className="text-xs font-semibold text-foreground">{mod.label}</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleSaveModules({
                            ...moduleVisibility,
                            [mod.key]: !isVisible,
                          })
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors ${
                          isVisible
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {isVisible ? "Visible" : "Masqué"}
                      </button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Festival Countdown & Maintenance Mode */}
            <Card className="border-amber-500/30 md:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-400">
                  <Clock className="w-4 h-4" />
                  Compte à Rebours & Maintenance
                </CardTitle>
                <CardDescription className="text-xs">
                  Règle la date officielle d&apos;ouverture et le mode maintenance.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date Picker */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Date de début officielle du Festival</Label>
                  <Input
                    type="datetime-local"
                    value={
                      festivalConfig.countdown_date
                        ? new Date(festivalConfig.countdown_date).toISOString().slice(0, 16)
                        : "2026-07-31T14:00"
                    }
                    onChange={(e) =>
                      handleSaveFestivalConfig({
                        ...festivalConfig,
                        countdown_date: new Date(e.target.value).toISOString(),
                      })
                    }
                    className="bg-background text-xs max-w-sm"
                  />
                </div>

                {/* Maintenance Mode Toggle */}
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="text-xs font-bold text-red-400">Mode Maintenance</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={festivalConfig.maintenance_mode}
                      onChange={(e) =>
                        handleSaveFestivalConfig({
                          ...festivalConfig,
                          maintenance_mode: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Message de maintenance</Label>
                    <Textarea
                      value={festivalConfig.maintenance_message}
                      onChange={(e) =>
                        handleSaveFestivalConfig({
                          ...festivalConfig,
                          maintenance_message: e.target.value,
                        })
                      }
                      rows={2}
                      className="bg-background text-xs"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Participant Modal */}
      <Dialog open={!!editingParticipant} onOpenChange={(open) => !open && setEditingParticipant(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <Pencil className="w-4 h-4" /> Éditer le Profil Participant
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveParticipantEdit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nom complet</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Pseudo</Label>
              <Input
                value={editPseudo}
                onChange={(e) => setEditPseudo(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Emoji Avatar</Label>
              <Input
                value={editEmoji}
                onChange={(e) => setEditEmoji(e.target.value)}
                maxLength={4}
              />
            </div>

            <div className="space-y-1.5 pt-2 border-t border-border/40">
              <Label className="text-xs font-semibold text-red-400 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5" /> Réinitialiser le mot de passe (optionnel)
              </Label>
              <Input
                type="text"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="Laisser vide pour ne pas modifier"
                className="font-mono text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditingParticipant(null)}>
                Annuler
              </Button>
              <Button type="submit" disabled={updatingUser} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                {updatingUser ? "Enregistrement..." : "Enregistrer les modifications ✏️"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
