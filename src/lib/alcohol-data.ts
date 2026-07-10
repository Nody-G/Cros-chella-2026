// Liste exhaustive des alcools et boissons pour Cros-Chella
// Partagée entre profil, participants et page alcool

export interface AlcoholItem {
  value: string;
  label: string;
  emoji: string;
  group: string;
}

export const ALCOHOL_LIST: AlcoholItem[] = [
  // Bières
  { value: "biere_blonde", label: "Blonde", emoji: "🍺", group: "Bières" },
  { value: "biere_blanche", label: "Blanche", emoji: "🍺", group: "Bières" },
  { value: "biere_ambree", label: "Ambrée", emoji: "🍺", group: "Bières" },
  { value: "biere_brune", label: "Brune", emoji: "🍺", group: "Bières" },
  { value: "biere_ipa", label: "IPA", emoji: "🍺", group: "Bières" },
  { value: "biere_stout", label: "Stout", emoji: "🍺", group: "Bières" },
  { value: "biere_pils", label: "Pils", emoji: "🍺", group: "Bières" },
  { value: "biere_wheat", label: "Weissbier / Blanche de blé", emoji: "🍺", group: "Bières" },
  { value: "biere_sour", label: "Sour / Gose", emoji: "🍺", group: "Bières" },
  { value: "biere_lager", label: "Lager", emoji: "🍺", group: "Bières" },
  { value: "cider", label: "Cidre", emoji: "🍏", group: "Bières" },
  // Vins
  { value: "vin_rouge", label: "Rouge", emoji: "🍷", group: "Vins" },
  { value: "vin_blanc", label: "Blanc", emoji: "🍷", group: "Vins" },
  { value: "vin_rose", label: "Rosé", emoji: "🍷", group: "Vins" },
  { value: "vin_petillant", label: "Pétillant / Crémant", emoji: "🍷", group: "Vins" },
  { value: "champagne", label: "Champagne", emoji: "🥂", group: "Vins" },
  { value: "prosecco", label: "Prosecco", emoji: "🥂", group: "Vins" },
  { value: "porto", label: "Porto", emoji: "🍷", group: "Vins" },
  { value: "sangria", label: "Sangria", emoji: "🍷", group: "Vins" },
  // Spiritueux
  { value: "vodka", label: "Vodka", emoji: "🍸", group: "Spiritueux" },
  { value: "rhum_blanc", label: "Rhum blanc", emoji: "🥃", group: "Spiritueux" },
  { value: "rhum_ambre", label: "Rhum ambré / vieux", emoji: "🥃", group: "Spiritueux" },
  { value: "whisky", label: "Whisky / Bourbon", emoji: "🥃", group: "Spiritueux" },
  { value: "gin", label: "Gin", emoji: "🍸", group: "Spiritueux" },
  { value: "tequila", label: "Tequila", emoji: "🌵", group: "Spiritueux" },
  { value: "mezcal", label: "Mezcal", emoji: "🌵", group: "Spiritueux" },
  { value: "cognac", label: "Cognac / Armagnac", emoji: "🥃", group: "Spiritueux" },
  { value: "calvados", label: "Calvados", emoji: "🥃", group: "Spiritueux" },
  { value: "pastis", label: "Pastis / Anis", emoji: "🫗", group: "Spiritueux" },
  { value: "absinthe", label: "Absinthe", emoji: "🫗", group: "Spiritueux" },
  { value: "sake", label: "Saké", emoji: "🍶", group: "Spiritueux" },
  { value: "marc", label: "Marc / Grappa", emoji: "🥃", group: "Spiritueux" },
  { value: "eau_de_vie", label: "Eau-de-vie (poire, mirabelle…)", emoji: "🥃", group: "Spiritueux" },
  // Liqueurs
  { value: "limoncello", label: "Limoncello", emoji: "🍋", group: "Liqueurs" },
  { value: "baileys", label: "Baileys", emoji: "🥛", group: "Liqueurs" },
  { value: "kahlua", label: "Kahlúa", emoji: "☕", group: "Liqueurs" },
  { value: "amaretto", label: "Amaretto", emoji: "🍒", group: "Liqueurs" },
  { value: "cointreau", label: "Cointreau / Triple sec", emoji: "🍊", group: "Liqueurs" },
  { value: "aperol", label: "Aperol", emoji: "🟧", group: "Liqueurs" },
  { value: "campari", label: "Campari", emoji: "🟥", group: "Liqueurs" },
  { value: "jagermeister", label: "Jägermeister", emoji: "🦌", group: "Liqueurs" },
  { value: "sambuca", label: "Sambuca", emoji: "🫗", group: "Liqueurs" },
  { value: "chartreuse", label: "Chartreuse", emoji: "🫗", group: "Liqueurs" },
  { value: "herbes", label: "Liqueur de herbes", emoji: "🌿", group: "Liqueurs" },
  { value: "creme_cassis", label: "Crème de cassis", emoji: "🫐", group: "Liqueurs" },
  // Cocktails classiques
  { value: "mojito", label: "Mojito", emoji: "🍹", group: "Cocktails" },
  { value: "pina_colada", label: "Piña Colada", emoji: "🍹", group: "Cocktails" },
  { value: "margarita", label: "Margarita", emoji: "🍹", group: "Cocktails" },
  { value: "spritz", label: "Spritz (Aperol/Campari)", emoji: "🍹", group: "Cocktails" },
  { value: "caipirinha", label: "Caipirinha", emoji: "🍹", group: "Cocktails" },
  { value: "daiquiri", label: "Daiquiri", emoji: "🍹", group: "Cocktails" },
  { value: "cosmopolitan", label: "Cosmopolitan", emoji: "🍹", group: "Cocktails" },
  { value: "long_island", label: "Long Island", emoji: "🍹", group: "Cocktails" },
  { value: "negroni", label: "Negroni", emoji: "🍹", group: "Cocktails" },
  { value: "gin_tonic", label: "Gin Tonic", emoji: "🍹", group: "Cocktails" },
  { value: "bloody_mary", label: "Bloody Mary", emoji: "🍅", group: "Cocktails" },
  { value: "espresso_martini", label: "Espresso Martini", emoji: "☕", group: "Cocktails" },
  { value: "sex_on_beach", label: "Sex on the Beach", emoji: "🍹", group: "Cocktails" },
  { value: "tequila_sunrise", label: "Tequila Sunrise", emoji: "🌅", group: "Cocktails" },
  { value: "mojito_fraise", label: "Mojito Fraise", emoji: "🍓", group: "Cocktails" },
  // Sans alcool / Soft
  { value: "bierre_sans_alcool", label: "Bière sans alcool", emoji: "🚫", group: "Soft" },
  { value: "virgin_mojito", label: "Virgin Mojito", emoji: "🚫", group: "Soft" },
  { value: "jus_fruit", label: "Jus de fruits", emoji: "🧃", group: "Soft" },
  { value: "soda", label: "Soda / Soft drink", emoji: "🥤", group: "Soft" },
  { value: "eau", label: "Eau (on est responsable)", emoji: "💧", group: "Soft" },
  // Divers / Spécial
  { value: "wd40", label: "WD-40", emoji: "🛢️", group: "Divers / Spécial" },
];

// Quick lookup map
export const ALCOHOL_MAP: Record<string, AlcoholItem> = Object.fromEntries(
  ALCOHOL_LIST.map((a) => [a.value, a])
);

// Get unique groups
export const ALCOHOL_GROUPS = Array.from(new Set(ALCOHOL_LIST.map((a) => a.group)));
