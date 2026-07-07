import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RECIPE_INCLUDE } from "@/lib/recipes";

/** GET /api/recipes/shared — recipes other people shared with me */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const shares = await prisma.recipeShare.findMany({
    where: { shared_with_id: session.user.id },
    include: {
      recipe: { include: RECIPE_INCLUDE },
    },
    orderBy: { shared_at: "desc" },
  });

  const recipes = shares.map((s) => ({
    ...s.recipe,
    permission: s.permission === "edit" ? "edit" : "view",
  }));

  return NextResponse.json(recipes);
}
