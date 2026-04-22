# Guide des composants

Inventaire des composants React du projet. Chaque entrée précise le rôle, les props, l'état interne et les dépendances clés.

## Pages (App Router)

### `app/layout.tsx`

Layout racine de l'application.

- Charge les polices Google (`Inter`, `Source_Serif_4`, `JetBrains_Mono`) via `next/font/google` et les expose comme variables CSS (`--font-sans`, `--font-serif`, `--font-mono`).
- Monte le `ThemeProvider` (next-themes) avec `defaultTheme="light"` et `enableSystem`.
- `suppressHydrationWarning` est actif sur `<html>` car next-themes modifie la classe côté client avant hydration.

Modifier les polices se fait ici. Ne pas ajouter de logique métier dans ce fichier.

### `app/page.tsx`

Homepage. Composant serveur, sans état.

- Appelle `loadSkillsData()` au rendu serveur
- Affiche `<EmptyStateFirstRun>` si le JSON est vide, sinon `<Hero>` + `<SkillGrid>` + `<Footer>`

### `app/skills/[slug]/page.tsx`

Page de détail d'un skill. Composant serveur asynchrone.

- `generateStaticParams()` pré-rend une page par skill au build
- `generateMetadata()` produit un `<title>` et `<meta description>` par skill
- Rend le `SKILL.md` via `react-markdown` avec les plugins :
  - `remarkGfm` pour tables, strikethrough, checklists
  - `rehypeRaw` pour laisser passer du HTML inline
  - `rehypeHighlight` pour la coloration syntaxique des blocs de code
- Affiche un bloc d'infos (chemin + bouton "Copier", date de modification, URL externe le cas échéant)

Les styles du Markdown rendu sont définis dans `.prose-skill` dans [app/globals.css](../app/globals.css).

### `app/not-found.tsx`

Page 404 custom. Statique, sans état.

## Composants de layout

### `components/header.tsx`

Header sticky avec logo, titre, lien vers la doc officielle Claude Skills et `<ThemeToggle>`.

Composant serveur (pas de `"use client"`).

### `components/hero.tsx`

Bloc titre principal avec 4 compteurs statistiques (Total, Perso, Plugins, Système).

**Props** : `data: SkillsData`

Les compteurs sont lus depuis `data.sources`. Si une source a `count=0`, elle affiche `0`.

### `components/footer.tsx`

Pied de page avec date du dernier scan et liste des dossiers scannés.

**Props** : `data: SkillsData`

### `components/empty-first-run.tsx`

Affiché si `data.skills.length === 0`. Explique les commandes à lancer pour peupler le catalogue.

Statique. Pas de props.

## Composants interactifs (client)

### `components/skill-grid.tsx`

Orchestre la logique de filtrage/recherche et le rendu de la grille.

**Props** : `data: SkillsData`

**État local** :
- `query: string` — contenu de la barre de recherche
- `category: string | null` — id de catégorie filtrée
- `source: string | null` — id de source filtrée

**Logique** :

1. Instancie un `Fuse` avec pondération sur `name`, `description`, `tags`, `category`, `plugin.name`
2. Si `query` est non vide, la base devient `fuse.search(query).map(r => r.item)`, sinon `data.skills`
3. Filtre ensuite par `category` et `source`
4. Regroupe les résultats par `source` selon l'ordre `SOURCE_ORDER = ["perso", "system", "plugin"]`
5. Rend un `<SourceSection>` par groupe non vide

Si tous les filtres donnent 0 résultat, affiche un `<EmptyState>`.

Pas de framer-motion : les animations `layout` étaient instables sous React 19 et généraient des erreurs de clés dupliquées.

### `components/filters.tsx`

Barre de recherche + pills de filtrage catégorie/source.

**Props** :
- `data: SkillsData`
- `activeCategory: string | null`
- `activeSource: string | null`
- `query: string`
- `onQueryChange: (q: string) => void`
- `onCategoryChange: (id: string | null) => void`
- `onSourceChange: (id: string | null) => void`
- `resultCount: number`
- `onReset: () => void`

**Comportement** : une pill active masque sa couleur de bordure et affiche le fond plein. Cliquer à nouveau sur une pill active la désactive. Le bouton "Réinitialiser" n'apparaît que si au moins un filtre est actif.

La recherche est débouncée **par Fuse lui-même** (instant filter avec threshold 0.35). Aucun debounce explicite côté composant.

### `components/skill-card.tsx`

Carte individuelle d'un skill dans la grille.

**Props** :
- `skill: Skill`
- `index?: number` — conservé pour compat, non utilisé actuellement

**Structure visuelle** :

```
┌──────────────────────────────────┐
│ [Catégorie]  [Source]  [Récent?] │  ← badges
│                                  │
│ nom-du-skill                     │  ← clickable vers /skills/{slug}
│ Description en 4 lignes max      │
│                                  │
│ [plugin-name si applicable]      │
│ [tag1] [tag2] [tag3] [tag4]      │
│                                  │
│ [Chemin] [SKILL.md] [↗]          │  ← actions
└──────────────────────────────────┘
```

**Pastille "Récent"** :
- Affichée uniquement si `source === "perso"` ET `daysSince(lastModified) <= 7`
- Seuil configurable via la constante `RECENT_THRESHOLD_DAYS`
- Utilise les classes Tailwind `bg-emerald-*`

**Actions** :
- Bouton "Chemin" : copie `skill.displayPath` dans le presse-papier via `navigator.clipboard.writeText`
- Lien "SKILL.md" : navigue vers la page détail
- Icône flèche : lien externe (`target="_blank"`) si `skill.externalUrl` est défini

### `components/theme-toggle.tsx`

Bouton bascule clair/sombre. Utilise `useTheme()` de next-themes.

Monté avec un `useEffect(() => setMounted(true), [])` pour éviter un mismatch d'hydration (le thème réel n'est connu que côté client).

### `components/theme-provider.tsx`

Wrapper typé autour de `next-themes`. Permet de simplifier l'API dans `layout.tsx`.

### `components/copy-path-button.tsx`

Bouton "Copier" autonome utilisé dans la page détail. Comportement identique à celui dans `skill-card.tsx` mais séparé pour pouvoir l'utiliser hors card.

## Tableau récapitulatif

| Composant | Type | Props | Dépendances |
| --- | --- | --- | --- |
| `Header` | Serveur | aucune | `ThemeToggle`, `next/link` |
| `Hero` | Serveur | `data` | — |
| `Footer` | Serveur | `data` | — |
| `EmptyStateFirstRun` | Serveur | aucune | — |
| `SkillGrid` | Client | `data` | Fuse.js, `SkillCard`, `Filters` |
| `Filters` | Client | voir plus haut | — |
| `SkillCard` | Client | `skill` | `next/link`, `lib/utils` |
| `ThemeToggle` | Client | aucune | next-themes |
| `ThemeProvider` | Client | children | next-themes |
| `CopyPathButton` | Client | `path` | — |

## Conventions

- **Server vs Client** : par défaut serveur, `"use client"` uniquement si le composant a un état, un effet, ou un event handler DOM
- **Nommage des fichiers** : kebab-case (ex. `skill-card.tsx`), export nommé en PascalCase (ex. `SkillCard`)
- **Pas de CSS-in-JS** : uniquement Tailwind + variables CSS dans `globals.css`
- **Pas d'abstractions prématurées** : un composant ne vit que dans un fichier, pas de dossiers `components/skill-card/index.tsx`
- **Accessibilité** : `aria-label` sur les boutons icônes, `alt` sur les images (aucune pour l'instant), `type="button"` explicite sur tous les `<button>` pour éviter les submits accidentels
