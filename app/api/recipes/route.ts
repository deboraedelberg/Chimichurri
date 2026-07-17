import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  recipeSchema,
  RECIPE_INCLUDE,
  buildRecipeWhere,
  parseCategoria,
  parseEtiqueta,
} from "@/lib/recipes";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  // Sitio familiar: todas las recetas son visibles para todos
  const recipes = await prisma.recipe.findMany({
    where: buildRecipeWhere(
      searchParams.get("q"),
      parseCategoria(searchParams.get("categoria")),
      parseEtiqueta(searchParams.get("etiqueta"))
    ),
    include: RECIPE_INCLUDE,
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(recipes);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = recipeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  const { ingredients, steps, ...data } = parsed.data;

  const recipe = await prisma.recipe.create({
    data: {
      ...data,
      user_id: session.user.id,
      ingredients: { create: ingredients },
      steps: {
        create: steps.map((s, i) => ({
          order: i + 1,
          content: s.content,
          time: s.time ?? null,
          heading: s.heading,
          photo_url: s.photo_url ?? null,
          photo_urls: s.photo_urls,
        })),
      },
    },
    include: RECIPE_INCLUDE,
  });

  return NextResponse.json(recipe, { status: 201 });
}
