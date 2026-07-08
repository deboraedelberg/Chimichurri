import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsSections } from "@/components/SettingsSections";

export const dynamic = "force-dynamic";

export const metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, provider: true },
  });
  if (!user) redirect("/auth/signin");

  return (
    <main className="container max-w-2xl space-y-6 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">
          Tu cuenta, apariencia y preferencias de cocina.
        </p>
      </div>
      <SettingsSections
        name={user.name ?? ""}
        email={user.email ?? ""}
        provider={user.provider}
      />
    </main>
  );
}
