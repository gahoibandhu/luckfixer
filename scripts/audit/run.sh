#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/../.."
npx --yes esbuild lib/panchang-engine.js --alias:@=. --bundle --platform=node --format=cjs --outfile=/tmp/audit-pe.cjs --log-level=error
npx --yes esbuild lib/panchang.js --bundle --platform=node --format=cjs --outfile=/tmp/audit-pg.cjs --log-level=error
node scripts/audit/panchang-reference.cjs
node scripts/audit/panchang-random.cjs > /tmp/audit-batch.json
python3 scripts/audit/panchang-random-check.py
python3 scripts/audit/sunrise-vs-swisseph.py
echo "AUDIT OK"
