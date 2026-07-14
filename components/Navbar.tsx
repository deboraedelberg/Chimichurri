"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { ChefHat, LogOut, Menu, Plus, Settings } from "@/components/icons";

import { SearchBar } from "@/components/SearchBar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  // El modo cocina no lleva chrome
  if (pathname?.startsWith("/cook/")) return null;

  const userLabel = session?.user && (
    <>
      <DropdownMenuLabel className="font-normal">
        <div className="flex flex-col space-y-1">
          <p className="text-sm font-medium leading-none">
            {session.user.name ?? "Chef"}
          </p>
          <p className="text-xs leading-none text-muted-foreground">
            {session.user.email}
          </p>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
    </>
  );

  const menuItems = (
    <>
      <DropdownMenuItem asChild>
        <Link href="/recipes/new">
          <Plus />
          Nueva receta
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/settings">
          <Settings />
          Configuración
        </Link>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => signOut({ callbackUrl: "/auth/signin" })}>
        <LogOut />
        Cerrar sesión
      </DropdownMenuItem>
    </>
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <ChefHat className="h-6 w-6 text-primary" />
          <span className="text-lg tracking-tight">Chimichurri</span>
        </Link>

        {/* Buscador desktop, entre el logo y los menús */}
        {session?.user && (
          <div className="hidden flex-1 justify-center px-4 md:flex">
            <Suspense fallback={null}>
              <SearchBar className="w-full max-w-md" />
            </Suspense>
          </div>
        )}

        {session?.user && (
          <div className="flex items-center gap-2">
            {/* Menú mobile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" aria-label="Menú">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 md:hidden">
                {userLabel}
                {menuItems}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Avatar con menú: solo desktop */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Cuenta"
                  className="hidden rounded-full md:inline-flex"
                >
                  {session.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={session.user.image}
                      alt=""
                      className="h-8 w-8 rounded-full"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {(session.user.name ?? session.user.email ?? "?")
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {userLabel}
                {menuItems}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Buscador mobile: segunda fila, siempre visible */}
      {session?.user && (
        <div className="container pb-3 md:hidden">
          <Suspense fallback={null}>
            <SearchBar />
          </Suspense>
        </div>
      )}
    </header>
  );
}
