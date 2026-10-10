# Jarvis

Planning de révision + bibliothèque de PDF (Terminale, section BFI).

- Next.js (App Router) · TypeScript · Tailwind v4
- Supabase (Postgres, Auth magic link, Storage)
- PWA installable sur iPhone

## Développement

```bash
pnpm install
cp .env.example .env.local   # puis renseigner les clés Supabase
pnpm dev
```

Les migrations SQL sont dans `supabase/migrations/` et s'appliquent dans l'ordre.
