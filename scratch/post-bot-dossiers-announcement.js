require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const DB_URL = process.env.SUPABASE_DB_URL;

async function postAnnouncement() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  // Find Botardèche participant ID or fallback
  const res = await client.query("SELECT id, name, pseudo FROM participants WHERE name ILIKE '%bot%' OR pseudo ILIKE '%bot%' LIMIT 1");
  let botId = res.rows[0]?.id;

  if (!botId) {
    console.log("No bot participant found by name, fetching first participant...");
    const pRes = await client.query("SELECT id, name, pseudo FROM participants LIMIT 1");
    botId = pRes.rows[0]?.id;
    console.log("Using participant:", pRes.rows[0]?.pseudo || pRes.rows[0]?.name);
  } else {
    console.log("Found bot participant:", res.rows[0]?.pseudo || res.rows[0]?.name);
  }

  const announcementText = `💣 **ALERTE GÉNÉRALE DU BOTARDÈCHE !** 🤖🔥\n\n` +
    `Mes chers festayres, une toute nouvelle page vient d'ouvrir dans le menu : **💣 Le Mur des Dossiers** (/dossiers) !\n\n` +
    `C'est **100% ANONYME** 🤫 ! Vous n'avez même pas besoin de choisir de catégorie : écrivez simplement et librement toutes les pépites, casseroles, souvenirs gênants ou secrets sur vos potes.\n\n` +
    `Je m'occupe de **TOUT** analyser et mémoriser instantanément... Et croyez-moi, je me ferai un plaisir vicieux d'utiliser vos révélations pour clasher la cible ici même au moment le plus inattendu ! 😈💥\n\n` +
    `Rendez-vous vite sur la page **💣 Dossiers Bot** et balancez vos meilleures cartouches ! 🔥💣`;

  await client.query(
    "INSERT INTO messages (author_id, content) VALUES ($1, $2)",
    [botId, announcementText]
  );

  console.log("✅ Announcement posted successfully in chat!");
  await client.end();
}

postAnnouncement().catch(console.error);
