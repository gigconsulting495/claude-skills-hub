#!/usr/bin/env bash
#
# Workflow de publication : scanne les skills, vérifie le build,
# commit le résultat et push sur main (→ Vercel redéploie).
#
# Usage :
#   npm run ship -- "<message de commit>"
#
# Exemple :
#   npm run ship -- "add: nouveau skill mermaid-diagram"
#
set -euo pipefail

# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

cd "$(dirname "$0")/.."

log()  { printf "→ %s\n" "$1"; }
ok()   { printf "   OK\n"; }
fail() { printf "\nErreur : %s\n" "$1" >&2; exit 1; }

# ------------------------------------------------------------------
# 1. Validation des arguments
# ------------------------------------------------------------------

if [ $# -lt 1 ] || [ -z "${1:-}" ]; then
  cat >&2 <<EOF
Usage : npm run ship -- "<message de commit>"

Exemples :
  npm run ship -- "add: nouveau skill mermaid-diagram"
  npm run ship -- "update: categorie design-ui pour skill brand"

Le script :
  1. scanne ~/.claude/skills et ~/.claude/plugins
  2. vérifie qu'il y a un vrai changement dans data/skills.json
  3. lance npm run build (sécurité)
  4. lance npm audit --audit-level=critical
  5. commit data/skills.json et push sur main
EOF
  exit 1
fi

MESSAGE="$1"

# ------------------------------------------------------------------
# 2. Checks Git préalables
# ------------------------------------------------------------------

log "Vérification de l'état du dépôt"

BRANCH=$(git rev-parse --abbrev-ref HEAD)
[ "$BRANCH" = "main" ] || fail "tu n'es pas sur la branche main (actuelle : $BRANCH)"

# Pas de changements staged
git diff --cached --quiet || fail "tu as des changements déjà staged. Commit-les ou reset-les avant."

# Pas de changements non-committés hors data/skills.json
if ! git diff --quiet -- . ':!data/skills.json'; then
  echo
  echo "Tu as des modifications non-committées hors data/skills.json :"
  git diff --name-only -- . ':!data/skills.json' | sed 's/^/  - /'
  fail "commit ou stash tes autres changements avant de publier."
fi

ok

# ------------------------------------------------------------------
# 3. Scan
# ------------------------------------------------------------------

log "Scan des skills"
npm run scan -- \
  --input ~/.claude/skills \
  --input ~/.claude/plugins \
  --output data/skills.json \
  > /tmp/ship-scan.log 2>&1 \
  || { cat /tmp/ship-scan.log; fail "le scan a échoué."; }

ok

# ------------------------------------------------------------------
# 4. Détection d'un vrai changement
# ------------------------------------------------------------------

log "Analyse du diff de data/skills.json"

# On ignore le champ `generatedAt` qui change à chaque scan.
MEANINGFUL_DIFF=$(
  git diff -U0 -- data/skills.json \
    | grep -E '^[+-]' \
    | grep -vE '^(\+\+\+|---)' \
    | grep -vE '"generatedAt":' \
    | head -1 \
    || true
)

if [ -z "$MEANINGFUL_DIFF" ]; then
  echo "   Aucun changement réel (seul generatedAt a bougé)."
  git checkout -- data/skills.json
  echo
  echo "Rien à publier. Le site en prod est déjà à jour."
  exit 0
fi

echo "   Changements détectés :"
git diff --stat -- data/skills.json | sed 's/^/   /'

# ------------------------------------------------------------------
# 5. Build de sécurité
# ------------------------------------------------------------------

log "Build de vérification (npm run build)"
rm -rf .next
npm run build > /tmp/ship-build.log 2>&1 \
  || { tail -40 /tmp/ship-build.log; fail "le build a échoué. Voir /tmp/ship-build.log"; }
ok

# ------------------------------------------------------------------
# 6. Audit de sécurité (CVE critiques uniquement)
# ------------------------------------------------------------------

log "Audit sécurité (critical)"
if ! npm audit --audit-level=critical > /tmp/ship-audit.log 2>&1; then
  echo
  cat /tmp/ship-audit.log
  fail "vulnérabilité critique détectée. Upgrade avant de publier (voir docs/deployment.md)."
fi
ok

# ------------------------------------------------------------------
# 7. Commit + push
# ------------------------------------------------------------------

log "Commit et push"
git add data/skills.json
git commit -m "$MESSAGE" > /dev/null
git push > /tmp/ship-push.log 2>&1 \
  || { cat /tmp/ship-push.log; fail "le push a échoué."; }
ok

# ------------------------------------------------------------------
# 8. Récap
# ------------------------------------------------------------------

SHA=$(git rev-parse --short HEAD)

echo
echo "Publié : commit $SHA"
echo "Vercel rebuild automatiquement → https://skills.gig-consulting.com"
echo "Suivi du build : https://vercel.com (onglet Deployments)"
