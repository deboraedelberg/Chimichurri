export interface IngredientInput {
  item: string;
  amount: number;
  unit: string;
  heading?: boolean;
}

export interface StepInput {
  content: string;
  time?: number | null; // seconds
  heading?: boolean;
  photo_url?: string | null; // legado
  photo_urls?: string[]; // hasta 3 fotos
}

export interface RecipeInput {
  name: string;
  description?: string | null;
  photo_url?: string | null;
  servings: number;
  prepTime?: number | null;
  cookTime?: number | null;
  tags: string[];
  ingredients: IngredientInput[];
  steps: StepInput[];
}

export interface IngredientDTO {
  id: string;
  item: string;
  amount: number;
  unit: string;
  heading: boolean;
}

export interface StepDTO {
  id: string;
  order: number;
  content: string;
  time: number | null;
  heading: boolean;
  photo_url: string | null; // legado: pasos guardados antes de photo_urls
  photo_urls: string[];
}

/** Fotos de un paso, uniendo el campo nuevo (photo_urls) con el legado (photo_url). */
export function stepPhotos(step: {
  photo_url?: string | null;
  photo_urls?: string[] | null;
}): string[] {
  if (step.photo_urls && step.photo_urls.length > 0) return step.photo_urls;
  return step.photo_url ? [step.photo_url] : [];
}

export interface RecipeDTO {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  category: string | null;
  credit: string | null;
  servings: number;
  servings_unit: string;
  prepTime: number | null;
  cookTime: number | null;
  tags: string[];
  ingredients: IngredientDTO[];
  steps: StepDTO[];
  createdAt: string;
  updatedAt: string;
  /** present on list/detail responses */
  owner?: { name: string | null; email: string | null };
  /** the viewer's permission: "owner" | "edit" | "view" */
  permission?: "owner" | "edit" | "view";
}

