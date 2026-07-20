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

// GET: Fetch bot_knowledge directly from Supabase app_settings
export async function GET() {
  try {
    const { data: dbSetting } = await supabase
      .from("app_settings")
      .select("value, updated_at")
      .eq("key", "bot_knowledge")
      .maybeSingle();

    let dynamicKnowledge: KnowledgeContainer = dbSetting?.value;

    // Seed from static JSON if Supabase is empty
    if (!dynamicKnowledge || !dynamicKnowledge.participants || Object.keys(dynamicKnowledge.participants).length === 0) {
      dynamicKnowledge = JSON.parse(JSON.stringify(staticBotKnowledge));
      await supabase.from("app_settings").upsert({
        key: "bot_knowledge",
        value: dynamicKnowledge,
        updated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      staticKnowledge: staticBotKnowledge,
      dynamicKnowledge,
      updatedAt: dbSetting?.updated_at || new Date().toISOString(),
      mergedKnowledge: dynamicKnowledge,
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

    const currentDynamic: KnowledgeContainer = dbSetting?.value || JSON.parse(JSON.stringify(staticBotKnowledge));
    if (!currentDynamic.participants) currentDynamic.participants = {};

    if (participants && typeof participants === "object") {
      currentDynamic.participants = participants;
    } else if (participantKey && updates && typeof updates === "object") {
      currentDynamic.participants[participantKey] = {
        ...(currentDynamic.participants[participantKey] || {}),
        ...updates,
      };
    } else {
      return NextResponse.json({ error: "Paramètres invalides (participants ou participantKey + updates requis)" }, { status: 400 });
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
