import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recipeSchema, RECIPE_INCLUDE } from "@/lib/recipes";
import { CATEGORY_VALUES } from "@/lib/categories";
import { parseRecipesFromText, type ImportedRecipe } from "@/lib/import";

/**
 * Carga masiva TEMPORAL: recibe un archivo (PDF, Word .docx, TXT o JSON)
 * con varias recetas, saltea las que ya existen (comparando por título,
 * sin distinguir mayúsculas) y crea el resto.
 */

/** Tolera exports viejos: descarta categorías/unidades que ya no existen */
function normalize(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const entry = { ...(raw as Record<string, unknown>) };
  if (
    typeof entry.category === "string" &&
    !(CATEGORY_VALUES as readonly string[]).includes(entry.category)
  ) {
    entry.category = null;
  }
  if (entry.servings_unit !== "porciones" && entry.servings_unit !== "unidades") {
    delete entry.servings_unit;
  }
  return entry;
}

function importedToPayload(recipe: ImportedRecipe): unknown {
  return {
    name: recipe.name,
    description: recipe.description,
    credit: recipe.credit ?? null,
    servings: recipe.servings ?? 4,
    servings_unit: recipe.servingsUnit ?? "porciones",
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    tags: [],
    ingredients: recipe.ingredients,
    steps: recipe.steps.map((content) => ({ content })),
  };
}

function listFromJson(json: unknown): unknown[] | null {
  if (Array.isArray(json)) return json;
  const recipes = (json as { recipes?: unknown })?.recipes;
  return Array.isArray(recipes) ? recipes : null;
}

/** Lee el body (archivo multipart o JSON directo) y devuelve las recetas crudas */
async function readEntries(req: Request): Promise<unknown[] | { error: string }> {
  const contentType = req.headers.get("content-type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    const body = await req.json().catch(() => null);
    return listFromJson(body) ?? { error: "El body debe ser un array JSON de recetas" };
  }

  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) {
    return { error: "Falta el archivo" };
  }
  const name = file.name.toLowerCase();

  if (name.endsWith(".json")) {
    let json: unknown;
    try {
      json = JSON.parse(await file.text());
    } catch {
      return { error: "El archivo no es un JSON válido" };
    }
    return listFromJson(json) ?? { error: "El JSON debe ser un array de recetas" };
  }

  let text: string;
  if (name.endsWith(".pdf")) {
    const pdf = (await import("pdf-parse/lib/pdf-parse.js")).default;
    const parsed = await pdf(Buffer.from(await file.arrayBuffer()));
    text = parsed.text;
  } else if (name.endsWith(".docx")) {
    const result = await mammoth.extractRawText({
      buffer: Buffer.from(await file.arrayBuffer()),
    });
    text = result.value;
  } else if (name.endsWith(".txt") || name.endsWith(".md")) {
    text = await file.text();
  } else if (name.endsWith(".doc")) {
    return { error: "Los .doc viejos no están soportados — guardalo como .docx o PDF" };
  } else {
    return { error: "Formato no soportado: PDF, Word (.docx), TXT o JSON" };
  }

  const recipes = parseRecipesFromText(text);
  if (recipes.length === 0) {
    return {
      error:
        "No se encontraron recetas en el documento. Cada receta necesita una sección \"Ingredientes\".",
    };
  }
  return recipes.map(importedToPayload);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const entries = await readEntries(req);
  if (!Array.isArray(entries)) {
    return NextResponse.json({ error: entries.error }, { status: 400 });
  }

  const existing = await prisma.recipe.findMany({ select: { name: true } });
  const seen = new Set(existing.map((r) => r.name.trim().toLowerCase()));

  const created: string[] = [];
  const skipped: string[] = [];
  const errors: { name: string; error: string }[] = [];

  for (const [i, raw] of entries.entries()) {
    const parsed = recipeSchema.safeParse(normalize(raw));
    const label =
      (typeof (raw as { name?: unknown })?.name === "string" &&
        (raw as { name: string }).name) ||
      `Receta #${i + 1}`;
    if (!parsed.success) {
      errors.push({
        name: label,
        error: parsed.error.errors[0]?.message ?? "Datos inválidos",
      });
      continue;
    }

    const key = parsed.data.name.trim().toLowerCase();
    if (seen.has(key)) {
      skipped.push(parsed.data.name);
      continue;
    }

    const { ingredients, steps, ...data } = parsed.data;
    try {
      await prisma.recipe.create({
        data: {
          ...data,
          user_id: session.user.id,
          ingredients: { create: ingredients },
          steps: {
            create: steps.map((s, order) => ({
              order: order + 1,
              content: s.content,
              time: s.time ?? null,
              heading: s.heading,
              photo_url: s.photo_url ?? null,
            })),
          },
        },
        include: RECIPE_INCLUDE,
      });
      seen.add(key);
      created.push(parsed.data.name);
    } catch {
      errors.push({ name: label, error: "No se pudo guardar" });
    }
  }

  return NextResponse.json({ created, skipped, errors });
}
