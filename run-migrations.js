require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_URL = process.env.SUPABASE_DB_URL;

// ⚠️  schema.sql is ONLY run if participants table does NOT exist yet.
// All other migrations are incremental (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
const MIGRATION_FILES = [
  'supabase/migration-advanced.sql',
  'supabase/migration-smoking.sql',
  'supabase/migration-chat-storage.sql',
  'supabase/migration-edit-delete-messages.sql',
  'supabase/migration-realtime-gallery.sql',
  'supabase/migration-proposal-images-comments.sql',
  'supabase/migration-alcohol-columns.sql',
  'supabase/migration-attendance.sql',
  'supabase/migration-proposal-comments.sql',
  'supabase/migration-chat-images.sql',
  'supabase/migration-photo-likes.sql',
  'supabase/migration-reactions.sql',
];

async function run() {
  const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('✅ Connected to Supabase\n');

  // Check if DB is empty (first deploy)
  const { rows } = await client.query(
    "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'participants') AS exists"
  );
  const dbExists = rows[0]?.exists;

  if (!dbExists) {
    console.log('🆕 Empty DB detected — running schema.sql + seed.sql');
    for (const file of ['supabase/schema.sql', 'supabase/seed.sql']) {
      const filePath = path.join(__dirname, file);
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  ${file} — not found, skipping`);
        continue;
      }
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`▶ Running ${file}...`);
      try {
        await client.query(sql);
        console.log(`  ✅ OK`);
      } catch (err) {
        console.log(`  ⚠️  ${(err.message || '').substring(0, 150)}`);
      }
    }
  } else {
    console.log('ℹ️  DB already has tables — skipping schema.sql (safe mode)');
  }

  // Always run incremental migrations
  for (const file of MIGRATION_FILES) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ${file} — not found, skipping`);
      continue;
    }
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`▶ Running ${file}...`);
    try {
      await client.query(sql);
      console.log(`  ✅ OK`);
    } catch (err) {
      const msg = err.message || '';
      // These are safe to ignore — means the change already exists
      if (
        msg.includes('already exists') ||
        msg.includes('already a member') ||
        msg.includes('duplicate key') ||
        msg.includes('already enabled')
      ) {
        console.log(`  ⚠️  ${msg.substring(0, 150)}`);
      } else {
        console.error(`  ❌ Error: ${msg}`);
      }
    }
  }

  await client.end();
  console.log('\n🏁 All migrations done!');
}

run().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
