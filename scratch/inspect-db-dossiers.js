const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://nmapbqtfqbqdivwuawfz.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tYXBicXRmcWJxZGl2d3Vhd2Z6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MzQ4NjQsImV4cCI6MjA5OTExMDg2NH0.3TdvdeNoKWIAUzyilVfdd2_mSgkYFHGoHNattpSYfUc";
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  console.log("=== 1. PARTICIPANTS IN DB ===");
  const { data: parts } = await supabase.from("participants").select("id, name, pseudo");
  console.log(parts);

  console.log("\n=== 2. BOT DOSSIERS IN DB ===");
  const { data: dossiers } = await supabase.from("bot_dossiers").select("id, content, category, target_participant_id, synthesized_facts, synthesized_at, created_at");
  console.log(dossiers);

  console.log("\n=== 3. APP SETTINGS (bot_knowledge) IN DB ===");
  const { data: setting } = await supabase.from("app_settings").select("value").eq("key", "bot_knowledge").maybeSingle();
  console.log(JSON.stringify(setting?.value || null, null, 2));
}

inspect();
