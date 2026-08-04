/**
 * Taxonomía de categorías del recetario familiar.
 * Único lugar con la lista: el form la usa para el dropdown agrupado
 * y los filtros de la home (chips + menú de navegación) la reusan.
 */

export interface CategoryItem {
  value: string; // slug guardado en Recipe.category
  label: string;
}

export interface CategoryGroup {
  key: "salado" | "dulce" | "otros";
  label: string; // usado en badges: "Recetas saladas · Carnes"
  navLabel: string; // usado en el menú de navegación: "Recetas Saladas"
  items: CategoryItem[];
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    key: "salado",
    label: "Recetas saladas",
    navLabel: "Recetas Saladas",
    items: [
      { value: "salado-salsas", label: "Sopas y salsas" },
      { value: "salado-tortillas", label: "Tortillas" },
      { value: "salado-tartas", label: "Tartas saladas" },
      { value: "salado-carnes", label: "Carnes" },
      { value: "salado-aves", label: "Aves" },
      { value: "salado-pescados", label: "Pescados" },
      { value: "salado-basicos", label: "Masas saladas" },
      { value: "salado-entradas", label: "Entradas y snacks" },
    ],
  },
  {
    key: "dulce",
    label: "Recetas dulces",
    navLabel: "Recetas Dulces",
    items: [
      { value: "dulce-postres", label: "Postres" },
      { value: "dulce-tortas", label: "Tortas y budines" },
      { value: "dulce-basicos", label: "Masas dulces" },
      { value: "dulce-salsas", label: "Salsas y cremas" },
    ],
  },
  {
    key: "otros",
    label: "Otras recetas",
    navLabel: "Otras Recetas",
    items: [
      { value: "otros-panes", label: "Panes y facturas" },
      { value: "dulce-galletitas", label: "Galletitas y alfajores" },
    ],
  },
];

export const CATEGORY_VALUES = CATEGORY_GROUPS.flatMap((g) =>
  g.items.map((i) => i.value)
) as [string, ...string[]];

/** "dulce-tortas" -> "Recetas dulces · Tortas y budines" (null si el slug no existe) */
export function categoryLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  for (const group of CATEGORY_GROUPS) {
    const item = group.items.find((i) => i.value === value);
    if (item) return `${group.label} · ${item.label}`;
  }
  return null;
}

/** Solo el nombre de la subcategoría: "dulce-tortas" -> "Tortas y budines" */
export function categoryShortLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  for (const group of CATEGORY_GROUPS) {
    const item = group.items.find((i) => i.value === value);
    if (item) return item.label;
  }
  return null;
}
