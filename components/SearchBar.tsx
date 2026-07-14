"use client";

import { FormEvent, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "@/components/icons";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Buscador global del navbar. Al enviar navega a la home con ?q=;
 * si ya estamos en la home conserva la categoría seleccionada.
 */
export function SearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const [value, setValue] = useState(q);

  // Re-sincroniza el input al navegar atrás/adelante
  useEffect(() => setValue(q), [q]);

  function navigate(nextQ: string) {
    const params = new URLSearchParams();
    if (nextQ) params.set("q", nextQ);
    const categoria = pathname === "/" ? searchParams.get("categoria") : null;
    if (categoria) params.set("categoria", categoria);
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    navigate(value.trim());
  }

  function handleClear() {
    setValue("");
    // Si había una búsqueda activa, limpiarla también en la URL
    if (pathname === "/" && q) navigate("");
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className={cn("relative", className)}
    >
      <button
        type="submit"
        aria-label="Buscar"
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        <Search className="h-4 w-4" />
      </button>
      <Input
        type="text"
        enterKeyHint="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Buscar recetas, ingredientes..."
        className="h-10 pl-9 pr-9"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Limpiar búsqueda"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </form>
  );
}
