import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
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
  participants: Record<string, KnowledgeParticipant>;
}

// Helper to normalize participant name/pseudo to bot-knowledge key
function findParticipantKey(nameOrPseudo: string, participantsObj: Record<string, KnowledgeParticipant>): string | null {
  const target = (nameOrPseudo || "").toLowerCase().trim();
  if (!target) return null;

  // Direct match
  if (participantsObj[target]) return target;

  // Search by prenom or pseudo in participantsObj
  for (const [key, p] of Object.entries(participantsObj)) {
    const prenom = (p.prenom || "").toLowerCase().trim();
    const pseudo = (p.pseudo || "").toLowerCase().trim();
    if (target === prenom || target === pseudo || prenom.includes(target) || target.includes(prenom)) {
      return key;
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { dossierId, content: directContent, targetName: directTargetName } = body;

    if (!MIMO_API_KEY) {
      return NextResponse.json(
        { error: "Clé API Mimo non configurée (MIMO_API_KEY manquant)" },
        { status: 500 }
      );
    }

    let dossierContent = directContent;
    let targetName = directTargetName;
    let category = "libre";

    if (dossierId) {
      const { data: dossier, error } = await supabase
        .from("bot_dossiers")
        .select("*, target:participants!target_participant_id(name, pseudo)")
        .eq("id", dossierId)
        .single();

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

    // Call Mimo API to synthesize dossier into concise bot knowledge
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
        "api-key": MIMO_API_KEY,
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
      console.error("Error from Mimo API during dossier synthesis:", mimoRes.status, errText);
      return NextResponse.json(
        { error: `Erreur API Mimo (${mimoRes.status}): ${errText}` },
        { status: 502 }
      );
    }

    const mimoData = await mimoRes.json();
    const rawReply = mimoData.choices?.[0]?.message?.content || "";

    let synthesizedFacts: string[] = [];
    try {
      // Clean code block ticks if Mimo returned markdown json
      const cleaned = rawReply.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed.synthesized_facts)) {
        synthesizedFacts = parsed.synthesized_facts;
      }
    } catch {
      // Fallback: split lines
      synthesizedFacts = rawReply
        .split("\n")
        .map((l: string) => l.replace(/^[-*•\d.]+\s*/, "").trim())
        .filter((l: string) => l.length > 0);
    }

    if (synthesizedFacts.length === 0) {
      synthesizedFacts = [dossierContent.substring(0, 100)];
    }

    // Update bot-knowledge.json file on disk if available
    const jsonPath = path.join(process.cwd(), "src", "data", "bot-knowledge.json");
    let fileUpdated = false;
    let botKnowledgeObj: KnowledgeContainer = { participants: {} };

    try {
      if (fs.existsSync(jsonPath)) {
        const fileData = fs.readFileSync(jsonPath, "utf-8");
        botKnowledgeObj = JSON.parse(fileData);
        const participantKey = findParticipantKey(targetName, botKnowledgeObj.participants || {});

        if (participantKey && botKnowledgeObj.participants[participantKey]) {
          const p = botKnowledgeObj.participants[participantKey];
          if (!Array.isArray(p.anecdotes)) p.anecdotes = [];
          for (const fact of synthesizedFacts) {
            if (!p.anecdotes.includes(fact)) {
              p.anecdotes.push(fact);
            }
          }
          fs.writeFileSync(jsonPath, JSON.stringify(botKnowledgeObj, null, 2), "utf-8");
          fileUpdated = true;
        }
      }
    } catch (fsErr) {
      console.error("Could not write to local bot-knowledge.json file:", fsErr);
    }

    // Also persist in Supabase app_settings table for dynamic runtime loading
    try {
      const { data: dbSetting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "bot_knowledge")
        .single();

      const dynamicKnowledge: KnowledgeContainer = dbSetting?.value || botKnowledgeObj || { participants: {} };
      if (!dynamicKnowledge.participants) dynamicKnowledge.participants = {};

      const participantKey = findParticipantKey(targetName, dynamicKnowledge.participants) || targetName.toLowerCase().replace(/\s+/g, "");
      if (!dynamicKnowledge.participants[participantKey]) {
        dynamicKnowledge.participants[participantKey] = {
          prenom: targetName,
          pseudo: targetName,
          infos: [],
          fun_facts: [],
          anecdotes: [],
        };
      }

      const p = dynamicKnowledge.participants[participantKey];
      if (!Array.isArray(p.anecdotes)) p.anecdotes = [];
      for (const fact of synthesizedFacts) {
        if (!p.anecdotes.includes(fact)) {
          p.anecdotes.push(fact);
        }
      }

      await supabase.from("app_settings").upsert({
        key: "bot_knowledge",
        value: dynamicKnowledge,
        updated_at: new Date().toISOString(),
      });
    } catch (dbErr) {
      console.error("Error saving dynamic bot_knowledge to Supabase app_settings:", dbErr);
    }

    // Save synthesized facts on the bot_dossiers record if dossierId is present
    if (dossierId) {
      try {
        await supabase
          .from("bot_dossiers")
          .update({
            synthesized_facts: synthesizedFacts,
            synthesized_at: new Date().toISOString(),
          })
          .eq("id", dossierId);
      } catch (dosErr) {
        console.error("Error updating bot_dossiers synthesized_facts:", dosErr);
      }
    }

    return NextResponse.json({
      success: true,
      targetName,
      synthesizedFacts,
      fileUpdated,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erreur interne";
    console.error("Unhandled error in /api/dossiers/synthesize:", err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
