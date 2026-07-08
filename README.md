# 🌿 Chimichurri

Your family recipes, organized. A full-stack recipe app: create and share recipes, scan them from photos (OCR), scale ingredients, convert units, cook step-by-step with timers, and generate consolidated shopping lists.

## Stack

- **Next.js 14** (App Router) + React + TypeScript
- **Tailwind CSS** + Shadcn UI components (dark theme by default)
- **NextAuth.js** — Google OAuth + email/password (bcrypt)
- **Neon PostgreSQL** + **Prisma ORM**
- **Vercel Blob** — recipe photo storage
- **Tesseract.js** — client-side OCR for photo-to-recipe

## Features

| Feature | How it works |
| --- | --- |
| Family model | Everyone who signs up can view, edit and add all recipes (each recipe keeps its author) |
| Auth | Google OAuth or email/password; JWT sessions; all routes protected by middleware |
| Recipe CRUD | Cards, dialogs, dynamic ingredient/step editors |
| Photo → recipe | Upload a photo of a recipe, Tesseract.js extracts the text in the browser, you review it and fill the form |
| URL import | Paste a URL → server fetches the page and parses schema.org/Recipe JSON-LD (name, ingredients, steps, times, photo); manual paste fallback |
| Ingredient scaling | Servings dropdown auto-multiplies every ingredient (½x, 2x, …) |
| Unit conversion | Per-ingredient dropdown converts g/kg/oz/lb and ml/l/cup/tbsp/tsp/fl oz |
| Cooking mode | Full-screen dark UI, ingredient checklist, one step per screen, countdown timers, screen wake-lock |
| Settings | Theme (light/dark/system), profile name, default servings & units, delete account |

## Setup

### 1. Install

```bash
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Where to get it |
| --- | --- |
| `DATABASE_URL` | [neon.tech](https://neon.tech) → create project → connection string (keep `?sslmode=require`) |
| `NEXTAUTH_URL` | `http://localhost:3000` locally; your production URL on Vercel |
| `NEXTAUTH_SECRET` | `openssl rand -hex 32` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → OAuth client (Web). Authorized redirect URI: `http://localhost:3000/api/auth/callback/google` (and the production equivalent) |
| `BLOB_READ_WRITE_TOKEN` | Vercel dashboard → Storage → Blob → create store → token. (Photo upload fails gracefully without it) |
| `NEXT_PUBLIC_APP_URL` | Same as `NEXTAUTH_URL` |

### 3. Database

Push the schema to Neon (first time / prototyping):

```bash
npm run db:push
```

Or use migrations (recommended once stable):

```bash
npm run db:migrate     # prisma migrate dev
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to sign in. Create an account (email/password) or use Google.

## Deploy to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. Add all the env vars above in **Project → Settings → Environment Variables** (set `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to your production URL).
3. Create a **Blob store** under Storage — Vercel injects `BLOB_READ_WRITE_TOKEN` automatically.
4. Add your production redirect URI to the Google OAuth client: `https://your-app.vercel.app/api/auth/callback/google`.
5. Run the schema push against production once: `DATABASE_URL=... npx prisma db push`.
6. Deploy. The build runs `prisma generate` automatically.

## API

```
POST   /api/auth/signup                    create account (email/password)
*      /api/auth/[...nextauth]             NextAuth (signin/signout/session/callbacks)

GET    /api/recipes                        list all family recipes (?q= search)
POST   /api/recipes                        create
GET    /api/recipes/[id]                   detail
PUT    /api/recipes/[id]                   update (any member)
DELETE /api/recipes/[id]                   delete (any member)

PATCH  /api/user                           update profile name
DELETE /api/user                           delete account (cascade)

POST   /api/import                         {url} → parsed recipe (schema.org JSON-LD)
POST   /api/upload                         image → Vercel Blob {url}
POST   /api/convert                        {amount, from, to} → {amount, unit}
```

## Project structure

```
app/                  pages + API routes (App Router)
components/           app components (RecipeForm, CookingMode, …)
components/ui/        Shadcn UI primitives
lib/                  auth config, prisma client, conversions, helpers
prisma/schema.prisma  data model (User, Recipe, Ingredient, Step, RecipeShare)
middleware.ts         route protection (NextAuth)
```

## Roadmap (post-MVP)

- Claude API recipe customization (vegetarian, quick, keto…)
- "What can I cook with my fridge?" search
- Automated URL scraping and Claude Vision photo parsing
- PWA offline mode
