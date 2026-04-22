#!/usr/bin/env bash
#
# Workflow de publication : scanne les skills, détecte les changements,
# génère un message de commit automatique (ou accepte un override),
# build + audit + commit + push → Vercel redéploie.
#
# Usage :
#   npm run ship                        # message auto-généré
#   npm run ship -- "message custom"    # message forcé
#
set -euo pipefail

cd "$(dirname "$0")/.."

# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

log()  { printf "→ %s\n" "$1"; }
ok()   { printf "   OK\n"; }
fail() { printf "\nErreur : %s\n" "$1" >&2; exit 1; }

# Joint les N premiers éléments d'un flux avec ", " et ajoute
# " et K autre(s)" si le total dépasse N.
join_preview() {
  local max=$1
  local items; items=$(cat)
  local count; count=$(echo "$items" | grep -c . || true)
  [ "$count" -eq 0 ] && { echo ""; return; }

  local list="" i=0
  while IFS= read -r line; do
    [ "$i" -ge "$max" ] && break
    if [ -z "$list" ]; then list="$line"; else list="$list, $line"; fi
    i=$((i+1))
  done <<< "$items"

  if [ "$count" -gt "$max" ]; then
    local rest=$((count - max))
    list="$list et $rest autre(s)"
  fi
  echo "$list"
}

# Calcule un message de commit à partir des listes added/removed/updated.
generate_message() {
  local added="$1" removed="$2" updated="$3"
  local n_added;   n_added=$(echo "$added"   | grep -c . || true)
  local n_removed; n_removed=$(echo "$removed" | grep -c . || true)
  local n_updated; n_updated=$(echo "$updated" | grep -c . || true)
  local total=$((n_added + n_removed + n_updated))

  # Une seule catégorie d'action
  if [ "$n_removed" -eq 0 ] && [ "$n_updated" -eq 0 ] && [ "$n_added" -gt 0 ]; then
    echo "add: $(echo "$added" | join_preview 5)"
    return
  fi
  if [ "$n_added" -eq 0 ] && [ "$n_updated" -eq 0 ] && [ "$n_removed" -gt 0 ]; then
    echo "remove: $(echo "$removed" | join_preview 5)"
    return
  fi
  if [ "$n_added" -eq 0 ] && [ "$n_removed" -eq 0 ] && [ "$n_updated" -gt 0 ]; then
    echo "update: $(echo "$updated" | join_preview 5)"
    return
  fi

  # Mix : on compile un résumé avec compteurs
  local parts=()
  [ "$n_added"   -gt 0 ] && parts+=("+${n_added} ajout(s)")
  [ "$n_updated" -gt 0 ] && parts+=("~${n_updated} modif(s)")
  [ "$n_removed" -gt 0 ] && parts+=("-${n_removed} retrait(s)")
  local summary=""
  for p in "${parts[@]}"; do
    if [ -z "$summary" ]; then summary="$p"; else summary="$summary, $p"; fi
  done
  echo "update: ${total} skill(s) — ${summary}"
}

# ------------------------------------------------------------------
# 1. Arguments
# ------------------------------------------------------------------

# Le 1er argument éventuel override le message auto.
MESSAGE_OVERRIDE="${1:-}"

# ------------------------------------------------------------------
# 2. Checks Git préalables
# ------------------------------------------------------------------

log "Vérification de l'état du dépôt"

BRANCH=$(git rev-parse --abbrev-ref HEAD)
[ "$BRANCH" = "main" ] || fail "tu n'es pas sur la branche main (actuelle : $BRANCH)"

git diff --cached --quiet || fail "tu as des changements déjà staged. Commit-les ou reset-les avant."

if ! git diff --quiet -- . ':!data/skills.json'; then
  echo
  echo "Tu as des modifications non-committées hors data/skills.json :"
  git diff --name-only -- . ':!data/skills.json' | sed 's/^/  - /'
  fail "commit ou stash tes autres changements avant de publier."
fi

ok

# ------------------------------------------------------------------
# 3. Snapshot de l'ancien skills.json (pour diff sémantique)
# ------------------------------------------------------------------

OLD_JSON=$(git show HEAD:data/skills.json 2>/dev/null || echo '{"skills":[]}')

# ------------------------------------------------------------------
# 4. Scan
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
# 5. Détection des changements
# ------------------------------------------------------------------

log "Analyse des changements"

# jq est requis pour la détection sémantique. Fallback texte sinon.
if ! command -v jq >/dev/null 2>&1; then
  echo "   jq n'est pas installé — fallback en mode diff texte (pas de détail par skill)."
  MEANINGFUL_DIFF=$(
    git diff -U0 -- data/skills.json \
      | grep -E '^[+-]' \
      | grep -vE '^(\+\+\+|---)' \
      | grep -vE '"generatedAt":' \
      | head -1 \
      || true
  )
  if [ -z "$MEANINGFUL_DIFF" ]; then
    git checkout -- data/skills.json
    echo; echo "Rien à publier. Le site en prod est déjà à jour."
    exit 0
  fi
  if [ -z "$MESSAGE_OVERRIDE" ]; then
    fail "Sans jq, fournis un message explicite : npm run ship -- \"<message>\""
  fi
  MESSAGE="$MESSAGE_OVERRIDE"
else
  # Diff sémantique via jq. On ignore `lastModified` qui peut bouger
  # sans que le contenu d'un skill change (re-sync Claude Code).

  ADDED=$(
    jq -r --argjson old "$OLD_JSON" '
      [ .skills[] | . as $s
        | select( $old.skills | map(.slug) | index($s.slug) | not )
        | $s.name
      ] | sort | .[]
    ' data/skills.json
  )

  REMOVED=$(
    jq -r --argjson new "$(cat data/skills.json)" '
      [ .skills[] | . as $s
        | select( $new.skills | map(.slug) | index($s.slug) | not )
        | $s.name
      ] | sort | .[]
    ' <<< "$OLD_JSON"
  )

  UPDATED=$(
    jq -r --argjson old "$OLD_JSON" '
      ($old.skills | map( { (.slug): ( . | del(.lastModified) ) } ) | add // {}) as $oldMap
      | [ .skills[] | . as $s
          | (del($s.lastModified)) as $stripped
          | select(
              $oldMap[$s.slug] != null
              and ($oldMap[$s.slug] | del(.lastModified)) != $stripped
            )
          | $s.name
        ] | sort | .[]
    ' data/skills.json
  )

  N_ADDED=$(echo "$ADDED"   | grep -c . || true)
  N_REMOVED=$(echo "$REMOVED" | grep -c . || true)
  N_UPDATED=$(echo "$UPDATED" | grep -c . || true)
  N_TOTAL=$((N_ADDED + N_REMOVED + N_UPDATED))

  if [ "$N_TOTAL" -eq 0 ]; then
    git checkout -- data/skills.json
    echo; echo "Rien à publier. Le site en prod est déjà à jour."
    exit 0
  fi

  # Résumé visuel
  echo "   Changements détectés :"
  [ "$N_ADDED"   -gt 0 ] && echo "$ADDED"   | sed 's/^/     + /'
  [ "$N_REMOVED" -gt 0 ] && echo "$REMOVED" | sed 's/^/     - /'
  [ "$N_UPDATED" -gt 0 ] && echo "$UPDATED" | sed 's/^/     ~ /'

  # Message : override fourni sinon auto-généré
  if [ -n "$MESSAGE_OVERRIDE" ]; then
    MESSAGE="$MESSAGE_OVERRIDE"
  else
    MESSAGE=$(generate_message "$ADDED" "$REMOVED" "$UPDATED")
  fi
  echo
  echo "   Message de commit : $MESSAGE"
fi

# ------------------------------------------------------------------
# 6. Build de sécurité
# ------------------------------------------------------------------

log "Build de vérification (npm run build)"
rm -rf .next
npm run build > /tmp/ship-build.log 2>&1 \
  || { tail -40 /tmp/ship-build.log; fail "le build a échoué. Voir /tmp/ship-build.log"; }
ok

# ------------------------------------------------------------------
# 7. Audit (CVE critiques uniquement)
# ------------------------------------------------------------------

log "Audit sécurité (critical)"
if ! npm audit --audit-level=critical > /tmp/ship-audit.log 2>&1; then
  echo
  cat /tmp/ship-audit.log
  fail "vulnérabilité critique détectée. Upgrade avant de publier (voir docs/deployment.md)."
fi
ok

# ------------------------------------------------------------------
# 8. Commit + push
# ------------------------------------------------------------------

log "Commit et push"
git add data/skills.json
git commit -m "$MESSAGE" > /dev/null
git push > /tmp/ship-push.log 2>&1 \
  || { cat /tmp/ship-push.log; fail "le push a échoué."; }
ok

SHA=$(git rev-parse --short HEAD)

echo
echo "Publié : commit $SHA"
echo "Message : $MESSAGE"
echo "Vercel rebuild automatiquement → https://skills.gig-consulting.com"
echo "Suivi du build : https://vercel.com (onglet Deployments)"
