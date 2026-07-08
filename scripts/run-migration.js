const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  connectionString: 'postgresql://postgres.nmapbqtfqbqdivwuawfz:gFjeS7qDnzEQ59LA@aws-0-eu-west-3.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    await client.connect();
    console.log('✅ Connecté à Supabase PostgreSQL');

    const sql = fs.readFileSync(path.join(__dirname, 'supabase', 'schema.sql'), 'utf8');
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
