# Jarvis — Planning de révision + Bibliothèque PDF

Proposition d'architecture (étape 1, à valider avant construction).

## 1. Principes

- **Un seul utilisateur** : auth Supabase par magic link. Un trigger refuse toute création de compte dès qu'un utilisateur existe déjà (le premier connecté devient le propriétaire), en plus de l'option « Disable new user signups » du dashboard.
- **Toutes les tables** portent `user_id uuid not null default auth.uid()` référencant `auth.users`, et une RLS identique : `user_id = auth.uid()` en select / insert / update / delete.
- **Un seul type de table pour l'agenda** : blocs de révision et évaluations vivent dans `events` avec une colonne `kind`. Ça simplifie énormément la grille (un seul flux à rendre, déplacer, filtrer) ; les champs propres aux évals (`eval_type`, `notes`) restent `null` pour les blocs.
- **Aucune donnée pré-remplie** sauf les 7 matières, insérées automatiquement par trigger à la création du compte.
- **Timezone** : stockage en `timestamptz`, affichage dans le fuseau configuré dans `settings` (par défaut `Europe/Paris`, voir questions).

## 2. Schéma Postgres

### Enums

```sql
create type subject_priority as enum ('haute', 'normale', 'light');
create type event_kind       as enum ('revision', 'evaluation');
create type event_status     as enum ('prevu', 'fait', 'rate');
create type eval_type        as enum ('ds', 'controle', 'oral');
create type doc_type         as enum ('cours', 'exos', 'annale', 'corrige');
create type doc_status       as enum ('a_faire', 'en_cours', 'fait');
```

### Tables

| Table | Rôle | Colonnes principales |
|---|---|---|
| `settings` | Préférences (1 ligne) | `user_id` PK, `theme` ('dark'/'light'/'system'), `timezone`, `week_start` (1 = lundi), `day_start_hour` (ex. 7), `day_end_hour` (ex. 23), `focus_minutes` (50), `break_minutes` (10), `allowed_email` |
| `subjects` | Matières | `id`, `user_id`, `name`, `color` (hex), `icon` (nom d'icône Lucide), `priority` subject_priority, `position` int, `archived` bool, `created_at` |
| `events` | Blocs de révision **et** évaluations | `id`, `user_id`, `subject_id` → subjects (restrict), `kind` event_kind, `title`, `description`, `starts_at` timestamptz, `ends_at` timestamptz, `all_day` bool, `status` event_status, `eval_type` eval_type (null si révision), `notes`, `created_at`, `updated_at` |
| `tasks` | Checklist d'un bloc | `id`, `user_id`, `event_id` → events (cascade), `label`, `done` bool, `position` int |
| `documents` | PDF de la bibliothèque | `id`, `user_id`, `subject_id` → subjects (set null), `title`, `chapter` text (tag libre), `doc_type`, `status` doc_status, `storage_path` text unique, `file_size` bigint, `page_count` int, `last_page` int default 1, `created_at`, `updated_at` |
| `event_documents` | Liaison bloc ↔ PDF (N-N) | `event_id` → events (cascade), `document_id` → documents (cascade), `user_id`, PK (`event_id`, `document_id`) |
| `ical_feeds` | Liens iCal (Pronote) | `id`, `user_id`, `name`, `url`, `color`, `enabled` bool, `last_synced_at`, `last_error` |
| `ical_events` | Cache des cours importés | `id`, `user_id`, `feed_id` → ical_feeds (cascade), `uid` text, `summary`, `location`, `starts_at`, `ends_at`, unique (`feed_id`, `uid`, `starts_at`) |

Contraintes et index :

- `events` : check `ends_at > starts_at` ; check `(kind = 'evaluation') = (eval_type is not null)` ; index `(user_id, starts_at)`.
- `documents` : index `(user_id, subject_id)`, `(user_id, status)` ; `last_page between 1 and coalesce(page_count, last_page)`.
- `tasks` : index `(event_id, position)`.
- `ical_events` : index `(user_id, starts_at)`.
- Trigger `set_updated_at()` sur `events` et `documents`.

### Vue utilitaire

`weekly_stats` (vue SQL) : par matière et par semaine ISO, somme des heures `prevu`/`fait`/`rate` — alimente le panneau latéral sans calcul côté client.

### Triggers liés à l'auth

1. `enforce_single_user()` — `before insert on auth.users` : `raise exception` si `auth.users` contient déjà une ligne.
2. `seed_new_user()` — `after insert on auth.users` : crée la ligne `settings` et les 7 matières :

| Matière | Priorité | Couleur proposée |
|---|---|---|
| Maths spécialité | haute | `#6366F1` indigo |
| Maths expertes | haute | `#8B5CF6` violet |
| Physique-Chimie | haute | `#06B6D4` cyan |
| Philosophie | haute | `#F59E0B` ambre |
| Histoire-Géo (arabe) | normale | `#10B981` émeraude |
| ACL | normale | `#EC4899` rose |
| CDM | light | `#F97316` orange |

### Storage

- Bucket privé `pdfs`, limite 50 Mo / fichier, type MIME `application/pdf` uniquement.
- Chemin : `{user_id}/{document_id}.pdf`.
- Policies `storage.objects` : `bucket_id = 'pdfs' and (storage.foldername(name))[1] = auth.uid()::text` pour select / insert / update / delete.
- Lecture via URL signée (1 h) générée côté client ; upload direct depuis le navigateur (pas de passage par Vercel, donc pas de limite de 4,5 Mo).

### Import iCal

Pronote ne pose pas d'en-têtes CORS : la synchro passe par une route `app/api/ical/sync/route.ts` (serveur Vercel) qui télécharge le `.ics`, le parse (`ical.js`), et remplace les lignes `ical_events` du flux. Déclenchée à l'ouverture du planning si `last_synced_at` > 1 h, et par un bouton « Rafraîchir ».

## 3. Arborescence du projet

```
jarvis/
├─ app/
│  ├─ layout.tsx                 # fonts, ThemeProvider, QueryProvider, manifest
│  ├─ globals.css                # tokens Tailwind (dark par défaut)
│  ├─ manifest.ts                # PWA manifest
│  ├─ (auth)/
│  │  ├─ connexion/page.tsx      # formulaire magic link
│  │  └─ callback/route.ts       # échange du code Supabase
│  ├─ (app)/
│  │  ├─ layout.tsx              # shell : onglets Planning / Bibliothèque, nav mobile
│  │  ├─ page.tsx                # redirige vers /planning
│  │  ├─ planning/page.tsx
│  │  ├─ bibliotheque/page.tsx
│  │  ├─ bibliotheque/[id]/page.tsx   # lecteur PDF plein écran
│  │  └─ reglages/page.tsx       # matières, iCal, thème, fuseau
│  └─ api/
│     └─ ical/sync/route.ts
├─ components/
│  ├─ ui/                        # Button, Dialog, Sheet, Popover, Badge, Input… (Radix + Tailwind)
│  ├─ layout/                    # AppShell, TabBar, ThemeToggle, FloatingAdd
│  ├─ subjects/                  # SubjectChip, SubjectForm, SubjectList (réordonnable)
│  ├─ planning/
│  │  ├─ Calendar.tsx            # conteneur vue semaine / jour, navigation
│  │  ├─ WeekView.tsx / DayView.tsx
│  │  ├─ TimeGrid.tsx            # grille horaire, création par cliquer-glisser
│  │  ├─ EventBlock.tsx          # bloc draggable + resizable (dnd-kit)
│  │  ├─ IcalBlock.tsx           # cours grisés non modifiables
│  │  ├─ EventSheet.tsx          # édition d'un bloc (checklist, PDF liés, statut)
│  │  ├─ QuickEvalDialog.tsx     # bouton « + Éval »
│  │  ├─ WeekSidebar.tsx         # heures prévues / faites, prochaines évals
│  │  └─ EvalCountdown.tsx
│  ├─ focus/
│  │  └─ FocusOverlay.tsx        # minuteur 50/10 plein écran
│  ├─ library/
│  │  ├─ UploadDropzone.tsx      # multi-fichiers
│  │  ├─ DocumentCard.tsx / DocumentGrid.tsx
│  │  ├─ LibraryFilters.tsx      # recherche + matière / type / statut
│  │  ├─ DocumentSheet.tsx       # métadonnées, « Planifier »
│  │  └─ PdfReader.tsx           # react-pdf, mémorise last_page
│  └─ ical/
│     └─ IcalFeedForm.tsx
├─ lib/
│  ├─ supabase/
│  │  ├─ client.ts               # navigateur
│  │  ├─ server.ts               # Server Components / routes
│  │  └─ middleware.ts           # rafraîchissement de session
│  ├─ types/database.ts          # types générés par Supabase
│  ├─ queries/                   # hooks TanStack Query : useSubjects, useEvents(range), useDocuments…
│  ├─ ical/parse.ts
│  └─ utils/{dates,colors,cn}.ts # date-fns (locale fr), palette
├─ hooks/                        # useMediaQuery, useSwipe, useFocusTimer, useKeyboard
├─ stores/                       # Zustand : vue courante, semaine affichée, focus actif
├─ supabase/
│  ├─ config.toml
│  └─ migrations/
│     ├─ 0001_schema.sql
│     ├─ 0002_rls.sql
│     ├─ 0003_storage.sql
│     └─ 0004_auth_triggers.sql
├─ public/
│  ├─ icons/                     # icônes PWA 192 / 512 / maskable / apple-touch
│  └─ sw.js                      # généré par Serwist
├─ middleware.ts                 # protège (app), redirige vers /connexion
├─ next.config.ts
├─ tailwind.config.ts
└─ .env.example
```

## 4. Choix techniques à confirmer

- **Next.js 15** (App Router, React 19), **Tailwind v4**, **TanStack Query** pour le cache + mises à jour optimistes sur le drag & drop, **Zustand** pour l'état d'interface, **date-fns** (locale `fr`), **Radix UI** pour les primitives accessibles (dialogs, popovers), **Lucide** pour les icônes.
- **PWA** avec `@serwist/next` (successeur maintenu de next-pwa) : cache des assets et des pages, pas de cache des PDF (trop lourds).
- **Grille horaire** : pas de dépendance calendrier type FullCalendar. Grille maison avec dnd-kit (déplacement + redimensionnement par poignée basse, pas de 15 min).
- **Lecteur PDF** : react-pdf, worker pdf.js servi localement, sauvegarde de `last_page` avec un debounce de 1 s.
