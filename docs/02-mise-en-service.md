# Mise en service

Tout le code est prêt et la base Supabase est créée et migrée. Il reste quatre réglages à faire à la main, dans les interfaces Vercel et Supabase (ils ne sont pas accessibles depuis l'API utilisée par Claude).

## 1. Vercel : déjà déployé

L'app est en ligne sur **https://jarviss-brown.vercel.app** (projet Vercel `jarviss`).

Le connecteur Vercel de Claude ne peut pas modifier les réglages du projet ni ses variables d'environnement, donc :

- les coordonnées Supabase (URL + clé *publishable*, publique par conception) sont intégrées au code avec valeurs par défaut (`lib/supabase/config.ts`) ; des variables d'environnement, si tu en ajoutes, ont la priorité ;
- le déploiement est fait depuis le dépôt GitHub public `roudacbusiness-debug/jarviss` (miroir de `main` du dépôt privé `jarvis`). Pour redéployer : pousser sur `jarviss/main`, puis relancer un déploiement (ou relier le projet au dépôt dans Vercel → Settings → Git pour que ce soit automatique).

Si l'URL demande une connexion Vercel : Vercel → projet `jarviss` → Settings → Deployment Protection → désactiver « Vercel Authentication » pour la production.

## 2. Autoriser l'URL dans Supabase Auth (2 min)

Dashboard Supabase → projet **jarvis** → **Authentication → URL Configuration** :

- **Site URL** : `https://jarviss-brown.vercel.app`
- **Redirect URLs** : ajoute `https://jarviss-brown.vercel.app/auth/callback`, `https://jarviss-*-roudacbusiness-debugs-projects.vercel.app/auth/callback` et `http://localhost:3000/auth/callback`

Sans ça, le lien magique renvoie vers `localhost`.

## 3. Ajouter le code à 6 chiffres dans l'e-mail (2 min, recommandé pour l'iPhone)

Quand l'app est installée sur l'écran d'accueil, le lien de l'e-mail s'ouvre dans Safari et non dans l'app : la session ne serait pas partagée. Le code à 6 chiffres règle ça.

Dashboard Supabase → **Authentication → Emails → Magic Link**, remplace le corps par :

```html
<h2>Connexion à Jarvis</h2>
<p>Ton code de connexion : <strong style="font-size:24px;letter-spacing:4px">{{ .Token }}</strong></p>
<p>Ou clique ici : <a href="{{ .ConfirmationURL }}">Se connecter</a></p>
<p style="color:#888">Ce code expire dans une heure.</p>
```

Dans l'app, la page de connexion propose les deux : cliquer sur le lien, ou saisir le code.

## 4. Première connexion

Le compte `roudac.business@gmail.com` existe déjà dans la base (il a servi aux tests, puis a été basculé sur ton adresse ; aucune session n'est ouverte et son mot de passe est aléatoire, donc inutilisable). Les 7 matières, les réglages et l'emploi du temps fixe (relevé depuis ta capture Pronote) y sont déjà rattachés.

Entre cette adresse sur la page de connexion, puis clique sur le lien reçu ou saisis le code. Toute autre inscription est refusée par un trigger en base : **un seul compte**.

Pour verrouiller encore plus : **Authentication → Sign In / Providers → Email** → décoche « Allow new users to sign up » une fois connecté.

## Installer sur iPhone

Safari → ouvre l'URL → bouton Partager → **Sur l'écran d'accueil**. L'app s'ouvre en plein écran, en vue Jour, avec swipe entre les jours et bouton « + ».

## Lien iCal Pronote

Pronote → Emploi du temps → icône d'export / « Lien iCal » → copie l'adresse → Réglages → *Emploi du temps Pronote (iCal)* → Importer. La synchro se refait toutes les heures à l'ouverture du planning. Si tu utilises l'iCal, tu peux supprimer les cours de l'emploi du temps fixe pour éviter les doublons.

## Développement local

```bash
pnpm install
cp .env.example .env.local   # mêmes valeurs que ci-dessus
pnpm dev
```

Migrations SQL : `supabase/migrations/` (déjà appliquées sur le projet).
