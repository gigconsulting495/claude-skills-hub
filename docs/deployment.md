# Déploiement et maintenance prod

Le site est déployé sur **Vercel** à partir du repo GitHub `gigconsulting495/claude-skills-hub`, branche `main`. Il est exposé sur `https://skills.gig-consulting.com` via un CNAME configuré chez one.com.

> **État actuel** : le site est en ligne, le certificat HTTPS est provisionné, le CNAME `skills` chez one.com pointe vers `<hash>.vercel-dns-017.com.` (valeur unique par projet Vercel). Chaque push sur `main` déclenche un redéploiement automatique en 1 à 2 minutes. Les sections "Premier déploiement" et "Configurer le sous-domaine" ci-dessous servent de référence si un jour il faut refaire l'ops (changement de domaine, repo, etc.).

## Vue d'ensemble

```
GitHub (main)  ──push──►  Vercel (build + CDN)  ──CNAME──►  skills.gig-consulting.com
```

- Chaque push sur `main` déclenche un build Vercel automatique (1 à 2 minutes)
- Le site est 100% statique après build : zéro Function, zéro Edge, zéro runtime serveur
- Le certificat HTTPS est provisionné automatiquement par Vercel (Let's Encrypt)

## Premier déploiement

### 1. Lier le repo à Vercel

1. Se connecter sur [vercel.com](https://vercel.com) avec le compte GitHub qui héberge le repo
2. Cliquer **Add New… → Project**
3. Section **Import Git Repository** : sélectionner `claude-skills-hub`
4. Laisser tous les paramètres par défaut :
   - Framework preset : **Next.js** (auto-détecté)
   - Root directory : `./`
   - Build command : `npm run build`
   - Output directory : géré par Next.js
   - Install command : `npm install`
5. Aucune variable d'environnement à configurer
6. Cliquer **Deploy**

Une fois le build terminé, Vercel attribue une URL `*.vercel.app`. Cette URL reste disponible même après configuration du domaine custom et peut servir d'URL de secours.

### 2. Configurer le sous-domaine `skills.gig-consulting.com`

**Côté Vercel** :

1. Ouvrir le projet → **Settings → Domains**
2. Champ d'ajout en haut : saisir `skills.gig-consulting.com` → **Add**
3. Dans la popup, laisser **Connect to an environment = Production** et cliquer **Save**
4. Le domaine apparaît avec le badge rouge "Invalid Configuration". Cliquer sur **Learn more** puis sur l'onglet **DNS Records**
5. Vercel affiche la configuration DNS attendue, typiquement :
   - Type : `CNAME`
   - Name : `skills`
   - Value : `<hash>.vercel-dns-017.com.` (ex. `8f01ad62921b2c28.vercel-dns-017.com.`)

Important : la valeur est un hash unique **propre à ton projet Vercel**, pas la valeur historique `cname.vercel-dns.com`. Vercel migre ses IP ranges et recommande maintenant cette nouvelle cible. L'ancienne fonctionne encore mais va être dépréciée.

**Ne PAS utiliser l'onglet "Vercel DNS"** : il propose de déléguer toute la gestion DNS du domaine racine à Vercel (via des nameservers `ns1.vercel-dns.com` / `ns2.vercel-dns.com`), ce qui casserait le site principal `gig-consulting.com`, les emails Google Workspace et tous les autres sous-domaines existants.

**Côté one.com** :

1. Se connecter sur [one.com](https://www.one.com). Sur la page d'accueil, le domaine `gig-consulting.com` est déjà sélectionné dans la sidebar gauche.
2. Menu de gauche → **DNS settings**
3. Scroll jusqu'à la section **Personal DNS settings** → bouton **Create a new record** ou équivalent
4. Remplir :
   - Hostname / Name : `skills`
   - Type : `CNAME`
   - Target : la valeur exacte fournie par Vercel (ex. `8f01ad62921b2c28.vercel-dns-017.com.`)
   - TTL : `3600`
5. Sauvegarder

**Ne pas toucher** aux enregistrements existants (A, MX Google, autres CNAME comme `www`, `ftp`, `sftp`, `ssh`) : ils concernent le site principal, la messagerie et les services one.com. Seul l'enregistrement `skills` CNAME est ajouté.

### 3. Attendre la propagation

- La propagation DNS prend de quelques minutes à 1 heure
- Vercel détecte automatiquement quand le CNAME est résolu et provisionne le certificat HTTPS
- Le bandeau "Invalid Configuration" passe au vert "Valid Configuration"

Vérifier en ligne de commande :

```bash
dig skills.gig-consulting.com CNAME +short
# Doit afficher la valeur exacte fournie par Vercel
# (ex. 8f01ad62921b2c28.vercel-dns-017.com.)
```

Une fois la propagation confirmée, revenir sur Vercel → Settings → Domains → bouton **Refresh** à côté du domaine. Le statut passe de "Invalid Configuration" à "Valid Configuration". Vercel provisionne le certificat HTTPS dans la foulée (30 secondes à 2 minutes).

## Workflow de mise à jour

### Raccourci : `npm run ship`

Pour les mises à jour courantes (ajout/modif de skills), un seul script enchaîne tout, et **détecte automatiquement** ce qui a changé pour générer un message de commit intelligent :

```bash
# Le plus simple : message auto-généré
npm run ship

# Message forcé (si tu veux un libellé précis)
npm run ship -- "add: skill mermaid-diagram pour les schémas"
```

Ce que ça fait :

1. Vérifie que tu es sur `main` sans changements non-committés hors `data/skills.json`
2. Lance `npm run scan` sur `~/.claude/skills` et `~/.claude/plugins`
3. Compare l'ancien et le nouveau `data/skills.json` pour détecter :
   - Les skills **ajoutés** (slugs nouveaux)
   - Les skills **retirés** (slugs disparus)
   - Les skills **modifiés** (contenu réellement différent, hors `lastModified`)
4. Si aucun changement réel, sort avec `Rien à publier` et restaure le JSON
5. Génère un message de commit automatique sauf si tu en fournis un
6. Lance `npm run build` et `npm audit --audit-level=critical`
7. Commit `data/skills.json` et push

### Exemples de messages auto-générés

Le script adapte le message selon le nombre et le type de changements :

| Changement | Message généré |
| --- | --- |
| 1 skill ajouté | `add: banner-design` |
| 3 skills ajoutés | `add: skill-a, skill-b, skill-c` |
| 7 skills ajoutés | `add: skill-a, skill-b, skill-c, skill-d, skill-e et 2 autre(s)` |
| 1 skill modifié | `update: humanizer` |
| 1 skill retiré | `remove: old-skill` |
| Mix (2 ajouts + 1 modif + 1 retrait) | `update: 4 skill(s) — +2 ajout(s), ~1 modif(s), -1 retrait(s)` |

Tu peux toujours forcer un message personnalisé si besoin (changelog plus descriptif, référence à un ticket, etc.) :

```bash
npm run ship -- "add: nouveau skill mermaid pour INGEST-1234"
```

### Comportement sur erreur

Si un check échoue (build KO, audit critique, working tree sale, push refusé), **aucun commit n'est créé** et le working tree reste dans son état initial. Les logs sont dans `/tmp/ship-*.log`.

### Workflow manuel (pour modifs de code)

Quand tu modifies autre chose que `data/skills.json` (composants, catégories, doc), le workflow reste classique :

```bash
# 1. Ajouter/modifier le code
# 2. Si tu as aussi touché à des SKILL.md → re-scanner
npm run scan -- --input ~/.claude/skills --input ~/.claude/plugins

# 3. Vérifier que rien n'est cassé en local
npm run build
npm audit

# 4. Commit + push
git add .
git commit -m "update: description du changement"
git push
```

Vercel redéploie automatiquement sur chaque push `main`. Pas d'étape manuelle.

### Automatisation complémentaire

Pour aller plus loin, `npm run ship` peut être wrappé dans une tâche `launchd` (macOS) ou `cron` qui le lance quotidiennement avec un message auto-généré. Pas mis en place aujourd'hui car ça sacrifie le contrôle sur le timing et les messages de commit.

## Conventions de commit pour les mises à jour

Pour garder l'historique lisible :

- `add: nouveau skill X` — ajout d'un skill
- `update: skill X catégorie design-ui` — modification de classification
- `fix: ...` — correction de bug
- `docs: ...` — changements dans `docs/`
- `chore: ...` — maintenance sans impact utilisateur

## Monitoring

Vercel fournit par défaut :

- **Deployments** : historique des builds avec logs complets
- **Analytics** (gratuit basique) : visiteurs, pages populaires, Core Web Vitals
- **Logs** : vide en pratique puisque pas de Function

Accéder aux logs de build : **Deployments → cliquer sur un déploiement → Build Logs**.

## Rollback

Deux façons en cas de régression sur `main` :

### Option A : rollback via Vercel

1. **Deployments** → identifier un déploiement précédent stable
2. Cliquer sur **⋯ → Promote to Production**
3. Vercel bascule immédiatement le domaine sur ce déploiement

Plus rapide mais ne corrige pas le code sur GitHub : le prochain push réintroduira le bug.

### Option B : rollback via Git

```bash
git revert <sha-du-commit-cassé>
git push
```

Vercel build et déploie le commit de revert en 1 à 2 minutes.

## Variables d'environnement

Aucune variable n'est requise à ce jour. Si une future fonctionnalité nécessite un secret (ex. analytics externe), l'ajouter dans **Settings → Environment Variables** sur Vercel. Ne jamais commiter de `.env` dans le repo : le `.gitignore` l'exclut déjà.

## Mise à jour des dépendances (sécurité)

Vercel applique une politique qui **bloque le déploiement si Next.js est dans une version affectée par une CVE critique**, même si le build réussit. Le symptôme :

- Les logs de build affichent `✓ Compiled successfully` et `Build Completed`
- Le déploiement est marqué **"Deployment failed with error"**
- La fin des logs contient `Vulnerable version of Next.js detected, please update immediately.`

### Vérifier les vulnérabilités en local

Avant chaque push important, et au moins une fois par mois :

```bash
npm audit
```

Si une vulnérabilité critique ou haute sur `next` apparaît, il faut upgrader avant que Vercel ne refuse un deploy.

### Upgrader Next.js sans breaking change

Pour rester sur la même majeure (ici 15.x) et minimiser les risques :

```bash
# Prendre la dernière stable 15.x
npm install next@^15 eslint-config-next@^15 --save

# Vérifier que tout compile
rm -rf .next
npm run build

# Si OK, commit
git add package.json package-lock.json next-env.d.ts
git commit -m "chore: upgrade Next.js → <version> (patch CVE-XXXX-YYYYY)"
git push
```

`next-env.d.ts` est parfois régénéré automatiquement par Next.js lors d'un upgrade mineur : il faut l'inclure dans le commit.

### Monter de majeure (ex. 15.x → 16.x)

À faire uniquement si la sécurité l'exige ou pour bénéficier de nouvelles features. Checklist :

1. Lire le [guide de migration Next.js](https://nextjs.org/docs/app/building-your-application/upgrading) pour la majeure ciblée
2. Vérifier les breaking changes sur l'App Router et sur `generateStaticParams`
3. Upgrader dans une branche dédiée (`chore/next-16`)
4. Tester `npm run build` puis `npm run dev`
5. Vérifier les pages critiques (homepage + 3 pages détail)
6. Merger seulement si tout passe

Pour ce projet (App Router statique sans middleware ni Server Actions), les montées de majeure sont généralement sans douleur.

### Audit régulier

Tous les 1 à 2 mois, relancer :

```bash
npm outdated
npm audit
```

Et traiter les deux colonnes `Current` vs `Latest` pour les dépendances directes. Les transitives sont gérées par `npm audit fix`.

## Coûts

- Plan Vercel **Hobby** : gratuit pour ce projet (0 Function, 0 Bandwidth au-delà du quota Hobby de 100 GB/mois, 0 build time critique)
- Domaine `gig-consulting.com` déjà payé chez one.com
- Le CNAME `skills` n'engendre aucun coût supplémentaire

Si le projet dépasse les limites Hobby un jour (peu probable pour un site statique de cette taille), la route de sortie est le plan Pro de Vercel (~$20/mois).

## Troubleshooting

### Le build Vercel échoue mais `npm run build` passe en local

Causes typiques :

- Différence de version Node : vérifier `Settings → General → Node.js Version` sur Vercel (mettre 20 ou plus récent)
- Fichier non committé : vérifier que `data/skills.json` est bien dans Git (`git ls-files data/`)
- Typage TypeScript cassé par une dépendance : `npm ci && npm run build` local pour reproduire

### "Deployment failed with error" alors que le build est vert

Si les logs montrent `✓ Compiled successfully` puis `Vulnerable version of Next.js detected` à la fin, Vercel bloque le déploiement pour raison de sécurité. Voir la section [Mise à jour des dépendances](#mise-à-jour-des-dépendances-sécurité) ci-dessus : upgrader Next.js vers une version patchée, commiter et pousser.

### `skills.gig-consulting.com` ne résout pas après 1h

- Vérifier le CNAME chez one.com : `dig skills.gig-consulting.com CNAME +short`
- Si la réponse est vide, l'enregistrement DNS n'a pas été sauvé correctement → recréer
- Si la réponse pointe ailleurs qu'`cname.vercel-dns.com`, corriger chez one.com

### Un skill attendu n'apparaît pas sur le site en prod

- Le `data/skills.json` committé est-il bien à jour ?
  ```bash
  git show HEAD:data/skills.json | jq '.skills | length'
  ```
- Vérifier les logs de build Vercel pour une erreur silencieuse
- Relancer le scan local et recommiter

### Le site répond mais le CSS est cassé

Symptôme observé : le HTML s'affiche sans style, les liens sont bleus soulignés par défaut.

C'est en général dû à un cache `.next` corrompu **en local**, pas en prod. Vercel part toujours d'un build propre. Si ça arrive en prod, forcer un re-déploiement : **Deployments → ⋯ → Redeploy** (avec "Use existing Build Cache" décoché).

## Sécurité

- Le repo est public ou privé selon ta préférence (aucun secret dedans)
- Ne jamais commiter de token personnel, clé API Anthropic, ou cookie Claude Code
- Vercel utilise OAuth GitHub : si tu retires ton accès GitHub, le projet Vercel perd l'accès mais reste en ligne (redeploy impossible jusqu'à relink)
