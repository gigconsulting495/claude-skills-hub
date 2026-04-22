# Documentation Claude Skills Hub

Documentation technique et opérationnelle du projet **claude-skills-hub**.

## Quick start

**Publier une mise à jour de skills en prod** (ajout, modif ou retrait) :

```bash
npm run ship
```

Le script scanne, détecte automatiquement ce qui a changé, génère un message de commit adapté, vérifie le build, audite les CVE, commit et push. Vercel redéploie en 1 à 2 minutes. Voir [deployment.md → Raccourci npm run ship](deployment.md#raccourci--npm-run-ship) pour le détail.

**Autres besoins courants** :

| Je veux… | Aller voir |
| --- | --- |
| Comprendre comment le projet est construit | [architecture.md](architecture.md) |
| Ajouter ou modifier une catégorie de skills | [categories.md](categories.md) |
| Modifier un composant React | [components.md](components.md) |
| Déboguer un skill qui n'apparaît pas | [scanner-cli.md → Troubleshooting](scanner-cli.md#cas-dusage) |
| Résoudre un déploiement Vercel qui échoue | [deployment.md → Troubleshooting](deployment.md#troubleshooting) |
| Upgrader Next.js (ex. CVE de sécurité) | [deployment.md → Mise à jour des dépendances](deployment.md#mise-à-jour-des-dépendances-sécurité) |

## Table des matières

| Document | Objectif |
| --- | --- |
| [architecture.md](architecture.md) | Vue d'ensemble : stack, flux de données, choix techniques, arborescence |
| [scanner-cli.md](scanner-cli.md) | Référence complète du scanner `scan-skills.ts` : options, modèle de données, règles de détection, intégration avec `ship` |
| [components.md](components.md) | Inventaire des composants React et de leurs responsabilités |
| [categories.md](categories.md) | Ajout et maintenance des catégories, overrides de mapping, tags |
| [deployment.md](deployment.md) | Déploiement Vercel, configuration du sous-domaine, maintenance prod, workflow `npm run ship` |
| [contributing.md](contributing.md) | Workflow de développement, conventions, checklist avant push |

## Pour démarrer (parcours de lecture)

- Lire d'abord [architecture.md](architecture.md) pour comprendre la forme générale du projet
- Puis [scanner-cli.md](scanner-cli.md) si tu veux ajuster la collecte de skills
- Ou [deployment.md](deployment.md) si tu arrives directement sur un besoin ops

## Organisation des connaissances

Le `README.md` à la racine du repo reste le point d'entrée grand public (installation, commandes, workflow de mise à jour). Cette documentation `docs/` creuse les choix techniques et les procédures internes.
