import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import staticBotKnowledge from "@/data/bot-knowledge.json";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface ParticipantKnowledge {
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
  participants: Record<string, ParticipantKnowledge>;
}

// Helper to normalize participant aliases to canonical keys
function normalizeParticipantKey(rawKey: string): string {
  const k = (rawKey || "").toLowerCase().trim();
  if (k === "xav" || k === "xavier" || k.includes("xav") || k.includes("xavier")) return "xav";
  if (k === "niels" || k === "maitre" || k === "maître") return "niels";
  if (k === "charly" || k === "chocolatine") return "charly";
  if (k === "ludo" || k === "rosette") return "ludo";
  if (k === "nelly" || k === "nellfest") return "nelly";
  if (k === "celis" || k === "célis" || k.includes("ombre")) return "celis";
  if (k === "alva" || k === "alvathor") return "alva";
  if (k === "herve" || k === "hervé") return "herve";
  if (k === "bber" || k.includes("punch")) return "bber";
  return k.replace(/\s+/g, "");
}

// GET: Fetch static + dynamic merged bot_knowledge with canonical key normalization
export async function GET() {
  try {
    const staticData: KnowledgeContainer = JSON.parse(JSON.stringify(staticBotKnowledge));
    const mergedParticipants: Record<string, ParticipantKnowledge> = {};

    // First load all static baseline participants
    for (const [key, part] of Object.entries(staticData.participants || {})) {
      const normKey = normalizeParticipantKey(key);
      mergedParticipants[normKey] = { ...part };
    }

    // Fetch dynamic knowledge from Supabase app_settings
    const { data: dbSetting } = await supabase
      .from("app_settings")
      .select("value, updated_at")
      .eq("key", "bot_knowledge")
      .maybeSingle();

    const dynamicKnowledge: KnowledgeContainer = dbSetting?.value || { participants: {} };

    // Deep merge dynamic knowledge onto canonical participant keys
    if (dynamicKnowledge.participants) {
      for (const [key, dynPart] of Object.entries(dynamicKnowledge.participants)) {
        const normKey = normalizeParticipantKey(key);
        if (!mergedParticipants[normKey]) {
          mergedParticipants[normKey] = dynPart;
        } else {
          const staticPart = mergedParticipants[normKey];
          mergedParticipants[normKey] = {
            ...staticPart,
            ...dynPart,
            prenom: staticPart.prenom || dynPart.prenom,
            pseudo: staticPart.pseudo || dynPart.pseudo,
            relation: staticPart.relation || dynPart.relation,
            infos: Array.from(new Set([...(staticPart.infos || []), ...(dynPart.infos || [])])),
            fun_facts: Array.from(new Set([...(staticPart.fun_facts || []), ...(dynPart.fun_facts || [])])),
            anecdotes: Array.from(new Set([...(staticPart.anecdotes || []), ...(dynPart.anecdotes || [])])),
          };
        }
      }
    }

    return NextResponse.json({
      success: true,
      staticKnowledge: staticBotKnowledge,
      dynamicKnowledge,
      updatedAt: dbSetting?.updated_at || new Date().toISOString(),
      mergedKnowledge: {
        description: staticBotKnowledge.description,
        participants: mergedParticipants,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erreur interne";
    console.error("Error reading bot_knowledge:", err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

// POST: Update bot_knowledge in Supabase (Admin)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { participants, participantKey, updates } = body;

    const { data: dbSetting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "bot_knowledge")
      .maybeSingle();

    const currentDynamic: KnowledgeContainer = dbSetting?.value || { participants: {} };
    if (!currentDynamic.participants) currentDynamic.participants = {};

    if (participants && typeof participants === "object") {
      // Normalize keys
      const normParticipants: Record<string, ParticipantKnowledge> = {};
      for (const [k, v] of Object.entries(participants as Record<string, ParticipantKnowledge>)) {
        const normKey = normalizeParticipantKey(k);
        normParticipants[normKey] = v;
      }
      currentDynamic.participants = normParticipants;
    } else if (participantKey && updates && typeof updates === "object") {
      const normKey = normalizeParticipantKey(participantKey);
      currentDynamic.participants[normKey] = {
        ...(currentDynamic.participants[normKey] || {}),
        ...updates,
      };
    } else {
      return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
    }

    const { error: dbError } = await supabase.from("app_settings").upsert({
      key: "bot_knowledge",
      value: currentDynamic,
      updated_at: new Date().toISOString(),
    });

    if (dbError) {
      console.error("Error saving bot_knowledge to Supabase:", dbError);
      return NextResponse.json({ error: "Erreur sauvegarde Supabase" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      storedInSupabase: true,
      dynamicKnowledge: currentDynamic,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erreur interne";
    console.error("Error updating bot_knowledge:", err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
