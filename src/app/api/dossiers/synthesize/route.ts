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
  fun_facts?: string[];
  anecdotes?: string[];
  [key: string]: unknown;
}

interface KnowledgeContainer {
  description?: string;
  participants: Record<string, KnowledgeParticipant>;
}

// Helper to normalize participant name/pseudo to bot-knowledge key
function findParticipantKey(nameOrPseudo: string, participantsObj: Record<string, KnowledgeParticipant>): string | null {
  const target = (nameOrPseudo || "").toLowerCase().trim();
  if (!target) return null;

  if (participantsObj[target]) return target;

  for (const [key, p] of Object.entries(participantsObj)) {
    const prenom = (p.prenom || "").toLowerCase().trim();
    const pseudo = (p.pseudo || "").toLowerCase().trim();
    if (target === prenom || target === pseudo || prenom.includes(target) || target.includes(prenom)) {
      return key;
    }
  }
  return null;
}

// Single dossier synthesis function using Mimo API
async function synthesizeSingleDossier(
  targetName: string,
  dossierContent: string,
  category: string
): Promise<string[]> {
  const systemPrompt = `Tu es un assistant d'analyse d'information pour un bot nommé Botardèche.
On vient de te transmettre une anecdote ou un dossier concernant le participant "${targetName}".
Extrais et synthétise les points clés de cette anecdote sous forme de 1 à 2 phrases/faits concis (max 20 mots par fait, style direct et pertinent en français).

Réponds STRICTEMENT et UNIQUEMENT avec un objet JSON valide suivant ce schéma :
{
  "synthesized_facts": ["Fait 1", "Fait 2"]
}`;

  const userPrompt = `Dossier (${category}) sur ${targetName} : "${dossierContent}"`;

  const mimoRes = await fetch(MIMO_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": MIMO_API_KEY!,
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
    throw new Error(`Erreur API Mimo (${mimoRes.status}): ${errText}`);
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

  if (synthesizedFacts.length === 0) {
    synthesizedFacts = [dossierContent.substring(0, 100)];
  }

  return synthesizedFacts;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { dossierId, processPending, content: directContent, targetName: directTargetName } = body;

    if (!MIMO_API_KEY) {
      return NextResponse.json(
        { error: "Clé API Mimo non configurée (MIMO_API_KEY manquant)" },
        { status: 500 }
      );
    }

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

          const pKey = findParticipantKey(targetName, dynamicKnowledge.participants) || targetName.toLowerCase().replace(/\s+/g, "");
          if (!dynamicKnowledge.participants[pKey]) {
            dynamicKnowledge.participants[pKey] = { prenom: targetName, pseudo: targetName, infos: [], fun_facts: [], anecdotes: [] };
          }
          const p = dynamicKnowledge.participants[pKey];
          if (!Array.isArray(p.anecdotes)) p.anecdotes = [];
          for (const f of facts) {
            if (!p.anecdotes.includes(f)) p.anecdotes.push(f);
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

      const pKey = findParticipantKey(targetName, dynamicKnowledge.participants) || targetName.toLowerCase().replace(/\s+/g, "");
      if (!dynamicKnowledge.participants[pKey]) {
        dynamicKnowledge.participants[pKey] = { prenom: targetName, pseudo: targetName, infos: [], fun_facts: [], anecdotes: [] };
      }
      const p = dynamicKnowledge.participants[pKey];
      if (!Array.isArray(p.anecdotes)) p.anecdotes = [];
      for (const f of facts) {
        if (!p.anecdotes.includes(f)) p.anecdotes.push(f);
      }

      totalProcessed = 1;
      allSynthesized.push({ targetName, facts });
    }

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
