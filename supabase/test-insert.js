const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
const c = new Client({ connectionString: process.env.SUPABASE_DB_URL });
c.connect()
  .then(() => c.query("INSERT INTO program (title, emoji, day) VALUES ('Test insertion', '🧪', 'friday') RETURNING id, title"))
  .then(r => {
    console.log('INSERT OK:', JSON.stringify(r.rows));
    return c.query("DELETE FROM program WHERE title = 'Test insertion'");
  })
  .then(r => {
    console.log('CLEANUP OK, rows deleted:', r.rowCount);
    c.end();
  })
  .catch(e => {
    console.error('ERROR:', e.message);
    c.end();
  });
