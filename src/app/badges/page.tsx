"use client";

import { useEffect, useState } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Award, X } from "lucide-react";
import { getAllBadges, awardBadge, deleteBadge } from "@/lib/supabase-queries";
import { supabase } from "@/lib/supabase";
import type { CustomBadge } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";

const BADGE_SUGGESTIONS: Record<string, { title: string; desc: string }> = {
  // 🎱 Jeux & Sport
  "🎱": { title: "Boule de Noël", desc: "Ta boule est ronde mais ton jeu est tout plat. Même le billard a honte." },
  "🏆": { title: "Trophée de Participation", desc: "T'as rien gagné mais t'as un emoji. C'est déjà ça." },
  "🥇": { title: "Premier du Fond", desc: "Premier à finir sa bière, dernier à avoir une vie sociale." },
  "🥈": { title: "L'Éternel Second", desc: "Toujours derrière quelqu'un d'autre. Comme dans la vie." },
  "🥉": { title: "Médaille de Consolation", desc: "T'as perdu mais on t'aime quand même. Enfin... on essaie." },
  "🏅": { title: "Héros du Canapé", desc: "Ton plus grand exploit c'est de pas t'endormir avant 3h." },
  "🎖️": { title: "Vétéran du Bar", desc: "Tu connais chaque bouteille par son prénom. C'est triste." },
  "🎯": { title: "Précision de Merde", desc: "Tu vises le miroir, tu touches le plafond. Chaque fois." },
  "🎲": { title: "Joueur Compulsif", desc: "Tu parierais sur la couleur de tes propres chaussettes." },
  "♟️": { title: "Stratège du Dimanche", desc: "Tu réfléchis 20 min pour un coup nul. Échec et mat, cérébralement." },
  "🎰": { title: "Machine à Perdre", desc: "Tu mets 10€, tu récupères 0€. Mais l'espoir est intact." },
  "🎮": { title: "No-Life Certifié", desc: "T'as plus d'heures de jeu que d'heures de sommeil depuis 2019." },
  "🕹️": { title: "Manette Vivante", desc: "On te manipule facilement et t'as même pas de bouton pause." },
  "🎳": { title: "Strike de Malchance", desc: "Tu renverses tout sauf les quilles. Même la bière du voisin." },
  "⚽": { title: "Footballeur du Dimanche", desc: "Tu cours après le ballon comme un golden retriever. Adorable et nul." },
  "🏀": { title: "Airball Professionnel", desc: "Ton tir est si mauvais que le panier te demande de partir." },
  "🏈": { title: "Quarterback du Canapé", desc: "Tu lances les chips vers ta bouche. 30% de réussite." },
  "🎾": { title: "Double Faute", desc: "Tu rates même le service. Au tennis comme dans la vie." },
  "🏓": { title: "Ping-Pong Mental", desc: "Tu changes d'avis toutes les 3 secondes. Bipolaire créatif." },

  // 🔥 Attitude & Réactions
  "🔥": { title: "En Feu (Littéralement)", desc: "T'es tellement chaud que t'as brûlé tes dernières neurones." },
  "💀": { title: "Mort Intérieurement", desc: "T'es vivant de l'extérieur mais c'est tout. L'âme a quitté le chat." },
  "⚡": { title: "Choc Électrique", desc: "T'es rapide comme l'éclair... pour dire des conneries." },
  "💥": { title: "Explosion de Talent", desc: "Le talent a explosé. Il reste plus rien. Juste des débris." },
  "✨": { title: "Paillettes sur une Poubelle", desc: "Tu brilles mais ça change rien au fond. Du bling sur du vide." },
  "🌟": { title: "Étoile Filante", desc: "Tu brilles 2 secondes puis t'existes plus. Comme tes relations." },
  "⭐": { title: "Star de Rien", desc: "Famous for being famous. Mais dans ta tête hein." },
  "💫": { title: "Vertige Permanent", desc: "T'as le tournis en permanence. C'est pas l'alcool, c'est toi." },
  "🎊": { title: "Confetti Humain", desc: "Tu voles partout mais tu finis toujours à la poubelle." },
  "🎉": { title: "Fête Foraine", desc: "Beaucoup de bruit, peu de contenu. Comme un feu d'artifice raté." },
  "🥳": { title: "Fêtard du Mardi", desc: "Tu fais la fête quand y'a même pas de raison. Pathétique et beau." },
  "🤯": { title: "Explosion Cérébrale", desc: "Ton cerveau a planté. Blue screen. Redémarrage impossible." },
  "😱": { title: "Panique Existentielle", desc: "T'as peur de tout. Surtout de toi-même. À raison." },
  "🥵": { title: "Chaud Patate", desc: "T'es tellement chaud que même le thermomètre démissionne." },
  "🥶": { title: "Froid comme un Poisson", desc: "T'as la chaleur humaine d'un congélateur en panne." },
  "😤": { title: "Rage Silencieuse", desc: "Tu bouilles intérieurement mais tu dis rien. Lâche." },
  "😡": { title: "Colère Mal Placée", desc: "T'es en rogne mais contre quoi ? Même toi tu sais pas." },
  "🤬": { title: "Grosse Bouche", desc: "Tu parles plus vite que ton cerveau. Résultat : que de la merde." },
  "😈": { title: "Petit Démon", desc: "T'es méchant mais mignon. Comme un chihuahua en colère." },
  "👿": { title: "Démon de Service", desc: "Le diable te demande des conseils. T'es son mentor." },
  "👹": { title: "Ogre du Quartier", desc: "Tu fais peur aux enfants et aux adultes. Même aux chiens." },
  "👺": { title: "Masque Social", desc: "Derrière ton sourire y'a... rien. Juste du vide et de l'ambition." },
  "🤡": { title: "Clown Officiel", desc: "T'es le clown du groupe. Tout le monde rit. De toi." },
  "💩": { title: "Caca Princesse", desc: "Tu pues mais tu te crois royal. Le déni c'est un art." },
  "👻": { title: "Fantôme Social", desc: "T'es là mais personne te voit. Comme d'habitude." },
  "🎃": { title: "Citrouille de Service", desc: "Creux à l'intérieur, une bougie pour faire croire que t'es vivant." },
  "🤖": { title: "Robot Défectueux", desc: "Tu répètes les mêmes erreurs en boucle. Bug non corrigé." },
  "👽": { title: "Extraterrestre", desc: "Viens d'une autre planète. C'est la seule explication à ton comportement." },
  "🗿": { title: "Tête de Pierre", desc: "T'es aussi expressif qu'un moai. Et aussi intéressant." },

  // 🍺 Fête & Nourriture
  "🍺": { title: "Biérologue", desc: "Tu connais 200 bières mais pas le nom de ta mère ce matin." },
  "🍻": { title: "Pot de Colle", desc: "Tu trinques avec tout le monde. Personne t'invite mais tu viens quand même." },
  "🥂": { title: "Champagne du Pauvre", desc: "Tu lèves ton verre de Ricard en faisant semblant d'être classe." },
  "🍷": { title: "Sommelier du Carton", desc: "Tu fais tourner ton vin dans le verre. C'est du Caprice des Dieux en brique." },
  "🍸": { title: "Barman Raté", desc: "Tu mélanges tout. Le résultat est toujours imbuvable. Comme toi." },
  "🍹": { title: "Cocktail Molotov", desc: "Tes mélanges explosent. Au bar comme dans tes relations." },
  "🥃": { title: "Whisky Business", desc: "Tu bois seul en regardant le plafond. C'est pas triste, c'est un lifestyle." },
  "🫗": { title: "Déversement de Honte", desc: "Tu renverses tout. Ton verre, ta dignité, tes espoirs." },
  "🍾": { title: "Bouteille de Champomy", desc: "Tu fais semblant de faire pop. C'est du pétillant à 1€50." },
  "☕": { title: "Café-Dépendant", desc: "Sans café t'es un zombie. Avec café t'es un zombie agité." },
  "🍕": { title: "Pizza Humaine", desc: "T'es rond, gras, et tout le monde te veut à 3h du matin." },
  "🍔": { title: "Burger de Luxe", desc: "T'es plein de couches mais aucune n'est appétissante." },
  "🌭": { title: "Saucisse de Vienne", desc: "Petit, mou, et personne te prend au sérieux." },
  "🌮": { title: "Taco Explosif", desc: "Tu débordes de partout et tu finis toujours par terre." },
  "🌯": { title: "Kebab Ambulant", desc: "T'es roulé dans tout et n'importe quoi. Résultat : indigeste." },
  "🍿": { title: "Popcorn Dramatique", desc: "Tu exploses sous la pression. Comme au micro-ondes." },
  "🧁": { title: "Muffin Décoratif", desc: "Joli dehors, vide dedans. La déco c'est tout ce que t'as." },
  "🍰": { title: "Gâteau Rassis", desc: "T'étais bon y'a longtemps. Maintenant t'es sec et oublié." },
  "🎂": { title: "Anniversaire Triste", desc: "T'as soufflé tes bougies seul. Les invités ont annulé." },
  "🍩": { title: "Donut Vide", desc: "T'es un cercle de rien avec du sucre par-dessus. La métaphore parfaite." },

  // 👑 Personnages & Titres
  "👑": { title: "Roi de Rien", desc: "Tu portes une couronne mais t'as pas de royaume. Juste un ego surdimensionné." },
  "💎": { title: "Diamant de Zircon", desc: "Tu brilles comme du faux. Tout le monde voit que c'est du toc." },
  "🫅": { title: "Majesté Déchue", desc: "T'étais roi, t'es maintenant serveur. La chute est rude." },
  "🤴": { title: "Prince de Banlieue", desc: "T'attends ta princesse. Elle viendra pas. T'es en RER C." },
  "👸": { title: "Princesse Capricieuse", desc: "T'es pas contente si t'as pas ce que tu veux. Donc jamais." },
  "🦸": { title: "Super-Héros du Dimanche", desc: "Ton pouvoir c'est de dormir 14h d'affilée. Impressionnant et inutile." },
  "🦹": { title: "Vilain de Pacotille", desc: "Tu veux être méchant mais t'es juste désagréable. Nuance." },
  "🧙": { title: "Sorcier du Micro-Ondes", desc: "Ta magie c'est de réchauffer des restes. Gandalf est jaloux." },
  "🧛": { title: "Vampire Émotionnel", desc: "Tu draines l'énergie de tout le monde. Pas de sang, juste de la patience." },
  "🧟": { title: "Zombie du Lundi", desc: "T'es mort mais tu bouges encore. Comme au boulot." },
  "🧜": { title: "Sirène de Piscine", desc: "Tu nages dans 30cm d'eau. La magie est limitée." },
  "🧝": { title: "Elfe Dépressif", desc: "T'es censé être immortel et gracieux. T'es juste lent et triste." },
  "🎅": { title: "Père Noël du PMU", desc: "Tu distribues des cadeaux... de merde. Et tu pues la bière." },
  "🤶": { title: "Mère Noël Fatiguée", desc: "Tu fais tout le boulot pendant que le barbu dort. Classique." },
  "🎭": { title: "Double Face", desc: "Tu changes de personnalité selon qui est là. Schizophrène social." },
  "🎪": { title: "Cirque Ambulant", desc: "Ta vie c'est un cirque. Mais sans les artistes, juste les clowns." },
  "🎤": { title: "Chanteur de Douche", desc: "Tu chantes bien... sous l'eau. Dehors c'est une agression sonore." },
  "🎸": { title: "Guitariste de Feu de Camp", desc: "Tu connais 3 accords et tu nous casses les oreilles depuis 2015." },
  "🥁": { title: "Batteur Fou", desc: "Tu tapes sur tout. Les tables, les murs, les nerfs des gens." },
  "🎺": { title: "Trompette de la Honte", desc: "Tu fais du bruit pour rien. Comme ta existence." },

  // 😎 Expressions & Humeur
  "😎": { title: "Cool de Surface", desc: "T'as l'air détendu mais t'as 3 crises d'angoisse en parallèle." },
  "🤪": { title: "Fou Furieux", desc: "T'es pas drôle-t'es malade. Mais on rit quand même." },
  "🥴": { title: "Ivre Mort", desc: "T'es à moitié conscient et à moitié vivant. Le reste c'est de l'alcool." },
  "🤫": { title: "Gardien du Secret", desc: "Tu sais tout mais tu dis rien. Enfin... tu dis tout à tout le monde." },
  "🫠": { title: "Fondu de Honte", desc: "Tu fonds de gêne. Bientôt t'existeras plus. C'est mieux pour tout le monde." },
  "😏": { title: "Sourire Suspect", desc: "Tu souris mais on sait pas pourquoi. C'est inquiétant." },
  "🤑": { title: "Richest Poor", desc: "T'as 12€ sur ton compte mais tu parles comme un trader. Le culot." },
  "🤓": { title: "Nerd de Service", desc: "Tu corrigeras les gens sur l'orthographe. Tout le monde te déteste." },
  "🧐": { title: "Inspecteur Gadget", desc: "Tu fouilles partout. Dans les affaires des autres. T'es relou." },
  "🫡": { title: "Salut Militaire", desc: "Tu obéis à tout le monde. T'es pas respectueux, t'es juste lâche." },
  "💪": { title: "Force de la Nature", desc: "T'es fort... en gueule. Au physique c'est une autre histoire." },
  "🧠": { title: "Gros Cerveau", desc: "Tu penses trop et tu agis pas. L'analyse paralysante, ton sport." },
  "👁️": { title: "Œil de Lynx", desc: "Tu vois tout sauf tes propres défauts. Ça s'appelle de l'aveuglement." },
  "👅": { title: "Langue de Vipère", desc: "Tu parles pour blesser. Et ça marche. Bravo, t'es horrible." },
  "🫀": { title: "Cœur d'Artichaut", desc: "Tu tombes amoureux de tout le monde. C'est pas romantique, c'est pathologique." },
  "🫁": { title: "Souffle Court", desc: "Tu perds ton souffle en montant 2 marches. Le cardio c'est un concept." },
  "🦴": { title: "Os Sec", desc: "T'es sec comme un os. Physiquement et émotionnellement." },
  "🦷": { title: "Dent de Sagesse", desc: "T'es la dernière à apparaître et on veut t'arracher. Symbolique." },
  "👀": { title: "Voyeur Professionnel", desc: "Tu regardes tout. Surtout ce qui te regarde pas." },
  "💅": { title: "Queen Attitude", desc: "Tu fais la princesse mais t'as les ongles cassés. Le contraste." },

  // 🦀 Animaux
  "🐐": { title: "GOAT (Greatest Of All Time)", desc: "Le plus grand... dans ta tête. Dans la réalité t'es une chèvre." },
  "🦄": { title: "Licorne Déçue", desc: "T'es censé être magique et rare. T'es juste bizarre et seul." },
  "🐸": { title: "Grenouille", desc: "Tu croasses tout le temps et personne t'écoute. Kermit vibes." },
  "🦀": { title: "Crabe de Compétition", desc: "Tu avances de côté et tu pinces tout le monde. Cancer zodiacal." },
  "🐍": { title: "Serpent Bipolaire", desc: "Tu mords dans le dos et tu fais semblant d'être gentil. Classique." },
  "🦎": { title: "Lézard Social", desc: "Tu changes de couleur selon l'ambiance. T'as pas de personnalité." },
  "🐊": { title: "Crocodile en Larmes", desc: "Tu pleures pour manipuler. Ça marche 2 fois. Après on te calcule plus." },
  "🦈": { title: "Requin du Bar", desc: "Tu tournes autour des verres. Tout le monde te craint mais t'es juste soif." },
  "🐬": { title: "Dauphin Dépressif", desc: "T'es censé être joyeux mais t'as le sourire forcé depuis 2020." },
  "🐳": { title: "Baleine Émotionnelle", desc: "Tu t'engouffres dans tout. Les sentiments, la nourriture, les drames." },
  "🐙": { title: "Pieuvre Collante", desc: "T'as 8 bras pour t'accrocher aux gens. Personne s'échappe." },
  "🦑": { title: "Calmar Confus", desc: "Tu lances de l'encre quand t'es stressé. C'est pas hygiénique." },
  "🐛": { title: "Bug Humain", desc: "T'es un glitch dans la matrice. Tout le monde le sait sauf toi." },
  "🦋": { title: "Papillon de Nuit", desc: "Tu voles vers la lumière. C'est beau jusqu'à ce que tu te crames." },
  "🐌": { title: "Escargot Chronique", desc: "Tu portes ta maison sur ton dos. T'es lent et tout le monde te marche dessus." },
  "🐜": { title: "Fourmi Ouvrière", desc: "Tu bosses pour tout le monde et personne te remercie. La vie." },
  "🐝": { title: "Abeille Irritable", desc: "Tu piques dès qu'on t'approche. Et tu meurs après. Dramatique." },
  "🐞": { title: "Coccinelle Chanceuse", desc: "T'as de la chance... de pas être morte encore. C'est tout." },
  "🦗": { title: "Criquet Silence", desc: "Quand on te pose une question, c'est le silence. Toujours." },
  "🕷️": { title: "Araignée des Coins", desc: "Tu tisses des toiles dans les coins. Personne te veut là." },

  // ❤️ Symboles & Divers
  "❤️": { title: "Cœur Brisé (Encore)", desc: "T'as donné ton cœur. Il est revenu en 47 morceaux. Comme d'hab." },
  "🧡": { title: "Cœur Orange", desc: "T'es pas assez rouge pour être passionné. Juste tiède. Comme ta vie." },
  "💛": { title: "Cœur Jaune", desc: "L'amitié ? C'est ce qu'on te dit quand on te friendzone." },
  "💚": { title: "Cœur Vert", desc: "Jaloux de tout le monde. Tout le temps. C'est épuisant." },
  "💙": { title: "Cœur Bleu", desc: "Triste par défaut. C'est ton état naturel depuis la naissance." },
  "💜": { title: "Cœur Violet", desc: "T'es mystique... non t'es juste confus sur tes émotions." },
  "🖤": { title: "Cœur Noir", desc: "T'as plus de sentiments. C'est pas cool, c'est clinique." },
  "🤍": { title: "Cœur Blanc", desc: "Pur ? Non. Vide. Y'a juste rien à l'intérieur." },
  "💔": { title: "Cassé en Deux", desc: "T'es brisé. Mais t'as l'habitude. Ça fait moins mal à force." },
  "❤️‍🔥": { title: "Cœur en Feu", desc: "T'es brûlant... de honte. Ça compte aussi." },
  "💘": { title: "Flèche du Cupidon", desc: "Le tir est raté. La flèche a touché le mur. Comme tes drague." },
  "💝": { title: "Cadeau Empoisonné", desc: "T'offres ton cœur. C'est un piège. Tout le monde le sait." },
  "💖": { title: "Paillettes Cardiaques", desc: "Tu scintilles d'amour. C'est des cristaux de solitude en fait." },
  "💗": { title: "Cœur qui Grossit", desc: "Ton cœur grandit... c'est l'insuffisance cardiaque. Va chez le médecin." },
  "💓": { title: "Palpitations", desc: "Ton cœur s'accélère. C'est pas l'amour, c'est la caféine." },
  "💞": { title: "Cœurs Tournants", desc: "Tu tournes en rond émotionnellement. Le manège s'arrête jamais." },
  "💕": { title: "Deux Petits Cœurs", desc: "T'as le cœur double. Bipolaire quoi." },
  "💯": { title: "100% Menteur", desc: "Tu dis toujours la vérité. Selon toi. Personne d'autre." },
  "💢": { title: "Veine qui Pète", desc: "T'es tellement en colère que tes veines explosent. Va voir un cardiologue." },
  "💨": { title: "Péteur Professionnel", desc: "Tu cours vite... pour fuir tes responsabilités. Et ça pue." },

  // 🏠 Lieux & Nature
  "🏠": { title: "Casa del Caos", desc: "Ta maison c'est un champ de bataille. Même les mouches veulent pas y rester." },
  "🏡": { title: "Pavillon de la Honte", desc: "T'as une maison mais pas de vie. Le jardin est aussi mort que ton âme." },
  "🏰": { title: "Château de Cartes", desc: "Ta vie est un château de cartes. Un souffle et tout s'effondre." },
  "🗼": { title: "Tour d'Ivoire", desc: "T'es haut perché mais tout seul. La vue est belle, la solitude moins." },
  "🌋": { title: "Volcan Émotionnel", desc: "Tu rentres tout jusqu'à ce que ça pète. Et là c'est Hiroshima." },
  "🏔️": { title: "Montagne de Stress", desc: "T'es stressé comme si t'allais gravir l'Everest. T'es juste au bureau." },
  "⛰️": { title: "Colline des Difficultés", desc: "Chaque problème c'est une montagne pour toi. T'es dramatique." },
  "🌊": { title: "Tsunami Social", desc: "Tu débarques et tu noies tout le monde. De ta présence." },
  "🏝️": { title: "Île Déserte", desc: "T'es seul sur ton île. Personne vient te chercher. Normal." },
  "🌅": { title: "Coucher de Soleil", desc: "Tu brilles à la fin de la journée. Le reste du temps t'es gris." },
  "🌈": { title: "Arc-en-Ciel Délavé", desc: "T'es censé être coloré mais t'es juste flou et fatigué." },
  "☀️": { title: "Soleil de Plomb", desc: "Tu brûles tout le monde. C'est pas de la passion, c'est de l'agacement." },
  "🌙": { title: "Lune de Miel (Ratée)", desc: "Ta lune de miel c'était un week-end à Dunkerque. Le rêve." },
  "❄️": { title: "Glacial Social", desc: "Tu refroidis l'ambiance juste en entrant dans la pièce." },
  "🌪️": { title: "Tornade de Merde", desc: "Tu laisses un sillage de chaos partout où tu passes." },
  "💧": { title: "Goutte d'Eau", desc: "T'es insignifiant mais t'es partout. Comme une fuite." },
  "🍀": { title: "Trèfle à 3 Feuilles", desc: "T'as pas de chance. Le 4ème pétale t'es tombé dessus." },
  "🌸": { title: "Fleur Fanée", desc: "T'étais beau au printemps. Maintenant c'est l'automne de ta vie." },

  // 🚀 Objets & Transport
  "🚀": { title: "Fusée en Carton", desc: "Tu décolles jamais. T'es juste un tuyau avec des rêves." },
  "🛸": { title: "OVNI Social", desc: "Personne sait ce que tu fais là. Toi non plus d'ailleurs." },
  "🚁": { title: "Hélicoptère Parental", desc: "Tu surveilles tout le monde. C'est pas de l'amour, c'est de la paranoïa." },
  "🏎️": { title: "Formule 1 du Parking", desc: "Tu roules vite... au parking. Sur la route t'es à 40." },
  "🏍️": { title: "Moto de Papa", desc: "Tu fais vroum vroum mais t'as un scooter. Le rêve américain." },
  "🛵": { title: "Scooter de la Honte", desc: "T'as un scooter. C'est tout. C'est déjà beaucoup." },
  "🚲": { title: "Vélo de l'Enfer", desc: "Tu pédales dans la semoule. T'avances pas et t'es fatigué." },
  "🛴": { title: "Trotinette de Luxe", desc: "T'as une trottinette électrique. T'es pas riche, t'es juste paresseux." },
  "🛹": { title: "Skate Raté", desc: "Tu tombes à chaque trick. Mais t'insistes. C'est beau et pathétique." },
  "🎿": { title: "Ski du Dimanche", desc: "Tu skues sur du plat. C'est pas du ski, c'est de la marche avec des bâtons." },
  "📱": { title: "Téléphone Cassé", desc: "T'es toujours sur ton tel. T'as le cou d'un dinosaure. Évolue." },
  "💻": { title: "Informaticien du Dimanche", desc: "Tu redémarres les PC de ta famille. C'est ton seul skill social." },

  // 🤝 Geste & Mains
  "🤝": { title: "Poignée de Main Molle", desc: "Ta poignée de main c'est comme toi : molle et sans conviction." },
  "👍": { title: "Pouce Vers le Haut", desc: "T'approuves tout. Même la merde. T'es pas positif, t'es passif." },
  "👎": { title: "Pouce Vers le Bas", desc: "Tu critiques tout. Même ce qui est bien. T'es insupportable." },
  "👊": { title: "Coup de Poing Raté", desc: "Tu frappes le vide. Comme dans ta vie professionnelle." },
  "✊": { title: "Poing Levé", desc: "Tu résistes... à la sobriété. T'es un combattant du bar." },
  "🤛": { title: "Bump Raté", desc: "Tu tends le poing, personne le tape. Awkward. Toujours." },
  "🤜": { title: "Droit du Vide", desc: "Tu frappes fort... dans le vide. Tes ennemis sont imaginaires." },
  "👏": { title: "Applaudissement Sarcastique", desc: "Tu applaudis mais c'est ironique. Tout le monde le sait." },
  "🙌": { title: "Mains en l'Air", desc: "Tu lèves les mains. C'est pas la joie, c'est l'abandon." },
  "👐": { title: "Mains Ouvertes", desc: "Tu reçois rien parce que t'offres rien. L'équilibre de l'univers." },
  "🤲": { title: "Mendiant Social", desc: "Tu tends les mains pour tout. De l'attention, de l'amour, des clopes." },
  "🫶": { title: "Cœur des Mains", desc: "Tu fais le cœur avec tes doigts. C'est mignon. C'est tout." },
  "🫰": { title: "Snap de Rien", desc: "Tu claque des doigts et rien ne se passe. Comme d'habitude." },
  "🤞": { title: "Doigts Croisés", desc: "Tu croises les doigts en espérant. Spoiler : ça marche jamais." },
  "✌️": { title: "Victoire de Pacotille", desc: "Tu fais le V mais t'as rien gagné. C'est le symbole de ta vie." },
  "🤟": { title: "Je t'aime (Non)", desc: "Tu fais signe que t'aimes. Personne te croit. Normal." },
  "🤘": { title: "Rock'n'Roll du Dimanche", desc: "Tu fais le cornu mais t'écoutes du Jul. Traître." },
  "👌": { title: "OK Boomer", desc: "Tout va bien. Selon toi. Le reste du monde est en feu." },
  "🤌": { title: "Mamma Mia", desc: "Tu gesticules avec tes mains. C'est pas de l'expressivité, c'est de l'agitation." },
  "🤏": { title: "Petit Geste", desc: "Tu fais le minimum. Toujours. Et encore, c'est beaucoup te demander." },
  "👈": { title: "Pointe le Voisin", desc: "Tu montres les autres. C'est jamais ta faute. Toujours la leur." },
  "👉": { title: "Pointe le Vide", desc: "Tu montres dans le vide. Personne suit. Comme tes idées." },
  "👆": { title: "Pointe le Ciel", desc: "Tu vises le haut. Tu touches le bas. La gravité de ta vie." },
  "👇": { title: "Pointe le Sol", desc: "Tu regardes en bas. C'est là que t'as laissé tes ambitions." },
  "☝️": { title: "Index Autoritaire", desc: "Tu lèves le doigt pour parler. Personne écoute. Continue." },
  "✋": { title: "Stop la Discussion", desc: "Tu coupes la parole. C'est pas de l'autorité, c'est de l'impolitesse." },
  "🤚": { title: "Main Levée (Ignorée)", desc: "Tu lèves la main en classe. Le prof te voit pas. Comme d'habitude." },
  "🖐️": { title: "High Five Raté", desc: "Tu tends la main, personne la tape. T'es seul. Toujours." },
  "🖖": { title: "Vulcain Dépressif", desc: "Live long and prosper... mais en souffrant. C'est ta devise." },
  "👋": { title: "Au Revoir Personne", desc: "Tu fais coucou mais y'a personne. T'es seul dans ta tête." },
};

const EMOJI_SUGGESTIONS = Object.keys(BADGE_SUGGESTIONS);

export default function BadgesPage() {
  const [badges, setBadges] = useState<CustomBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState("");
  const [emoji, setEmoji] = useState("🏅");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedBadgeId, setExpandedBadgeId] = useState<string | null>(null);
  const { currentParticipant, participants, isAdmin } = useAuth();

  useEffect(() => {
    let mounted = true;

    async function fetchBadges() {
      const data = await getAllBadges();
      if (!mounted) return;
      setBadges(data);
      setLoading(false);
    }
    fetchBadges();

    // Realtime
    const existingChannel = supabase.getChannels().find(
      (ch) => ch.topic === "realtime:badges-realtime"
    );
    if (existingChannel) supabase.removeChannel(existingChannel);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (supabase as any)
      .channel("badges-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "custom_badges" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        () => {
          if (mounted) fetchBadges();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAward = async () => {
    if (!selectedParticipant || !title.trim() || !currentParticipant) return;
    setSubmitting(true);
    const success = await awardBadge({
      participant_id: selectedParticipant,
      awarded_by: currentParticipant.id,
      emoji: emoji || "🏅",
      title: title.trim(),
      description: description.trim() || undefined,
    });
    if (success) {
      setShowForm(false);
      setSelectedParticipant("");
      setEmoji("🏅");
      setTitle("");
      setDescription("");
    }
    setSubmitting(false);
  };

  const handleDelete = async (badgeId: string) => {
    await deleteBadge(badgeId);
  };

  // Group badges by participant
  const badgesByParticipant = new Map<string, CustomBadge[]>();
  for (const badge of badges) {
    const existing = badgesByParticipant.get(badge.participant_id) || [];
    existing.push(badge);
    badgesByParticipant.set(badge.participant_id, existing);
  }

  // Sort participants: those with badges first, then alphabetically
  const sortedParticipants = [...participants].sort((a, b) => {
    const aBadges = badgesByParticipant.get(a.id)?.length || 0;
    const bBadges = badgesByParticipant.get(b.id)?.length || 0;
    if (bBadges !== aBadges) return bBadges - aBadges;
    return a.name.localeCompare(b.name);
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold">
            🏅 Badges
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Les médailles de gloire (et de honte) du Cros-Chella
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {badges.length} badge{badges.length !== 1 ? "s" : ""} décerné{badges.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Admin: Award button */}
        {isAdmin && !showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="w-full mb-6 bg-gradient-to-r from-primary to-accent text-primary-foreground"
          >
            <Plus className="w-4 h-4 mr-2" />
            Décerner un badge
          </Button>
        )}

        {/* Admin: Award form */}
        {isAdmin && showForm && (
          <Card className="mb-6 glass border-primary/30">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">🏅 Décerner un badge</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Participant selector */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Pour qui ?
                </label>
                <select
                  value={selectedParticipant}
                  onChange={(e) => setSelectedParticipant(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Choisir un pote...</option>
                  {participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.emoji_avatar || "👤"} {p.pseudo || p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Emoji picker */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Emoji
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {EMOJI_SUGGESTIONS.map((e) => (
                    <button
                      key={e}
                      onClick={() => setEmoji(e)}
                      className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                        emoji === e
                          ? "bg-primary/20 ring-2 ring-primary scale-110"
                          : "bg-secondary hover:bg-secondary/80"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
                <Input
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  placeholder="Ou tape un emoji..."
                  className="text-center text-lg"
                  maxLength={4}
                />
                {/* Suggestion preview */}
                {BADGE_SUGGESTIONS[emoji] && (
                  <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{emoji}</span>
                      <span className="text-yellow-300 font-bold text-sm">
                        {BADGE_SUGGESTIONS[emoji].title}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs italic leading-relaxed">
                      💡 {BADGE_SUGGESTIONS[emoji].desc}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setTitle(BADGE_SUGGESTIONS[emoji].title);
                        setDescription(BADGE_SUGGESTIONS[emoji].desc);
                      }}
                      className="mt-2 text-[11px] text-yellow-400/80 hover:text-yellow-300 underline underline-offset-2 transition-colors"
                    >
                      ✨ Utiliser cette suggestion
                    </button>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Titre du badge
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Boss du billard, Roi de la grillade..."
                  maxLength={50}
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Description <span className="text-muted-foreground">(optionnel)</span>
                </label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Pour avoir raté sa bille de finale à 30cm du trou"
                  maxLength={200}
                />
              </div>

              <Button
                onClick={handleAward}
                disabled={!selectedParticipant || !title.trim() || submitting}
                className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Award className="w-4 h-4 mr-2" />
                )}
                Décerner ce badge !
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Badges by participant */}
        <div className="space-y-4">
          {sortedParticipants.map((participant) => {
            const participantBadges = badgesByParticipant.get(participant.id) || [];
            if (participantBadges.length === 0 && !isAdmin) return null;

            return (
              <Card key={participant.id} className="glass">
                <CardContent className="p-4">
                  {/* Participant header */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{participant.emoji_avatar || "👤"}</span>
                    <div>
                      <h3 className="font-bold">{participant.pseudo || participant.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {participantBadges.length} badge{participantBadges.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  {/* Badges grid */}
                  {participantBadges.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {participantBadges.map((badge) => {
                        const isExpanded = expandedBadgeId === badge.id;
                        return (
                        <div
                          key={badge.id}
                          className="relative flex items-center gap-1.5 bg-secondary/60 rounded-full pl-2 pr-3 py-1.5 hover:bg-secondary transition-colors cursor-pointer"
                          onClick={() => setExpandedBadgeId(isExpanded ? null : badge.id)}
                        >
                          <span className="text-lg">{badge.emoji}</span>
                          <span className="text-xs font-medium">{badge.title}</span>

                          {/* Admin: delete button */}
                          {isAdmin && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(badge.id); }}
                              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}

                          {/* Tooltip on click/tap (mobile-friendly) */}
                          {badge.description && isExpanded && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover border border-border rounded-lg text-xs max-w-[220px] whitespace-normal text-center shadow-lg z-20">
                              {badge.description}
                              <div className="text-[10px] text-muted-foreground mt-1">
                                Par {badge.awarder?.pseudo || badge.awarder?.name || "Admin"}
                              </div>
                            </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Aucun badge pour l&apos;instant...
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
