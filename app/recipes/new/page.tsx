import { RecipeForm } from "@/components/RecipeForm";

export const metadata = { title: "Nueva receta" };

export default function NewRecipePage() {
  return (
    <main className="container max-w-3xl space-y-6 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nueva receta</h1>
        <p className="text-muted-foreground">
          Escríbela, escanea una foto o impórtala desde una URL.
        </p>
      </div>
      <RecipeForm mode="create" />
    </main>
  );
}
