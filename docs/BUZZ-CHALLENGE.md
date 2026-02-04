# Buzz Challenge de Brice

## 개요

Buzz Challenge는 2026년 1분기(1Q) 동안 90개의 exercice를 완료하는 목표 달성 시스템입니다.

## 목표

| 월 | 목표 개수 | 누적 | 색상 테마 |
|----|----------|------|-----------|
| Janvier (1월) | 31개 | 31 | 파란색 (겨울) |
| Février (2월) | 28개 | 59 | 로즈 (발렌타인) |
| Mars (3월) | 31개 | 90 | 에메랄드 (봄) |

## 진행 방식

- 완료된 exercice는 **completedAt (완료 일시)** 기준으로 **오름차순** 정렬
- 정렬된 순서대로:
  - 1~31번째 → 1월
  - 32~59번째 → 2월
  - 60~90번째 → 3월
- **실제 완료 날짜와 무관**하게 순서로만 분류됨

## UI 구성

### 홈 대시보드

위치: `/` (홈 페이지 상단)

- 3개 월별 진행 카드 표시
- 각 카드에 진행률 바 및 완료 상태 아이콘
- 카드 클릭 시 해당 월 상세 페이지로 이동

### 월별 상세 페이지

위치: `/buzz-challenge/[month]` (janvier, fevrier, mars)

- 해당 월에 포함된 exercice 목록
- 각 항목에 번호 표시 (1, 2, 3...)
- 완료 날짜 표시 및 수정 가능
- Terminés 페이지와 유사한 UI

## 파일 구조

```
src/app/
├── page.tsx                          # 홈 - Buzz Challenge 대시보드
└── buzz-challenge/
    └── [month]/
        └── page.tsx                  # 월별 상세 페이지

tests/
└── buzz-challenge.test.ts            # 월별 분류 로직 테스트
```

## 계산 로직

```typescript
// 월별 진행 상황 계산
function calculateMonthProgress(completed: number, monthIndex: number) {
  const months = [
    { target: 31, cumulative: 31 },   // 1월
    { target: 28, cumulative: 59 },   // 2월
    { target: 31, cumulative: 90 },   // 3월
  ];

  const month = months[monthIndex];
  const prevCumulative = monthIndex === 0 ? 0 : months[monthIndex - 1].cumulative;
  const monthProgress = Math.max(0, Math.min(month.target, completed - prevCumulative));
  const isComplete = completed >= month.cumulative;

  return { monthProgress, isComplete };
}
```

## 예시

총 45개 완료 시:
- **1월**: 31/31 ✅ (완료)
- **2월**: 14/28 (45 - 31 = 14)
- **3월**: 0/31
