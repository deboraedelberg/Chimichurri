/**
 * Importación de recetas desde una URL.
 *
 * La mayoría de los sitios de recetas publican datos estructurados
 * schema.org/Recipe en <script type="application/ld+json">. Acá los
 * extraemos y los mapeamos a nuestro modelo (ingredientes con
 * cantidad/unidad, pasos, tiempos, porciones, foto).
 */

export interface ImportedIngredient {
  item: string;
  amount: number;
  unit: string;
  heading?: boolean; // título de sección ("Tapitas", "Relleno")
}

export interface ImportedRecipe {
  name: string;
  description: string | null;
  image: string | null;
  servings: number | null;
  servingsUnit?: "porciones" | "unidades";
  credit?: string | null; // "Receta de la Babe Teresa"
  prepTime: number | null; // minutos
  cookTime: number | null; // minutos
  ingredients: ImportedIngredient[];
  steps: string[];
  sourceUrl: string;
}

/* ------------------------------ utilidades ------------------------------ */

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&#x27;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&lt;": "<",
  "&gt;": ">",
};

function cleanText(input: unknown): string {
  if (typeof input !== "string") return "";
  let text = input.replace(/<[^>]*>/g, " ");
  for (const [entity, char] of Object.entries(ENTITIES)) {
    text = text.split(entity).join(char);
  }
  return text.replace(/\s+/g, " ").trim();
}

/** "PT1H30M" -> 90 (minutos) */
function parseDuration(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const m = value.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m || (!m[1] && !m[2])) return null;
  return (Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0)) || null;
}

/** "4", "4 porciones", ["6 servings"] -> 4 / 6 */
function parseYield(value: unknown): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const m = String(raw ?? "").match(/\d+/);
  if (!m) return null;
  const n = Number(m[0]);
  return n >= 1 && n <= 100 ? n : null;
}

function parseImage(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return parseImage(value[0]);
  if (value && typeof value === "object" && "url" in value) {
    return parseImage((value as { url: unknown }).url);
  }
  return null;
}

/* --------------------------- parseo de cantidades --------------------------- */

const UNICODE_FRACTIONS: Record<string, number> = {
  "¼": 0.25, "½": 0.5, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3,
  "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875,
};

/** Palabras de unidad (es/en) -> clave de UNITS en lib/conversions.ts */
const UNIT_WORDS: Record<string, string> = {
  g: "g", gr: "g", grs: "g", gramo: "g", gramos: "g", gram: "g", grams: "g",
  kg: "kg", kilo: "kg", kilos: "kg", kilogramo: "kg", kilogramos: "kg",
  ml: "ml", cc: "ml", mililitro: "ml", mililitros: "ml",
  l: "l", lt: "l", litro: "l", litros: "l", liter: "l", liters: "l",
  taza: "cup", tazas: "cup", cup: "cup", cups: "cup",
  cda: "tbsp", cdas: "tbsp", cucharada: "tbsp", cucharadas: "tbsp",
  tbsp: "tbsp", tablespoon: "tbsp", tablespoons: "tbsp",
  cdta: "tsp", cdtas: "tsp", cucharadita: "tsp", cucharaditas: "tsp",
  tsp: "tsp", teaspoon: "tsp", teaspoons: "tsp",
  oz: "oz", onza: "oz", onzas: "oz", ounce: "oz", ounces: "oz",
  lb: "lb", lbs: "lb", libra: "lb", libras: "lb", pound: "lb", pounds: "lb",
  pizca: "pinch", pizcas: "pinch", pinch: "pinch", pinches: "pinch",
  diente: "clove", dientes: "clove", clove: "clove", cloves: "clove",
  rebanada: "slice", rebanadas: "slice", feta: "slice", fetas: "slice",
  slice: "slice", slices: "slice",
  atado: "bunch", atados: "bunch", manojo: "bunch", manojos: "bunch",
  bunch: "bunch", bunches: "bunch",
  unidad: "unit", unidades: "unit", u: "unit",
};

/** "1", "1.5", "1,5", "1/2", "½" -> número; null si no es cantidad */
function tokenToNumber(token: string): number | null {
  if (token in UNICODE_FRACTIONS) return UNICODE_FRACTIONS[token];
  // "1½"
  const uni = token.match(/^(\d+)([¼½¾⅓⅔⅛⅜⅝⅞])$/);
  if (uni) return Number(uni[1]) + UNICODE_FRACTIONS[uni[2]];
  // "1/2"
  const frac = token.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac && Number(frac[2]) !== 0) return Number(frac[1]) / Number(frac[2]);
  // "1.5" / "1,5"
  const num = token.replace(",", ".");
  if (/^\d+(\.\d+)?$/.test(num)) return Number(num);
  return null;
}

/** "200 g de harina" -> { item: "harina", amount: 200, unit: "g" } */
export function parseIngredient(raw: string): ImportedIngredient | null {
  const text = cleanText(raw);
  if (!text) return null;

  // "Harina leudante, cantidad necesaria" / "Sal, c/n" / "Pimienta a gusto" -> unidad C/N
  const cn = text.match(/^(.*?)[,:\s]*(?:\bcantidad necesaria\b|c\/n|\ba gusto\b)[.\s]*$/i);
  if (cn && cn[1].trim()) {
    return { item: cn[1].trim().replace(/[,:]$/, ""), amount: 1, unit: "cn" };
  }

  const tokens = text.split(/\s+/);
  let amount: number | null = null;
  let index = 0;

  const first = tokenToNumber(tokens[0] ?? "");
  if (first !== null) {
    amount = first;
    index = 1;
    // cantidades compuestas: "1 1/2", "1 ½"
    const second = tokenToNumber(tokens[1] ?? "");
    if (second !== null && second < 1) {
      amount += second;
      index = 2;
    }
  }

  let unit = "unit";
  const unitToken = (tokens[index] ?? "").toLowerCase().replace(/[.,]$/, "");
  if (amount !== null && unitToken in UNIT_WORDS) {
    unit = UNIT_WORDS[unitToken];
    index += 1;
  }

  // "de harina" -> "harina"
  if ((tokens[index] ?? "").toLowerCase() === "de") index += 1;

  const item = tokens.slice(index).join(" ").trim() || text;
  return { item, amount: amount ?? 1, unit };
}

function parseInstructions(value: unknown): string[] {
  const steps: string[] = [];
  const visit = (node: unknown) => {
    if (!node) return;
    if (typeof node === "string") {
      const text = cleanText(node);
      if (text) steps.push(text);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (typeof node === "object") {
      const obj = node as Record<string, unknown>;
      // HowToSection agrupa pasos en itemListElement
      if (obj.itemListElement) {
        visit(obj.itemListElement);
        return;
      }
      const text = cleanText(obj.text ?? obj.name);
      if (text) steps.push(text);
    }
  };
  visit(value);
  return steps;
}

/* ----------------------------- JSON-LD -> receta ----------------------------- */

function isRecipeNode(node: unknown): node is Record<string, unknown> {
  if (!node || typeof node !== "object") return false;
  const type = (node as Record<string, unknown>)["@type"];
  const types = Array.isArray(type) ? type : [type];
  return types.some((t) => typeof t === "string" && t.toLowerCase() === "recipe");
}

/** Busca recursivamente un nodo Recipe en el JSON-LD (incluye @graph y arrays). */
function findRecipeNode(node: unknown, depth = 0): Record<string, unknown> | null {
  if (depth > 4 || !node || typeof node !== "object") return null;
  if (isRecipeNode(node)) return node;
  const candidates = Array.isArray(node)
    ? node
    : Object.values(node as Record<string, unknown>);
  for (const child of candidates) {
    const found = findRecipeNode(child, depth + 1);
    if (found) return found;
  }
  return null;
}

export function parseRecipeFromHtml(html: string, sourceUrl: string): ImportedRecipe | null {
  const scripts = html.matchAll(
    /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );

  for (const match of scripts) {
    let data: unknown;
    try {
      data = JSON.parse(match[1].trim());
    } catch {
      continue;
    }

    const recipe = findRecipeNode(data);
    if (!recipe) continue;

    const name = cleanText(recipe.name);
    if (!name) continue;

    const ingredients = (Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient : [])
      .map((i) => parseIngredient(String(i)))
      .filter((i): i is ImportedIngredient => i !== null);

    const steps = parseInstructions(recipe.recipeInstructions);

    return {
      name,
      description: cleanText(recipe.description) || null,
      image: parseImage(recipe.image),
      servings: parseYield(recipe.recipeYield),
      prepTime: parseDuration(recipe.prepTime),
      cookTime: parseDuration(recipe.cookTime) ?? parseDuration(recipe.totalTime),
      ingredients,
      steps,
      sourceUrl,
    };
  }

  return null;
}

/* --------------------------- texto libre -> receta --------------------------- */

const ING_HEADER = /^ingredientes?\b/i;
const STEP_HEADER = /^(preparaci[oó]n|pasos?|instrucciones|elaboraci[oó]n|procedimiento)\b/i;
const BULLET = /^[-*•·▪○●➤>]+\s*/;

/** "para 48 knishes" / "(para 4 porciones)" -> rinde + tipo */
function parseYieldFromText(line: string): { servings: number; unit: "porciones" | "unidades" } | null {
  const m = line.match(/\bpara\s+(\d+)\s*([a-záéíóúñ]+)?/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (n < 1 || n > 100) return null;
  const word = (m[2] ?? "").toLowerCase();
  const isPorciones = /porci|persona|comensal|racion/.test(word);
  return { servings: n, unit: isPorciones ? "porciones" : "unidades" };
}

/**
 * Parsea texto libre de una receta (OCR o pegado a mano) con el formato
 * típico "Nombre / Ingredientes / Preparación". Devuelve null si no se
 * encontró nada estructurado.
 */
export function parseRecipeText(raw: string): ImportedRecipe | null {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;

  let name = "";
  let credit: string | null = null;
  let servings: number | null = null;
  let servingsUnit: "porciones" | "unidades" | undefined;
  const descLines: string[] = [];
  const ingredients: ImportedIngredient[] = [];
  const steps: string[] = [];
  let section: "pre" | "ing" | "steps" = "pre";

  for (const line of lines) {
    if (ING_HEADER.test(line)) {
      section = "ing";
      const y = parseYieldFromText(line); // "Ingredientes (para 48 knishes)"
      if (y) {
        servings = y.servings;
        servingsUnit = y.unit;
      }
      continue;
    }
    if (STEP_HEADER.test(line)) {
      section = "steps";
      continue;
    }

    if (section === "pre") {
      const creditMatch = line.match(/^\(?\s*receta de\s+(.+?)\)?\.?$/i);
      if (creditMatch) {
        credit = creditMatch[1].trim();
        continue;
      }
      const y = parseYieldFromText(line);
      if (y && line.length < 40) {
        servings = y.servings;
        servingsUnit = y.unit;
        continue;
      }
      if (!name) {
        name = line;
        continue;
      }
      descLines.push(line);
    } else if (section === "ing") {
      const clean = line.replace(BULLET, "").trim();
      if (!clean) continue;
      // "Tapitas:" -> título de sección dentro de los ingredientes
      if (/^.{2,40}:$/.test(clean)) {
        ingredients.push({ item: clean.slice(0, -1).trim(), amount: 0, unit: "unit", heading: true });
        continue;
      }
      const ing = parseIngredient(clean);
      if (ing) ingredients.push(ing);
    } else {
      const clean = line.replace(BULLET, "").replace(/^\d+\s*[.)]\s*/, "").trim();
      if (clean) steps.push(clean);
    }
  }

  if (ingredients.length === 0 && steps.length === 0) return null;

  return {
    name,
    description: descLines.join(" ") || null,
    image: null,
    servings,
    servingsUnit,
    credit,
    prepTime: null,
    cookTime: null,
    ingredients,
    steps,
    sourceUrl: "",
  };
}

/* ------------------------------- guard de URL ------------------------------- */

const BLOCKED_HOSTS = /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)|(\.local|\.internal)$/i;

/** Solo http(s) hacia hosts públicos — evita que el server pida URLs internas. */
export function isSafeUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = url.hostname;
    if (BLOCKED_HOSTS.test(host)) return false;
    if (host === "[::1]" || !host.includes(".")) return false;
    return true;
  } catch {
    return false;
  }
}
