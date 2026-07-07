import { ShoppingListGenerator } from "@/components/ShoppingListGenerator";

export const metadata = { title: "Lista de compras" };

export default function ShoppingListPage() {
  return (
    <main className="container space-y-6 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Lista de compras</h1>
        <p className="text-muted-foreground">
          Elige recetas y obtén una sola lista consolidada para el mercado.
        </p>
      </div>
      <ShoppingListGenerator />
    </main>
  );
}
