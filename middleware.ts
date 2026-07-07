export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    /*
     * Protect everything except:
     * - /auth/* (sign in / sign up pages)
     * - /api/auth/* (NextAuth + signup endpoints)
     * - Next.js internals and static assets
     */
    "/((?!auth|api/auth|_next/static|_next/image|favicon.ico|icon.svg).*)",
  ],
};
