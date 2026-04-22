# Scanner CLI : `scripts/scan-skills.ts`

Le scanner est un script TypeScript exécuté par `tsx`. Il parcourt des dossiers à la recherche de fichiers `SKILL.md`, les parse, les catégorise et produit `data/skills.json`.

## Invocation

```bash
npm run scan -- [options]
```

Le `--` est nécessaire pour que npm transmette les flags au script au lieu de les consommer lui-même.

### Scripts pré-configurés

```bash
# Scan avec paramètres passés explicitement
npm run scan -- --input ~/.claude/skills --input ~/.claude/plugins

# Scan avec les chemins par défaut (~/.claude/skills, ~/.claude/plugins, ./my-skills)
npm run scan:default
```

## Options CLI

| Option | Alias | Type | Défaut | Effet |
| --- | --- | --- | --- | --- |
| `--input <path>` | `-i` | chemin | voir ci-dessous | Dossier à scanner. Répétable pour scanner plusieurs emplacements. |
| `--output <file>` | `-o` | chemin | `data/skills.json` | Fichier JSON de sortie. |
| `--verbose` | `-v` | boolean | `false` | Log les erreurs par fichier (utile pour déboguer un SKILL.md mal formé). |
| `--help` | `-h` | boolean | | Affiche l'aide. |

Les chemins acceptent la notation `~/...` pour pointer vers le home de l'utilisateur.

### Dossiers d'entrée par défaut

Si aucun `--input` n'est passé, le scanner utilise :

```
~/.claude/skills       # Skills installés localement
~/.claude/plugins      # Plugins Claude Code installés
./my-skills            # Skills perso du projet (optionnel)
```

## Modèle de sortie

Le fichier produit est un JSON typé `SkillsData` (voir [lib/types.ts](../lib/types.ts)) :

```json
{
  "generatedAt": "2026-04-22T10:00:00.000Z",
  "scannedPaths": ["~/.claude/skills", "~/.claude/plugins"],
  "skills": [ /* ... liste de Skill ... */ ],
  "categories": [ { "id": "design-ui", "label": "Design & UI", "count": 11, "color": "#C88A5C" } ],
  "sources":    [ { "id": "perso", "label": "Perso", "count": 14 } ],
  "plugins":    [ { "name": "superpowers", "count": 14 } ]
}
```

### Structure d'un `Skill`

```json
{
  "slug": "perso-banner-design",
  "name": "banner-design",
  "description": "Design banners for social media, ads, website heroes...",
  "category": "design-ui",
  "tags": ["Design", "Visuel"],
  "source": "perso",
  "plugin": null,
  "path": "/Users/you/.claude/skills/banner-design",
  "displayPath": "~/.claude/skills/banner-design",
  "content": "# Markdown complet du SKILL.md sans frontmatter",
  "frontmatter": { "name": "ckm:banner-design", "description": "..." },
  "lastModified": "2026-04-13T17:34:00.000Z",
  "externalUrl": null
}
```

## Règles de détection

### Détection de la source

Appliquée dans cet ordre, première règle qui match gagne :

1. **Plugin avec manifest** : le scanner remonte les ancêtres du fichier jusqu'à trouver un `plugin.json` ou `.claude-plugin/plugin.json`. Si trouvé, `source = "plugin"` et les métadonnées du manifest sont extraites.
2. **Plugin via pattern de chemin** : si le chemin matche `/plugins/<nom>/skills/...`, le skill est classé `plugin` même sans manifest. C'est le cas de `session-report` par exemple.
3. **Skill perso** : si le chemin contient un segment dans la liste `PERSO_MARKERS` :
   - `my-skills`
   - `Skill_management`
   - `perso-skills`
   - `.claude/skills`
4. **Système** : fallback si aucune des règles précédentes ne matche. Rare en pratique.

### Normalisation du nom

Les SKILL.md synchronisés via Cowork ont souvent un préfixe namespace type `name: ckm:banner-design`. Le scanner strip ce préfixe :

```typescript
const name = rawName.includes(":")
  ? rawName.split(":").pop()!.trim()
  : rawName;
```

Le nom propre est utilisé pour le slug, l'affichage et la détection de catégorie. Le `frontmatter` brut est tout de même conservé dans le JSON pour référence.

### Détection de la catégorie

Dans `lib/categories.ts`, fonction `detectCategory(name, description)` :

1. Si `name` est présent dans `CATEGORY_OVERRIDES`, retourne directement cette catégorie
2. Sinon, pour chaque catégorie, compte les matches de ses `keywords` dans `name + description`
3. Retourne l'id de la catégorie avec le plus grand score
4. Si aucune catégorie ne match, retourne `"autre"`

Voir [categories.md](categories.md) pour la maintenance.

### Génération du slug

```typescript
const slugParts = [source, plugin?.name, name].filter(Boolean);
const slug = slugify(slugParts.join("-"));
```

Exemples :
- Skill perso `banner-design` → `perso-banner-design`
- Skill du plugin `superpowers` nommé `brainstorming` → `plugin-superpowers-brainstorming`
- Skill sans plugin en mode système → `system-<name>`

### Déduplication

Deux skills peuvent produire le même slug (même plugin présent dans plusieurs marketplaces, ou copies dans `cache/`). La fonction `scoreSkillPath` attribue un score à chaque chemin pour décider quel doublon conserver :

| Critère du chemin | Score |
| --- | --- |
| Contient `/.claude/plugins/cache/` | **-100** (disqualifié) |
| Contient `/.claude/skills/` | **+10** |
| Contient `/marketplaces/` | **+5** |
| Autre | pénalité par longueur |

Le skill au plus gros score gagne.

### Dossiers ignorés pendant le scan récursif

Constante `SKIP_DIRS` dans `scan-skills.ts` :

- `node_modules`
- `.next`
- `.git*` (tous les dossiers commençant par `.git`)
- `cache` (pour éviter `~/.claude/plugins/cache/`)

## Cas d'usage

### Scanner tes skills perso et les plugins

```bash
npm run scan -- \
  --input ~/.claude/skills \
  --input ~/.claude/plugins \
  --output data/skills.json
```

### Ajouter un dossier perso hors de `~/.claude/`

```bash
npm run scan -- \
  --input ~/.claude/skills \
  --input ~/.claude/plugins \
  --input ~/Dev/mes-experiences/perso-skills \
  --output data/skills.json
```

Le dossier doit contenir `perso-skills` dans son chemin pour que les skills soient détectés comme perso, sinon ils seront classés "système".

### Déboguer un SKILL.md qui disparaît du catalogue

```bash
npm run scan -- --input ~/.claude/skills --verbose
```

Si un skill n'apparaît pas après scan, les causes les plus fréquentes sont :

1. **Frontmatter invalide** : `name` ou `description` manquants → le skill est silencieusement ignoré. Le mode verbose log l'erreur.
2. **Slug dupliqué** : un autre skill produit le même slug → le déduplicateur en garde un seul. Vérifier avec `grep '"slug"' data/skills.json | sort | uniq -c`.
3. **Chemin dans `SKIP_DIRS`** : le skill est dans un dossier ignoré (ex. `cache/`). Déplacer le skill ou ajuster les `SKIP_DIRS`.

## Ajout d'un marker perso

Si tu veux ajouter un emplacement reconnu comme perso sans casser le comportement existant, édite `PERSO_MARKERS` dans [scripts/scan-skills.ts](../scripts/scan-skills.ts) :

```typescript
const PERSO_MARKERS = [
  "my-skills",
  "Skill_management",
  "perso-skills",
  ".claude/skills",
  "mon-nouveau-dossier",    // ← nouveau marker
];
```

Attention : un plugin qui aurait par hasard un dossier avec ce nom serait mal classé. Les plugins sont détectés en priorité (étape 1 et 2) pour éviter ce cas.

## Invariants

- Le fichier `data/skills.json` est **toujours** committé dans Git : Vercel en a besoin au build et n'a pas accès à ton filesystem local.
- Les slugs sont **stables** : tant qu'un skill ne change pas de source/plugin/name, son slug (et donc son URL) reste identique entre deux scans.
- Le scanner est **idempotent** : deux runs successifs sur les mêmes dossiers produisent un JSON identique (au `generatedAt` près).

## Intégration avec `npm run ship`

Le scanner est rarement lancé seul en pratique : il est appelé par [`scripts/ship.sh`](../scripts/ship.sh) (alias `npm run ship`) qui enchaîne scan → diff sémantique → build → audit → commit → push.

### Quand utiliser `npm run scan` directement

- Quand tu veux juste régénérer `data/skills.json` **sans** publier (par exemple pour vérifier localement qu'un nouveau skill est bien détecté)
- Quand tu dois scanner des dossiers non-standards (ex. un dossier `my-skills` temporaire)
- Quand tu veux passer `--verbose` pour déboguer un SKILL.md mal formé

### Quand utiliser `npm run ship`

- Pour **publier** une mise à jour du catalogue en prod en une commande
- Le script ne committe que `data/skills.json` : si tu as aussi modifié `lib/categories.ts` ou du code, il refusera de partir tant que ces changements ne sont pas committés séparément

### Différence clé

| Aspect | `npm run scan` | `npm run ship` |
| --- | --- | --- |
| Régénère `data/skills.json` | oui | oui (en appelant scan) |
| Filtre les changements superficiels | non (toujours change `generatedAt`) | oui (ignore `generatedAt` et `lastModified` par skill) |
| Lance `npm run build` | non | oui (en sécurité) |
| Lance `npm audit` | non | oui (bloque si CVE critique) |
| Commit + push | non | oui (avec message auto ou fourni) |
| Sortie si rien n'a changé | écrit quand même le JSON | sort avec "Rien à publier" sans polluer Git |

Voir [deployment.md → Raccourci npm run ship](deployment.md#raccourci--npm-run-ship) pour la référence complète du workflow.
