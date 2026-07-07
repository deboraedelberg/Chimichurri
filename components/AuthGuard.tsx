"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Client-side guard for pages that need a session.
 * Route protection is primarily handled by middleware.ts; this is a
 * belt-and-braces wrapper for client components that render user data.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        Cargando…
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  return <>{children}</>;
}
