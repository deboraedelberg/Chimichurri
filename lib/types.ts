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
  photo_url?: string | null;
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
  photo_url: string | null;
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

