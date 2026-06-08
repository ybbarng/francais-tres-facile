# 쉐도잉 도구 명세 (Specification)

> 이 문서는 `grammaire-francaise/shadowing/`에 만든 정적 사이트의 설계 명세다.
> 향후 `francais-tres-facile` (Next.js)로 옮길 때 손실 없이 이전하기 위한 기준 문서.

## 1. 목적

프랑스어 쉐도잉 (shadowing) 학습 — 음성을 들으면서 동시에 따라 말하는 방식으로 **발음 / 억양 / 리듬 / 청해**를 동시에 훈련.

대상 사용자: B1 수준 학습자 (B2 도달 후 능동 생산 단계 보강용).

## 2. 학습 흐름 — 5단계

학습은 **자유 진행**이 원칙. 각 단계는 가이드일 뿐 강제 X. 사용자는 자유롭게 단계 이동 가능.

| # | 단계 | 자막 | 속도 | 권장 횟수 | 의도 |
|---|------|------|-----|--------|------|
| 1 | 첫 듣기 | OFF | 1.0x | 1회 | 자막 없이 의미 추측, 청해 |
| 2 | 텍스트 + 듣기 | ON | 1.0x | 2~3회 | 자막으로 모르는 단어 확인 |
| 3 | Slow Shadowing | ON | 0.75x | 5~10회 | 텍스트 보며 따라 말하기 (입 운동) |
| 4 | Pure Shadowing | OFF | 1.0x | 3~5회 | 자막 없이 동시 따라 말하기 |
| 5 | 셀프 체크 | OFF | 녹음 | 1회 | 본인 녹음 → 원본 비교 |

단계 전환 시: 자막 / 속도 자동 적용. 단계 5에서만 녹음 UI 활성.

## 3. 학습 단위

콘텐츠를 4 단위로 분할:

| 단위 | 한국어 | 설명 | 분할 기준 |
|------|------|------|---------|
| `full` | 전체 | 자료 전체 | 전체 |
| `segments` | 구간 | 시간 분할 (~60초) | 누적 60초 도달 시 끊음 (자연 문장 종료 시) |
| `paragraphs` | 문단 | 의미 그룹 (~5문장) | 5문장씩 묶음 |
| `sentences` | 문장 | 한 문장 (~3초) | 구두점 (`.`, `!`, `?`) 기준 |

**선택 흐름**: 사용자가 먼저 단위 선택 → 그 단위 안의 항목 (예: "구간 3") 선택 → 학습.

## 4. 데이터 구조

### `data/materials.json` — 자료 목록 (홈 페이지)

```json
{
  "materials": [
    {
      "id": "nicolas-1",
      "title": "Le Petit Nicolas — Chapitre 1",
      "subtitle": "Un souvenir qu'on va chérir",
      "author": "René Goscinny",
      "duration_sec": 479,
      "sentence_count": 117,
      "paragraph_count": 24,
      "segment_count": 8,
      "source_url": "https://youtu.be/3envXRFwxsI",
      "data_file": "data/nicolas-1.json"
    }
  ]
}
```

### `data/{material_id}.json` — 자료 상세

```json
{
  "meta": {
    "title": "Le Petit Nicolas - Chapitre 1",
    "youtube_url": "https://youtu.be/3envXRFwxsI",
    "audio_full": "audio/nicolas-1/full.mp3",
    "duration": 479.12
  },
  "sentences": [
    {
      "text": "Ce matin, nous sommes tous arrivés à l'école bien contents.",
      "start": 30.0,
      "end": 35.9,
      "word_count": 11,
      "audio_file": "audio/nicolas-1/sentences/001.mp3"
    }
  ],
  "paragraphs": [
    {
      "text": "...",
      "start": 30.0,
      "end": 68.1,
      "sentence_count": 5,
      "audio_file": "audio/nicolas-1/paragraphs/001.mp3"
    }
  ],
  "segments": [
    {
      "text": "...",
      "start": 1.2,
      "end": 68.1,
      "sentence_count": 6,
      "audio_file": "audio/nicolas-1/segments/001.mp3"
    }
  ],
  "full_text": "..."
}
```

**핵심 결정**: 각 항목(문장/문단/구간)이 **개별 mp3 파일** 보유. 클릭 시 그 mp3 로드 → 시작/끝이 항상 정확 (`audio.currentTime` 부정확 회피).

## 5. 오디오 분할 방식

### 도구
- `yt-dlp` — YouTube에서 mp3 추출
- `ffmpeg` — wav 변환 + 단위별 mp3 분할
- `whisper-cpp` (`whisper-cli`) — word-level timestamps 추출 (large-v3 모델)

### 흐름 (`make_material.py` 같은 스크립트로 자동화 가능)

```
1. YouTube URL → mp3 (yt-dlp -x --audio-format mp3)
2. mp3 → wav 16kHz mono (ffmpeg)
3. wav → Whisper transcribe (whisper-cli -l fr -ojf, word-level)
4. 후처리 (process.py):
   - 환각 제거 (Sous-titrage, Musique 등)
   - word → sentence (구두점 기준)
   - sentence → paragraph (5문장 그룹)
   - sentence → segment (60초 누적)
5. 단위별 mp3 분할 (split_audio.py, ffmpeg -ss -t -c copy)
6. JSON에 audio_file 경로 추가
```

### 디렉토리 구조

```
audio/{material_id}/
├── full.mp3
├── sentences/001.mp3 ... NNN.mp3
├── paragraphs/001.mp3 ... NNN.mp3
└── segments/001.mp3 ... NNN.mp3
```

## 6. UI 컴포넌트 명세

### 홈 페이지 (`index.html` + `js/home.js`)

- 헤더: 제목 + ? 가이드 버튼 (우측)
- 자료 목록: 카드 형태, 각 자료 클릭 시 `material.html?id={id}`로 이동
- 빈 상태 처리

### 자료 페이지 (`material.html` + `js/material.js`)

순서대로 4개 카드:

1. **단위 선택**: 4개 탭 (전체 / 구간 / 문단 / 문장)
2. **항목 선택**: 선택된 단위의 항목 리스트 (preview 텍스트 + duration)
3. **학습 단계**: 5개 버튼 + 현재 단계 설명
4. **플레이어**:
   - 텍스트 표시 (자막 ON/OFF 시 blur)
   - 재생 컨트롤 (재생/처음/반복/속도/자막)
   - 진행 바
   - 녹음 섹션 (단계 5에서만 노출)
   - 단위 이동 (이전 / 다음)

### 가이드 모달

- ? 버튼 클릭 시 표시
- 5단계 흐름 + 팁
- ESC 또는 배경 클릭으로 닫기

## 7. 키보드 단축키

| 키 | 동작 |
|---|------|
| `Space` | 재생 / 일시정지 |
| `R` | 현재 항목 처음으로 |
| `S` | 자막 토글 |
| `L` | 반복 토글 |
| `←` / `→` | 이전 / 다음 항목 |
| `ESC` | 모달 닫기 |

## 8. 녹음 기능 (단계 5)

### 기술
- `navigator.mediaDevices.getUserMedia({ audio: true })`
- `MediaRecorder` API (mimeType: `audio/webm`)
- HTTPS 또는 `localhost`에서만 동작

### 동작
1. **🎤 녹음 시작**: 마이크 권한 요청 → 녹음 시작 (빨간 펄스 인디케이터)
2. **⏹ 녹음 중지**: Blob 생성 → 메모리(`recordings` 객체)에 저장
3. **▶ 내 녹음 재생**: 저장된 Blob 재생
4. **🔁 원본 / 내 녹음 비교**: 원본 재생 → 0.5초 정지 → 내 녹음 재생
5. **⬇ 다운로드**: 녹음 파일 다운로드 (webm)

### 저장
현재: 메모리만 (페이지 닫으면 사라짐). 단순함 우선.

향후 옵션:
- `localStorage` (Base64 인코딩) — 용량 제한
- `IndexedDB` — 큰 Blob 저장 가능
- 서버 업로드 (ftf 통합 시)

### 한계 (현재 정적 사이트)
- 발음 자동 분석 X (Whisper transcribe + diff 비교 가능하지만 무거움)
- 클라우드 저장 X
- 단순 청취 비교가 적절

## 9. 상태 관리

### 클라이언트 상태 (메모리만)
- `currentUnit`: 'full' | 'segments' | 'paragraphs' | 'sentences'
- `currentIndex`: number (선택된 항목 인덱스)
- `currentStep`: 1~5
- `repeatOn`: boolean
- `subtitleOn`: boolean (단계 전환 시 자동 적용)
- `recordings`: `{ [unit_index_key]: Blob }`

### 영구 저장 (현재 X, 향후 검토)
- 마지막 위치 (자료 / 단위 / 항목)
- 사용자 선호 (속도 기본값, 자막 토글 기본 등)

## 10. 향후 확장 (ftf 이전 시)

### Next.js 컴포넌트 매핑

| 현재 (Vanilla) | Next.js |
|--------------|--------|
| `index.html` + `home.js` | `app/shadowing/page.tsx` |
| `material.html` + `material.js` | `app/shadowing/[id]/page.tsx` |
| `data/materials.json` | DB 쿼리 (`getMaterials`) |
| `data/{id}.json` | DB 쿼리 (`getMaterial(id)`) |
| `audio/...` (정적 파일) | 정적 자산 또는 CDN |

### ftf DB 통합

RFI A2 121개 자료가 이미 ftf DB에 있음:
- transcript + audio_url 활용
- 한 번에 단위 분할 (Whisper 불필요 — 이미 정확한 transcript)
- 동일 5단계 학습 흐름 + 녹음 적용

### 추가 기능 (Q4 인프라 — 9월 예정)

- 녹음 → Whisper 전사 → 원본과 단어 diff
- 발음 정확도 점수
- 진도 추적 (localStorage 또는 DB)
- 마지막 학습 위치 기억
- 자료 추가 UX (관리자용)

## 11. 자료 추가 절차 (운영자용)

새 자료 추가:

```bash
# 1. mp3 추출
yt-dlp -x --audio-format mp3 "URL" -o "new-mat.mp3"

# 2. wav 변환
ffmpeg -i new-mat.mp3 -ar 16000 -ac 1 new-mat.wav

# 3. Whisper transcribe
whisper-cli -m ~/.whisper-models/ggml-large-v3.bin -l fr -ojf -of new-mat new-mat.wav

# 4. 후처리 (process.py 수정 또는 일반화)
python3 process.py  # → new-mat-processed.json

# 5. 오디오 분할 (split_audio.py 일반화)
python3 split_audio.py  # → audio/new-mat/{full,sentences,paragraphs,segments}

# 6. materials.json에 항목 추가
```

→ 향후 단일 스크립트 `make_material.py URL <id>` 만들어 자동화.

## 12. 의존성

- Python 3.10+ (어디든 OK, 3.14에서도 후처리 가능)
- ffmpeg
- yt-dlp
- whisper-cpp (brew install whisper-cpp)
- Whisper large-v3 모델 (~3GB, 한 번 다운로드)
- 브라우저 (Chrome/Safari/Firefox, MediaRecorder API 지원)

## 13. 파일 구조

```
shadowing/
├── SPEC.md                           # 이 문서
├── index.html                        # 홈 페이지
├── material.html                     # 자료 페이지
├── css/style.css
├── js/
│   ├── home.js                       # 홈 페이지 로직
│   └── material.js                   # 자료 페이지 + 5단계 + 녹음
├── data/
│   ├── materials.json                # 자료 목록
│   └── nicolas-1.json                # 자료 상세
└── audio/
    └── nicolas-1/
        ├── full.mp3
        ├── sentences/001.mp3 ~ NNN.mp3
        ├── paragraphs/001.mp3 ~ NNN.mp3
        └── segments/001.mp3 ~ NNN.mp3
```

## 14. 결정 이력

| 일자 | 결정 | 비고 |
|-----|------|----|
| 2026-06-07 | 위치: `grammaire-francaise/shadowing/` (임시) | ftf 안정화 후 이전 예정 |
| 2026-06-07 | 단위 한국어: 전체 / 구간 / 문단 / 문장 | "구간"이 가장 자연 |
| 2026-06-07 | 5단계 학습 흐름 | 사용자 자유 진행 |
| 2026-06-07 | 개별 mp3 분할 | 정확한 시작/끝 보장 |
| 2026-06-07 | 녹음 = 메모리만 | 정적 사이트라 단순화 |
| 2026-06-07 | Whisper large-v3 | 정확도 우선 (M3 Pro에서 1.5분 처리) |

## 15. ftf 이전 시 체크리스트

- [ ] 5단계 학습 흐름 유지
- [ ] 4 단위 (전체/구간/문단/문장) 모두 작동
- [ ] 단위별 개별 mp3 시스템 (또는 timestamps 기반 정확 재생)
- [ ] 자막 토글 (blur)
- [ ] 속도 조절 (0.5/0.75/1.0/1.25)
- [ ] 반복 + 자동 다음
- [ ] 녹음 + 비교 (단계 5)
- [ ] 가이드 모달 (?)
- [ ] 키보드 단축키
- [ ] 자료 추가 절차 (스크립트)
- [ ] RFI 121개 자료 통합
- [ ] 진도 추적 (DB)
- [ ] Whisper 자동 분석 (Q4)
