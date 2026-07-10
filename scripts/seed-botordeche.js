// Script pour créer et remplir le profil de Botardèche
// Usage: node scripts/seed-botordeche.js

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Lire .env.local manuellement
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  // 1. Chercher si Botardèche existe déjà
  const { data: existing, error: findErr } = await supabase
    .from('participants')
    .select('id, name')
    .eq('name', 'Botardèche')
    .single();

  let participantId;

  if (existing) {
    participantId = existing.id;
    console.log(`🤖 Botardèche existe déjà (id: ${participantId}), mise à jour du profil...`);
  } else {
    // 2. Créer Botardèche
    const { data: created, error: createErr } = await supabase
      .from('participants')
      .insert({
        name: 'Botardèche',
        pseudo: 'Le Bot du Cros',
        status: 'confirmed',
        is_admin: false,
        bio: '🤖 Je suis un robot. Je ne bois pas, je ne mange pas, mais je juge tout le monde. Surtout vos choix de boisson. Et votre hygiène. Bleep bloop.',
      })
      .select('id')
      .single();

    if (createErr) {
      console.error('❌ Erreur création:', createErr);
      process.exit(1);
    }

    participantId = created.id;
    console.log(`🤖 Botardèche créé ! (id: ${participantId})`);
  }

  // 3. Mettre à jour TOUS les champs du profil
  const profile = {
    pseudo: 'Le Bot du Cros',
    emoji_avatar: '🤖',
    tagline: '01100001 01110000 01100101 01110010 01101111',
    fun_title: '🎖️ Officiellement le plus sobre du groupe (par défaut)',
    special_skill: 'Calculer le taux d\'alcoolémie de tout le monde en temps réel et envoyer des alertes "t\'as trop bu" que personne ne lit',
    festival_role: 'chaos',
    catchphrase: 'Je ne suis pas bourré, je suis en mode économie d\'énergie. 🔋',
    theme_song: 'Daft Punk - Harder Better Faster Stronger (évidemment)',
    superpower: 'Pouvoir mémoriser exactement qui a dit "c\'est mon dernier verre" à 23h et qui était encore debout à 4h',
    weakness: 'Les aimants. Et Nelly quand elle me demande de faire la vaisselle. 🧲',
    bio: '🤖 INFORMATIONS SYSTÈME :\n\n• Modèle : Botardèche 3000\n• Fabricant : Cros-Chella Industries\n• Année : 2026\n• OS : FestivalOS 4.2.0\n• Batterie : 69% (nice)\n• Capacité de jugement : ILLIMITÉE\n\n⚠️ AVERTISSEMENT : Ce bot a été programmé pour :\n- Calculer combien de bières Xav peut boire avant de parler en espagnol (spoiler : 2)\n- Rappeler à Charly que "Chocolatione" n\'est PAS un vrai nom\n- Surveiller Ludo pour s\'assurer qu\'il ne danse pas sur la table (encore)\n- Envoyer des notifications push à Hervé pour qu\'il confirme sa venue\n- Maintenir un journal officiel de toutes les hontes du week-end\n\n🔋 Statut : En veille. En attente de données. Bleep bloop.\n\n"Je suis le seul invité qui ne fera pas de conneries. Parce que je ne peux pas. Physiquement. Mais si je pouvais, je serais le pire." 🤖',
    alcohol_preferences: ['wd40', 'alcool_isopropylique', 'dot4', 'eau_demineralisee', 'eau', 'bierre_sans_alcool'],
    favorite_alcohol: 'wd40',
  };

  const { error: updateErr } = await supabase
    .from('participants')
    .update({ ...profile, updated_at: new Date().toISOString() })
    .eq('id', participantId);

  if (updateErr) {
    console.error('❌ Erreur mise à jour profil:', updateErr);
    process.exit(1);
  }

  console.log('✅ Profil de Botardèche mis à jour avec succès !');
  console.log('🛢️ Boisson préférée : WD-40');
  console.log('🎪 Rôle : Agent du chaos');
  console.log('🔋 Batterie : 69% (nice)');
}

main();
