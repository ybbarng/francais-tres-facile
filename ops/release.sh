#!/usr/bin/env bash
# 배포 직전에 tools 이미지 안에서 돈다 — progress.db 에 SQL 마이그레이션 적용(멱등).
#   docker compose run --rm tools ops/release.sh
# 예전 ./server 의 `pnpm run migrate:progress` 를 옮겼다. DB 는 /app/data (서버 폴더를 붙인다).
# tsx 는 이 저장소 의존성에 없다(예전엔 npx 로 그때그때 받았다). Node 24 는 TypeScript 를 바로 실행하므로 node 로 돌린다.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "🗄  Applying SQL migrations (idempotent)..."
node scripts/migrate-progress.ts

echo "✅ release steps done"
