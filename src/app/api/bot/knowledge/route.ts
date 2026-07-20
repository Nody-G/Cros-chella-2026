import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import staticBotKnowledge from "@/data/bot-knowledge.json";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
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

// GET: Fetch static, dynamic, and merged bot_knowledge
export async function GET() {
  try {
    let diskKnowledge: KnowledgeContainer = { description: staticBotKnowledge.description, participants: staticBotKnowledge.participants as Record<string, ParticipantKnowledge> };

    // Try reading directly from disk file to get latest on-disk changes
    const jsonPath = path.join(process.cwd(), "src", "data", "bot-knowledge.json");
    if (fs.existsSync(jsonPath)) {
      try {
        const fileContent = fs.readFileSync(jsonPath, "utf-8");
        diskKnowledge = JSON.parse(fileContent);
      } catch (err) {
        console.warn("Could not parse local bot-knowledge.json file:", err);
      }
    }

    // Fetch dynamic overrides from Supabase app_settings
    const { data: dbSetting } = await supabase
      .from("app_settings")
      .select("value, updated_at")
      .eq("key", "bot_knowledge")
      .single();

    const dynamicKnowledge: KnowledgeContainer = dbSetting?.value || { participants: {} };

    // Merge static and dynamic knowledge
    const mergedParticipants: Record<string, ParticipantKnowledge> = { ...(diskKnowledge.participants || {}) };

    if (dynamicKnowledge.participants) {
      for (const [key, dynPart] of Object.entries(dynamicKnowledge.participants)) {
        if (!mergedParticipants[key]) {
          mergedParticipants[key] = dynPart;
        } else {
          const staticPart = mergedParticipants[key];
          mergedParticipants[key] = {
            ...staticPart,
            ...dynPart,
            infos: Array.from(new Set([...(staticPart.infos || []), ...(dynPart.infos || [])])),
            fun_facts: Array.from(new Set([...(staticPart.fun_facts || []), ...(dynPart.fun_facts || [])])),
            anecdotes: Array.from(new Set([...(staticPart.anecdotes || []), ...(dynPart.anecdotes || [])])),
          };
        }
      }
    }

    return NextResponse.json({
      success: true,
      staticKnowledge: diskKnowledge,
      dynamicKnowledge,
      updatedAt: dbSetting?.updated_at || null,
      mergedKnowledge: {
        description: diskKnowledge.description,
        participants: mergedParticipants,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erreur interne";
    console.error("Error reading bot_knowledge:", err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

// POST: Update bot_knowledge (Admin)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { participants, participantKey, updates } = body;

    // Fetch existing dynamic knowledge from Supabase
    const { data: dbSetting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "bot_knowledge")
      .single();

    const currentDynamic: KnowledgeContainer = dbSetting?.value || { participants: {} };
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

    // Save to Supabase app_settings
    const { error: dbError } = await supabase.from("app_settings").upsert({
      key: "bot_knowledge",
      value: currentDynamic,
      updated_at: new Date().toISOString(),
    });

    if (dbError) {
      console.error("Error saving bot_knowledge to Supabase:", dbError);
      return NextResponse.json({ error: "Erreur sauvegarde Supabase" }, { status: 500 });
    }

    // Attempt to write to local bot-knowledge.json on disk
    let fileUpdated = false;
    try {
      const jsonPath = path.join(process.cwd(), "src", "data", "bot-knowledge.json");
      if (fs.existsSync(jsonPath)) {
        const fileContent = fs.readFileSync(jsonPath, "utf-8");
        const diskObj: KnowledgeContainer = JSON.parse(fileContent);
        if (!diskObj.participants) diskObj.participants = {};

        // Merge updates onto diskObj
        for (const [k, p] of Object.entries(currentDynamic.participants)) {
          if (!diskObj.participants[k]) {
            diskObj.participants[k] = p;
          } else {
            const existing = diskObj.participants[k];
            diskObj.participants[k] = {
              ...existing,
              ...p,
              infos: Array.from(new Set([...(existing.infos || []), ...(p.infos || [])])),
              fun_facts: Array.from(new Set([...(existing.fun_facts || []), ...(p.fun_facts || [])])),
              anecdotes: Array.from(new Set([...(existing.anecdotes || []), ...(p.anecdotes || [])])),
            };
          }
        }

        fs.writeFileSync(jsonPath, JSON.stringify(diskObj, null, 2), "utf-8");
        fileUpdated = true;
      }
    } catch (fsErr) {
      console.warn("Could not write to local bot-knowledge.json file:", fsErr);
    }

    return NextResponse.json({
      success: true,
      fileUpdated,
      dynamicKnowledge: currentDynamic,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erreur interne";
    console.error("Error updating bot_knowledge:", err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
