import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CATEGORY_VALUES } from "@/lib/categories";

export const ingredientSchema = z.object({
  item: z.string().trim().min(1, "El nombre del ingrediente es obligatorio").max(200),
  amount: z.coerce.number().nonnegative(),
  unit: z.string().trim().min(1).max(30),
  heading: z.boolean().optional().default(false),
});

export const stepSchema = z.object({
  content: z.string().trim().min(1, "El texto del paso es obligatorio").max(4000),
  time: z.coerce.number().int().positive().nullish(),
  heading: z.boolean().optional().default(false),
  photo_url: z.string().trim().url().nullish().or(z.literal("").transform(() => null)),
  photo_urls: z.array(z.string().trim().url()).max(3, "Máximo 3 fotos por paso").optional().default([]),
});

export const recipeSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  description: z.string().trim().max(2000).nullish(),
  photo_url: z.string().trim().url().nullish().or(z.literal("").transform(() => null)),
  category: z.enum(CATEGORY_VALUES).nullish(),
  credit: z.string().trim().max(100).nullish().or(z.literal("").transform(() => null)),
  servings: z.coerce.number().int().min(1).max(100).default(4),
  servings_unit: z.enum(["porciones", "unidades"]).default("porciones"),
  prepTime: z.coerce.number().int().min(0).max(6000).nullish(),
  cookTime: z.coerce.number().int().min(0).max(6000).nullish(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  ingredients: z.array(ingredientSchema).min(1, "Agrega al menos un ingrediente").max(100),
  steps: z.array(stepSchema).min(1, "Agrega al menos un paso").max(100),
});

export type RecipeSchemaInput = z.infer<typeof recipeSchema>;

export const RECIPE_INCLUDE = {
  ingredients: true,
  steps: { orderBy: { order: "asc" as const } },
  user: { select: { name: true, email: true } },
} as const;

/** Valida el slug de categoría venido de la URL; inválido -> null (sin filtro) */
export function parseCategoria(
  raw: string | string[] | null | undefined
): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  return (CATEGORY_VALUES as readonly string[]).includes(value) ? value : null;
}

/**
 * Filtro compartido entre la home y GET /api/recipes.
 * Limitaciones conocidas: el tag matchea exacto (no "contains") y
 * "insensitive" no pliega acentos ("ñoquis" ≠ "noquis").
 */
export function buildRecipeWhere(
  qRaw?: string | null,
  categoria?: string | null,
  etiquetaRaw?: string | null
): Prisma.RecipeWhereInput | undefined {
  const q = qRaw?.trim();
  const etiqueta = etiquetaRaw?.trim().toLowerCase();
  const where: Prisma.RecipeWhereInput = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { tags: { has: q.toLowerCase() } },
            { ingredients: { some: { item: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
    ...(categoria ? { category: categoria } : {}),
    ...(etiqueta ? { tags: { has: etiqueta } } : {}),
  };
  return Object.keys(where).length ? where : undefined;
}

/** Normaliza el valor de ?etiqueta= de la URL */
export function parseEtiqueta(
  raw: string | string[] | null | undefined
): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const etiqueta = value?.trim().toLowerCase();
  return etiqueta ? etiqueta.slice(0, 50) : null;
}

export interface FrequentCategory {
  category: string;
  viewCount: number;
  recipeId: string;
  recipeName: string;
  photoUrl: string | null;
}

/**
 * Categorías cuyas recetas este usuario más abrió (RecipeView), de más a
 * menos aperturas. Cada categoría se representa con la receta que más
 * abrió dentro de ella (para la foto del bloque).
 */
export async function getFrequentCategories(
  userId: string,
  limit = 6
): Promise<FrequentCategory[]> {
  const views = await prisma.recipeView.findMany({
    where: { user_id: userId },
    select: {
      recipe: { select: { id: true, name: true, category: true, photo_url: true } },
    },
  });

  const byCategory = new Map<string, Map<string, { count: number; name: string; photoUrl: string | null }>>();
  for (const { recipe } of views) {
    if (!recipe.category) continue;
    if (!byCategory.has(recipe.category)) byCategory.set(recipe.category, new Map());
    const recipes = byCategory.get(recipe.category)!;
    const existing = recipes.get(recipe.id);
    if (existing) existing.count += 1;
    else recipes.set(recipe.id, { count: 1, name: recipe.name, photoUrl: recipe.photo_url });
  }

  return [...byCategory.entries()]
    .map(([category, recipes]) => {
      const total = [...recipes.values()].reduce((sum, r) => sum + r.count, 0);
      const [topRecipeId, top] = [...recipes.entries()].sort(
        (a, b) => b[1].count - a[1].count
      )[0];
      return {
        category,
        viewCount: total,
        recipeId: topRecipeId,
        recipeName: top.name,
        photoUrl: top.photoUrl,
      };
    })
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, limit);
}

export type Permission = "owner" | "edit" | "view" | null;

/**
 * Sitio familiar: cualquier usuario autenticado puede ver y editar
 * cualquier receta. Distinguimos "owner" solo para mostrar el autor
 * y para los futuros filtros ("creada por mí").
 */
export async function getRecipePermission(
  recipeId: string,
  userId: string
): Promise<Permission> {
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    select: { user_id: true },
  });
  if (!recipe) return null;
  return recipe.user_id === userId ? "owner" : "edit";
}
