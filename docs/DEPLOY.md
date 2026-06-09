# 배포

`main` 브랜치에 push 하면 GitHub Actions가 자동으로 서버의 `./server`를 SSH로 실행해 빌드·재시작까지 수행한다. 수동으로는 서버에 접속해 `./server`만 실행하면 된다.

## DB 안전 정책

`./server`가 매 실행마다 다음을 보장한다:

1. **자동 백업** — 첫 단계에서 `data/progress.db`를 `data/progress.db.bak.<YYYYMMDD-HHMMSS>`로 복사한다. 최근 14개만 유지하고 그 이상은 삭제.
2. **멱등 마이그레이션** — `prisma/progress/migrations/*.sql`은 `CREATE TABLE IF NOT EXISTS` 등 무해한 SQL만. 새 마이그를 추가할 때도 이 원칙 유지.
3. **빌드 실패 시 안전** — `set -e`라 어디서 실패해도 `pm2 reload`까지 안 감 → 옛 프로세스가 계속 서빙. 사이트는 다운되지 않음.
4. **헬스체크** — 마지막에 `${HEALTH_URL:-http://localhost:3101/api/progress}`로 200 확인. 실패하면 워크플로가 빨갛게.

`exercises.db`는 `./sync` 흐름에서 별도 관리하므로 자동 배포에서 건드리지 않는다.

## 자동 배포 셋업 (최초 1회)

GitHub Settings → Secrets and variables → Actions → "New repository secret"에서 다섯 개 등록:

| 이름 | 값 | 예 |
|---|---|---|
| `SERVER_HOST` | 서버 호스트 또는 IP | `ftf.byb.kr` 또는 IP |
| `SERVER_USER` | SSH 사용자 | `ybbarng` |
| `SERVER_SSH_KEY` | private key 전문 (PEM) | `-----BEGIN OPENSSH PRIVATE KEY-----\n...` |
| `SERVER_PORT` | SSH 포트 (기본 22면 생략 가능) | `22` |
| `SERVER_PATH` | 서버의 ftf 디렉토리 절대 경로 | `/home/ybbarng/francais-tres-facile` |

### SSH 키 만들기 (선택)

기존 키 재사용해도 되지만, 배포 전용 키를 새로 만들어 격리하는 게 안전:

```bash
# 로컬에서
ssh-keygen -t ed25519 -f ~/.ssh/ftf-deploy -C "github-actions-deploy" -N ""

# 공개키를 서버 authorized_keys에 추가
ssh-copy-id -i ~/.ssh/ftf-deploy.pub user@host

# private 키를 GitHub Secret SERVER_SSH_KEY에 통째로 (-----BEGIN/END 포함) 붙여넣기
cat ~/.ssh/ftf-deploy
```

## 동작 흐름

1. `main`에 push → GitHub Actions trigger
2. workflow가 SSH로 서버 접속 → `cd $SERVER_PATH && ./server` 실행
3. `./server`가:
   - progress.db 백업
   - git pull → pnpm install → prisma generate → migrate → build → pm2 restart
   - 헬스체크 OK 확인
4. 실패하면 Actions 탭에 빨갛게, 사이트는 옛 빌드로 계속 동작

## 롤백

빌드 자체가 망가져 옛 프로세스도 못 살리는 상황은 `set -e`로 막혀 있지만, 데이터에 문제가 생긴 경우 백업으로 복원:

```bash
# 서버에서
ls -t data/progress.db.bak.* | head    # 최근 백업 확인
cp data/progress.db.bak.<TS> data/progress.db
pm2 reload francais-tres-facile
```

## 수동 트리거

GitHub Actions UI → "Deploy to server" workflow → "Run workflow" 버튼으로 푸시 없이도 재배포 가능.
