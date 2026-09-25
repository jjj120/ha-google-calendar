#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

echo "=== Building Google Calendar Card ==="
node scripts/build.js

echo "=== Syncing custom component to ha-config ==="
mkdir -p ha-config/custom_components/google_calendar_card
cp -r custom_components/google_calendar_card/* ha-config/custom_components/google_calendar_card/

echo "=== Starting Home Assistant Docker Container ==="
docker compose up -d

echo ""
echo "Home Assistant is starting up at: http://localhost:8123"
echo "To view logs, run: docker compose logs -f"
