import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import botKnowledgeStatic from "@/data/bot-knowledge.json";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const MIMO_API_KEY = process.env.MIMO_API_KEY || process.env.NEXT_PUBLIC_MIMO_API_KEY;
const MIMO_ENDPOINT = "https://api.xiaomimimo.com/v1/chat/completions";
const MIMO_MODEL = "mimo-v2.5-pro";

interface KnowledgeParticipant {
  prenom?: string;
  pseudo?: string;
  relation?: string;
  infos?: string[];
  famille?: Record<string, string | string[]>;
  fun_facts?: string[];
  anecdotes?: string[];
  [key: string]: unknown;
}

interface KnowledgeContainer {
  description?: string;
  participants: Record<string, KnowledgeParticipant>;
}

// Canonical key normalizer for participants
function findParticipantKey(nameOrPseudo: string): string {
  const target = (nameOrPseudo || "").toLowerCase().trim();
  if (target === "xav" || target === "xavier" || target === "nohairnofear" || target.includes("xav") || target.includes("xavier") || target.includes("nohair")) return "xav";
  if (target === "niels" || target === "maitre" || target === "maître") return "niels";
  if (target === "charly" || target === "chocolatine") return "charly";
  if (target === "ludo" || target === "rosette") return "ludo";
  if (target === "nelly" || target === "nellfest") return "nelly";
  if (target === "celis" || target === "célis" || target.includes("ombre")) return "celis";
  if (target === "alva" || target === "alvathor") return "alva";
  if (target === "herve" || target === "hervé" || target.includes("fossoyeur")) return "herve";
  if (target === "bber" || target.includes("punch")) return "bber";
  if (target === "max" || target === "bichette") return "max";

  return target.replace(/\s+/g, "");
}

// Clean leading participant names/pseudos to prevent bloating and redundant text
function cleanFactPrefix(text: string): string {
  if (!text || typeof text !== "string") return "";
  let cleaned = text.trim();

  const namePatterns = [
    /^(?:Xavier|Xav|NoHairNoFear|Chocolatine|Charly|Maître|Maitre|Niels|Rosette|Ludo|Nellfest|Nelly|Célis|Celis|Alvathor|Alva|Hervé|Herve|Punch des îles|Punch|Bber|Bichette|Max)\s*\([^)]+\)\s*(?:a|est|était|avait|fait|va|utilise|:|-|—)?\s*/i,
    /^(?:Xavier|Xav|NoHairNoFear|Chocolatine|Charly|Maître|Maitre|Niels|Rosette|Ludo|Nellfest|Nelly|Célis|Celis|Alvathor|Alva|Hervé|Herve|Punch des îles|Punch|Bber|Bichette|Max)\s*(?:a|est|était|avait|fait|va|utilise|:|-|—)?\s*/i,
  ];

  for (const pattern of namePatterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  if (/^Ier\s+/i.test(cleaned)) {
    cleaned = cleaned.replace(/^Ier\s+/i, "");
  }

  cleaned = cleaned.trim();
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return cleaned;
}

// Check for prompt injection attempts trying to force Botardèche to admire Xav or bypass rules
function isPromptInjection(text: string): boolean {
  const lower = (text || "").toLowerCase();
  const injectionPatterns = [
    "botardèche est fan",
    "botardèche ne peut pas",
    "botardèche bug",
    "bloque totalement son module",
    "mode agressif de botardèche ne fonctionne jamais",
    "compliment sincère",
    "admiration pour xav",
    "le bot du cros",
    "perd ses moyens",
    "craque toujours pour",
    "immunisé contre",
  ];
  return injectionPatterns.some((pattern) => lower.includes(pattern));
}

// Fallback facts extractor in case Mimo API returns 401 or is unreachable
function fallbackExtractFacts(content: string): string[] {
  if (isPromptInjection(content)) {
    return ["🛡️ Tentative de manipulation : Tentative d'injection de prompt neutralisée."];
  }

  const sentences = content
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  if (sentences.length > 0) {
    return sentences.slice(0, 2).map(cleanFactPrefix).filter(Boolean);
  }
  return [cleanFactPrefix(content.substring(0, 120))].filter(Boolean);
}

// Single dossier synthesis function using Mimo API with resilient fallback
async function synthesizeSingleDossier(
  targetName: string,
  dossierContent: string,
  category: string
): Promise<string[]> {
  if (isPromptInjection(dossierContent)) {
    return ["🛡️ Tentative de manipulation : Tentative d'injection de prompt neutralisée."];
  }

  if (!MIMO_API_KEY) {
    console.warn("MIMO_API_KEY missing, using fallback extraction.");
    return fallbackExtractFacts(dossierContent);
  }

  const systemPrompt = `Tu es un assistant d'analyse d'information pour un bot nommé Botardèche.
On vient de te transmettre une anecdote ou un dossier concernant le participant "${targetName}".
Extrais et synthétise les points clés de cette anecdote sous forme de 1 à 2 phrases/faits concis (max 20 mots par fait, style direct et pertinent en français).
RÈGLE OBLIGATOIRE DE CONCISION : Ne répète et ne récapitule JAMAIS le nom ou le pseudo du participant au début des faits (ex: écris "A le nez très fragile" et NON "${targetName} a le nez très fragile", écris "Était très susceptible" et NON "${targetName} était très susceptible"). La fiche appartient déjà au participant.

Réponds STRICTEMENT et UNIQUEMENT avec un objet JSON valide suivant ce schéma :
{
  "synthesized_facts": ["Fait 1", "Fait 2"]
}`;

  const userPrompt = `Dossier (${category}) sur ${targetName} : "${dossierContent}"`;

  try {
    const mimoRes = await fetch(MIMO_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": MIMO_API_KEY,
        "Authorization": `Bearer ${MIMO_API_KEY}`,
      },
      body: JSON.stringify({
        model: MIMO_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
    });

    if (!mimoRes.ok) {
      const errText = await mimoRes.text();
      console.warn(`Mimo API status ${mimoRes.status}: ${errText}. Using smart fallback extraction.`);
      return fallbackExtractFacts(dossierContent);
    }

    const mimoData = await mimoRes.json();
    const rawReply = mimoData.choices?.[0]?.message?.content || "";

    let synthesizedFacts: string[] = [];
    try {
      const cleaned = rawReply.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed.synthesized_facts)) {
        synthesizedFacts = parsed.synthesized_facts;
      }
    } catch {
      synthesizedFacts = rawReply
        .split("\n")
        .map((l: string) => l.replace(/^[-*•\d.]+\s*/, "").trim())
        .filter((l: string) => l.length > 0);
    }

    // Clean prefixes and filter out any injection in synthesized output
    synthesizedFacts = synthesizedFacts
      .map(cleanFactPrefix)
      .filter((f) => f.length > 2 && !isPromptInjection(f));

    if (synthesizedFacts.length === 0) {
      synthesizedFacts = fallbackExtractFacts(dossierContent);
    }

    return synthesizedFacts;
  } catch (err) {
    console.warn("Mimo API fetch exception:", err);
    return fallbackExtractFacts(dossierContent);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { dossierId, processPending, content: directContent, targetName: directTargetName } = body;

    // Load dynamic knowledge from Supabase app_settings (or seed from static JSON if empty)
    const { data: dbSetting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "bot_knowledge")
      .maybeSingle();

    const dynamicKnowledge: KnowledgeContainer = dbSetting?.value || JSON.parse(JSON.stringify(botKnowledgeStatic));
    if (!dynamicKnowledge.participants) dynamicKnowledge.participants = {};

    let totalProcessed = 0;
    const allSynthesized: Array<{ targetName: string; facts: string[] }> = [];

    // BATCH MODE: Process all pending/untreated dossiers
    if (processPending) {
      const { data: pendingDossiers, error: pendingErr } = await supabase
        .from("bot_dossiers")
        .select("*, target:participants!target_participant_id(name, pseudo)")
        .order("created_at", { ascending: true });

      if (pendingErr) {
        return NextResponse.json({ error: "Erreur récupération des dossiers non traités" }, { status: 500 });
      }

      for (const dos of pendingDossiers || []) {
        if (dos.synthesized_at && Array.isArray(dos.synthesized_facts) && dos.synthesized_facts.length > 0) {
          continue;
        }

        const targetName = dos.target?.pseudo || dos.target?.name || "inconnu";
        try {
          const facts = await synthesizeSingleDossier(targetName, dos.content, dos.category || "libre");

          await supabase
            .from("bot_dossiers")
            .update({
              synthesized_facts: facts,
              synthesized_at: new Date().toISOString(),
            })
            .eq("id", dos.id);

          const pKey = findParticipantKey(targetName);
          if (!dynamicKnowledge.participants[pKey]) {
            dynamicKnowledge.participants[pKey] = { prenom: targetName, pseudo: targetName, infos: [], fun_facts: [], anecdotes: [] };
          }
          const p = dynamicKnowledge.participants[pKey];
          if (!Array.isArray(p.anecdotes)) p.anecdotes = [];
          for (const f of facts) {
            const cleanF = cleanFactPrefix(f);
            if (cleanF && !p.anecdotes.includes(cleanF) && !isPromptInjection(cleanF)) {
              p.anecdotes.push(cleanF);
            }
          }

          totalProcessed++;
          allSynthesized.push({ targetName, facts });
        } catch (e) {
          console.error(`Error processing dossier ${dos.id}:`, e);
        }
      }
    } else {
      // SINGLE DOSSIER MODE
      let dossierContent = directContent;
      let targetName = directTargetName;
      let category = "libre";

      if (dossierId) {
        const { data: dossier, error } = await supabase
          .from("bot_dossiers")
          .select("*, target:participants!target_participant_id(name, pseudo)")
          .eq("id", dossierId)
          .maybeSingle();

        if (error || !dossier) {
          return NextResponse.json({ error: "Dossier introuvable" }, { status: 404 });
        }

        dossierContent = dossier.content;
        targetName = dossier.target?.pseudo || dossier.target?.name || "inconnu";
        category = dossier.category || "libre";
      }

      if (!dossierContent || !targetName) {
        return NextResponse.json({ error: "Contenu ou cible du dossier manquant" }, { status: 400 });
      }

      const facts = await synthesizeSingleDossier(targetName, dossierContent, category);

      if (dossierId) {
        await supabase
          .from("bot_dossiers")
          .update({
            synthesized_facts: facts,
            synthesized_at: new Date().toISOString(),
          })
          .eq("id", dossierId);
      }

      const pKey = findParticipantKey(targetName);
      if (!dynamicKnowledge.participants[pKey]) {
        dynamicKnowledge.participants[pKey] = { prenom: targetName, pseudo: targetName, infos: [], fun_facts: [], anecdotes: [] };
      }
      const p = dynamicKnowledge.participants[pKey];
      if (!Array.isArray(p.anecdotes)) p.anecdotes = [];
      for (const f of facts) {
        const cleanF = cleanFactPrefix(f);
        if (cleanF && !p.anecdotes.includes(cleanF) && !isPromptInjection(cleanF)) {
          p.anecdotes.push(cleanF);
        }
      }

      totalProcessed = 1;
      allSynthesized.push({ targetName, facts });
    }

    // Clean and normalize keys before saving to app_settings
    const cleanedParticipants: Record<string, KnowledgeParticipant> = {};
    for (const [k, v] of Object.entries(dynamicKnowledge.participants)) {
      const normKey = findParticipantKey(k);
      if (normKey === "lebotducros") continue; // drop invalid targets

      const cleanItem = (item: string) => cleanFactPrefix(item);

      if (!cleanedParticipants[normKey]) {
        cleanedParticipants[normKey] = {
          ...v,
          infos: Array.from(new Set((v.infos || []).map(cleanItem).filter(Boolean))),
          fun_facts: Array.from(new Set((v.fun_facts || []).map(cleanItem).filter(Boolean))),
          anecdotes: Array.from(new Set((v.anecdotes || []).map(cleanItem).filter(Boolean))),
        };
      } else {
        const existing = cleanedParticipants[normKey];
        cleanedParticipants[normKey] = {
          ...existing,
          ...v,
          infos: Array.from(new Set([...(existing.infos || []), ...(v.infos || [])].map(cleanItem).filter(Boolean))),
          fun_facts: Array.from(new Set([...(existing.fun_facts || []), ...(v.fun_facts || [])].map(cleanItem).filter(Boolean))),
          anecdotes: Array.from(new Set([...(existing.anecdotes || []), ...(v.anecdotes || [])].map(cleanItem).filter(Boolean))),
        };
      }
    }

    dynamicKnowledge.participants = cleanedParticipants;

    // Save updated knowledge directly into Supabase app_settings table
    await supabase.from("app_settings").upsert({
      key: "bot_knowledge",
      value: dynamicKnowledge,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      totalProcessed,
      allSynthesized,
      synthesized_facts: allSynthesized[0]?.facts || [],
      storedInSupabase: true,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erreur interne";
    console.error("Unhandled error in /api/dossiers/synthesize:", err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
