import Link from "next/link";
import { Clock, Users, UtensilsCrossed } from "@/components/icons";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatMinutes } from "@/lib/utils";
import type { RecipeDTO } from "@/lib/types";

export function RecipeCard({ recipe }: { recipe: RecipeDTO }) {
  const totalTime = (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0);

  return (
    <Link href={`/recipes/${recipe.id}`} className="group block">
      <Card className="h-full overflow-hidden transition-colors hover:border-primary/50">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          {recipe.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={recipe.photo_url}
              alt={recipe.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <UtensilsCrossed className="h-10 w-10 opacity-40" />
            </div>
          )}
          {recipe.permission && recipe.permission !== "owner" && (
            <Badge variant="secondary" className="absolute left-2 top-2">
              Compartida · {recipe.permission === "edit" ? "editar" : "ver"}
            </Badge>
          )}
        </div>
        <CardContent className="space-y-2 p-4">
          <h3 className="line-clamp-1 font-semibold leading-tight">{recipe.name}</h3>
          {recipe.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {recipe.description}
            </p>
          )}
          <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {recipe.servings}
            </span>
            {totalTime > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatMinutes(totalTime)}
              </span>
            )}
          </div>
          {recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {recipe.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
