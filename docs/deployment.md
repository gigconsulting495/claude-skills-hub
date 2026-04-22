# Déploiement et maintenance prod

Le site est déployé sur **Vercel** à partir du repo GitHub `gigconsulting495/claude-skills-hub`, branche `main`. Il est exposé sur `https://skills.gig-consulting.com` via un CNAME configuré chez one.com.

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
3. Vercel affiche la configuration DNS attendue :
   - Type : `CNAME`
   - Name : `skills`
   - Value : `cname.vercel-dns.com`
4. Noter la valeur exacte du CNAME (elle peut varier légèrement selon la région)

**Côté one.com** :

1. Se connecter sur [one.com](https://www.one.com), aller dans l'administration du domaine `gig-consulting.com`
2. Menu **Paramètres DNS / Zone DNS / Advanced DNS settings**
3. Section **Enregistrements DNS** → **Créer un nouvel enregistrement DNS** :
   - Nom d'hôte : `skills`
   - Type : `CNAME`
   - Cible : `cname.vercel-dns.com.` (point final toléré)
   - TTL : `3600`
4. Sauvegarder

**Ne pas toucher** aux enregistrements A, MX, TXT, ni aux autres CNAME : ils concernent le site principal `gig-consulting.com` et la messagerie. Seul l'enregistrement `skills` CNAME est ajouté.

### 3. Attendre la propagation

- La propagation DNS prend de quelques minutes à 1 heure
- Vercel détecte automatiquement quand le CNAME est résolu et provisionne le certificat HTTPS
- Le bandeau "Invalid Configuration" passe au vert "Valid Configuration"

Vérifier en ligne de commande :

```bash
dig skills.gig-consulting.com CNAME +short
# Doit afficher : cname.vercel-dns.com.
```

## Workflow de mise à jour

```bash
# 1. Ajouter ou modifier des SKILL.md dans ~/.claude/skills ou ~/.claude/plugins
# 2. Relancer le scan
npm run scan -- --input ~/.claude/skills --input ~/.claude/plugins

# 3. Vérifier que rien n'est cassé en local
npm run build

# 4. Commit + push
git add data/skills.json lib/categories.ts
git commit -m "update: description du changement"
git push
```

Vercel redéploie automatiquement sur chaque push `main`. Pas d'étape manuelle.

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
