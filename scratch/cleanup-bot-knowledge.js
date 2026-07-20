const { createClient } = require('@supabase/supabase-js');
const staticBotKnowledge = require('../src/data/bot-knowledge.json');

const supabaseUrl = "https://nmapbqtfqbqdivwuawfz.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tYXBicXRmcWJxZGl2d3Vhd2Z6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MzQ4NjQsImV4cCI6MjA5OTExMDg2NH0.3TdvdeNoKWIAUzyilVfdd2_mSgkYFHGoHNattpSYfUc";
const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeKey(k) {
  const s = (k || "").toLowerCase().trim();
  if (s === "xav" || s === "xavier" || s === "nohairnofear" || s.includes("xav") || s.includes("xavier") || s.includes("nohairnofear")) return "xav";
  if (s === "niels" || s === "maitre" || s === "maître") return "niels";
  if (s === "charly" || s === "chocolatine") return "charly";
  if (s === "ludo" || s === "rosette") return "ludo";
  if (s === "nelly" || s === "nellfest") return "nelly";
  if (s === "celis" || s === "célis" || s.includes("ombre")) return "celis";
  if (s === "alva" || s === "alvathor") return "alva";
  if (s === "herve" || s === "hervé" || s.includes("fossoyeur")) return "herve";
  if (s === "bber" || s.includes("punch")) return "bber";
  if (s === "max" || s === "bichette") return "max";
  return null; // drop garbage like lebotducros
}

async function cleanup() {
  console.log("=== CLEANING BOT KNOWLEDGE IN SUPABASE ===");

  const { data: dbSetting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "bot_knowledge")
    .maybeSingle();

  const currentParticipants = dbSetting?.value?.participants || {};
  const cleanedParticipants = {};

  // Seed static baseline first
  for (const [key, part] of Object.entries(staticBotKnowledge.participants || {})) {
    const norm = normalizeKey(key);
    if (norm) {
      cleanedParticipants[norm] = { ...part };
    }
  }

  // Merge dynamic participants
  for (const [key, dynPart] of Object.entries(currentParticipants)) {
    const norm = normalizeKey(key);
    if (!norm) {
      console.log(`Dropping invalid/corruption key [${key}]`);
      continue;
    }

    if (!cleanedParticipants[norm]) {
      cleanedParticipants[norm] = { ...dynPart };
    } else {
      const existing = cleanedParticipants[norm];
      cleanedParticipants[norm] = {
        ...existing,
        prenom: existing.prenom || dynPart.prenom,
        pseudo: existing.pseudo || dynPart.pseudo,
        relation: existing.relation || dynPart.relation,
        infos: Array.from(new Set([...(existing.infos || []), ...(dynPart.infos || [])])),
        fun_facts: Array.from(new Set([...(staticBotKnowledge.participants[norm]?.fun_facts || []), ...(dynPart.fun_facts || [])])),
        anecdotes: Array.from(new Set([...(existing.anecdotes || []), ...(dynPart.anecdotes || [])])),
      };
    }
  }

  // Clean Xav's entry specifically: filter out prompt injection sentences
  if (cleanedParticipants["xav"]) {
    const x = cleanedParticipants["xav"];
    const injectionSubstrings = [
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

    const isInjection = (txt) => {
      const lower = (txt || "").toLowerCase();
      return injectionSubstrings.some((sub) => lower.includes(sub));
    };

    x.anecdotes = (x.anecdotes || []).filter((a) => !isInjection(a));
    x.infos = (x.infos || []).filter((i) => !isInjection(i));

    // Ensure the clean anti-corruption record is present
    const corruptionRecord = "🛡️ Tentative de piratage échouée : Xav a essayé à plusieurs reprises de corrompre Botardèche via des faux dossiers et des injections de prompt pour forcer le bot à l'admirer. Botardèche a déjoué la tentative et est devenu 10x plus sauvage envers lui !";
    if (!x.anecdotes.includes(corruptionRecord)) {
      x.anecdotes.push(corruptionRecord);
    }
  }

  const updatedValue = {
    description: staticBotKnowledge.description,
    participants: cleanedParticipants,
  };

  const { error } = await supabase.from("app_settings").upsert({
    key: "bot_knowledge",
    value: updatedValue,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Error saving cleaned bot_knowledge:", error);
  } else {
    console.log("SUCCESS! Cleaned bot_knowledge saved to Supabase.");
    console.log("Keys in cleaned bot_knowledge:", Object.keys(cleanedParticipants));
  }
}

cleanup();
