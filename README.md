# Site officiel de StellarForge

Site Angular 22 (composants autonomes, signaux), en français et en anglais,
publié sur GitHub Pages.

## Commandes

| Commande | Rôle |
|---|---|
| `npm install` | installer les dépendances (une fois) |
| `npm start` | serveur de développement sur http://localhost:4200 |
| `npm run data` | régénérer les données depuis le jeu (`../StellarForge`) |
| `npm run data -- C:/chemin/StellarForge` | idem, avec un autre chemin vers le jeu |
| `npm run build:gh` | build de production pour GitHub Pages |

## Données du jeu

`scripts/generate-data.mjs` lit le projet du jeu et écrit :

- `public/data/game-data.json` : technologies, bâtiments, recettes, matières,
  vaisseaux, sondes et planètes (fichiers `data/**/*.tres`) ;
- `public/data/journal.json` : notes de version (`docs/patch-notes.md`) ;
- `public/images/logo.png` et `panorama.png` (`assets/ui/`).

Ces fichiers sont versionnés : le build sur GitHub n'a pas accès au jeu.
Après une mise à jour du jeu : `npm run data`, puis commit et push.
Les pages Technologies, Codex, Atlas et Journal de bord se mettent à jour seules.

## Textes

- Tous les textes du site : `src/app/i18n/fr.ts` (référence) et `src/app/i18n/en.ts`
  (mêmes clés, vérifiées à la compilation).
- La feuille de route est choisie à la main dans `docs/Todo-list.md` du jeu :
  `src/app/pages/roadmap/roadmap.ts` et les clés `roadmap.*`.
- Les crédits reprennent `CREDITS.md` du jeu : `src/app/pages/credits/credits.ts`.
- Les noms du jeu (technologies, objets, planètes) et le journal restent en
  français : la version anglaise l'indique par un bandeau.

## Pages

URL avec la langue en premier : `/fr/...` ou `/en/...` (la racine choisit selon
le navigateur, puis retient le choix).

| Chemin | Page |
|---|---|
| `/fr` | Accueil |
| `/fr/game` | Le jeu |
| `/fr/atlas` | Atlas des planètes |
| `/fr/technologies` | Arbre technologique (`?tech=tech_steel` ouvre une technologie) |
| `/fr/codex` | Bâtiments, recettes, vaisseaux, matières (`?tab=recipes&item=steel`) |
| `/fr/journal` | Journal de bord |
| `/fr/roadmap` | Feuille de route |
| `/fr/media` | Médias et presse |
| `/fr/credits` | Crédits |

## Publication sur GitHub Pages

1. Dépôt GitHub nommé `StellarForge_website` (sinon, changer `--base-href`
   dans le script `build:gh` de `package.json`).
2. Settings > Pages > Source : **GitHub Actions**.
3. Chaque push sur `main` lance `.github/workflows/deploy.yml`.

Le site est alors à `https://<compte>.github.io/StellarForge_website/`.
`404.html` est une copie de `index.html` : les liens directs (`/fr/codex`)
fonctionnent malgré l'absence de serveur.
