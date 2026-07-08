export interface IngredientInput {
  item: string;
  amount: number;
  unit: string;
}

export interface StepInput {
  content: string;
  time?: number | null; // seconds
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

export interface IngredientDTO extends IngredientInput {
  id: string;
}

export interface StepDTO {
  id: string;
  order: number;
  content: string;
  time: number | null;
}

export interface RecipeDTO {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  servings: number;
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

