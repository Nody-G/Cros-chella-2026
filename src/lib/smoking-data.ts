// Liste des options de tabac/fumeur pour Cros-Chella
// Partagée entre profil, participants et page alcool

export interface SmokingItem {
  value: string;
  label: string;
  emoji: string;
}

export const SMOKING_LIST: SmokingItem[] = [
  { value: "cigarette", label: "Cigarette", emoji: "🚬" },
  { value: "cigarillo", label: "Cigarillo", emoji: "🚬" },
  { value: "cigare", label: "Cigare", emoji: "🥢" },
  { value: "vape", label: "Vape / Puff", emoji: "💨" },
  { value: "cbd", label: "CBD", emoji: "🌿" },
  { value: "cannabis", label: "Cannabis", emoji: "🍁" },
];

export function getSmokingLabel(value: string): string {
  return SMOKING_LIST.find((s) => s.value === value)?.label || value;
}

export function getSmokingEmoji(value: string): string {
  return SMOKING_LIST.find((s) => s.value === value)?.emoji || "🚬";
}
