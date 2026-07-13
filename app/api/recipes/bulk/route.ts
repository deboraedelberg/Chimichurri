import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recipeSchema, RECIPE_INCLUDE } from "@/lib/recipes";
import { CATEGORY_VALUES } from "@/lib/categories";

/**
 * Carga masiva TEMPORAL: recibe un array JSON de recetas (o { recipes: [...] }),
 * saltea las que ya existen (comparando por título, sin distinguir mayúsculas)
 * y crea el resto. Acepta el mismo formato que POST /api/recipes por receta.
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

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const list = Array.isArray(body)
    ? body
    : Array.isArray((body as { recipes?: unknown[] })?.recipes)
      ? (body as { recipes: unknown[] }).recipes
      : null;
  if (!list) {
    return NextResponse.json(
      { error: "El archivo debe ser un array JSON de recetas" },
      { status: 400 }
    );
  }

  const existing = await prisma.recipe.findMany({ select: { name: true } });
  const seen = new Set(existing.map((r) => r.name.trim().toLowerCase()));

  const created: string[] = [];
  const skipped: string[] = [];
  const errors: { name: string; error: string }[] = [];

  for (const [i, raw] of list.entries()) {
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
