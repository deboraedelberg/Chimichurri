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
  categoria?: string | null
): Prisma.RecipeWhereInput | undefined {
  const q = qRaw?.trim();
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
  };
  return Object.keys(where).length ? where : undefined;
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
