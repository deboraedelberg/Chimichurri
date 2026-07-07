import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const ingredientSchema = z.object({
  item: z.string().trim().min(1, "El nombre del ingrediente es obligatorio").max(200),
  amount: z.coerce.number().nonnegative(),
  unit: z.string().trim().min(1).max(30),
});

export const stepSchema = z.object({
  content: z.string().trim().min(1, "El texto del paso es obligatorio").max(4000),
  time: z.coerce.number().int().positive().nullish(),
});

export const recipeSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  description: z.string().trim().max(2000).nullish(),
  photo_url: z.string().trim().url().nullish().or(z.literal("").transform(() => null)),
  servings: z.coerce.number().int().min(1).max(100).default(4),
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

export type Permission = "owner" | "edit" | "view" | null;

/** Resolve what `userId` may do with `recipeId`. */
export async function getRecipePermission(
  recipeId: string,
  userId: string
): Promise<Permission> {
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    select: { user_id: true },
  });
  if (!recipe) return null;
  if (recipe.user_id === userId) return "owner";

  const share = await prisma.recipeShare.findUnique({
    where: {
      recipe_id_shared_with_id: { recipe_id: recipeId, shared_with_id: userId },
    },
    select: { permission: true },
  });
  if (!share) return null;
  return share.permission === "edit" ? "edit" : "view";
}
