#!/usr/bin/env bash
# Deploys Committee to Fly.
#
#   ./deploy.sh --secrets   set/refresh secrets, then deploy (first time, or when
#                           a secret changes)
#   ./deploy.sh             deploy code only
#
# Secrets are read from server/.env.production, which is gitignored and never
# copied into the image.
set -euo pipefail

APP="$(grep -m1 "^app = " fly.toml | cut -d"'" -f2)"
REGION="$(grep -m1 "^primary_region = " fly.toml | cut -d"'" -f2)"
ENV_FILE="server/.env.production"

echo "App:    $APP"
echo "Region: $REGION"
echo

if ! fly auth whoami >/dev/null 2>&1; then
    echo "Not logged in. Run: fly auth login"
    exit 1
fi

if ! fly apps list 2>/dev/null | awk '{print $1}' | grep -qx "${APP}"; then
    echo "Creating app ${APP}…"
    fly apps create "$APP" --org personal
fi

if [[ "${1:-}" == "--secrets" ]]; then
    if [[ ! -f "$ENV_FILE" ]]; then
        echo "Missing $ENV_FILE — copy server/.env.production.example and fill it in."
        exit 1
    fi
    echo "Setting secrets…"
    # --stage avoids a release per secret; the deploy below applies them together.
    # READ_ONLY is deliberately never set here: production must accept writes.
    while IFS= read -r line; do
        [[ -z "$line" || "$line" == \#* ]] && continue
        [[ "$line" == READ_ONLY=* ]] && { echo "  skipping READ_ONLY"; continue; }
        fly secrets set "$line" --app "$APP" --stage >/dev/null
        echo "  set ${line%%=*}"
    done < "$ENV_FILE"
    echo
fi

echo "Deploying…"
# Region comes from primary_region in fly.toml; fly deploy has no --region flag.
# Fly's remote builder intermittently refuses ("Not authorized to access this
# firecrackerapp"), so fall back to building locally when Docker is available.
if ! fly deploy --app "$APP" --ha=false; then
    echo
    echo "Remote build failed — retrying with a local Docker build…"
    fly deploy --app "$APP" --ha=false --local-only
fi

echo
echo "Ensuring exactly one always-on machine in ${REGION}…"
fly scale count 1 --region "${REGION}" --app "${APP}" --yes

echo
fly status --app "$APP"
echo
echo "Health: https://${APP}.fly.dev/api/health"
