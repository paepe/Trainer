#!/usr/bin/env bash

set -euo pipefail

status_env="$(supabase status -o env)"

read_env() {
  local key="$1"
  # `supabase status -o env` quotes values.  Vite must receive the raw value;
  # otherwise the URL and anon key include literal quote characters.
  printf '%s\n' "$status_env" | awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); gsub(/^"|"$/, ""); print; exit }'
}

export VITE_SUPABASE_URL="$(read_env API_URL)"
export VITE_SUPABASE_ANON_KEY="$(read_env ANON_KEY)"

if [[ -z "$VITE_SUPABASE_URL" || -z "$VITE_SUPABASE_ANON_KEY" ]]; then
  echo "Local Supabase is not available. Run 'supabase start' first." >&2
  exit 1
fi

exec npm run dev:local -- "$@"
