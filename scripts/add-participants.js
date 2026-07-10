const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({ connectionString: process.env.SUPABASE_DB_URL });

(async () => {
  await client.connect();

  // Check existing
  const existing = await client.query('SELECT id, name, pseudo FROM participants ORDER BY id');
  console.log('Existing participants:');
  existing.rows.forEach(r => console.log(`  ${r.id}: ${r.name} (${r.pseudo || 'no pseudo'})`));

  // Update Célis
  const celis = existing.rows.find(r => r.name === 'Célis');
  if (celis) {
    await client.query(
      "UPDATE participants SET pseudo = $1, status = 'confirmed' WHERE id = $2",
      ["l'homme de l'ombre", celis.id]
    );
    console.log('✅ Updated Célis → l\'homme de l\'ombre');
  } else {
    await client.query(
      "INSERT INTO participants (name, pseudo, status, is_admin, bio) VALUES ($1, $2, 'confirmed', false, $3)",
      ['Célis', "l'homme de l'ombre", "Le frère. L'ombre. Celui qu'on voit pas mais qui est là. 🌑"]
    );
    console.log('✅ Inserted Célis');
  }

  // Insert Bber
  const bber = existing.rows.find(r => r.name === 'Bber');
  if (!bber) {
    await client.query(
      "INSERT INTO participants (name, pseudo, status, is_admin, bio) VALUES ($1, $2, 'confirmed', false, $3)",
      ['Bber', 'Punch des îles', 'Le punch des îles. Ça va mal tourner. 🍹🏝️']
    );
    console.log('✅ Inserted Bber → Punch des îles');
  } else {
    console.log('⚠️ Bber already exists');
  }

  // Verify
  const final = await client.query('SELECT id, name, pseudo, status FROM participants ORDER BY id');
  console.log('\nFinal participants:');
  final.rows.forEach(r => console.log(`  ${r.id}: ${r.name} aka ${r.pseudo || 'N/A'} [${r.status}]`));

  await client.end();
})().catch(e => { console.error(e.message); process.exit(1); });
