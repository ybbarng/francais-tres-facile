# DELF 모의고사

`/delf` 에서 DELF A1·A2·B1·B2 를 시험 형식으로 연습한다. RFI 연습(`/exercises`)과 달리 **시험 형식 연습**이다.
실제 기출이 아니다. France Éducation International 의 기출·샘플 문항을 옮기지 않고, 형식·난이도만 맞춰 새로 쓴 문제다. 화면에도 "실제 기출 아님"을 적는다.

- 영역: 듣기(CO)·읽기(CE)는 객관식이라 앱이 채점한다. 쓰기(PE)는 답을 저장만 하고, 첨삭은 study-french 에서 Claude 에게 받는다. 말하기(PO)는 넣지 않는다.
- 종류: `mini` 미니 세트(15분 안팎, 듣기 문서 1~2 + 읽기 문서 1~2 + 짧은 쓰기 1), `exam` 실제 형식 한 회분(그 수준의 영역별 시간·25점 배점·문항 유형).
- 목표: 수준마다 미니 100 + 실제 25. 첫 판은 수준마다 미니 10 + 실제 2(모두 48개).

## 파일

```
public/delf/sets/index.json          # 세트 목록(화면이 읽는다). scripts/delf-index.ts 가 만든다
public/delf/sets/<setId>.json        # 세트 하나 = 파일 하나. 사람이 검토하는 원본
public/delf/audio/<setId>/<docId>.mp3  # 듣기 음성. scripts/delf-audio.ts 가 대본에서 만든다
```

`setId` 규칙: `<level 소문자>-<kind>-<두 자리 번호>` — 예 `a1-mini-01`, `b2-exam-02`.

## 세트 형식 `ftf/delf-set@1`

```jsonc
{
  "schema": "ftf/delf-set@1",
  "id": "a2-mini-03",
  "level": "A2",              // A1 | A2 | B1 | B2
  "kind": "mini",             // mini | exam
  "title": "Un week-end à Lyon",   // 프랑스어 짧은 제목
  "sections": [
    {
      "area": "CO",           // CO 듣기 | CE 읽기 | PE 쓰기
      "minutes": 5,           // 이 영역 권장 시간
      "instructions": "Vous allez entendre ... Lisez d'abord les questions.",  // 시험지 지시문(프랑스어)
      "documents": [
        {
          "id": "doc1",       // 세트 안에서 유일. 음성 파일 이름이 된다
          "context": "Vous entendez ce message sur votre répondeur.",  // 문서 앞 안내(프랑스어)
          // CO 만: 대본. 화자마다 맥 say 음성(fr_FR)을 정한다. 문제를 푼 뒤에만 화면에 보인다
          "audio": {
            "plays": 2,       // 들려주는 횟수(DELF 규칙대로)
            "script": [
              { "speaker": "Femme", "voice": "Flo (프랑스어(프랑스))", "text": "Bonjour Paul, c'est Marie..." }
            ]
          },
          // CE 만: 읽기 지문. 빈 줄로 문단을 나눈다. 광고·메일 같은 형식이면 title 을 쓴다
          "title": "Objet : invitation",
          "text": "Chère Anne,\n\nJe t'écris pour...",
          "questions": [
            {
              "id": "q1",     // 세트 안에서 유일
              "type": "choice",   // choice 하나 고르기 | multi 여러 개 고르기 | truefalse 참/거짓(/알 수 없음)
              "prompt": "Marie appelle Paul pour...",
              "options": [
                { "id": "a", "text": "l'inviter au cinéma." },
                { "id": "b", "text": "annuler un rendez-vous." },
                { "id": "c", "text": "demander un service." }
              ],
              "answer": ["b"],    // 정답 option id. choice·truefalse 는 하나, multi 는 여럿(모두 맞아야 점수)
              "points": 1,        // 0.5 단위 허용
              "explanation": "« je ne peux pas venir samedi » 에서 약속을 취소한다는 것을 알 수 있다."  // 한국어 해설, 근거 문장 인용
            }
          ]
        }
      ],
      // PE 만: 쓰기 과제
      "tasks": [
        {
          "id": "w1",
          "prompt": "Vous avez passé un week-end chez des amis. Vous écrivez un message pour les remercier...",
          "minWords": 60,
          "maxWords": 80,
          "points": 10,
          "rubric": [ { "criterion": "Respect de la consigne", "points": 2 } ]   // 첨삭 기준. 합이 points 와 같다
        }
      ]
    }
  ]
}
```

규칙

- `truefalse` 의 options 는 `[{ "id": "v", "text": "Vrai" }, { "id": "f", "text": "Faux" }]` 이고, "알 수 없음"이 필요하면 `{ "id": "n", "text": "On ne sait pas" }` 를 더한다.
- 정답은 지문·대본만 보고 하나로 정해져야 한다. 다른 보기가 그럴듯하게라도 맞으면 안 된다.
- `explanation` 은 근거가 되는 지문·대본 문장을 인용한다.
- `exam` 의 CO·CE·PE 배점은 각각 25점이다(DELF 처럼). `mini` 는 배점을 자유롭게 두되 CO·CE 는 문항당 1점 안팎.
- 지문·대본·문항은 그 수준(CECR)의 어휘·문법 안에서 쓴다. 고유명사·숫자·시간이 정답 근거면 대본에 또렷이 넣는다.
- 듣기 음성은 맥 `say` 로 만든다. `voice` 는 `say -v '?'` 의 fr_FR 이름을 그대로 쓴다(예 `Thomas`, `Jacques`, `Flo (프랑스어(프랑스))`, `Eddy (프랑스어(프랑스))`, `Sandy (프랑스어(프랑스))`, `Shelley (프랑스어(프랑스))`, `Rocko (프랑스어(프랑스))`). 대화는 화자마다 다른 음성.
- 세트 맨 끝 `review` 에 확인 단계 기록을 남긴다:
  `"review": { "status": "verified", "by": "independent-solver", "at": "2026-11-08", "notes": "..." }`
  확인 전은 `"status": "draft"`. 화면은 `verified` 만 보인다.

## 정답 확인 단계

1. 만든 세트에서 `answer`·`explanation` 을 뺀 사본을 `scripts/delf-strip.ts` 로 만든다.
2. 맥락 없는 서브에이전트가 사본만 보고 푼다. 대본은 글로 준다.
3. 그 답과 정답 키를 비교한다. 다르면 문항을 고치거나 뺀다. 지문이 수준에 맞는지, 프랑스어가 틀리지 않았는지도 함께 본다.
4. 음성은 Whisper 로 받아 적어 대본과 비교한다(합성 음성이 단어를 빼먹거나 숫자를 다르게 읽지 않았는지).

## 저장

`progress.db` 의 `DelfAttempt` 표(멱등 마이그레이션). 쓰기 API 는 `docs/AUTH.md` 의 암호 보호를 따른다.
