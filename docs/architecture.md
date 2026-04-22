# Architecture

Vue d'ensemble technique du projet **claude-skills-hub** : un catalogue visuel statique de skills Claude (système, plugins et perso) exposé sous forme d'un site Next.js.

## Principe général

Le site est généré statiquement à partir d'un unique fichier de données : [`data/skills.json`](../data/skills.json). Ce fichier est produit par un scanner CLI qui parcourt les dossiers locaux contenant des fichiers `SKILL.md`.

```
┌────────────────────┐      npm run scan      ┌─────────────────┐
│  ~/.claude/skills  │  ──────────────────►   │ data/skills.json│
│  ~/.claude/plugins │                        │   (committé)    │
│  ./my-skills       │                        └────────┬────────┘
└────────────────────┘                                 │
                                                       │ lu au build
                                                       ▼
                                              ┌─────────────────┐
                                              │  Next.js build  │
                                              │  (SSG statique) │
                                              └────────┬────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │ Pages HTML + JS │
                                              │ servies Vercel  │
                                              └─────────────────┘
```

Aucune base de données, aucune API runtime : toutes les pages sont pré-rendues au build (`output: 'static'`).

## Stack technique

| Couche | Technologie | Rôle |
| --- | --- | --- |
| Framework | Next.js 15.5 (App Router) | Routing, SSG, chargement des polices |
| UI | React 19 | Rendu des composants |
| Typage | TypeScript 5.7 | Types partagés `Skill`, `SkillsData`, etc. |
| Styling | Tailwind CSS 3.4 | Utility-first, palette custom terracotta/crème |
| Thème | next-themes 0.4 | Toggle clair/sombre persistant |
| Recherche | Fuse.js 7 | Recherche floue côté client |
| Rendu Markdown | react-markdown + remark-gfm + rehype-highlight + rehype-raw | Rendu des `SKILL.md` dans les pages détail |
| Parsing frontmatter | gray-matter 4 | Parse YAML frontmatter dans les SKILL.md |
| CLI Scanner | tsx 4 | Exécute le scanner TypeScript sans build |
| Icônes | lucide-react | Icônes SVG |

## Arborescence

```
claude-skills-hub/
├── app/                        # App Router Next.js 15
│   ├── layout.tsx              # Layout racine : polices, ThemeProvider
│   ├── page.tsx                # Homepage : Hero + SkillGrid + Footer
│   ├── skills/[slug]/page.tsx  # Page de détail d'un skill (SSG)
│   ├── not-found.tsx           # Page 404
│   └── globals.css             # Variables CSS, styles globaux, .prose-skill
├── components/
│   ├── header.tsx              # Header sticky avec logo + toggle thème
│   ├── hero.tsx                # Bloc titre + stats (4 compteurs)
│   ├── filters.tsx             # Barre de recherche + pills catégorie/source
│   ├── skill-grid.tsx          # Orchestre Fuse + regroupe par source
│   ├── skill-card.tsx          # Carte individuelle d'un skill
│   ├── footer.tsx              # Pied de page : date de scan, chemins
│   ├── empty-first-run.tsx     # Écran vide si skills.json inexistant
│   ├── theme-provider.tsx      # Wrapper next-themes
│   ├── theme-toggle.tsx        # Bouton bascule clair/sombre
│   └── copy-path-button.tsx    # Bouton "Copier chemin" (page détail)
├── lib/
│   ├── types.ts                # Skill, SkillsData, SkillSource, SkillPlugin
│   ├── skills.ts               # Chargement de skills.json au build
│   ├── categories.ts           # CATEGORIES, CATEGORY_OVERRIDES, TAG_OVERRIDES
│   └── utils.ts                # cn, slugify, daysSince, formatRelativeDays
├── scripts/
│   ├── scan-skills.ts          # CLI qui génère data/skills.json
│   ├── ship.sh                 # Workflow de publication (scan + build + commit + push)
│   └── release.sh              # Workflow de release SemVer (bump + tag + release GitHub)
├── data/
│   └── skills.json             # Données produites par le scan (committé)
├── docs/                       # Cette documentation
├── public/                     # Assets statiques (vide pour l'instant)
├── tailwind.config.ts          # Palette, fonts, animations
├── next.config.mjs             # reactStrictMode, optimizePackageImports
├── tsconfig.json               # Config TypeScript
└── package.json
```

## Flux de données

### 1. Collecte (local)

`scripts/scan-skills.ts` :

1. Accepte une liste de dossiers via `--input` (répétable)
2. Parcourt récursivement à la recherche de fichiers `SKILL.md`
3. Pour chaque fichier :
   - Parse le YAML frontmatter via `gray-matter`
   - Normalise le `name` (strip du préfixe `namespace:` type `ckm:banner-design`)
   - Détermine la source (`plugin` / `perso` / `system`) selon le chemin
   - Détermine la catégorie via `CATEGORY_OVERRIDES` puis heuristique de mots-clés
   - Génère un slug unique `{source}-{plugin?}-{name}`
4. Déduplique par slug (évite les copies `~/.claude/plugins/cache/`)
5. Agrège : catégories, sources, plugins avec leurs compteurs
6. Écrit `data/skills.json`

Voir [scanner-cli.md](scanner-cli.md) pour le détail.

### 2. Build (CI/CD Vercel)

`next build` déclenche :

1. `app/page.tsx` appelle `loadSkillsData()` qui lit `data/skills.json`
2. `app/skills/[slug]/page.tsx` appelle `generateStaticParams()` pour pré-rendre une page par skill
3. Tailwind compile le CSS depuis les classes utilisées dans `app/` et `components/`
4. Next.js produit du HTML statique + chunks JS minimaux

### 3. Runtime (navigateur)

- La homepage sert une grille de cartes déjà rendue côté serveur
- Le client React hydrate les composants interactifs (filtres, recherche, thème)
- La recherche se fait **entièrement côté client** via Fuse.js sur les skills
- Chaque page détail est un fichier HTML statique indépendant

### 4. Publication (workflow quotidien)

Le script `scripts/ship.sh` (alias `npm run ship`) encapsule la boucle de publication :

```
Skills modifiés localement  →  npm run ship  →  scan  →  diff sémantique  →  build  →  audit  →  commit  →  push
                                                                                                              │
                                                                                                              ▼
                                                                                                   Vercel build & deploy
```

Le script détecte automatiquement les skills ajoutés, retirés et modifiés en comparant l'ancien et le nouveau `data/skills.json` (en ignorant `lastModified` qui peut bouger sans vrai changement de contenu). Il génère un message de commit adapté au type et au nombre de changements.

Voir [scanner-cli.md](scanner-cli.md#intégration-avec-npm-run-ship) et [deployment.md](deployment.md#raccourci--npm-run-ship) pour le détail.

## Choix techniques notables

### App Router Next.js 15

Utilisé pour bénéficier du SSG par défaut et de la génération des pages détail via `generateStaticParams`. Aucun usage des features runtime (Server Actions, Server Components dynamiques, route handlers).

### React 19

Compatible avec Next.js 15. Les composants interactifs sont marqués `"use client"`. Pas de framer-motion sur la homepage : ses `layout` animations étaient instables avec React 19 et généraient des erreurs "Encountered two children with the same key" sous hot reload.

### Pas d'ORM, pas de base de données

`data/skills.json` joue le rôle de "source de vérité" et est versionné dans Git. Cela rend le build 100% déterministe et permet à Vercel de builder sans accès au disque local.

### Détection de catégorie : overrides > keywords > "autre"

`lib/categories.ts` expose un mapping explicite `CATEGORY_OVERRIDES` (nom de skill vers id de catégorie) prioritaire sur la détection automatique par mots-clés. Ça permet de corriger les mauvaises classifications sans bricoler le scanner.

### Déduplication des skills par slug

Le dossier `~/.claude/plugins/cache/` contient des copies versionnées des plugins déjà présents dans `~/.claude/plugins/marketplaces/`. Le scanner les ignore explicitement (`SKIP_DIRS`) et applique en plus une déduplication par slug (`scoreSkillPath`) comme ceinture de sécurité.

### Pastille "Récent" uniquement pour les skills perso

Les fichiers de plugins ont une `mtime` qui reflète la date de dernière synchronisation Claude Code (souvent le jour même), pas la vraie date de mise à jour du skill. La pastille "Récent" dans [skill-card.tsx](../components/skill-card.tsx) n'est donc affichée que pour `source === "perso"`.

## Modèle de données principal

Types définis dans [lib/types.ts](../lib/types.ts) :

```typescript
type SkillSource = "system" | "plugin" | "perso";

interface Skill {
  slug: string;             // unique, URL-safe
  name: string;             // nom normalisé, sans préfixe namespace
  description: string;      // depuis le frontmatter
  category: string;         // id de CATEGORIES
  tags: string[];           // TAG_OVERRIDES + frontmatter.tags
  source: SkillSource;
  plugin?: { name: string; version?: string; description?: string; author?: string };
  path: string;             // chemin absolu du dossier du skill
  displayPath: string;      // version lisible avec ~
  content: string;          // corps du SKILL.md (sans frontmatter)
  frontmatter: Record<string, unknown>;
  lastModified: string;     // ISO date
  externalUrl?: string;     // fm.url ou fm.repo
}

interface SkillsData {
  generatedAt: string;
  scannedPaths: string[];
  skills: Skill[];
  categories: { id: string; label: string; count: number; color: string }[];
  sources: { id: SkillSource; label: string; count: number }[];
  plugins: { name: string; count: number }[];
}
```

## Limitations connues

- Le scanner lit uniquement des fichiers `SKILL.md` : les autres formats de skills ne sont pas détectés
- La date `lastModified` est celle du filesystem, pas celle du commit Git du skill d'origine
- La recherche côté client charge tous les skills en mémoire : acceptable jusqu'à quelques centaines d'items, au-delà il faudrait indexer côté build
- Les plugins sans `plugin.json` sont détectés via un pattern de chemin `.claude/plugins/<name>/skills/` — ça peut casser si Claude Code change sa convention de layout
