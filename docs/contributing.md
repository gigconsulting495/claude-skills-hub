# Workflow de contribution

Guide pour développer, tester et pousser des changements dans **claude-skills-hub**.

## Prérequis

- Node.js 20 ou plus récent
- npm 10 ou plus récent
- Un clone du repo : `git clone https://github.com/gigconsulting495/claude-skills-hub.git`
- Accès en écriture sur `main` (contribution directe) OU un fork (PR)

## Setup initial

```bash
npm install
npm run dev
```

Le serveur de dev démarre sur `http://localhost:3000`. Si `data/skills.json` est vide, la page affiche un écran d'onboarding au lieu de la grille.

Pour peupler le catalogue avec tes propres skills :

```bash
npm run scan:default
```

## Boucle de développement

```bash
# Terminal 1 : serveur de dev (hot reload)
npm run dev

# Terminal 2 : lint et typage au fil du développement
npm run lint

# Après chaque modif de SKILL.md ou de lib/categories.ts
npm run scan -- --input ~/.claude/skills --input ~/.claude/plugins
```

### Publier une mise à jour

Quand tu as modifié des SKILL.md dans `~/.claude/skills/` ou `~/.claude/plugins/` et que tu veux mettre à jour le site en prod, le raccourci est :

```bash
# Message de commit auto-généré (ajouts/modifs/retraits détectés)
npm run ship

# Message custom si tu veux enrichir le contexte
npm run ship -- "add: skill X pour ticket INGEST-1234"
```

Le script enchaîne scan + build + audit + commit + push. Aucune action manuelle ensuite : Vercel rebuild et déploie en 1 à 2 minutes. Voir [deployment.md → Raccourci npm run ship](deployment.md#raccourci--npm-run-ship) pour le détail.

Pour des modifications autres (composants, catégories, doc), reste sur le workflow Git manuel — `ship` ne committe que `data/skills.json`.

### Règle importante : ne pas mélanger `npm run build` et `npm run dev`

Les deux commandes écrivent dans `.next/` avec des artefacts incompatibles. Lancer un `build` pendant qu'un `dev` tourne corrompt les chunks webpack et casse le serveur de dev (erreur `Cannot find module './213.js'`, CSS en 404).

**Procédure pour tester un build de prod localement** :

```bash
# Arrêter le serveur de dev (Ctrl+C)
rm -rf .next
npm run build
npm run start   # serve le build de prod sur localhost:3000
```

## Checklist avant de pousser

Avant chaque `git push` :

- [ ] `npm run lint` passe sans erreur
- [ ] `npm run build` passe sans erreur ni warning de typage
- [ ] `npm audit` ne rapporte pas de vulnérabilité critique sur `next` (sinon Vercel refusera le deploy)
- [ ] Le serveur de dev affiche correctement la homepage et au moins une page détail
- [ ] `data/skills.json` est committé si modifié (ne jamais laisser l'ancien JSON après un scan)
- [ ] Aucune clé API, token personnel ou chemin absolu sensible dans le diff

Commande combinée :

```bash
npm run lint && npm run build && npm audit
```

Pour la procédure d'upgrade quand `npm audit` signale une CVE sur Next.js, voir [deployment.md → Mise à jour des dépendances](deployment.md#mise-à-jour-des-dépendances-sécurité).

## Conventions de code

### TypeScript

- Strict mode actif (`"strict": true` dans `tsconfig.json`)
- Types partagés dans [lib/types.ts](../lib/types.ts) : ne pas dupliquer les définitions dans les composants
- Pas de `any`. Si une coercion est nécessaire, utiliser `unknown` + type guard
- Pas de `// @ts-ignore` sans commentaire expliquant pourquoi

### React

- Server Components par défaut, `"use client"` uniquement si nécessaire (état, effet, event handler)
- Props typées via `interface Props { ... }` (pas d'inline type sauf composant trivial)
- `key` stable et unique dans chaque `.map()` (voir le bug des clés dupliquées résolu dans `scan-skills.ts`)

### Styling

- Tailwind uniquement. Pas de CSS modules, pas de CSS-in-JS, pas de `styled-components`
- Variables CSS dans `app/globals.css` pour les tokens réutilisés (couleurs, fond, texte)
- La palette custom est dans `tailwind.config.ts` (`cream`, `ink`, `terracotta`)
- Dark mode via `class` (activé par next-themes) : utiliser `dark:` prefix

### Commits

Format : `<type>: <description courte>` en français, ton direct, sans emoji.

Types courants :

| Type | Utilisation |
| --- | --- |
| `add` | Ajout d'une nouvelle fonctionnalité ou d'un nouveau skill dans le JSON |
| `update` | Modification d'une fonctionnalité existante |
| `fix` | Correction de bug |
| `docs` | Changement dans `docs/` ou `README.md` |
| `refactor` | Réorganisation de code sans changement fonctionnel |
| `chore` | Maintenance (deps, config, build) |

Exemples :

```
add: catégorie Power Platform et overrides Dataverse
fix: déduplication des skills par slug pour éviter les clés React dupliquées
update: scanner classe désormais ~/.claude/skills comme perso
docs: guide de déploiement Vercel et CNAME one.com
```

Pour les commits générés avec Claude Code, ajouter le trailer standard :

```
Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

### Structure des fichiers

- Un composant = un fichier (`components/skill-card.tsx`, pas `components/skill-card/index.tsx`)
- Nommage kebab-case pour les fichiers, PascalCase pour les exports
- Les helpers transverses vont dans `lib/utils.ts`, les types dans `lib/types.ts`, les catégories dans `lib/categories.ts`

## Ajouter un composant

1. Créer `components/mon-composant.tsx`
2. Typer les props dans une interface locale
3. Si serveur : pas de `"use client"`. Si client (état, effet, event) : `"use client"` en haut
4. Import nommé :

```typescript
export function MonComposant({ ... }: Props) {
  return (...)
}
```

5. L'importer dans le fichier qui l'utilise : `import { MonComposant } from "@/components/mon-composant";`

L'alias `@/` pointe sur la racine du projet (défini dans `tsconfig.json`).

## Ajouter un skill perso

Deux options :

### Option 1 : dossier local dans le projet

```
claude-skills-hub/
└── my-skills/
    └── mon-super-skill/
        └── SKILL.md
```

Format du `SKILL.md` :

```markdown
---
name: mon-super-skill
description: Description courte (une phrase, sans retour à la ligne).
tags: [Tag1, Tag2]
---

# Contenu Markdown complet du skill
```

Puis pour voir le résultat en local :

```bash
npm run scan:default
npm run dev
```

### Option 2 : via `~/.claude/skills/` (recommandé pour le quotidien)

Déposer le dossier dans `~/.claude/skills/mon-super-skill/` puis :

```bash
npm run ship
```

Le skill sera automatiquement détecté comme perso (via le marker `.claude/skills` dans `PERSO_MARKERS`), et `npm run ship` :

- lance le scan
- détecte le nouveau skill (ADDED)
- génère un message de commit `add: mon-super-skill`
- push → Vercel redéploie

Tu n'as **rien d'autre à faire**. Le site en prod est à jour en 1 à 2 minutes.

## Modifier le scanner

Fichier : [scripts/scan-skills.ts](../scripts/scan-skills.ts).

Pour tester une modification du scanner sans toucher au JSON committé :

```bash
npm run scan -- --input ~/.claude/skills --output /tmp/test.json
diff <(jq -S . data/skills.json) <(jq -S . /tmp/test.json)
```

Si le diff montre exactement les changements attendus, écraser le JSON officiel :

```bash
npm run scan:default
git add data/skills.json scripts/scan-skills.ts
git commit -m "update: scanner supporte X"
```

## Résoudre les bugs connus

### "Encountered two children with the same key"

Cause : deux skills produisent le même slug. Vérifier :

```bash
jq '.skills | group_by(.slug) | map(select(length > 1)) | map(.[0].slug)' data/skills.json
```

Si le tableau est non vide, ajuster `scoreSkillPath` dans `scan-skills.ts` ou ajouter un segment dans le calcul du slug pour différencier les doublons.

### "Cannot find module './213.js'" en dev

Cause : cache `.next` corrompu (voir ci-dessus).

Fix :

```bash
lsof -ti:3000 | xargs kill -9 2>/dev/null
rm -rf .next
npm run dev
```

### Hydration mismatch sur le thème

Cause : next-themes modifie `<html class="...">` côté client avant hydration.

Fix : s'assurer que `app/layout.tsx` a bien `suppressHydrationWarning` sur `<html>`. C'est déjà en place.

## Revue de code (pour contributeurs externes)

Si tu ouvres une PR vers ce repo :

1. Fork → branch dédiée
2. Commits atomiques (1 changement logique = 1 commit)
3. Description de PR claire : contexte, changement, impact
4. Attendre la CI Vercel (Preview Deployment automatique sur chaque PR)
5. Tester le Preview Deployment avant merge

Le merge est en principe fait en **squash-merge** pour garder `main` linéaire.

## Contact

Pour des questions qui ne trouvent pas de réponse dans la doc :

- Ouvrir une Issue GitHub sur le repo
- Pinger `gigconsulting495` sur GitHub
