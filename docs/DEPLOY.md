# 배포

`ftf.byb.kr` → byb.kr 서버 → nginx(TLS) → Traefik → `ftf` 컨테이너. (2026-10-20 pm2 에서 옮김)

- 서버를 돌리는 설정(compose·배포 스크립트)은 **`ybbarng/servers` 저장소의 `byb.kr/apps/ftf/`** 에 있다.
  이 저장소는 앱 코드와 이미지 빌드만 맡는다.
- `main` 에 push 하면 `.github/workflows/image.yml` 이
  1. 이미지 두 개를 빌드해 GHCR 에 올리고
     - `ghcr.io/ybbarng/francais-tres-facile` — 앱 (`Dockerfile` 의 `runner`, Next standalone)
     - `ghcr.io/ybbarng/francais-tres-facile-tools` — `progress.db` 마이그레이션 (`tools`)
  2. 배포 키로 서버에 SSH 접속해 `deploy <sha>` 를 보낸다.
- 서버에서 빌드하지 않는다. `docs/` 와 `*.md` 만 바뀐 push 는 빌드·배포를 건너뛴다.

## 서버에서 일어나는 일 (`servers/byb.kr/apps/ftf/deploy.sh`)

1. `progress.db` 백업 (`~/data/ftf/progress.db.bak.*`, 최근 14개)
2. 이미지 받기 — 그 실행의 `GITHUB_TOKEN` 을 SSH 표준입력으로 받아 임시로만 쓰고 지운다.
   서버에 오래 남는 토큰은 없다(classic PAT 는 회사 조직까지 읽을 수 있어서 쓰지 않는다).
3. `tools` 컨테이너로 [`ops/release.sh`](../ops/release.sh) — `prisma/progress/migrations/*.sql` 적용(멱등)
4. 앱 컨테이너 교체, 헬스체크(`/api/progress` 200), 지난 이미지 정리

헬스체크가 실패하면 워크플로가 실패로 끝난다. DB 는 1번에서 백업돼 있다.

## DB 안전 정책

- DB 두 개는 서버의 `~/data/ftf/` 에 있고 컨테이너의 `/app/data` 로 붙는다(`src/lib/db.ts` 가 `process.cwd()/data` 를 읽는다).
- **멱등 마이그레이션** — `prisma/progress/migrations/*.sql` 은 `CREATE TABLE IF NOT EXISTS` 같은 무해한 SQL 만. 새 마이그레이션도 이 원칙을 지킨다.
- `exercises.db` 는 앱의 동기화(`/api/sync`)로 채워지므로 배포에서 건드리지 않는다.

## 손으로 해야 할 때 (서버에서)

```bash
cd ~/servers/byb.kr/apps/ftf
docker compose ps
docker compose logs --tail 100 ftf
# 이미 받아 둔 이미지로 다시 배포
SSH_ORIGINAL_COMMAND="deploy $(docker images --format '{{.Tag}}' ghcr.io/ybbarng/francais-tres-facile | grep -v latest | head -1)" ./deploy.sh </dev/null
```

## 롤백 (데이터)

```bash
# 서버에서
ls -t ~/data/ftf/progress.db.bak.* | head    # 최근 백업 확인
cd ~/servers/byb.kr/apps/ftf && docker compose stop ftf
cp ~/data/ftf/progress.db.bak.<TS> ~/data/ftf/progress.db
docker compose start ftf
```

## 키와 시크릿

GitHub → Settings → Secrets and variables → Actions:

| 이름 | 값 |
|---|---|
| `SERVER_HOST` / `SERVER_USER` / `SERVER_PORT` | `byb.kr` / `ybbarng` / (22 면 생략) |
| `SERVER_SSH_KEY` | 배포 키. 서버 `authorized_keys` 에서 `command="/home/ybbarng/servers/byb.kr/apps/ftf/deploy.sh"` 로 묶여 있어 새어도 배포 말고는 할 수 없다 |

`SERVER_PATH` 는 더 쓰지 않는다. 서버에만 있는 값(`ADMIN_PASSWORD`)은 `servers/byb.kr/apps/ftf/.env` 에 있다.
