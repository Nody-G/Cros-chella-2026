const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.nmapbqtfqbqdivwuawfz:gFjeS7qDnzEQ59LA@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('✅ Connecté à Supabase PostgreSQL');

  const sql = `
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at timestamptz DEFAULT NULL;
  `;

  console.log('🔄 Ajout des colonnes deleted_at et edited_at...');
  await client.query(sql);
  console.log('✅ Colonnes ajoutées !');

  // Vérifier que realtime est bien activé
  console.log('🔄 Vérification de la publication realtime...');
  const { rows } = await client.query(`
    SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages';
  `);
  
  if (rows.length === 0) {
    console.log('🔄 Ajout de messages à la publication realtime...');
    await client.query(`ALTER PUBLICATION supabase_realtime ADD TABLE messages;`);
    console.log('✅ Realtime activé pour messages !');
  } else {
    console.log('✅ Realtime déjà activé pour messages');
  }

  await client.end();
  console.log('🎉 Migration terminée !');
}

run().catch(err => {
  console.error('❌ Erreur:', err.message);
  process.exit(1);
});
