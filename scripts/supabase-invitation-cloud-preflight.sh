#!/usr/bin/env bash

# Read-only release gate for the Trainer invitation lifecycle cloud patch.
# It never runs `migration repair`, `db push`, or arbitrary SQL.
set -euo pipefail

schema_dump="$(mktemp /private/tmp/trainer-invitation-cloud-schema.XXXXXX.sql)"
trap 'rm -f "$schema_dump"' EXIT

supabase db dump --linked --schema public --file "$schema_dump" >/dev/null

required_patterns=(
  'CREATE TABLE IF NOT EXISTS "public"\."trainer_invitations"'
  'CREATE TABLE IF NOT EXISTS "public"\."trainer_clients"'
  'CREATE TABLE IF NOT EXISTS "public"\."notification_log"'
  'CREATE OR REPLACE FUNCTION "public"\."accept_trainer_invitation"\("p_token" "text", "p_user_id" "uuid"\)'
  'CREATE POLICY "trainer reads client workouts"'
)

for pattern in "${required_patterns[@]}"; do
  if ! rg -q "$pattern" "$schema_dump"; then
    echo "Cloud preflight failed: expected baseline object is missing: $pattern" >&2
    exit 1
  fi
done

if rg -q '"declined"' "$schema_dump" \
  || rg -q '"trainer_discovery_preferences"' "$schema_dump" \
  || rg -q '"end_trainer_client_links"' "$schema_dump"; then
  echo "Cloud preflight failed: lifecycle patch appears partially applied; stop for reconciliation." >&2
  exit 1
fi

echo "Cloud preflight passed: original invitation baseline detected; lifecycle patch not yet applied."
