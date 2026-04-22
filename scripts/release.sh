#!/usr/bin/env bash
#
# Workflow de release SemVer : bump la version dans package.json,
# crée un tag annoté, push, et crée la release GitHub avec
# des release notes auto-générées depuis git log.
#
# Usage :
#   npm run release -- <patch|minor|major>            # interactif (demande confirmation)
#   npm run release -- <patch|minor|major> --yes      # non-interactif
#   npm run release -- <patch|minor|major> --dry-run  # simulation sans rien faire
#
set -euo pipefail

cd "$(dirname "$0")/.."

# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

log()  { printf "→ %s\n" "$1"; }
ok()   { printf "   OK\n"; }
fail() { printf "\nErreur : %s\n" "$1" >&2; exit 1; }

usage() {
  cat >&2 <<EOF
Usage : npm run release -- <patch|minor|major> [--yes] [--dry-run]

Bumps :
  patch   1.0.0 → 1.0.1  (bugfix, changement interne sans impact visible)
  minor   1.0.0 → 1.1.0  (feature rétrocompatible)
  major   1.0.0 → 2.0.0  (breaking change)

Flags :
  --yes      skip la confirmation interactive
  --dry-run  affiche ce qui serait fait sans rien modifier

Exemples :
  npm run release -- patch
  npm run release -- minor --yes
  npm run release -- major --dry-run

Le script :
  1. vérifie working tree clean + branche main + gh installé
  2. calcule la nouvelle version via npm
  3. extrait la liste des commits depuis le dernier tag
  4. build + audit (sécurité)
  5. demande confirmation
  6. bump package.json, commit, tag annoté, push
  7. crée la release GitHub avec notes auto-générées
EOF
}

# ------------------------------------------------------------------
# 1. Parsing des arguments
# ------------------------------------------------------------------

BUMP=""
AUTO_YES=0
DRY_RUN=0

while [ $# -gt 0 ]; do
  case "$1" in
    patch|minor|major) BUMP="$1" ;;
    --yes|-y)          AUTO_YES=1 ;;
    --dry-run|-n)      DRY_RUN=1 ;;
    --help|-h)         usage; exit 0 ;;
    *)                 usage; fail "argument inconnu : $1" ;;
  esac
  shift
done

[ -z "$BUMP" ] && { usage; exit 1; }

# ------------------------------------------------------------------
# 2. Checks préalables
# ------------------------------------------------------------------

log "Vérifications préalables"

BRANCH=$(git rev-parse --abbrev-ref HEAD)
[ "$BRANCH" = "main" ] || fail "doit être sur main (actuelle : $BRANCH)"

git diff --quiet || fail "working tree sale. Commit ou stash tes changements d'abord."
git diff --cached --quiet || fail "tu as des changements staged. Commit-les ou reset-les."

command -v gh >/dev/null 2>&1 || fail "gh CLI requis. Installe-le : brew install gh"
gh auth status >/dev/null 2>&1 || fail "gh CLI non authentifié. Lance : gh auth login"

# Synchro avec le remote
git fetch origin main --quiet
LOCAL=$(git rev-parse main)
REMOTE=$(git rev-parse origin/main)
[ "$LOCAL" = "$REMOTE" ] || fail "ta branche main n'est pas à jour avec origin/main. Fais git pull d'abord."

ok

# ------------------------------------------------------------------
# 3. Calcul de la version
# ------------------------------------------------------------------

log "Calcul de la nouvelle version"

CURRENT=$(node -p "require('./package.json').version")
IFS='.' read -r V_MAJOR V_MINOR V_PATCH <<< "$CURRENT"

case "$BUMP" in
  patch) V_PATCH=$((V_PATCH + 1)) ;;
  minor) V_MINOR=$((V_MINOR + 1)); V_PATCH=0 ;;
  major) V_MAJOR=$((V_MAJOR + 1)); V_MINOR=0; V_PATCH=0 ;;
esac

NEW="$V_MAJOR.$V_MINOR.$V_PATCH"
TAG="v$NEW"

echo "   $CURRENT → $NEW ($BUMP)"

# Vérifier que le tag n'existe pas déjà
if git rev-parse "$TAG" >/dev/null 2>&1; then
  fail "le tag $TAG existe déjà."
fi

ok

# ------------------------------------------------------------------
# 4. Collecte des commits depuis le dernier tag
# ------------------------------------------------------------------

log "Extraction des commits depuis le dernier tag"

LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || true)

if [ -n "$LAST_TAG" ]; then
  RANGE="${LAST_TAG}..HEAD"
  echo "   Depuis $LAST_TAG"
else
  RANGE=""
  echo "   Première release (pas de tag précédent)"
fi

# On exclut les commits "release:" précédents et les trailers Co-Authored-By.
if [ -n "$RANGE" ]; then
  COMMITS=$(git log --pretty=format:"%s" "$RANGE" \
    | grep -v '^release:' \
    | grep -v '^Co-Authored-By' \
    | sed 's/^/- /' || true)
else
  COMMITS=$(git log --pretty=format:"%s" \
    | grep -v '^release:' \
    | grep -v '^Co-Authored-By' \
    | sed 's/^/- /' || true)
fi

if [ -z "$COMMITS" ]; then
  fail "aucun commit significatif depuis le dernier tag. Rien à releaser."
fi

N_COMMITS=$(echo "$COMMITS" | grep -c . || true)
echo "   $N_COMMITS commit(s) à inclure dans les release notes"
ok

# ------------------------------------------------------------------
# 5. Build + audit (sécurité)
# ------------------------------------------------------------------

log "Build de vérification"
rm -rf .next
npm run build > /tmp/release-build.log 2>&1 \
  || { tail -30 /tmp/release-build.log; fail "le build échoue. Voir /tmp/release-build.log"; }
ok

log "Audit sécurité (critical)"
if ! npm audit --audit-level=critical > /tmp/release-audit.log 2>&1; then
  echo; cat /tmp/release-audit.log
  fail "vulnérabilité critique détectée. Corrige avant de releaser."
fi
ok

# ------------------------------------------------------------------
# 6. Résumé et confirmation
# ------------------------------------------------------------------

echo
echo "────────────────────────────────────────────────────────────"
echo "  Release $TAG (depuis $CURRENT, bump $BUMP)"
echo "────────────────────────────────────────────────────────────"
echo
echo "Changements :"
echo "$COMMITS" | sed 's/^/  /'
echo
echo "Actions à exécuter :"
echo "  1. npm version $NEW (update package.json + package-lock.json)"
echo "  2. git commit -m \"release: $TAG\""
echo "  3. git tag -a $TAG (avec notes ci-dessus)"
echo "  4. git push && git push origin $TAG"
echo "  5. gh release create $TAG (release GitHub publique)"
echo

if [ "$DRY_RUN" -eq 1 ]; then
  echo "[DRY-RUN] Aucune action exécutée. Rien n'a changé."
  exit 0
fi

if [ "$AUTO_YES" -eq 0 ]; then
  read -p "Confirmer la release $TAG ? [y/N] " CONFIRM
  if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "Annulé."
    exit 0
  fi
fi

# ------------------------------------------------------------------
# 7. Exécution
# ------------------------------------------------------------------

log "Bump package.json"
npm version "$NEW" --no-git-tag-version > /dev/null
ok

log "Commit"
git add package.json package-lock.json 2>/dev/null || true
git commit -m "release: $TAG" > /dev/null
ok

log "Tag annoté $TAG"
TAG_MESSAGE="Claude Skills Hub $TAG

Changements depuis ${LAST_TAG:-la première version} :

$COMMITS"
git tag -a "$TAG" -m "$TAG_MESSAGE"
ok

log "Push commit + tag"
git push > /tmp/release-push.log 2>&1 \
  || { cat /tmp/release-push.log; fail "git push a échoué."; }
git push origin "$TAG" > /tmp/release-push-tag.log 2>&1 \
  || { cat /tmp/release-push-tag.log; fail "git push du tag a échoué."; }
ok

log "Release GitHub"
RELEASE_NOTES="Release $TAG du catalogue claude-skills-hub.

## Changements depuis ${LAST_TAG:-la première version}

$COMMITS

## Liens

- Site en ligne : [skills.gig-consulting.com](https://skills.gig-consulting.com)
- Documentation : [docs/](https://github.com/gigconsulting495/claude-skills-hub/tree/$TAG/docs)"

gh release create "$TAG" \
  --title "$TAG" \
  --notes "$RELEASE_NOTES" > /tmp/release-gh.log 2>&1 \
  || { cat /tmp/release-gh.log; fail "gh release create a échoué."; }
ok

# ------------------------------------------------------------------
# 8. Récap
# ------------------------------------------------------------------

RELEASE_URL=$(gh release view "$TAG" --json url --jq .url 2>/dev/null || echo "")

echo
echo "────────────────────────────────────────────────────────────"
echo "  Release $TAG publiée"
echo "────────────────────────────────────────────────────────────"
[ -n "$RELEASE_URL" ] && echo "  $RELEASE_URL"
echo "  Vercel rebuild automatiquement → https://skills.gig-consulting.com"
