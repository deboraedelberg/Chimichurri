import Link from "next/link";
import { UtensilsCrossed } from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { categoryShortLabel } from "@/lib/categories";
import type { FrequentCategory } from "@/lib/recipes";

export function FrequentCategories({ categories }: { categories: FrequentCategory[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="space-y-3">
      <h3 className="text-lg font-semibold text-foreground">
        Categorías más frecuentes
      </h3>
      <div className="grid grid-cols-3 gap-x-4 gap-y-5 sm:grid-cols-4 md:grid-cols-6">
        {categories.map((cat) => (
          <Link
            key={cat.category}
            href={`/categoria/${cat.category}`}
            className="group flex flex-col items-center gap-2 text-center"
          >
            <Avatar className="aspect-square w-2/3 ring-1 ring-border transition-transform group-hover:scale-[1.03]">
              {cat.photoUrl && <AvatarImage src={cat.photoUrl} alt="" />}
              <AvatarFallback>
                <UtensilsCrossed className="h-6 w-6 text-muted-foreground/40" />
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium leading-tight">
              {categoryShortLabel(cat.category)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
