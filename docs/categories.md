# Gestion des catégories

Les catégories servent à filtrer les skills sur la homepage et à leur donner une couleur d'accent. Toute la logique vit dans [lib/categories.ts](../lib/categories.ts).

## Trois structures à connaître

### 1. `CATEGORIES` — la liste des catégories

```typescript
export const CATEGORIES: CategoryDef[] = [
  {
    id: "design-ui",         // identifiant stable, kebab-case
    label: "Design & UI",    // affiché dans les filtres et les cartes
    color: "#C88A5C",        // couleur d'accent
    keywords: [              // utilisés pour la détection automatique
      "design", "ui", "ux", "tailwind", "shadcn",
      "brand", "banner", "slide", "typography"
    ],
  },
  // ...
];
```

L'entrée `autre` sert de fallback et doit rester en **dernière position**. Elle a un tableau `keywords` vide.

### 2. `CATEGORY_OVERRIDES` — mapping explicite

Prioritaire sur la détection automatique. Utile pour forcer une catégorie sur un skill dont le nom ou la description ne match pas les keywords.

```typescript
export const CATEGORY_OVERRIDES: Record<string, string> = {
  "banner-design": "design-ui",
  "dataverse-crud-react": "power-platform",
  "context7-mcp": "mcp",
  // ...
};
```

Clé : nom du skill (après normalisation, donc **sans** le préfixe namespace type `ckm:`).

### 3. `TAG_OVERRIDES` — étiquettes additionnelles

Ajoute des tags affichés sous forme de petites étiquettes sous la description de chaque carte.

```typescript
export const TAG_OVERRIDES: Record<string, string[]> = {
  "banner-design": ["Design", "Visuel"],
  "power-apps-code-app": ["Power Apps", "Dataverse", "PAC"],
};
```

Ces tags se cumulent avec ceux éventuellement présents dans le `tags:` du frontmatter du SKILL.md.

## Ajouter une nouvelle catégorie

1. Ouvre [lib/categories.ts](../lib/categories.ts)
2. Ajoute un objet dans `CATEGORIES` **avant** l'entrée `autre` :

```typescript
{
  id: "ma-cat",
  label: "Ma Catégorie",
  color: "#5A9E7A",
  keywords: ["mot-cle-1", "mot-cle-2", "synonyme"],
},
```

3. (Optionnel) Force certains skills dans cette catégorie via `CATEGORY_OVERRIDES` si les keywords ne suffisent pas
4. Relance le scan pour régénérer `data/skills.json` :

```bash
npm run scan -- --input ~/.claude/skills --input ~/.claude/plugins
```

5. Vérifie en dev :

```bash
npm run dev
```

La catégorie apparaît automatiquement dans les filtres si au moins un skill y est rangé (la catégorie n'apparaît pas si `count=0`).

### Choisir une couleur

Palette existante pour cohérence visuelle :

| Catégorie | Couleur | Utilisation |
| --- | --- | --- |
| Documents | `#CC785C` | Terracotta signature (ne pas réutiliser) |
| Productivité | `#8B7AA8` | Violet doux |
| Meta-skills | `#6B8CAE` | Bleu gris |
| Développement | `#5A9E7A` | Vert forêt |
| Data & Analyse | `#C7A45C` | Jaune terre |
| Communication | `#D98A9F` | Rose doux |
| Création | `#B9786B` | Brique |
| Design & UI | `#C88A5C` | Orange cuivré |
| Power Platform | `#5A7EB8` | Bleu Microsoft |
| Documentation | `#7BA070` | Vert pâle |
| Intégrations MCP | `#A87BBE` | Violet |
| Autre | `#8E8578` | Gris chaud (fallback) |

Privilégier des couleurs saturées modérément (entre 40 et 65% de saturation) pour rester cohérent avec l'esprit Anthropic.

## Modifier les keywords d'une catégorie

Les `keywords` sont des sous-chaînes cherchées dans `name + description` d'un skill (lowercase, `includes`). Un keyword multi-mots (ex. `"design system"`) fonctionne car `includes` accepte les espaces.

**Priorité** : un skill est attribué à la catégorie qui totalise **le plus grand nombre de keywords matchés**. En cas d'égalité, la première catégorie dans l'ordre de `CATEGORIES` gagne.

Règles :

- Privilégier les termes **discriminants** : `"shadcn"` est plus utile que `"react"` qui matche trop de choses
- Éviter les synonymes trop proches de keywords d'une autre catégorie (ex. `"design"` pourrait être dans Création ET Design & UI)
- Les keywords sont matchés avec `includes` donc `"design"` matche aussi `"designer"`, `"redesign"`, etc.

## Forcer une catégorie sur un skill

Si la détection automatique classe un skill dans la mauvaise catégorie :

```typescript
export const CATEGORY_OVERRIDES: Record<string, string> = {
  "mon-skill": "design-ui",
};
```

La clé doit correspondre au `name` **après** normalisation. Exemple : un skill avec `name: ckm:banner-design` dans son frontmatter sera connu sous le nom `banner-design` (le préfixe `ckm:` est strippé par le scanner). C'est ce dernier qu'il faut utiliser comme clé d'override.

## Retirer une catégorie

1. Retirer l'objet de `CATEGORIES`
2. Retirer toutes les entrées de `CATEGORY_OVERRIDES` qui pointaient vers cet id
3. Relancer le scan : les skills concernés retomberont dans une autre catégorie via la détection par mots-clés, ou dans `autre` si rien ne match
4. Vérifier en dev que rien ne casse

Ne jamais garder un id de catégorie "fantôme" dans les overrides : le scanner n'émet pas d'erreur mais `getCategory()` fera le fallback vers `autre`, créant de la confusion.

## Effet de bord sur le scan

Changer `lib/categories.ts` ne regénère pas automatiquement `data/skills.json`. Il faut relancer `npm run scan` pour que les nouvelles catégories soient appliquées. Les filtres de la homepage sont calculés à partir du JSON, pas à partir du code.

## Workflow de publication pour un changement de catégories

Attention : `npm run ship` **ne couvre pas** les modifications de `lib/categories.ts`. Le script ne committe que `data/skills.json` et refuse de partir s'il détecte d'autres changements non-committés.

Pour publier une modification de catégories, le workflow manuel est :

```bash
# 1. Modifier lib/categories.ts (ajout / override / couleur / keywords)
# 2. Régénérer skills.json avec la nouvelle classification
npm run scan -- --input ~/.claude/skills --input ~/.claude/plugins

# 3. Vérifier en local
npm run dev  # ou npm run build

# 4. Commit + push des DEUX fichiers ensemble
git add lib/categories.ts data/skills.json
git commit -m "update: nouvelle catégorie X / override skill Y"
git push
```

C'est fait séparément parce qu'une modification de catégories est une opération éditoriale (choix humain : quelle couleur, quels mots-clés, quel nom) et n'a pas à être enchaînée automatiquement avec un simple ajout de skill.
