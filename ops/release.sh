#!/usr/bin/env bash
# 배포 직전에 tools 이미지 안에서 돈다 — progress.db 에 SQL 마이그레이션 적용(멱등).
#   docker compose run --rm tools ops/release.sh
# 예전 ./server 의 `pnpm run migrate:progress` 를 옮겼다. DB 는 /app/data (서버 폴더를 붙인다).
# pnpm 을 거치지 않고 설치된 실행 파일을 바로 쓴다(컨테이너는 바깥과 통신하지 않는다).
set -euo pipefail

cd "$(dirname "$0")/.."

echo "🗄  Applying SQL migrations (idempotent)..."
node_modules/.bin/tsx scripts/migrate-progress.ts

echo "✅ release steps done"
