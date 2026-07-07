import Link from "next/link";
import { ChefHat } from "@/components/icons";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="container flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 py-8 text-center">
      <ChefHat className="h-12 w-12 text-muted-foreground/40" />
      <h1 className="text-2xl font-bold">Página no encontrada</h1>
      <p className="text-muted-foreground">
        Esta receta no existe o no tienes acceso a ella.
      </p>
      <Button asChild>
        <Link href="/">Volver al inicio</Link>
      </Button>
    </main>
  );
}
