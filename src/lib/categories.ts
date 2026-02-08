// Shared question categories for Futurykon

export const CATEGORIES = [
  "AGI i Superinteligencja",
  "Modele językowe",
  "Robotyka",
  "AI w medycynie",
  "Autonomiczne pojazdy",
  "AI w biznesie",
  "Regulacje AI",
  "Inne"
] as const;

export type Category = typeof CATEGORIES[number];
