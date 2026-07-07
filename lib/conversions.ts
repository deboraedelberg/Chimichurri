/**
 * Static unit-conversion table.
 *
 * Units are normalized to two base dimensions:
 *  - mass:   grams (g)
 *  - volume: milliliters (ml)
 *
 * Conversions are only possible within the same dimension
 * (you can't convert grams to cups without a density).
 */

export type Dimension = "mass" | "volume" | "count";

export interface UnitDef {
  /** canonical key, e.g. "g" */
  key: string;
  label: string;
  dimension: Dimension;
  /** multiplier to the dimension's base unit (g or ml) */
  toBase: number;
}

export const UNITS: Record<string, UnitDef> = {
  // mass (base: g)
  g: { key: "g", label: "g", dimension: "mass", toBase: 1 },
  kg: { key: "kg", label: "kg", dimension: "mass", toBase: 1000 },
  oz: { key: "oz", label: "oz", dimension: "mass", toBase: 28.3495 },
  lb: { key: "lb", label: "lb", dimension: "mass", toBase: 453.592 },

  // volume (base: ml)
  ml: { key: "ml", label: "ml", dimension: "volume", toBase: 1 },
  l: { key: "l", label: "l", dimension: "volume", toBase: 1000 },
  cup: { key: "cup", label: "taza", dimension: "volume", toBase: 236.588 },
  tbsp: { key: "tbsp", label: "cda", dimension: "volume", toBase: 14.7868 },
  tsp: { key: "tsp", label: "cdta", dimension: "volume", toBase: 4.92892 },
  floz: { key: "floz", label: "fl oz", dimension: "volume", toBase: 29.5735 },

  // count-ish units — never converted, only scaled
  unit: { key: "unit", label: "unidad", dimension: "count", toBase: 1 },
  pinch: { key: "pinch", label: "pizca", dimension: "count", toBase: 1 },
  clove: { key: "clove", label: "diente", dimension: "count", toBase: 1 },
  slice: { key: "slice", label: "rebanada", dimension: "count", toBase: 1 },
  bunch: { key: "bunch", label: "manojo", dimension: "count", toBase: 1 },
};

export const UNIT_KEYS = Object.keys(UNITS);

/** Flat "from->to" table, generated from UNITS (kept for API compatibility). */
export const CONVERSIONS: Record<string, number> = (() => {
  const table: Record<string, number> = {};
  for (const from of Object.values(UNITS)) {
    for (const to of Object.values(UNITS)) {
      if (from.key === to.key) continue;
      if (from.dimension !== to.dimension || from.dimension === "count") continue;
      table[`${from.key}->${to.key}`] = from.toBase / to.toBase;
    }
  }
  return table;
})();

export function canConvert(from: string, to: string): boolean {
  const f = UNITS[from];
  const t = UNITS[to];
  return !!f && !!t && f.dimension === t.dimension && f.dimension !== "count";
}

/** Convert an amount between units. Returns null if the conversion is impossible. */
export function convert(amount: number, from: string, to: string): number | null {
  if (from === to) return amount;
  if (!canConvert(from, to)) return null;
  const factor = UNITS[from].toBase / UNITS[to].toBase;
  return amount * factor;
}

/** Units that share a dimension with `unit` (including itself) — used for the convert dropdown. */
export function compatibleUnits(unit: string): string[] {
  const def = UNITS[unit];
  if (!def || def.dimension === "count") return [unit];
  return Object.values(UNITS)
    .filter((u) => u.dimension === def.dimension)
    .map((u) => u.key);
}

/**
 * Pick a friendlier unit for large/small amounts, e.g. 1500 g -> 1.5 kg.
 * Used by the shopping list consolidator.
 */
export function normalizeForDisplay(amount: number, unit: string): { amount: number; unit: string } {
  const def = UNITS[unit];
  if (!def) return { amount, unit };
  if (def.dimension === "mass") {
    const grams = amount * def.toBase;
    if (grams >= 1000) return { amount: round2(grams / 1000), unit: "kg" };
    return { amount: round2(grams), unit: "g" };
  }
  if (def.dimension === "volume") {
    const ml = amount * def.toBase;
    if (ml >= 1000) return { amount: round2(ml / 1000), unit: "l" };
    return { amount: round2(ml), unit: unit === "cup" || unit === "tbsp" || unit === "tsp" ? unit : "ml" };
  }
  return { amount: round2(amount), unit };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
