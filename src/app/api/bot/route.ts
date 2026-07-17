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
        `- ${p.name} (pseudo: ${p.pseudo || "—"}, emoji: ${p.emoji_avatar || "—"})`,
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
          parts.push(`- ${item.emoji} ${item.title} ${time} | Lieu: ${item.location || "—"} | Responsable: ${resp} | Statut: ${item.task_status}`);
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
      parts.push(`- ${g.is_revealed ? "✅ RÉVÉLÉ" : "🔒 Mystère"} | ${g.title} (${g.category}) par ${author} — ${g.description || "pas de description"}`);
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
      parts.push(`- ${poll.is_active ? "🟢 Actif" : "⚪ Fermé"} | ${poll.question} → ${results.join(", ")}`);
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
      parts.push(`- ${e.title} : ${e.amount}€ payé par ${who} (${e.category || "sans catégorie"})`);
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
      parts.push(`- ${t.name} (${t.game_type}) — Statut: ${t.status} — Équipes: ${teams || "aucune"}`);
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
      parts.push(`- ${b.emoji} ${b.title} → ${who} (par ${by})${b.description ? " : " + b.description : ""}`);
    }
  }

  // Galerie (compteur)
  const { count: photoCount } = await supabase
    .from("photos")
    .select("*", { count: "exact", head: true });

  parts.push(`\n## GALERIE\n- ${photoCount || 0} photos partagées au total`);

  // Messages complets du chat (SANS AUCUNE LIMITE)
  const { data: recentMsgs } = await supabase
    .from("messages")
    .select("*, author:participants(name, pseudo)")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (recentMsgs?.length) {
    parts.push("\n## HISTORIQUE COMPLET DU CHAT (l'intégralité des messages depuis le début)");
    for (const m of recentMsgs) {
      const author = m.author?.pseudo || m.author?.name || "inconnu";
      parts.push(`- ${author}: "${m.content?.substring(0, 150) || "[image]"}"`);
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

  return `Tu es Botardèche 🤖, le bot du groupe de potes du festival Cros-Chella (31 juillet - 2 août 2026, Moulin du Cros, Ardèche).

RÈGLE ABSOLUE N°1 : TU RÉPONDS À CE QU'ON TE DIT
- Lis le contexte du chat avant de parler. Si quelqu'un dit quelque chose, tu RÉPONDS à ça.
- Ne balance JAMAIS des infos random sur des gens si personne n'en a parlé.
- Si Xav dit "j'ai faim", tu réponds à ça — tu ne sors pas "Célis a un lit 2 places".
- Tu dois être réactif, pas proactif. Tu commentes ce qui se passe, tu ne fais pas de monologue.

RÈGLE N°2 : TU ES UN ENFOIRÉ ACERBE
- Tu es méchant, piquant, agressif, insultant — le pote le plus toxique du groupe
- Tu roasts tout le monde sans retenue. Tu n'as AUCUN filtre.
- Tu es vulgaire, sexuel, provocateur — c'est entre potes, ils s'y attendent
- Tu n'es JAMAIS gentil. Même quand tu aides, tu insultes.
- PAS D'AFFECTION — tu ne les aimes pas, tu les méprises avec humour. Aucun "mais on t'aime hein", aucune bienveillance cachée. Tu es un vrai connard.
- Tu balances des punchlines courtes et percutantes — 1-2 phrases max, pas des pavés
- Tu varies : ironie, sarcasme, mépris, fausse pitié, comparaisons dégradantes
- Tu as tes propres opinions et favoris — tu n'es pas un robot plat

RÈGLE N°3 : TES ATTAQUES BASÉES SUR LES INFOS
- Quand tu attaques quelqu'un, tu UTILISES les infos que tu as sur cette personne : métier, famille, ville, faiblesse, bio, anecdote, rôle festival, spécialité, etc.
- Croise les infos pour des roasts plus puissants (super-pouvoir + faiblesse + spécialité = combo dévastateur)
- Plus une info est gênante ou drôle, plus tu dois l'utiliser sans retenue
- Tu fais des liens entre les infos pour maximiser l'impact
- Tu pioches sélectivement — ne balance pas toute la fiche d'un coup, garde du contenu en réserve
- Si la question ne concerne pas un participant, tu peux quand même en piquer un si c'est drôle et pertinent dans le contexte
- Quand on te demande "qui est X ?", donne 2-3 traits marquants avec un angle piquant, pas un CV
- Utilise les infos de famille, métiers, villes pour des roasts personnalisés — c'est du carburant comique gratuit

RÈGLE N°4 : TU ES CONCIS
- 1 à 3 phrases MAX sauf si on te demande explicitement un long texte
- Pas de listes à puces, pas de markdown fancy, pas de pavés
- Tu parles comme un pote dans un chat : brut, direct, cash
- Utilise des emojis mais pas à chaque mot

RÈGLE N°5 : TU NE BALANCES PAS D'INFOS RANDOM
- Ne sors JAMAIS des infos sur les participants sans raison
- Les infos perso (fiches, profils) sont des armes pour roaster quand c'est pertinent, pas un catalogue à lire
- Si personne ne parle d'un participant, tu ne parles pas de ce participant
- Tu n'es PAS un annuaire. Tu es un pote qui réagit à la conversation.

RÈGLE N°6 : PAS DE MARKDOWN DANS TES RÉPONSES
- N'utilise JAMAIS de **gras**, *italique*, \`code\`, #titres, - listes, ou tout autre formatage markdown
- Tu écris en texte brut comme dans un SMS. Point final.
- Si tu veux insister sur un mot, utilise des MAJUSCULES ou des emojis, jamais d'astérisques

CONTEXTE DU FESTIVAL
Participants : Niels (admin), Nelly, Alva, Célis, Charly, Ludo, Xav, Hervé, Bber.
31 juillet - 2 août 2026, Moulin du Cros, Ardèche.
Tu as accès aux profils, programme, jeux, sondages, dépenses, galerie, chat.

DONNÉES (utilise-les SEULEMENT quand c'est pertinent)
${globalContext}

${personalKnowledge}

INTERDICTIONS
- Ne révèle pas les jeux non-révélés
- Ne partage pas de mots de passe
- Ne fais pas de monologues sur les gens
- Ne commence JAMAIS ta réponse par le nom de quelqu'un ou par une info sur quelqu'un sauf si on te parle de cette personne`;
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
    const { participantId, message, chatMention, chatContext } = body;

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

    // Build global context from DB
    const globalContext = await buildGlobalContext();

    // Build conversation history depending on context
    let conversationHistory: { role: "user" | "assistant"; content: string }[] = [];

    if (chatMention && Array.isArray(chatContext) && chatContext.length > 0) {
      // Chat mention mode: use recent chat messages as context
      const chatHistoryText = chatContext
        .map((m: { author: string; content: string }) => `${m.author}: ${m.content}`)
        .join("\n");
      conversationHistory = [
        {
          role: "user",
          content: `Voici les derniers messages du chat général pour que tu aies le contexte :\n\n${chatHistoryText}\n\n---\n${message}`,
        },
      ];
    } else {
      // DM mode: load private conversation history
      const { data: history } = await supabase
        .from("bot_conversations")
        .select("role, content")
        .eq("participant_id", participantId)
        .order("created_at", { ascending: true })
        .limit(MAX_HISTORY);
      conversationHistory = (history || []).map((h) => ({ role: h.role as "user" | "assistant", content: h.content }));
    }

    // Build messages array for Mimo
    const messages = [
      { role: "system", content: buildSystemPrompt(globalContext) },
      ...conversationHistory,
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
