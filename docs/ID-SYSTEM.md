# Exercise ID 시스템

## 개요

Exercise ID는 URL 기반 해시로 생성됩니다. 짧고 일관된 ID를 통해 진도 데이터 저장 시 용량을 줄입니다.

## ID 생성 방식

### 알고리즘: djb2 + Base36

```typescript
function generateShortId(url: string, suffix = 0): string {
  const input = suffix ? `${url}#${suffix}` : url;
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}
```

### 특징

| 항목 | 값 |
|------|-----|
| 해시 알고리즘 | djb2 (32비트) |
| 인코딩 | Base36 (0-9, a-z) |
| 결과 길이 | 6-7자 |
| 결정적 | 동일 URL → 동일 ID |

### 예시

```
URL: https://francaisfacile.rfi.fr/fr/actualité/20260109-example
ID:  1lhym2l (7자)

이전 (cuid): cml5xmfdm0000gzroyotsm26u (25자)
이후 (djb2): 1lhym2l (7자)
```

## 충돌 처리

djb2는 32비트 해시라 충돌 가능성이 있습니다:

| 데이터 수 | 충돌 확률 |
|-----------|-----------|
| 100개 | ~0.001% |
| 1,000개 | ~0.01% |
| 10,000개 | ~1% |

### 충돌 해결

충돌 시 suffix를 증가시켜 다른 해시 생성:

```typescript
// 충돌 없음
generateShortId("url-a")     → "abc123"

// 충돌 발생 시
generateShortId("url-b", 0)  → "abc123" (충돌!)
generateShortId("url-b", 1)  → "xyz789" (OK)
```

실제 코드:

```typescript
let suffix = 0;
while (true) {
  const id = generateShortId(url, suffix);
  const existingUrl = idToUrl.get(id);

  if (!existingUrl) {
    // 새 ID 사용
    idToUrl.set(id, url);
    return id;
  }
  if (existingUrl === url) {
    // 같은 URL, 기존 ID 반환
    return id;
  }

  // 충돌 → 다시 시도
  suffix++;
}
```

## 파일 위치

- `src/lib/id.ts` - ID 생성 함수
- `src/app/api/sync/route.ts` - 동기화 시 ID 생성
- `tests/id.test.ts` - ID 생성 테스트

## 마이그레이션

기존 cuid ID에서 djb2 ID로 마이그레이션:

```bash
npx tsx scripts/migrate-ids.ts
```

이 스크립트는:
1. 기존 Exercise 데이터 백업 (`scripts/exercises-backup.json`)
2. Progress 및 Exercise 삭제
3. 새 ID로 Exercise 복원
4. ID 매핑 저장 (`scripts/id-mapping.json`)
