# Progress 시스템

## 개요

학습 진도 데이터는 **localStorage**에 저장됩니다. 서버 DB가 아닌 클라이언트에 저장하여:
- 로그인 없이 사용 가능
- 개인 데이터 프라이버시 보장
- 오프라인에서도 진도 확인 가능

## 데이터 구조

```typescript
interface ProgressData {
  completed: boolean;      // 완료 여부
  score?: number;          // 퀴즈 점수
  maxScore?: number;       // 최대 점수
  listenCount: number;     // 오디오 재생 횟수
  notes?: string;          // 개인 메모
  completedAt?: string;    // 완료 시각 (ISO 8601)
}

// localStorage 저장 형태
{
  [exerciseId: string]: ProgressData
}
```

## 저장소 키

- **키**: `ftf-progress`
- **형식**: JSON 문자열

## 내보내기/불러오기

### 내보내기 (Export)

1. localStorage에서 진도 데이터 읽기
2. Brotli로 압축 (quality: 11)
3. Base64 인코딩
4. 클립보드에 복사

### 불러오기 (Import)

1. 사용자가 코드 붙여넣기
2. Base64 디코딩
3. Brotli 압축 해제
4. JSON 파싱 및 유효성 검사
5. localStorage에 저장
6. 페이지 새로고침

## 압축 효율

| Exercice 수 | 원본 JSON | 압축 후 (Brotli) |
|-------------|-----------|------------------|
| 100개 | ~8KB | ~1-2KB |
| 500개 | ~40KB | ~8-10KB |
| 1000개 | ~80KB | ~15-25KB |

## 파일 위치

- `src/lib/progress.ts` - localStorage 진도 관리 유틸리티
- `src/lib/compression.ts` - Brotli 압축/해제 유틸리티
- `src/components/DataManager.tsx` - 내보내기/불러오기 UI

## 마이그레이션

이전 버전(DB 기반 Progress)에서 마이그레이션이 필요한 경우:
1. 기존 진도 데이터를 JSON으로 내보내기
2. 새 버전에서 불러오기 사용

## 브라우저 지원

Brotli-wasm은 WebAssembly를 사용합니다:
- Chrome 57+ (2017년 3월)
- Firefox 52+ (2017년 3월)
- Safari 11+ (2017년 9월)
- Edge 16+ (2017년 10월)
- iOS Safari 11+ (iOS 11, 2017년)
