import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a scaled ingredient amount for display: 0.3333 -> "⅓", 1.5 -> "1½", 2 -> "2" */
export function formatAmount(amount: number): string {
  if (amount === 0) return "0";

  const whole = Math.floor(amount);
  const frac = amount - whole;

  const FRACTIONS: [number, string][] = [
    [1 / 8, "⅛"],
    [1 / 4, "¼"],
    [1 / 3, "⅓"],
    [3 / 8, "⅜"],
    [1 / 2, "½"],
    [5 / 8, "⅝"],
    [2 / 3, "⅔"],
    [3 / 4, "¾"],
    [7 / 8, "⅞"],
  ];

  if (frac > 0.01) {
    for (const [value, glyph] of FRACTIONS) {
      if (Math.abs(frac - value) < 0.02) {
        return whole > 0 ? `${whole}${glyph}` : glyph;
      }
    }
    // No nice fraction: round to 2 decimals, strip trailing zeros
    return String(Math.round(amount * 100) / 100);
  }

  return String(whole);
}

/** "1h 25m" style display for minutes */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** "mm:ss" display for seconds */
export function formatSeconds(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
