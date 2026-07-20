const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://nmapbqtfqbqdivwuawfz.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tYXBicXRmcWJxZGl2d3Vhd2Z6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MzQ4NjQsImV4cCI6MjA5OTExMDg2NH0.3TdvdeNoKWIAUzyilVfdd2_mSgkYFHGoHNattpSYfUc";
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkParticipants() {
  const { data } = await supabase.from("participants").select("*");
  console.log("Participants table:", data);
}

checkParticipants();
