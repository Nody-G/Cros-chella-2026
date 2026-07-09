const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load connectionString from .env.local dynamically to avoid pushing secrets to git
const envPath = path.join(__dirname, '..', '.env.local');
let connectionString = process.env.SUPABASE_DB_URL;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/^SUPABASE_DB_URL=(.+)$/m);
  if (match) {
    connectionString = match[1].trim();
  }
}

if (!connectionString) {
  console.error("❌ Erreur : SUPABASE_DB_URL non trouvé dans .env.local");
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    await client.connect();
    console.log('✅ Connecté à Supabase PostgreSQL');

    const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'schema.sql'), 'utf8');
    console.log('📄 Fichier SQL chargé, exécution en cours...');

    await client.query(sql);
    console.log('✅ Migration exécutée avec succès !');

    // Vérifier les tables créées
    const res = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('\n📋 Tables dans la base :');
    res.rows.forEach(row => console.log(`  - ${row.table_name}`));

  } catch (err) {
    console.error('❌ Erreur:', err.message);
    if (err.position) {
      console.error('Position dans le SQL:', err.position);
    }
  } finally {
    await client.end();
  }
}

runMigration();
