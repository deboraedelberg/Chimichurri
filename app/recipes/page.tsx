import { redirect } from "next/navigation";

// La home ya muestra todas las recetas de la familia
export default function RecipesPage() {
  redirect("/");
}
