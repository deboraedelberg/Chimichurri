import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RECIPE_INCLUDE, getRecipePermission } from "@/lib/recipes";
import { toRecipeDTO } from "@/lib/serialize";
import { RecipeForm } from "@/components/RecipeForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Editar receta" };

export default async function EditRecipePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const permission = await getRecipePermission(params.id, session.user.id);
  if (!permission) notFound();
  if (permission === "view") redirect(`/recipes/${params.id}`);

  const recipe = await prisma.recipe.findUnique({
    where: { id: params.id },
    include: RECIPE_INCLUDE,
  });
  if (!recipe) notFound();

  return (
    <main className="container max-w-3xl space-y-6 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Editar receta</h1>
      <RecipeForm mode="edit" initial={toRecipeDTO(recipe, permission)} />
    </main>
  );
}
