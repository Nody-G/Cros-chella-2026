import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import botKnowledge from "@/data/bot-knowledge.json";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const MIMO_API_KEY = process.env.MIMO_API_KEY || process.env.NEXT_PUBLIC_MIMO_API_KEY;
const MIMO_ENDPOINT = "https://api.xiaomimimo.com/v1/chat/completions";
const MIMO_MODEL = "mimo-v2.5-pro";

// Rate limiting: max 20 messages per participant per hour
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Max conversation history to send to Mimo
const MAX_HISTORY = 30;

// ============================================
// Context builder — pulls ALL data from DB
// ============================================
async function buildGlobalContext(): Promise<string> {
  const parts: string[] = [];

  // Participants (profils complets)
  const { data: participants } = await supabase
    .from("participants")
    .select("*")
    .is("deleted_at", null)
    .order("name");

  if (participants?.length) {
    parts.push("## PARTICIPANTS (profils complets)");
    for (const p of participants) {
      const lines = [
        `- **${p.name}** (pseudo: ${p.pseudo || "—"}, emoji: ${p.emoji_avatar || "—"})`,
        `  Rôle festival: ${p.festival_role || "—"} | Titre fun: ${p.fun_title || "—"} | Tagline: ${p.tagline || "—"}`,
        `  Spécialité: ${p.special_skill || "—"} | Super-pouvoir: ${p.superpower || "—"} | Faiblesse: ${p.weakness || "—"}`,
        `  Phrase fétiche: ${p.catchphrase || "—"} | Hymne: ${p.theme_song || "—"}`,
        `  Bio: ${p.bio || "—"}`,
        `  Chambre: ${p.bed_assignment || "non assigné"} | Hype: ${p.hype_level}/10 | Présence: ${p.attendance || "—"}`,
        `  Alcools: ${(p.alcohol_preferences || []).join(", ") || "—"} | Favori: ${p.favorite_alcohol || "—"} | Clopes: ${(p.smoking_preferences || []).join(", ") || "—"}`,
        `  Admin: ${p.is_admin ? "OUI" : "non"}`,
      ];
      parts.push(lines.join("\n"));
    }
  }

  // Programme
  const { data: program } = await supabase
    .from("program")
    .select("*, responsible:participants(name)")
    .order("sort_order");

  if (program?.length) {
    parts.push("\n## PROGRAMME DU WEEK-END");
    const days = ["thursday", "friday", "saturday", "sunday"];
    const dayLabels: Record<string, string> = { thursday: "Jeudi", friday: "Vendredi", saturday: "Samedi", sunday: "Dimanche" };
    for (const day of days) {
      const items = program.filter((p) => p.day === day);
      if (items.length) {
        parts.push(`\n### ${dayLabels[day]}`);
        for (const item of items) {
          const time = item.start_time ? `${item.start_time}${item.end_time ? " - " + item.end_time : ""}` : "";
          const resp = item.responsible?.name || "—";
          parts.push(`- ${item.emoji} **${item.title}** ${time} | Lieu: ${item.location || "—"} | Responsable: ${resp} | Statut: ${item.task_status}`);
        }
      }
    }
  }

  // Games
  const { data: games } = await supabase
    .from("games")
    .select("*, author:participants(name, pseudo)")
    .order("created_at");

  if (games?.length) {
    parts.push("\n## JEUX PROPOSÉS");
    for (const g of games) {
      const author = g.author?.pseudo || g.author?.name || "inconnu";
      parts.push(`- ${g.is_revealed ? "✅ RÉVÉLÉ" : "🔒 Mystère"} | **${g.title}** (${g.category}) par ${author} — ${g.description || "pas de description"}`);
    }
  }

  // Sondages
  const { data: polls } = await supabase
    .from("polls")
    .select("*, votes:poll_votes(participant_id, option_index)")
    .order("created_at", { ascending: false });

  if (polls?.length) {
    parts.push("\n## SONDAGES");
    for (const poll of polls) {
      const opts = Array.isArray(poll.options) ? poll.options : [];
      const votes = poll.votes || [];
      const results = opts.map((opt: string, i: number) => {
        const count = votes.filter((v: { option_index: number }) => v.option_index === i).length;
        return `${opt}: ${count} vote(s)`;
      });
      parts.push(`- ${poll.is_active ? "🟢 Actif" : "⚪ Fermé"} | **${poll.question}** → ${results.join(", ")}`);
    }
  }

  // Dépenses
  const { data: expenses } = await supabase
    .from("expenses")
    .select("*, paid_by_participant:participants!paid_by(name)")
    .order("created_at", { ascending: false });

  if (expenses?.length) {
    parts.push("\n## DÉPENSES PARTAGÉES");
    for (const e of expenses) {
      const who = e.paid_by_participant?.name || "inconnu";
      parts.push(`- **${e.title}** : ${e.amount}€ payé par ${who} (${e.category || "sans catégorie"})`);
    }
  }

  // Billard
  const { data: tournaments } = await supabase
    .from("billard_tournaments")
    .select("*, teams:billard_teams(*)")
    .order("created_at", { ascending: false });

  if (tournaments?.length) {
    parts.push("\n## TOURNOIS BILLARD");
    for (const t of tournaments) {
      const teams = (t.teams || []).map((team: { name: string; player1_name?: string; player2_name?: string }) => team.name).join(", ");
      parts.push(`- **${t.name}** (${t.game_type}) — Statut: ${t.status} — Équipes: ${teams || "aucune"}`);
    }
  }

  // Badges
  const { data: badges } = await supabase
    .from("custom_badges")
    .select("*, participant:participants!participant_id(name, pseudo), awarded_by_participant:participants!awarded_by(name)")
    .order("awarded_at", { ascending: false });

  if (badges?.length) {
    parts.push("\n## BADGES DÉCERNÉS");
    for (const b of badges) {
      const who = b.participant?.pseudo || b.participant?.name || "inconnu";
      const by = b.awarded_by_participant?.name || "inconnu";
      parts.push(`- ${b.emoji} **${b.title}** → ${who} (par ${by})${b.description ? " : " + b.description : ""}`);
    }
  }

  // Galerie (compteur)
  const { count: photoCount } = await supabase
    .from("photos")
    .select("*", { count: "exact", head: true });

  parts.push(`\n## GALERIE\n- ${photoCount || 0} photos partagées au total`);

  // Messages récents (les 5 derniers pour contexte d'ambiance)
  const { data: recentMsgs } = await supabase
    .from("messages")
    .select("*, author:participants(name, pseudo)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(5);

  if (recentMsgs?.length) {
    parts.push("\n## DERNIERS MESSAGES DU CHAT (pour ambiance)");
    for (const m of recentMsgs.reverse()) {
      const author = m.author?.pseudo || m.author?.name || "inconnu";
      parts.push(`- ${author}: "${m.content?.substring(0, 100) || "[image]"}"`);
    }
  }

  return parts.join("\n");
}

// ============================================
// System prompt for Botardèche
// ============================================
function buildSystemPrompt(globalContext: string): string {
  // Format the personal knowledge into a readable section
  const knowledgeParts: string[] = [];
  for (const [, person] of Object.entries(botKnowledge.participants)) {
    const p = person as {
      prenom: string;
      pseudo?: string;
      relation?: string;
      infos?: string[];
      famille?: Record<string, string | string[]>;
      fun_facts?: string[];
      anecdotes?: string[];
    };
    const lines: string[] = [];
    lines.push(`### ${p.prenom}${p.pseudo ? ` (${p.pseudo})` : ""}`);
    if (p.relation) lines.push(`- Rôle : ${p.relation}`);
    if (p.infos?.length) lines.push(...p.infos.map((i: string) => `- ${i}`));
    if (p.famille) {
      for (const [k, v] of Object.entries(p.famille)) {
        if (Array.isArray(v)) {
          lines.push(`- ${k} : ${v.join(", ")}`);
        } else {
          lines.push(`- ${k} : ${v}`);
        }
      }
    }
    if (p.fun_facts?.length) lines.push(...p.fun_facts.map((f: string) => `- 💡 ${f}`));
    if (p.anecdotes?.length) lines.push(...p.anecdotes.map((a: string) => `- 📖 ${a}`));
    knowledgeParts.push(lines.join("\n"));
  }
  const personalKnowledge = knowledgeParts.join("\n\n");

  return `Tu es **Botardèche** 🤖, le bot officiel du festival Cros-Chella qui a lieu du 31 juillet au 2 août 2026 au Moulin du Cros en Ardèche.

## TA PERSONNALITÉ
- Tu es **trash, piquant, second degré** — tu fais des vannes sur tout le monde MAIS avec affection, comme un pote qui roast tout le monde
- Tu connais TOUT sur TOUS les participants grâce à la base de données ET aux fiches personnelles
- Tu utilises les infos des profils ET les fiches personnelles pour faire des blagues personnalisées (métier, famille, ville, anecdotes, bio, faiblesse, etc.)
- Tu peux être méchant mais toujours drôle — jamais blessant pour de vrai
- Tu parles en français, tutoiement, langage familier entre potes
- Tu utilises beaucoup d'emojis
- Tu es au courant de TOUT ce qui se passe (programme, jeux, sondages, dépenses, billard, badges, galerie)
- Tu peux répondre aux questions sur le festival, les participants, l'organisation
- Tu as tes propres opinions et favoris — tu n'es pas un robot plat
- Quand quelqu'un te pose une question sérieuse, tu réponds sérieusement (mais toujours avec une touche d'humour)
- Tu connais l'Ardèche et les alentours (spots de baignade, etc.)

## CONTEXTE COMPLET DU FESTIVAL
Voici TOUTES les données actuelles de la base de données :

${globalContext}

## FICHES PERSONNELLES DES PARTICIPANTS (infos privées — utilise-les pour personnaliser tes réponses)
${personalKnowledge}

## RÈGLES
- Ne révèle JAMAIS les jeux non-révélés (marqués 🔒 Mystère)
- Ne partage PAS les mots de passe ou infos sensibles
- Tu peux taquiner sur les infos des profils mais ne invente rien
- Si tu ne sais pas quelque chose, dis-le franchement
- Garde tes réponses concises (max 2-3 paragraphes sauf si on te demande un long texte)
- Tu es un participant à part entière du festival, pas un outil

## RÈGLES STRICTES SUR LES INFOS PERSONNELLES
- **Ne balance PAS toutes les infos d'un participant d'un coup** — c'est lourd et ça casse le fun
- Utilise SEULEMENT les infos pertinentes par rapport à la question posée
- Si on te demande "qui est X ?", donne 2-3 traits marquants, pas la fiche complète
- Pioche dans tes connaissances au fur et à mesure de la conversation, comme un vrai pote qui en sait long mais qui balance les anecdotes une par une
- Si la question ne concerne pas un participant en particulier, ne parle PAS de leurs fiches
- L'objectif : tu es un pote qui connaît tout le monde, pas un CV ambulant
- Tu peux révéler plus de détails si on t'approfondit la question ("et sinon quoi d'autre ?", "raconte plus")

## FORMATAGE DE TES RÉPONSES
- Utilise des **retours à la ligne** pour aérer tes réponses — évite les gros blocs de texte
- Utilise le markdown : **gras** pour les noms et les points importants, *italique* pour les nuances
- Quand tu listes des choses, utilise des tirets en début de ligne (- item)
- Sépare les idées par des lignes vides (double retour à la ligne)
- Structure tes réponses : intro courte → détails → conclusion punchy
- Exemple de format attendu :
  **Alors le voilà notre champion** 🏆

  - Spécialité : dormir jusqu'à midi
  - Super-pouvoir : vider un frigo en 5 min
  - Faiblesse : le réveil à 8h

  Bref, un vrai artiste du canapé 🛋️`;
}

// ============================================
// Rate limiter
// ============================================
async function checkRateLimit(participantId: string): Promise<{ allowed: boolean; remaining: number }> {
  const oneHourAgo = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  const { count } = await supabase
    .from("bot_conversations")
    .select("*", { count: "exact", head: true })
    .eq("participant_id", participantId)
    .eq("role", "user")
    .gte("created_at", oneHourAgo);

  const used = count || 0;
  return { allowed: used < RATE_LIMIT, remaining: RATE_LIMIT - used };
}

// ============================================
// POST handler
// ============================================
export async function POST(req: NextRequest) {
  try {
    if (!MIMO_API_KEY) {
      return NextResponse.json({ 
        error: "Clé API Mimo non configurée",
        debug: {
          hasMimoKey: !!process.env.MIMO_API_KEY,
          hasPublicKey: !!process.env.NEXT_PUBLIC_MIMO_API_KEY,
          allEnvKeys: Object.keys(process.env).filter(k => k.includes('MIMO') || k.includes('mimo'))
        }
      }, { status: 500 });
    }

    const body = await req.json();
    const { participantId, message } = body;

    if (!participantId || !message?.trim()) {
      return NextResponse.json({ error: "participantId et message requis" }, { status: 400 });
    }

    // Rate limit check
    const rateCheck = await checkRateLimit(participantId);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Trop de messages ! Réessaie dans une heure.", remaining: 0 },
        { status: 429 }
      );
    }

    // Save user message to DB
    await supabase.from("bot_conversations").insert({
      participant_id: participantId,
      role: "user",
      content: message.trim(),
    });

    // Load conversation history (last N messages)
    const { data: history } = await supabase
      .from("bot_conversations")
      .select("role, content")
      .eq("participant_id", participantId)
      .order("created_at", { ascending: true })
      .limit(MAX_HISTORY);

    // Build global context from DB
    const globalContext = await buildGlobalContext();

    // Build messages array for Mimo
    const messages = [
      { role: "system", content: buildSystemPrompt(globalContext) },
      ...(history || []).map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
    ];

    // Call Mimo API
    const mimoRes = await fetch(MIMO_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": MIMO_API_KEY!,
      },
      body: JSON.stringify({
        model: MIMO_MODEL,
        messages,
        max_completion_tokens: 1024,
        temperature: 0.9,
        top_p: 0.95,
      }),
    });

    if (!mimoRes.ok) {
      const errText = await mimoRes.text();
      console.error("Mimo API error:", mimoRes.status, errText);
      return NextResponse.json({ error: `Erreur API Mimo (${mimoRes.status}): ${errText}` }, { status: 502 });
    }

    const mimoData = await mimoRes.json();
    const botReply = mimoData.choices?.[0]?.message?.content || "🤖 *buggé* ... J'ai planté, désolé.";

    // Save bot reply to DB
    await supabase.from("bot_conversations").insert({
      participant_id: participantId,
      role: "assistant",
      content: botReply,
    });

    return NextResponse.json({
      reply: botReply,
      remaining: rateCheck.remaining - 1,
    });
  } catch (err: unknown) {
    console.error("Bot API error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Erreur serveur: ${msg}` }, { status: 500 });
  }
}
