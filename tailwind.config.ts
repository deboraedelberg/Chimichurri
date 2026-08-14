import type { Config } from "tailwindcss";

/**
 * Color del tema con soporte de transparencia (ej: bg-primary/90).
 * Las variables CSS guardan un color oklch completo, y Tailwind v3 no puede
 * aplicarle alpha directamente — sin esto, hover:bg-primary/90 y compañía
 * se descartan en silencio al compilar. color-mix logra el mismo efecto.
 */
const themeColor = (variable: string) =>
  `color-mix(in oklab, var(${variable}) calc(<alpha-value> * 100%), transparent)`;

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: themeColor("--border"),
        input: themeColor("--input"),
        ring: themeColor("--ring"),
        background: themeColor("--background"),
        foreground: themeColor("--foreground"),
        primary: {
          DEFAULT: themeColor("--primary"),
          foreground: themeColor("--primary-foreground"),
        },
        secondary: {
          DEFAULT: themeColor("--secondary"),
          foreground: themeColor("--secondary-foreground"),
        },
        destructive: {
          DEFAULT: themeColor("--destructive"),
          foreground: themeColor("--destructive-foreground"),
        },
        muted: {
          DEFAULT: themeColor("--muted"),
          foreground: themeColor("--muted-foreground"),
        },
        accent: {
          DEFAULT: themeColor("--accent"),
          foreground: themeColor("--accent-foreground"),
        },
        popover: {
          DEFAULT: themeColor("--popover"),
          foreground: themeColor("--popover-foreground"),
        },
        card: {
          DEFAULT: themeColor("--card"),
          foreground: themeColor("--card-foreground"),
        },
        chart: {
          "1": themeColor("--chart-1"),
          "2": themeColor("--chart-2"),
          "3": themeColor("--chart-3"),
          "4": themeColor("--chart-4"),
          "5": themeColor("--chart-5"),
        },
        sidebar: {
          DEFAULT: themeColor("--sidebar"),
          foreground: themeColor("--sidebar-foreground"),
          primary: themeColor("--sidebar-primary"),
          "primary-foreground": themeColor("--sidebar-primary-foreground"),
          accent: themeColor("--sidebar-accent"),
          "accent-foreground": themeColor("--sidebar-accent-foreground"),
          border: themeColor("--sidebar-border"),
          ring: themeColor("--sidebar-ring"),
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      // Tailwind no trae `invalid` en el set de variantes `aria-*` por
      // defecto — sin esto, aria-invalid:* se descarta en silencio al compilar.
      aria: {
        invalid: 'invalid="true"',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
