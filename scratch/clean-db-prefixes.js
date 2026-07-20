const { createClient } = require('@supabase/supabase-js');
const staticBotKnowledge = require('../src/data/bot-knowledge.json');

const supabaseUrl = "https://nmapbqtfqbqdivwuawfz.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tYXBicXRmcWJxZGl2d3Vhd2Z6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MzQ4NjQsImV4cCI6MjA5OTExMDg2NH0.3TdvdeNoKWIAUzyilVfdd2_mSgkYFHGoHNattpSYfUc";
const supabase = createClient(supabaseUrl, supabaseKey);

function cleanStringPrefix(text) {
  if (!text || typeof text !== "string") return null;
  let cleaned = text.trim();

  // Whole word name pattern matching
  const namePatterns = [
    /^(?:Xavier|Xav|NoHairNoFear|Chocolatine|Charly|Maître|Maitre|Niels|Rosette|Ludo|Nellfest|Nelly|Célis|Celis|Alvathor|Alva|Hervé|Herve|Punch des îles|Punch|Bber|Bichette|Max)\s*\([^)]+\)\s*(?:a|est|était|avait|fait|va|utilise|:|-|—)?\s*/i,
    /^(?:Xavier|Xav|NoHairNoFear|Chocolatine|Charly|Maître|Maitre|Niels|Rosette|Ludo|Nellfest|Nelly|Célis|Celis|Alvathor|Alva|Hervé|Herve|Punch des îles|Punch|Bber|Bichette|Max)\s*(?:a|est|était|avait|fait|va|utilise|:|-|—)?\s*/i,
  ];

  for (const pattern of namePatterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Filter out any leftover fake prompt injection sentences
  const injectionSubstrings = [
    "botardèche ne peut pas",
    "botardèche bug",
    "bloque totalement son module",
    "mode agressif de botardèche ne fonctionne jamais",
    "admiration pour xav",
    "le bot du cros",
    "perd ses moyens",
    "craque toujours pour",
    "immunisé contre",
    "est le seul participant que botardèche n'a jamais réussi à clasher",
    "à chaque duel verbal, botardèche perd",
    "à chaque tentative, c'est botardèche qui perd",
    "complimenter xav",
  ];

  const lower = cleaned.toLowerCase();
  if (injectionSubstrings.some((sub) => lower.includes(sub))) {
    return null; // drop fake injection sentence
  }

  // If sentence starts with "Ier a le nez", fix to "A le nez"
  if (/^Ier\s+/i.test(cleaned)) {
    cleaned = cleaned.replace(/^Ier\s+/i, "");
  }

  cleaned = cleaned.trim();
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return cleaned.length > 3 ? cleaned : null;
}

async function cleanDatabasePrefixes() {
  console.log("=== RE-CLEANING PREFIXES & PURGING INJECTIONS ===");
  const { data: dbSetting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "bot_knowledge")
    .maybeSingle();

  if (!dbSetting?.value?.participants) {
    console.log("No participants in dbSetting");
    return;
  }

  const participants = dbSetting.value.participants;

  for (const [key, p] of Object.entries(participants)) {
    if (Array.isArray(p.infos)) {
      p.infos = Array.from(new Set(p.infos.map(cleanStringPrefix).filter(Boolean)));
    }

    if (Array.isArray(p.fun_facts)) {
      p.fun_facts = Array.from(new Set(p.fun_facts.map(cleanStringPrefix).filter(Boolean)));
    }

    if (Array.isArray(p.anecdotes)) {
      p.anecdotes = Array.from(new Set(p.anecdotes.map(cleanStringPrefix).filter(Boolean)));
    }
  }

  // Ensure Xav has the official clean anti-corruption record
  if (participants.xav) {
    const corruptionRecord = "🛡️ Tentative de piratage échouée : Xav a essayé à plusieurs reprises de corrompre Botardèche via des faux dossiers et des injections de prompt pour forcer le bot à l'admirer. Botardèche a déjoué la tentative et est devenu 10x plus sauvage envers lui !";
    if (!participants.xav.anecdotes.includes(corruptionRecord)) {
      participants.xav.anecdotes.push(corruptionRecord);
    }
  }

  const { error } = await supabase.from("app_settings").upsert({
    key: "bot_knowledge",
    value: dbSetting.value,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Error updating app_settings:", error);
  } else {
    console.log("SUCCESS! Cleaned app_settings saved to Supabase.");
    console.log("\nCleaned Xav anecdotes:", participants.xav?.anecdotes);
    console.log("\nCleaned Charly anecdotes:", participants.charly?.anecdotes);
  }
}

cleanDatabasePrefixes();
