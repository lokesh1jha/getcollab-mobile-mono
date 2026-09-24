#!/usr/bin/env bash
# Runs one app's Maestro flows against the booted simulator and the local
# getcollab-go stack. The app must already be installed and its Metro running.
#   scripts/maestro.sh brand|influencer [flow.yaml]
set -euo pipefail
app="${1:?usage: scripts/maestro.sh brand|influencer [flow.yaml]}"
root="$(cd "$(dirname "$0")/.." && pwd)"
case "$app" in
  brand) email="maestro.brand@test.local" ;;
  influencer) email="maestro.creator@test.local" ;;
  *) echo "unknown app: $app" >&2; exit 2 ;;
esac
maestro="$(command -v maestro || echo "$HOME/.maestro/bin/maestro")"
node "$root/scripts/maestro-seed.mjs"
MAESTRO_CLI_NO_ANALYTICS=1 MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true \
  "$maestro" test -e EMAIL="$email" -e PASSWORD='Passw0rd!23' "$root/getcollab-$app/.maestro/${2:-}"
