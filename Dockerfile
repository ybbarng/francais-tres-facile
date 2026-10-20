# francais-tres-facile 이미지 — GitHub Actions 가 빌드해 GHCR 에 올린다. 서버에서는 빌드하지 않는다.
#
# 타깃 두 개:
#   runner : 앱 실행용. Next standalone 출력만 담아 작게 만든다.
#   tools  : progress.db 마이그레이션·동기화 스크립트용. tsx·scripts·prisma 가 들어 있다.
#            배포 때 `docker compose run --rm tools ...` 로 잠깐 띄운다.
#
# 두 타깃 모두 DB(exercises.db·progress.db)는 서버 폴더를 /app/data 로 붙여 쓴다
# (src/lib/db.ts 가 process.cwd()/data 를 읽는다).

FROM node:24-bookworm-slim AS base
# prisma CLI 가 openssl 을 찾는다. slim 이미지에는 없다.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
# package.json 에 packageManager 가 없어 corepack 이 최신 pnpm 을 깐다. 최신판은 package.json 의
# pnpm.onlyBuiltDependencies 를 읽지 않아 설치가 멈추므로 서버에서 쓰던 버전으로 고정한다.
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate
WORKDIR /app

# 의존성 — lockfile 이 바뀔 때만 다시 받는다
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
# 이미지 안에서만 node_modules 를 평평하게 깐다. pnpm 기본(심볼릭 링크) 구조에서는 Next standalone 이
# 일부 모듈을 빠뜨려 server.js 가 시작하지 못한다. 로컬 개발 방식은 바꾸지 않는다.
RUN echo "node-linker=hoisted" > .npmrc && pnpm install --frozen-lockfile

# 빌드 — prisma generate 두 개 + next build (화면은 클라이언트 컴포넌트, DB 는 API 에서만 읽어 빌드에 DB 가 필요 없다)
FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run prisma:generate && pnpm run build

# 도구 — 빌드 단계를 그대로 쓴다
FROM build AS tools
ENV NODE_ENV=production
CMD ["node_modules/.bin/tsx", "scripts/migrate-progress.ts"]

# 실행 — standalone 출력 + 정적 파일
FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
