import type { DrinkGroup, DrinkType } from "../types/domain";

export interface Criterion {
  key: string;
  label: string;
  /** Percent. Weights in a group sum to 100. */
  weight: number;
}

export const SCORE_MIN = 0;
export const SCORE_MAX = 10;

export const TYPE_TO_GROUP: Record<DrinkType, DrinkGroup> = {
  red: "wine",
  white: "wine",
  rose: "wine",
  sparkling: "wine",
  port: "port",
  gin: "gin",
  other: "other",
};

export const CRITERIA: Record<DrinkGroup, readonly Criterion[]> = {
  wine: [
    { key: "aroma", label: "Аромат", weight: 20 },
    { key: "palate", label: "Смак і баланс", weight: 35 },
    { key: "finish", label: "Післясмак", weight: 20 },
    { key: "again", label: "Випив би ще", weight: 25 },
  ],
  port: [
    { key: "aroma", label: "Аромат", weight: 20 },
    { key: "palate", label: "Смак (солодкість проти спирту)", weight: 30 },
    { key: "finish", label: "Післясмак", weight: 25 },
    { key: "again", label: "Випив би ще", weight: 25 },
  ],
  gin: [
    { key: "botanicals", label: "Ботаніка в ароматі", weight: 25 },
    { key: "clean", label: "Чистий смак", weight: 25 },
    { key: "mixing", label: "З тоніком чи в коктейлі", weight: 25 },
    { key: "smooth", label: "М'якість і післясмак", weight: 25 },
  ],
  other: [
    { key: "aroma", label: "Аромат", weight: 25 },
    { key: "palate", label: "Смак", weight: 35 },
    { key: "finish", label: "Післясмак", weight: 20 },
    { key: "again", label: "Випив би ще", weight: 20 },
  ],
};

export function groupOf(type: DrinkType): DrinkGroup {
  return TYPE_TO_GROUP[type];
}

export function criteriaFor(type: DrinkType): readonly Criterion[] {
  return CRITERIA[TYPE_TO_GROUP[type]];
}
