import type { Ingredient, Recipe, Step } from "@prisma/client";
import type { RecipeDTO } from "@/lib/types";

type RecipeWithRelations = Recipe & {
  ingredients: Ingredient[];
  steps: Step[];
  user?: { name: string | null; email: string | null };
};

/** Convert a Prisma recipe (with relations) into a plain, client-safe DTO. */
export function toRecipeDTO(
  recipe: RecipeWithRelations,
  permission?: "owner" | "edit" | "view"
): RecipeDTO {
  return {
    id: recipe.id,
    user_id: recipe.user_id,
    name: recipe.name,
    description: recipe.description,
    photo_url: recipe.photo_url,
    category: recipe.category,
    credit: recipe.credit,
    servings: recipe.servings,
    servings_unit: recipe.servings_unit,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    tags: recipe.tags,
    ingredients: recipe.ingredients.map((i) => ({
      id: i.id,
      item: i.item,
      amount: i.amount,
      unit: i.unit,
      heading: i.heading,
    })),
    steps: recipe.steps
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((s) => ({
        id: s.id,
        order: s.order,
        content: s.content,
        time: s.time,
        heading: s.heading,
        photo_url: s.photo_url,
      })),
    createdAt: recipe.createdAt.toISOString(),
    updatedAt: recipe.updatedAt.toISOString(),
    owner: recipe.user
      ? { name: recipe.user.name, email: recipe.user.email }
      : undefined,
    permission,
  };
}
