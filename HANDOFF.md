# 인수인계

마지막 정리: 2026-11-23. 운영(ftf.byb.kr)은 main `255838f` 까지 배포됐다.

## 이 저장소의 앞날 — study-french 로 옮긴다

사용자가 FTF 를 study-french 로 합치기로 정했다(2026-11-23, 안 2: FTF 앱을 study-french 저장소 `app/` 으로 기록째 옮기고 배포·주소를 옮긴다). 계획과 받는 쪽 조건은 [docs/HANDOVER-STUDY-FRENCH.md](docs/HANDOVER-STUDY-FRENCH.md).

- 1단계(세션 인계): 2026-11-23 이 문서로 넘김. **이제 FTF 일은 study-french 세션이 맡는다.**
- 2~5단계(코드·배포·주소 옮기기, 정리): 12월 초 study-french 세션이 시작(study-french 알림 12-03).
- 새 주소: 사용자 확인 중(추천 `study-fr.byb.kr`). 옛 `ftf.byb.kr` 은 301.

## 사용자가 확인할 것

1. **/expressions/practice — 폰에서 한 판**: 달력으로 범위 고르기가 편한지, 상황 대꾸에서 여러 표현이 답이 될 만한데 오답으로 나오는 문제가 남았는지. 보이면 그 문제를 검토 기록(`src/features/expressions/data/practice-review.json`)의 `alsoFits` 에 더한다.
2. **/expressions — 폰과 맥이 같은 「익힘」을 보는지**: 폰·맥 각각 헤더 자물쇠로 암호를 넣고, 폰에서 「익힘」을 누른 뒤 맥에서 새로고침. 실제 암호가 필요해서 세션이 하지 못했다.
3. **/delf — 세트를 풀어 보고 품질 판단**: 미니 하나와 실제 형식 하나. 음성(맥 say), 난이도, 채점·대본 공개, 쓰기 저장과 "첨삭 요청용 복사". 이 판단을 보고 세트를 늘린다(아래).

## 화면과 데이터

| 화면 | 데이터 | 문서 |
|---|---|---|
| `/expressions` 표현 복습·「익힘」 | 원본 study-french `speaking/expressions.json`(지금은 Pages 주소로 읽음), 익힘 `ExpressionProgress` | — |
| `/expressions/practice` 연습 게임 | 같은 원본 + 검토 기록 `practice-review.json`, 범위 `ExpressionPracticeSetting`(key `range`) | [docs/EXPRESSIONS-PRACTICE.md](docs/EXPRESSIONS-PRACTICE.md) |
| `/delf` DELF A1~B2 48세트 | `public/delf/sets/*.json`, 음성 `public/delf/audio`(35MB), 기록 `DelfAttempt` | [docs/DELF.md](docs/DELF.md) |
| `/exercises` `/completed` `/playlist` `/statistics` RFI 연습 | `exercises.db`(RFI 를 긁어 채움, `/api/sync`), 진도 `Progress` | [docs/ID-SYSTEM.md](docs/ID-SYSTEM.md), [docs/STATISTICS.md](docs/STATISTICS.md) |
| `/shadowing` 쉐도잉 | `public/shadowing/*`, `ShadowingProgress`, 자료 만들기 `shadowing-pipeline/` | — |
| `/buzz-challenge/[month]` 사내 챌린지 화면 | RFI 기록에서 계산 | [docs/BUZZ-CHALLENGE.md](docs/BUZZ-CHALLENGE.md) |

쓰기 API 는 모두 `ADMIN_PASSWORD` 로 보호, 읽기는 암호 없이([docs/AUTH.md](docs/AUTH.md)). 디자인은 [docs/THEME.md](docs/THEME.md).

## 명령

pnpm 은 `/opt/homebrew/bin/pnpm` 으로 부른다(다른 pnpm 이면 store 가 어긋난다).

| 할 일 | 명령 |
|---|---|
| 의존성 | `pnpm install` 뒤 `pnpm prisma:generate`(생성물 `src/generated/` 는 git 무시. 새 작업 트리에서 tsc 가 Prisma 를 못 찾으면 이것부터) |
| 개발 서버 | `ADMIN_PASSWORD=local-test pnpm dev --port <포트>` (로컬 DB 는 `data/progress.db`·`data/exercises.db`, git 무시) |
| 로컬 DB 마이그레이션 | `node scripts/migrate-progress.ts` (멱등) |
| 테스트 | `pnpm test:run` (지금 16개 파일 253개) |
| lint | `pnpm lint` (biome. 원래 있는 `public/sw.js` 경고 2개. `.claude/worktrees` 에 작업 트리가 있으면 그 안 biome.json 때문에 실패하니 지운 뒤 돌리거나 `pnpm exec biome check src tests scripts public prisma docs package.json`) |
| 타입 검사 | `pnpm exec tsc --noEmit` |
| 빌드 | `pnpm build` (Next standalone, 이미지 빌드는 `Dockerfile`) |
| DELF | `pnpm delf:index`(형식 검사·목록), `delf:strip`, `delf:audio`(맥 say), `delf:asr`(Whisper 대조) |
| 표현 검토 거리 | `pnpm expressions:review-todo <원본 경로|주소>` |
| RFI 동기화 | `pnpm sync` / `sync:full` |

커밋 전 lefthook 이 biome 을 돈다. pnpm 이 저절로 만드는 `pnpm-workspace.yaml`(allowBuilds 자리표시)은 커밋하지 말고 지운다(값이 비어 이미지 빌드를 깨뜨린다). 빌드 허용 목록은 `package.json` 의 `pnpm.onlyBuiltDependencies`.

## 배포와 비밀 (이름만, 값은 적지 않는다)

- main push → `.github/workflows/image.yml` 이 이미지 `ghcr.io/ybbarng/francais-tres-facile`(앱)·`-tools`(마이그레이션)를 만들고 서버 `deploy.sh` 를 부른다. `docs/`·`*.md` 만 바뀐 push 는 건너뛴다(`paths-ignore`). 자세한 것은 [docs/DEPLOY.md](docs/DEPLOY.md).
- GitHub Actions 비밀: `SERVER_HOST`, `SERVER_USER`, `SERVER_PORT`, `SERVER_SSH_KEY`(배포 키, 서버 `authorized_keys` 에서 forced-command 로 `servers/byb.kr/apps/ftf/deploy.sh` 에 묶임), `GITHUB_TOKEN`(자동, GHCR 받기에 씀).
- 서버 비밀: `servers/byb.kr/apps/ftf/.env` 의 `ADMIN_PASSWORD`. 앱이 읽는 환경 변수는 이것 하나.
- 서버 설정: `ybbarng/servers` 저장소 `byb.kr/apps/ftf/`(compose.yaml, deploy.sh). DB 는 서버 `~/data/ftf/`(progress.db, exercises.db), 배포마다 백업 14개.
- 3단계(배포 옮기기)에서 바뀔 것: 이미지 이름, 워크플로 위치와 경로 필터(`app/**`), deploy.sh 경로와 배포 키 forced-command.

## DELF 를 수준마다 미니 100 + 실제 25 로 늘리기

사용자가 첫 판(48세트)을 풀어 보고 품질·난이도를 확인한 뒤 시작한다. C1·C2(DALF)는 A1~B2 가 끝나고 여유가 있으면.

- 한 번에 수준마다 10~20세트씩. 첫 판에서 지적이 많았던 점을 생성 지시에 미리 넣는다: 정답 위치 쏠림(특히 b·Faux), 지문 없이 상식으로 풀리는 문항, 정답만 길거나 지문을 그대로 옮긴 보기(B2 는 바꿔 말하기 필수), 극단 오답, 소리로 헷갈리는 숫자 함정(세트당 하나만), 대본의 기호(€, %, h)는 낱말로, 날짜·요일은 실제 달력과, 지어낸 일에 실제 지명 쓰지 않기(`https://geo.api.gouv.fr/communes?nom=<이름>` 로 확인), 장난감 계열 음성(Grandma, Grandpa, Rocko) 피하기, 화자를 가려야 하면 남녀로.
- 세트 id 는 이어서(`a1-mini-11` …, `a1-exam-03` …).

정답 확인 절차(docs/DELF.md "정답 확인 단계"를 실제로 돌린 순서):
1. 초안: 수준별 서브에이전트가 작업 트리에서 `public/delf/sets/<id>.json` 을 `review.status: "draft"` 로. 형식 검사 `pnpm delf:index`.
2. 정답 뺀 사본: `pnpm delf:strip <setId|all> <outDir>`.
3. 독립 풀이: 맥락 없는 서브에이전트가 사본만 읽고(정답 키·저장소는 열지 말라고 적는다) 문항마다 답과 지적(ambiguous·unanswerable·guessable·french·level·audio·fact)을 JSON 으로.
4. 비교: 풀이 답과 정답 키를 스크립트로. 다르면 고치거나 뺀다(첫 판 723문항 모두 일치).
5. 지적 고치기: 다른 서브에이전트가 작업 트리에서. 보기 순서를 바꾸면 option id 를 새 순서로 다시 붙이고 answer 를 맞춘다.
6. 재검수: 바뀐 세트는 3~4 를 다시.
7. 음성: `pnpm delf:audio all`(바뀐 문서만), `pnpm delf:asr <setId>` 로 문서마다 90% 이상, 어긋난 곳이 정답 근거와 무관해야.
8. 확인 완료: `review` 를 verified 로(통째로 다시 쓰지 말고 review 부분만 글자로 바꾼다 — diff 가 커진다). 그다음 index·테스트·lint·타입 검사 뒤 push(= 운영 배포, 사용자 승인).

## 표현 연습 검토 기록을 다시 돌리기

새 표현이 원본에 들어오면(12월 이후 E259~) `pnpm expressions:review-todo https://gh.byb.kr/study-french/speaking/expressions.json` 으로 검토 안 된 표현·바뀐 칸을 뽑고, 서브에이전트에게 묶음별로 맡긴다(형식·기준은 docs/EXPRESSIONS-PRACTICE.md). 이번에는 1차로 다른 정답을 몇 개만 적어 빠진 것이 남았고, 2차로 "맥락마다 표현 전체를 하나씩 대 보며 빠진 것만 더하기"를 돌려 채웠다. 새로 돌릴 때도 두 번(판단 → 빠진 것 채우기) 돌리는 것이 낫다. 검토 기록이 없는 표현은 같은 group 표현을 상황 대꾸 오답에서 빼는 기본 규칙으로 나간다.

## 알아 둘 것

- DELF 시험 형식 세부(연습별 배점 등)는 FEI 공식 페이지가 자동 접속을 막아 공개 2차 자료로 맞췄다. 쓰기 채점 기준표의 항목별 점수는 DELF 채점표 항목 이름을 따라 정한 값이다.
- 지난 쓰기 글을 화면에서 다시 보는 기능은 없다(기록 읽기 API 가 공개라 글은 내보내지 않는다).
- DELF 음성 이름은 이 맥의 `say -v '?'` 표시 이름(`Flo (프랑스어(프랑스))` 등)이다. 다른 언어로 설정한 맥에서는 이름이 달라질 수 있다.
- 운영 화면을 Claude in Chrome 으로 볼 때: 사용자 Chrome 에 FTF 암호가 저장돼 있어 칩·토글을 누르면 서버에 저장된다. 보기만 할 때는 페이지 글로 보고 누르지 않는다(2026-11-23 범위 칩을 눌러 서버 값이 바뀐 일).
- 지난 세션의 DELF 도구 스크립트는 `~/.local/state/secretary/backup/ftf-delf-scripts-20261109/` 에 있다.
- 5단계(정리)에 더한 일: lang.byb.kr/french/numbers(프랑스어 숫자 듣기)를 연습 화면의 모드로 다시 짓고 옛 주소를 넘긴다(어려운 범위 70~99·연도·가격·시각·전화번호 고르기 포함, 사용자 동의). 숫자를 낱말로 바꾸는 함수는 `scripts/delf-asr-normalize.ts` 의 `frenchNumber` 를 다시 쓸 수 있다.
