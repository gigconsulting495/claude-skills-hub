# Claude Skills Hub

[![Live](https://img.shields.io/badge/live-skills.gig--consulting.com-CC785C?style=flat-square)](https://skills.gig-consulting.com) [![Next.js](https://img.shields.io/badge/Next.js-15.5-000?style=flat-square)](https://nextjs.org) [![Deployed on Vercel](https://img.shields.io/badge/deployed%20on-Vercel-000?style=flat-square)](https://vercel.com)

Catalogue visuel des skills Claude (système, plugins et skills perso) exposé sous forme d'un site Next.js statique avec filtres par catégorie, filtres par source, recherche floue et rendu Markdown complet du `SKILL.md`.

Site en ligne : **[skills.gig-consulting.com](https://skills.gig-consulting.com)**. Chaque push sur `main` déclenche un redéploiement Vercel automatique.

> Pour la doc technique détaillée (architecture, scanner CLI, composants, déploiement, contribution), voir [docs/README.md](docs/README.md).

## Stack technique

- Next.js 15.5 (App Router, génération statique)
- React 19 + TypeScript 5.7
- Tailwind CSS 3.4 avec palette custom (crème `#F0EEE6` + terracotta `#CC785C`)
- Framer Motion (animations), Fuse.js (recherche floue)
- react-markdown + remark-gfm + rehype-highlight (rendu du `SKILL.md`)
- next-themes (toggle clair/sombre)
- gray-matter + tsx (script de scan)

## Installation

```bash
npm install
```

## Commandes principales

| Commande                    | Effet                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------ |
| `npm run scan`              | Scanne des dossiers passés en `--input` et écrit `data/skills.json`                  |
| `npm run scan:default`      | Scan avec les chemins par défaut (`~/.claude/skills`, `~/.claude/plugins`, `./my-skills`) |
| `npm run dev`               | Démarre le serveur de dev sur `http://localhost:3000`                                |
| `npm run build`             | Compile une version statique optimisée dans `.next/`                                 |
| `npm run start`             | Lance la version buildée (équivalent à ce que Vercel sert en prod)                   |
| `npm run lint`              | Lint ESLint avec la config Next.js                                                   |
| `npm run ship`              | Scan + détection auto des changements + build + audit + commit + push (message auto-généré) |
| `npm run ship -- "msg"`     | Idem, avec message de commit forcé. Voir [docs/deployment.md](docs/deployment.md) |

### Exemple de scan ciblé

```bash
npm run scan -- \
  --input ~/.claude/skills \
  --input ~/.claude/plugins \
  --output data/skills.json
```

Le scanner :

- Parcourt récursivement chaque chemin à la recherche de fichiers `SKILL.md`
- Parse le YAML frontmatter (`name`, `description`, `tags`, etc.)
- Retire automatiquement les préfixes de namespace (ex : `ckm:banner-design` devient `banner-design`)
- Détecte la source de chaque skill : `system` (Claude Code natif), `plugin` (présence d'un `plugin.json` dans un dossier parent) ou `perso` (chemin contenant `my-skills`, `Skill_management` ou `perso-skills`)
- Détermine la catégorie via `CATEGORY_OVERRIDES` (mapping explicite) puis, à défaut, via la détection par mots-clés
- Produit un `data/skills.json` qui est lu au build par le site

## Ajouter un skill perso

Deux options :

**Option 1 — dossier local dans le projet**

```
claude-skills-hub/
└── my-skills/
    └── mon-super-skill/
        └── SKILL.md
```

**Option 2 — emplacement dédié à tes skills perso**

Dépose le dossier dans n'importe quel chemin contenant le segment `my-skills`, `Skill_management` ou `perso-skills`, puis passe ce chemin au scanner via `--input`.

Dans les deux cas, le skill sera automatiquement marqué `source=perso` et affiché en tête de la grille.

Format attendu du `SKILL.md` :

```markdown
---
name: mon-super-skill
description: Description courte affichée sur la carte.
tags: [Tag1, Tag2]
---

# Contenu Markdown complet du skill
```

Après ajout : relance `npm run scan` puis `npm run build` (ou laisse Vercel rebuilder sur push).

## Personnaliser les catégories

Ouvre [lib/categories.ts](lib/categories.ts). Trois structures à ajuster selon tes besoins :

- `CATEGORIES` — la liste des catégories affichées comme filtres (id, label, couleur d'accent, mots-clés de détection auto)
- `CATEGORY_OVERRIDES` — mapping explicite `nom-du-skill → id-catégorie` (prioritaire sur la détection par mots-clés)
- `TAG_OVERRIDES` — tags additionnels affichés sous forme de petites étiquettes sur chaque carte

Les catégories actuellement disponibles :

- Documents, Productivité, Meta-skills, Développement, Data & Analyse, Communication, Création
- Design & UI, Power Platform, Documentation, Intégrations MCP (ajoutées pour couvrir les skills perso)
- Autre (fallback)

Pour ajouter une catégorie, insère un nouvel objet dans `CATEGORIES` avant l'entrée `autre`, choisis un id unique, une couleur d'accent cohérente avec la palette, et ajoute quelques mots-clés pertinents ou des overrides explicites.

## Workflow de mise à jour

```
1. Ajouter/modifier un SKILL.md dans ~/.claude/skills ou dans my-skills/
2. npm run scan -- --input ~/.claude/skills --input ~/.claude/plugins
3. git add data/skills.json lib/categories.ts
4. git commit -m "update: nouveau skill X"
5. git push
```

Vercel redéploie automatiquement sur chaque push vers `main`.

## Déploiement Vercel

### Première mise en ligne

1. Va sur [vercel.com](https://vercel.com) et connecte-toi avec ton compte GitHub.
2. Clique **Add New → Project**, puis **Import Git Repository** et sélectionne le repo `gigconsulting495/claude-skills-hub`.
3. Vercel détecte automatiquement Next.js. Laisse tous les paramètres par défaut :
   - Framework preset : Next.js
   - Root directory : `./`
   - Build command : `npm run build`
   - Output : géré par Next.js
4. Aucune variable d'environnement à configurer.
5. Clique **Deploy**. Le build prend environ 1 à 2 minutes.

Une fois le premier déploiement terminé, Vercel expose le site sur un domaine `*.vercel.app`.

### Ajouter le sous-domaine `skills.gig-consulting.com`

Côté **Vercel** :

1. Ouvre le projet → **Settings → Domains**.
2. **Add Domain** : tape `skills.gig-consulting.com`.
3. Vercel affiche l'enregistrement DNS attendu, typiquement un CNAME pointant vers `cname.vercel-dns.com`. Copie cette valeur.

Côté **one.com** (registrar du domaine `gig-consulting.com`) :

1. Connecte-toi sur [one.com](https://www.one.com), va dans l'admin du domaine `gig-consulting.com`.
2. Section **DNS / Zone DNS / Advanced DNS**.
3. Ajoute un enregistrement CNAME :
   - Nom / Host : `skills`
   - Type : `CNAME`
   - Valeur / Target : `cname.vercel-dns.com` (ou la cible fournie par Vercel)
   - TTL : `3600`
4. Sauvegarde.

La propagation DNS prend de quelques minutes à 1 heure. Vercel provisionne automatiquement un certificat HTTPS Let's Encrypt dès que le CNAME est résolu. Le site est ensuite accessible sur `https://skills.gig-consulting.com`.

Le site principal `gig-consulting.com` et ses sous-domaines existants ne sont pas touchés : on ajoute uniquement un CNAME `skills`.

## Structure du projet

```
claude-skills-hub/
├── app/                        # App Router Next.js
│   ├── layout.tsx              # Layout global + theme provider
│   ├── page.tsx                # Homepage : hero + grille + filtres
│   ├── skills/[slug]/page.tsx  # Page de détail d'un skill
│   ├── not-found.tsx
│   └── globals.css
├── components/                 # Composants React (skill-card, filters, header, etc.)
├── lib/
│   ├── types.ts                # Types Skill, SkillsData, SkillSource
│   ├── categories.ts           # Catégories, overrides, détection
│   ├── skills.ts               # Lecture du skills.json au build
│   └── utils.ts
├── scripts/
│   └── scan-skills.ts          # Scanner CLI
├── data/
│   └── skills.json             # Produit par le scan, committé dans le repo
├── my-skills/                  # (optionnel) dossier pour tes skills perso
└── ...
```

## Licence

Usage personnel. Les skills listés conservent leurs licences d'origine telles que déclarées dans leurs `SKILL.md` respectifs.
