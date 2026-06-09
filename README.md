# Français Très Facile

RFI(Radio France Internationale) 프랑스어 학습 콘텐츠를 더 편리하게 학습할 수 있는 웹앱입니다.

## 주요 기능

- RFI 학습 콘텐츠 동기화 (H5P 퀴즈, 오디오, 스크립트)
- 학습 진도 추적 (완료 상태, 점수, 메모)
- 레벨별 필터링 (A1, A2, B1, B2)
- 퀴즈 자동 크기 조절
- 스크립트(Transcription) 표시
- 비전형적 콘텐츠 표시 (오디오/스크립트 누락 시 "Atypique" 배지)

## 시작하기

### 설치

```bash
pnpm install
```

### 데이터베이스 설정

```bash
pnpm prisma migrate dev
```

### 개발 서버 실행

```bash
pnpm dev
```

[http://localhost:3000](http://localhost:3000)에서 앱을 확인할 수 있습니다.

## 동기화 명령어

RFI 사이트에서 콘텐츠를 가져오는 동기화 스크립트입니다.

```bash
# 도움말
pnpm sync help

# 전체 동기화 (모든 섹션 스크래핑 + H5P 추출)
pnpm sync full

# H5P URL만 업데이트 (기본값)
pnpm sync update-h5p

# 스크립트(Transcription)만 업데이트
pnpm sync update-transcript
```

## 테스트

```bash
pnpm test
```

## 린트

```bash
pnpm lint
```

## 배포

`main`에 push 하면 GitHub Actions가 자동으로 서버의 `./server`를 SSH로 돌립니다. 수동 배포는 서버에서 `./server` 한 줄.

`./server`가 순서대로 하는 일:

1. **`progress.db` 자동 백업** — `data/progress.db.bak.<timestamp>` (최근 14개 유지)
2. `git pull`
3. `pnpm install`
4. `pnpm run prisma:generate`
5. `pnpm run migrate:progress` — 멱등 SQL 적용 (sqlite3 CLI 불필요)
6. `pnpm run build`
7. `pm2 restart francais-tres-facile` (첫 실행 시 `pm2 start ecosystem.config.js`)
8. **헬스체크** — `/api/progress`가 200 응답해야 통과

자동 배포 셋업과 DB 안전 정책 자세한 내용은 [docs/DEPLOY.md](docs/DEPLOY.md).

## 기술 스택

- **프레임워크**: Next.js 16 (App Router)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS
- **데이터베이스**: SQLite + Prisma ORM
- **테스트**: Vitest + React Testing Library
- **크롤링**: Cheerio + Playwright (H5P 추출)
