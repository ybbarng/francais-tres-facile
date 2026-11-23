# FTF → study-french 인계 계획 (초안, 2026-11-23)

사용자가 FTF(francais-tres-facile)의 역할을 study-french 로 합치기로 했다. FTF 세션이 인계를 준비하고, study-french 가 받는다. 사이트 주소는 바뀔 수 있다.

**정할 것 두 가지** — 이것만 정하면 나머지는 FTF 세션이 준비한다.
1. 어디까지 합칠지 (아래 세 안 중 하나)
2. 새 주소 (예: `french.byb.kr`, 옛 `ftf.byb.kr` 은 새 주소로 넘겨 주기)

## 지금 FTF 가 맡은 것

| 화면 | 하는 일 | 데이터 | study-french 와의 관계 |
|---|---|---|---|
| `/expressions` | 말하기 표현 복습, 「익힘」 | 원본 `study-french/speaking/expressions.json`(Pages 주소로 읽음), 익힘은 서버 DB | 원본이 study-french |
| `/expressions/practice` | 표현 연습 게임(달력 범위, 검토 기록) | 같은 원본 + FTF 검토 기록 `src/features/expressions/data/practice-review.json`, 범위는 서버 DB | 원본이 study-french |
| `/delf` | DELF A1~B2 모의고사 48세트, 채점·쓰기 저장 | `public/delf/sets/*.json`, 음성 35MB, 기록은 서버 DB | 쓰기 첨삭은 study-french 에서 |
| `/exercises` `/completed` `/playlist` `/statistics` | RFI 「Français facile」 연습 모음·진도 | 서버 DB(exercises.db 는 RFI 를 긁어 채움, progress.db) | 없음 |
| `/shadowing` | 쉐도잉 자료와 반복 횟수 | `public/shadowing/*`, 서버 DB | 없음 |
| `/buzz-challenge/[month]` | 사내 챌린지 월별 인증 화면 | RFI 기록에서 계산 | study-french 에도 `buzz-challenge/` 기록이 따로 있다(겹침) |

돌아가는 곳
- 서버: byb.kr → nginx(TLS) → Traefik → `ftf` 컨테이너. 설정은 `ybbarng/servers` 저장소 `byb.kr/apps/ftf/`(compose.yaml, deploy.sh).
- 배포: FTF 저장소 main push → GitHub Actions 가 이미지 두 개(`ghcr.io/ybbarng/francais-tres-facile`, `-tools`)를 만들고 배포 키로 서버의 deploy.sh 를 부른다. 배포 키는 forced-command 로 그 deploy.sh 경로에 묶여 있다.
- 서버 DB: `~/data/ftf/progress.db`(익힘·연습 범위·DELF 기록·쉐도잉·RFI 진도), `~/data/ftf/exercises.db`. 배포마다 백업 14개를 남긴다.
- 비밀: 서버 `servers/byb.kr/apps/ftf/.env` 의 `ADMIN_PASSWORD`, GitHub Actions 비밀(`SERVER_*`). 값은 이 문서에 적지 않는다.

study-french 는 노트·데이터 저장소이고 GitHub Pages 로 정적 파일만 낸다(서버·DB 없음).

## 세 안

### 안 1. 세션만 넘긴다 (저장소·주소 그대로)
FTF 저장소와 서버는 그대로 두고, 앞으로 FTF 일을 study-french 세션이 맡는다(study-french 세션이 FTF 저장소도 고치고 배포한다).
- 장점: 바뀌는 것이 없어 위험이 없다. 오늘 바로 끝난다.
- 단점: 저장소가 둘로 남아 "합쳤다"는 느낌이 약하다. 표현 원본은 여전히 Pages 주소로 읽는다.

### 안 2. 앱을 study-french 저장소로 옮긴다 (추천)
FTF 코드를 기록째 study-french 저장소의 `app/` 폴더로 옮기고(git subtree), 배포 워크플로도 옮긴다. 서버의 앱·DB 는 그대로 쓰고 이름만 정리한다. 주소는 새 주소로 바꾸고 옛 주소는 넘겨 준다. FTF 저장소는 보관(archive)한다.
- 장점: 한 저장소에서 데이터(expressions.json)와 화면을 같이 고친다. 표현 원본을 주소가 아니라 같은 저장소 파일로 읽을 수 있다. 학습 노트와 연습 화면이 한곳에 모인다.
- 단점: study-french 저장소에 Node 앱·이미지 빌드가 들어온다(Pages 와 함께 산다). 배포 키·서버 설정·도메인을 함께 바꿔야 해서 servers 저장소 일이 생긴다. 음성 35MB 가 study-french 저장소에 들어온다.

### 안 3. 학습 화면만 옮기고 나머지는 접는다
study-french 데이터와 이어진 화면(표현·연습·DELF)만 study-french 로 옮기고, RFI·쉐도잉·통계·FTF 버즈 챌린지는 접거나(보관) 그대로 둔다.
- 장점: study-french 에 꼭 필요한 것만 들어간다.
- 단점: RFI·쉐도잉 기록을 계속 쓸지 사용자 판단이 필요하다. 화면을 나누는 일이 안 2보다 많다.

## 안 2를 고르면 하는 순서 (각 단계는 따로 승인받는다)

1. **세션 인계(바깥 일 없음)**: FTF 의 남은 일·절차를 study-french HANDOFF 로 옮기고, 이 문서와 FTF HANDOFF 를 study-french 가 읽는다. 이때부터 FTF 일은 study-french 세션이 맡는다.
2. **코드 옮기기**: study-french 저장소에 `app/` 으로 FTF 기록을 합친다(git subtree). 테스트·lint 가 study-french 안에서 돈다. 이 단계에서는 배포를 바꾸지 않는다(FTF 저장소가 계속 배포).
3. **배포 옮기기**: 이미지 빌드 워크플로를 study-french 로 옮기고(경로 필터 `app/**`), servers 저장소의 deploy.sh·compose 를 새 이미지 이름으로. 배포 키 forced-command 경로를 맞춘다. 서버 DB 는 그대로(옮기지 않음).
4. **주소 바꾸기**: 새 주소 nginx·TLS, 옛 `ftf.byb.kr` 은 301 로 넘긴다. `lang.byb.kr` 홈의 프랑스어 링크를 새 주소로 바꾼다(홈은 lang.byb.kr 세션이 맡는다, 비서를 통해 요청). 폰 홈 화면 바로가기·북마크는 사용자가 새로 단다.
5. **정리**: FTF 저장소 archive, 표현 원본을 같은 저장소 파일로 읽게 바꾸기, 겹치는 buzz-challenge 정리.

## FTF 세션이 넘길 것
- 이 문서, FTF `HANDOFF.md`(DELF 확장 절차·정답 확인 단계), `docs/DELF.md`, `docs/EXPRESSIONS-PRACTICE.md`(검토 기록과 다시 돌리는 법), `docs/DEPLOY.md`, `docs/AUTH.md`.
- 사용자 확인이 남은 것: `/expressions` 폰→맥 「익힘」, `/delf` 풀어 보기, `/expressions/practice` 한 판.
- 검토 기록 다시 돌리기: 새 표현이 들어오면 `pnpm expressions:review-todo <원본>` 으로 뽑아 서브에이전트에게 맡긴다.
