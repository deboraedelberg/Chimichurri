import type { Metadata, Viewport } from "next";

import "./globals.css";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import { SubNav } from "@/components/SubNav";

export const metadata: Metadata = {
  title: {
    default: "Chimichurri",
    template: "%s · Chimichurri",
  },
  description: "Tus recetas familiares, organizadas. Cocina, escala, comparte.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1917" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Providers>
          <Navbar />
          <SubNav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
