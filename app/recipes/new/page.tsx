import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RecipeForm } from "@/components/RecipeForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Nueva receta" };

export default async function NewRecipePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  // Etiquetas ya usadas en el recetario, para las sugerencias del form
  const rows = await prisma.recipe.findMany({ select: { tags: true } });
  const knownTags = Array.from(new Set(rows.flatMap((r) => r.tags)));

  return (
    <main className="container max-w-3xl space-y-6 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nueva receta</h1>
        <p className="text-muted-foreground">
          Escríbela, escanea una foto o impórtala desde una URL.
        </p>
      </div>
      <RecipeForm mode="create" knownTags={knownTags} />
    </main>
  );
}
