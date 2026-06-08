# 쉐도잉 운영 노트

설계는 `SPEC.md`, 이 파일은 운영 — 자료 추가 절차, 알려진 한계, 디버깅 방법.

## 배포

- URL: https://gh.byb.kr/grammaire-francaise/shadowing/
- 호스트: GitHub Pages (main 브랜치 / root, `.nojekyll` 적용)
- HTTPS enforced (녹음 기능용)
- 이전 계획: 추후 `francais-tres-facile` repo로 이전

## 새 자료 추가 절차

1. **원본 오디오 준비** — YouTube URL 또는 로컬 mp3
2. **정본 텍스트 준비** — `.txt` 파일. 챕터 제목은 별도 처리 가능 (`title_text` 필드)
3. **config 작성** — `configs/<material_id>.json`. 예시는 `configs/nicolas-1.json`
4. **실행** — `python3 pipeline.py --config configs/<id>.json`
5. **결과 확인** — `data/<id>_report.json`에서 `unresolved_issues: 0`인지
6. **사이트에서 확인** — 로컬: `python3 -m http.server 8000`
7. **커밋 + push** — 작업 캐시(`source.mp3` 등)는 `.gitignore`로 자동 제외

## Config 옵션

| 필드 | 설명 | 기본값 |
|---|---|---|
| `material_id` | 자료 ID (디렉토리/파일명에 사용) | (필수) |
| `language` | Whisper 언어 코드 (`fr` 등) | (필수) |
| `audio_source` | URL 또는 mp3 경로 | (필수) |
| `reference_text` | 정본 텍스트 파일 경로 | (필수) |
| `whisper_model` | ggml 모델 경로 | (필수) |
| `title_text` | 챕터 제목 (별도 sentence로 추가) | 없음 |
| `overrides` | sentence 인덱스별 start/end 강제 적용 | `{}` |
| `silence_noise_db` | silence detection threshold | `-30dB` |
| `silence_min_duration` | 최소 silence 길이 | `0.2` |
| `snap_window` | silence-snap 탐색 window (초) | `1.2` |
| `snap_pad` | snap 후 padding | `0.05` |
| `default_lead_pad` | align timestamp 앞 padding | `0.05` |
| `default_tail_pad` | align timestamp 뒤 padding | `0.2` |
| `silence_sec` | sentence 사이 무음 길이 (concat용) | `0.3` |
| `segment_target_sec` | segment 길이 목표 | `60` |
| `force_reextract` / `force_whisper` / `force_silence` | 캐시 무시 | `false` |

## 검증 카테고리

- **OK** — 단어 누락 없음, 경계 깨끗
- **FALSE_POSITIVE** — 발음 동일 매칭 통과 (예: 끝 `s` 묵음). 사실상 OK
- **REAL_CUT_END / REAL_CUT_START** — 단어 누락 검출. auto_fix가 boundary 확장으로 보정 시도
- **EXTRA_AT_START / EXTRA_AT_END** — 시작/끝에 음성 외 군더더기. auto_fix가 trim

## 알려진 한계

### 음악 → 음성 전환 (챕터 시작)
챕터 오프닝 음악 직후 첫 본문 sentence는 자동 검출 한계:
- ffmpeg silencedetect는 음악을 silence로 안 잡음 (음량 ~-19dB)
- Whisper는 음악을 첫 단어의 sub-token으로 흡수해 word.start=0이 됨
- → validation도 통과해버림

**해결책**: `overrides`로 `start` 수동 지정. 챕터당 1건 발생.
```json
"overrides": { "2": { "start": 32.72 } }
```

향후 자동화하려면 silero-vad 도입 가능.

### 챕터 제목이 노래/음악과 겹치는 경우
Whisper가 보컬 부분의 timestamp를 매우 부정확하게 잡음. `overrides`로 처리.

### 끝 자음 잘림
Whisper word.end가 자음 release 전에 끊는 경향. 두 가지로 완화:
1. word 직후 punctuation 토큰의 audio time을 word.end로 흡수 (`extract_whisper_words`)
2. `default_tail_pad` 0.2s padding

여전히 짧으면 `default_tail_pad`를 0.3으로 늘리거나 자료별 override.

## 캐시 파일 (재실행 시 활용)

- `audio/<id>/source.mp3` — 원본 오디오 (yt-dlp 캐싱)
- `data/<id>_whisper.json` — 전체 Whisper transcribe 결과
- `data/<id>_silences.json` — silence detection 결과

모두 `.gitignore` 대상. 재실행 시 `force_*` 플래그로 무효화 가능.

## 디버깅 팁

- `data/<id>_report.json`에서 카테고리 분포 확인
- 특정 sentence 들어보기: `audio/<id>/sentences/NNN.mp3`
- raw whisper 확인: `data/<id>_whisper.json` JSON 직접 grep
- silence boundary 확인: `data/<id>_silences.json`
