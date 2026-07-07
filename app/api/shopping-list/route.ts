import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UNITS, normalizeForDisplay } from "@/lib/conversions";
import type { ShoppingListItem } from "@/lib/types";

const listSchema = z.object({
  recipeIds: z.array(z.string()).min(1, "Selecciona al menos una receta").max(50),
  /** optional per-recipe servings override for scaling */
  servings: z.record(z.string(), z.coerce.number().int().min(1).max(100)).optional(),
});

/**
 * POST /api/shopping-list
 * Consolidates ingredients across the selected recipes:
 * same item + same dimension (mass/volume) are summed in a common base unit;
 * count units are summed only when the unit matches exactly.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = listSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  const recipes = await prisma.recipe.findMany({
    where: {
      id: { in: parsed.data.recipeIds },
      OR: [
        { user_id: session.user.id },
        { shares: { some: { shared_with_id: session.user.id } } },
      ],
    },
    include: { ingredients: true },
  });

  if (recipes.length === 0) {
    return NextResponse.json({ error: "No se seleccionaron recetas accesibles" }, { status: 404 });
  }

  // key: normalized item name + dimension (or exact unit for count units)
  const buckets = new Map<
    string,
    { item: string; baseAmount: number; baseUnit: string; recipes: Set<string> }
  >();

  for (const recipe of recipes) {
    const targetServings = parsed.data.servings?.[recipe.id] ?? recipe.servings;
    const factor = targetServings / recipe.servings;

    for (const ing of recipe.ingredients) {
      const def = UNITS[ing.unit];
      const itemKey = ing.item.trim().toLowerCase();
      const scaled = ing.amount * factor;

      let key: string;
      let baseAmount: number;
      let baseUnit: string;

      if (def && def.dimension !== "count") {
        key = `${itemKey}::${def.dimension}`;
        baseAmount = scaled * def.toBase; // grams or ml
        baseUnit = def.dimension === "mass" ? "g" : "ml";
      } else {
        key = `${itemKey}::${ing.unit}`;
        baseAmount = scaled;
        baseUnit = ing.unit;
      }

      const existing = buckets.get(key);
      if (existing) {
        existing.baseAmount += baseAmount;
        existing.recipes.add(recipe.name);
      } else {
        buckets.set(key, {
          item: ing.item.trim(),
          baseAmount,
          baseUnit,
          recipes: new Set([recipe.name]),
        });
      }
    }
  }

  const items: ShoppingListItem[] = Array.from(buckets.values())
    .map((b) => {
      const { amount, unit } = normalizeForDisplay(b.baseAmount, b.baseUnit);
      return { item: b.item, amount, unit, recipes: Array.from(b.recipes) };
    })
    .sort((a, b) => a.item.localeCompare(b.item));

  return NextResponse.json({ items });
}
