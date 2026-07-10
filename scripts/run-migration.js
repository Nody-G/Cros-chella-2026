const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

async function runMigration() {
  const client = new Client({ connectionString: process.env.SUPABASE_DB_URL });
  await client.connect();
  
  const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migration-advanced.sql'), 'utf8');
  
  // Split by semicolons but handle $$ blocks
  const statements = [];
  let current = '';
  let inDollarQuote = false;
  
  for (const line of sql.split('\n')) {
    if (line.includes('$FUNC$')) inDollarQuote = !inDollarQuote;
    current += line + '\n';
    if (!inDollarQuote && line.trim().endsWith(';') && current.trim()) {
      statements.push(current.trim());
      current = '';
    }
  }
  if (current.trim()) statements.push(current.trim());
  
  for (const stmt of statements) {
    if (!stmt || stmt.startsWith('--')) continue;
    try {
      await client.query(stmt);
      const preview = stmt.substring(0, 60).replace(/\n/g, ' ');
      console.log(`✅ ${preview}...`);
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('already member')) {
        console.log(`⏭️  Déjà existant: ${stmt.substring(0, 50)}...`);
      } else {
        console.error(`❌ Erreur: ${err.message}`);
        console.error(`   Statement: ${stmt.substring(0, 80)}...`);
      }
    }
  }
  
  await client.end();
  console.log('\n🎉 Migration terminée !');
}

runMigration().catch(console.error);
