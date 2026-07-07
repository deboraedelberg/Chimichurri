import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/auth/signin",
  },
});

export const config = {
  matcher: [
    /*
     * Protege todo excepto:
     * - /auth/* (páginas de inicio de sesión / registro)
     * - /api/auth/* (NextAuth + registro)
     * - Archivos internos y estáticos de Next.js
     */
    "/((?!auth|api/auth|_next/static|_next/image|favicon.ico|icon.svg).*)",
  ],
};
