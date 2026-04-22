# Documentation Claude Skills Hub

Documentation technique et opérationnelle du projet **claude-skills-hub**.

## Table des matières

| Document | Objectif |
| --- | --- |
| [architecture.md](architecture.md) | Vue d'ensemble : stack, flux de données, choix techniques, arborescence |
| [scanner-cli.md](scanner-cli.md) | Référence complète du scanner `scan-skills.ts` : options, modèle de données, règles de détection |
| [components.md](components.md) | Inventaire des composants React et de leurs responsabilités |
| [categories.md](categories.md) | Ajout et maintenance des catégories, overrides de mapping, tags |
| [deployment.md](deployment.md) | Déploiement Vercel, configuration du sous-domaine, maintenance prod |
| [contributing.md](contributing.md) | Workflow de développement, conventions, checklist avant push |

## Pour démarrer rapidement

- Lire d'abord [architecture.md](architecture.md) pour comprendre la forme générale du projet
- Puis [scanner-cli.md](scanner-cli.md) si tu veux ajuster la collecte de skills
- Ou [deployment.md](deployment.md) si tu arrives directement sur un besoin ops

## Organisation des connaissances

Le `README.md` à la racine du repo reste le point d'entrée grand public (installation, commandes, workflow de mise à jour). Cette documentation `docs/` creuse les choix techniques et les procédures internes.
