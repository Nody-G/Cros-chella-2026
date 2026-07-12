# 🎪 Cros-Chella

> **Un week-end entre potes en Ardèche, version festival.**

Web app mobile-first pour organiser, s'amuser et garder les souvenirs du **Cros-Chella** — un week-end festif du **31 juillet au 2 août 2026** au Moulin du Cros, en Ardèche.

---

## ✨ Fonctionnalités

| Feature | Description |
|---|---|
| 🏠 **Participants** | Profils personnalisés avec pseudo, emoji avatar, bio, rôle de festival, spécialité, super-pouvoir... |
| 📋 **Programme** | Planning du week-end (jeudi → dimanche) avec CRUD admin et propositions par les participants |
| 🎮 **Jeux mystères** | Soumission secrète de jeux par chacun, révélés par l'admin au bon moment |
| 💬 **Chat** | Mur de discussion en temps réel avec réactions emoji et modification de messages |
| 📸 **Galerie** | Upload de photos avec compression, commentaires, viewer plein écran, lien Google Drive HD |
| 💰 **Dépenses** | Tricount intégré — suivi des frais partagés, catégories, répartition automatique, règlements optimaux |
| 🎱 **Billard** | Tournoi par équipes avec bracket automatique et suivi des scores |
| 🏅 **Badges** | Badges custom décernés par l'admin (emoji + titre + description) |
| 🍺 **Alcool** | Page dédiée avec préférences de chacun et inventaire absurde "Botardèche" |
| 🔔 **Notifications** | Pastilles rouges en temps réel sur Chat, Galerie, Jeux, Dépenses |
| 💬 **Feedback** | Système de feedback anonyme pour améliorer l'app |

---

## 🛠️ Stack technique

- **Framework** : [Next.js 14](https://nextjs.org/) (App Router)
- **Styling** : [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Base de données** : [Supabase](https://supabase.com/) (PostgreSQL + Auth + Storage + Realtime)
- **Hébergement** : [Vercel](https://vercel.com/)
- **Temps réel** : Supabase Realtime (chat, badges, galeries)
- **Images** : Compression custom + react-easy-crop

---

## 🚀 Installation

```bash
# Cloner le repo
git clone https://github.com/Nody-G/Cros-chella-2026.git
cd Cros-chella-2026

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env.local
# Remplir SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_DB_URL

# Lancer en dev
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

---

## 📂 Structure du projet

```
src/
├── app/                    # Pages Next.js (App Router)
│   ├── page.tsx            # Landing page + compte à rebours
│   ├── participants/       # Liste des participants + profils
│   ├── programme/          # Planning + propositions
│   ├── chat/               # Chat temps réel
│   ├── galerie/            # Galerie photos
│   ├── depenses/           # Tricount / frais partagés
│   ├── jeux/               # Jeux mystères
│   ├── billard/            # Tournoi de billard
│   ├── badges/             # Badges custom
│   ├── alcool/             # Préférences alcool
│   ├── profil/             # Édition du profil
│   └── admin/              # Panel admin (feedback)
├── components/
│   ├── layout/             # Bottom nav, menu "Plus"
│   └── ui/                 # Composants shadcn/ui
├── lib/
│   ├── supabase.ts         # Client Supabase
│   ├── supabase-queries.ts # Toutes les requêtes DB
│   ├── types.ts            # Types TypeScript
│   └── image-utils.ts      # Compression d'images
└── data/
    ├── alcohol-data.ts     # Données alcool
    └── updates.json        # Journal des mises à jour
```

---

## 🎨 Design

- **Dark theme** festival (violet-nuit, accents or/doré)
- **Glass morphism** + glow cards + gradients
- **Mobile-first** — optimisé pour téléphone
- **Ton** : humour border, second degré, emojis partout

---

## 📱 Authentification

L'app utilise un système d'auth par **sélection de profil** (pas de login/mot de passe classique). Chaque participant choisit son nom et entre son code d'accès. Les permissions admin sont gérées côté base de données.

---

## 🗄️ Base de données

**13 tables** Supabase avec Realtime activé :
`participants`, `games`, `messages`, `photos`, `photo_comments`, `photo_likes`, `polls`, `poll_votes`, `program`, `program_proposals`, `program_proposal_votes`, `proposal_comments`, `spots`, `expenses`, `expense_splits`, `settlements`, `billard_tournaments`, `billard_teams`, `billard_matches`, `custom_badges`, `participant_badges`

Les migrations SQL sont dans `supabase/migrations/` et sont toutes **idempotentes**.

---

## 📅 Dates clés

| Date | Événement |
|---|---|
| 🌙 Jeudi 30 juillet | Arrivée anticipée (pour les motivés) |
| 🎉 Vendredi 31 juillet | Début officiel du festival |
| ☀️ Samedi 1 août | Journée complète de festivités |
| 🌊 Dimanche 2 août | Dernier jour + départ |

---

## 🏠 Le lieu

**Le Moulin du Cros** — 670 le Cros, 07240, Ardèche
- 5 chambres (~16-17 places)
- Piscine
- Spots de baignade à proximité
- [📍 Google Maps](https://maps.app.goo.gl/Mzno5hxobVQbWubr8)

---

## 📄 Licence

Projet privé — fait avec ❤️ pour le Cros-Chella 2026
