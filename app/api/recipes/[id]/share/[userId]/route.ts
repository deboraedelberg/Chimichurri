import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRecipePermission } from "@/lib/recipes";

type Params = { params: { id: string; userId: string } };

/** DELETE /api/recipes/[id]/share/[userId] — revoke a share (owner only) */
export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const permission = await getRecipePermission(params.id, session.user.id);
  if (permission !== "owner") {
    return NextResponse.json(
      { error: "Solo el dueño puede revocar accesos" },
      { status: 403 }
    );
  }

  await prisma.recipeShare.deleteMany({
    where: { recipe_id: params.id, shared_with_id: params.userId },
  });

  return NextResponse.json({ ok: true });
}
