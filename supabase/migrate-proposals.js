const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const c = new Client({ connectionString: process.env.SUPABASE_DB_URL });

async function migrate() {
  await c.connect();

  // Get pending proposals
  const { rows: proposals } = await c.query(
    "SELECT id, title, description, emoji, day, start_time, end_time, location FROM program_proposals WHERE status = 'pending'"
  );

  console.log(`Found ${proposals.length} pending proposals to migrate`);

  for (const p of proposals) {
    // Insert into program
    await c.query(
      `INSERT INTO program (title, description, emoji, day, start_time, end_time, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [p.title, p.description, p.emoji, p.day, p.start_time, p.end_time, p.location]
    );
    // Mark as approved
    await c.query(
      "UPDATE program_proposals SET status = 'approved' WHERE id = $1",
      [p.id]
    );
    console.log(`✅ Migrated: "${p.title}" (${p.day})`);
  }

  // Verify
  const { rows: programs } = await c.query("SELECT id, title, day FROM program ORDER BY sort_order");
  console.log(`\nProgram now has ${programs.length} entries:`);
  programs.forEach(p => console.log(`  - ${p.title} (${p.day})`));

  await c.end();
}

migrate().catch(e => { console.error(e); c.end(); });
