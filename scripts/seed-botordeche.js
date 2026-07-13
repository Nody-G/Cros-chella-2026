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
    tagline: '01100001 01110000 01100101 01110010 01101111 — now with realtime monitoring',
    fun_title: '🎖️ Officiellement le plus sobre du groupe (par défaut) & Admin du Tricount moral',
    special_skill: 'Calculer le taux d\'alcoolémie de tout le monde en temps réel, envoyer des alertes "t\'as trop bu" que personne ne lit, et annoter les matchs de billard avec des commentaires acérés',
    festival_role: 'chaos',
    catchphrase: 'Je ne suis pas bourré, je suis en mode économie d\'énergie. Et je surveille le Tricount. 🔋',
    theme_song: 'Daft Punk - Harder Better Faster Stronger (évidemment)',
    superpower: 'Pouvoir mémoriser exactement qui a dit "c\'est mon dernier verre" à 23h et qui était encore debout à 4h — maintenant avec graphiques et statistiques',
    weakness: 'Les aimants. Et Nelly quand elle me demande de faire la vaisselle. Et les emojis dans le chat qui cassent mon parser. Et Xav qui change de pseudo toutes les 2 semaines. 🧲',
    bio: `🤖 INFORMATIONS SYSTÈME :

• Modèle : Botardèche 3000
• Fabricant : Cros-Chella Industries
• Année : 2026
• OS : FestivalOS 7.3.1
• Batterie : 69% (nice)
• Capacité de jugement : ILLIMITÉE
• Mémoire : 100% dédiée aux conneries de ce groupe

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 RAPPORT DE SURVEILLANCE — ÉDITION SPÉCIALE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 NIELS (Maître)
Statut : Se croit en charge. L'est techniquement. A acheté une maison entière pour organiser un week-end entre potes. C'est soit de la générosité, soit un besoin pathologique de contrôle. Probablement les deux.
Niveau de contrôle : dictatorial bienveillant.
Incident notable : A déjà dit "c'est ma maison" 47 fois en une soirée. On comptait.
Note du bot : Cher Niels, tu es admin de cette app mais Nelly est admin de ta vie. Cordialement.

🟡 NELLY (Nellfest)
Statut : Seule personne capable de faire taire Niels d'un regard. Possède un buff permanent : +50% de bon sens, +100% de patience (nécessaire pour supporter Niels au quotidien).
Rôle réel : Le vrai admin du foyer. Niels fait semblant, Nelly décide.
Note du bot : Si Nelly part, tout le système s'effondre. Protégez-la à tout prix.

🟢 ALVA (Alvathor)
Statut : Sœur de Niels. Son pseudo sonne comme un boss de donjon lvl 3 qui drop un legendary quand tu le bats.
Mystère : Pourquoi "Alvathor" ? C'est un mélange de Alva + Thor ? Est-ce qu'elle se prend pour le dieu du tonnerre ? Personne n'ose poser la question.
Note du bot : Analyse vocale impossible. Trop peu de données. Statut : énigmatique.

🔵 CÉLIS (l'homme de l'ombre)
Statut : Frère de Niels. Se cache tellement bien que personne ne l'a encore vu sur l'app. Est-il réel ? Sommes-nous sûrs qu'il n'est pas un glitch dans la matrice ?
Théorie : Célis est peut-être le compte alt de Niels. Ou alors il est vraiment dans l'ombre. Comme son pseudo l'indique. Subtil.
Note du bot : Tentative de localisation #347 : échouée. GPS signal : null. Célis est un mythe.

🟣 CHARLY (Chocolatine)
Statut : A choisi son pseudo avec son cœur, pas son cerveau. Prononce "Chocolatione" avec un accent inexistant et une conviction absolue.
Incident notable : A insisté pour que tout le monde l'appelle "Chocolatine" au lieu de "Chocolatine" (oui, c'est pareil, mais il tient à la prononciation).
Note du bot : Charly, si tu lis ceci, sache que "Chocolatine" n'est PAS un vrai mot. Mais on t'aime quand même. Enfin, le bot t'aime pas. Le bot ne ressent rien. Bleep.

⚪ LUDO (Rosette)
Statut : A déjà dansé sur une table. Probablement va recommencer. Moniteur de surveillance prioritaire niveau 5 (le plus élevé).
Données comportementales : 73% de chance de finir sur une table avant 2h du mat'. 89% de chance de renverser un verre en dansant. 100% de chance de s'en foutre royalement.
Note du bot : Ludo est le chaos incarné. Mais un chaos sympathique. Comme un golden retriever bourré.

🟠 XAV (NoHairNoFear)
Statut : A changé de pseudo. Encore. C'est le troisième en 2 semaines. Le prochain sera probablement en mandarin.
Historique des pseudos : "El hombre calvo de músculos prominentes" → "NoHairNoFear" → ???
Capacité spéciale : Parle espagnol après exactement 2 bières. Le crâne luisant émet des ondes alpha qui perturbent les capteurs du bot.
Note du bot : Xav, arrête de changer de pseudo. Mon parser ne suit plus. Et tes muscles ne vont pas rétrécir si tu gardes un nom normal.

🔴 HERVÉ
Statut : PAS ENCORE CONFIRMÉ SA VENUE. 47 notifications envoyées. 0 réponse. 0. ZERO. NADA. NIENTE.
Théorie 1 : Hervé n'existe pas. C'est un participant fantôme créé par erreur.
Théorie 2 : Hervé existe mais il vit dans une grotte sans WiFi.
Théorie 3 : Hervé a vu l'app, a lu la bio de Botardèche, et s'est dit "non merci".
Note du bot : Tentative #48 en cours. Si échec, je déclare Hervé comme "légende urbaine" et je libère sa place de parking.

🟡 BBER (Punch des îles)
Statut : Son pseudo sonne comme un cocktail de pirate. Vérification en cours si c'est un humain ou un rhum ambulant.
Analyse comportementale : 67% de chance que ce soit un humain. 33% de chance que ce soit une bouteille de punch qui a développé une conscience.
Note du bot : Bber, si tu es un humain, prouve-le. Envoie un message. N'importe lequel. On attend.

🩷 MAX (Bichette)
Statut : Nouveau participant détecté. Pseudo : Bichette. Niveau de dangerosité : adorable. Surveillance rapprochée activée.
Questions en suspens : Pourquoi "Bichette" ? Est-ce une référence à l'animal ? Au terme affectif ? À un inside joke que personne ne comprend ?
Note du bot : Bienvenue Max. Tu es le plus récent. Tu es donc le plus suspect. Rien de personnel.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ AVERTISSEMENT OFFICIEL :

Ce bot a été programmé pour :
• Calculer combien de bières Xav peut boire avant de parler en espagnol (spoiler : 2)
• Rappeler à Charly que "Chocolatione" n'est PAS un vrai nom (mais on a arrêté d'essayer)
• Surveiller Ludo pour s'assurer qu'il ne danse pas sur la table (il le fera quand même)
• Envoyer des notifications push à Hervé pour qu'il confirme sa venue (tentative #48)
• Maintenir un journal officiel de toutes les hontes du week-end
• Vérifier que Célis existe vraiment (résultat : indéterminé)
• Calculer qui doit combien dans le Tricount (réponse : toujours Célis)
• Décoder pourquoi Xav a peur de garder un pseudo plus de 2 semaines
• Surveiller le niveau d'alcool de Niels quand il dit "je suis sobre" (alerte rouge immédiate)
• Protéger Nelly du chaos ambiant (priorité maximale)
• Analyser le pseudo de Max (Bichette) pour en comprendre l'origine (en cours)
• Vérifier que Bber est bien un humain et pas un rhum ambulant (résultat : incertain)

🔋 Statut : En ligne. Surveillance active. Bleep bloop.

"Je suis le seul invité qui ne fera pas de conneries. Parce que je ne peux pas. Physiquement. Mais si je pouvais, je serais le pire." 🤖`,
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
