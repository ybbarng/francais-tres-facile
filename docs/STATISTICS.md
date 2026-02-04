# Statistiques (통계)

## 개요

학습 현황을 다양한 시각화와 지표로 보여주는 페이지입니다.

**URL**: `/statistics`

## 주요 지표 카드

| 지표 | 설명 |
|------|------|
| Exercices terminés | 완료한 총 exercice 수 |
| Jours consécutifs | 현재 연속 학습 일수 |
| Écoutes audio | 총 오디오 재생 횟수 |
| Score moyen | 평균 점수 (%) |

## Série d'apprentissage (학습 시리즈)

| 항목 | 설명 |
|------|------|
| Série actuelle | 현재 연속 학습 일수 (어제/오늘 완료 기준) |
| Record jours | 최장 연속 학습 일수 |
| Max/jour | 하루에 가장 많이 완료한 횟수 |

추가 정보:
- 일 평균 완료 수
- 첫 번째 완료 날짜

## Performances (성과)

| 항목 | 설명 |
|------|------|
| Score moyen | 평균 점수 |
| Meilleur score | 최고 점수 |
| Score le plus bas | 최저 점수 (클릭 시 해당 exercice로 이동) |
| Scores parfaits | 만점(100%) 횟수 |
| Exercices avec score | 점수가 기록된 exercice 수 |

## 시간대 분석

### Jour le plus actif (가장 활발한 요일)
- 요일별 완료 횟수 막대 그래프
- 가장 많이 완료한 요일 강조

### Heure préférée (선호 시간대)
- 시간대별 히트맵 (0-23시)
- 가장 많이 완료한 시간대 강조

## Progression mensuelle (월별 추이)

최근 6개월간 월별 완료 횟수 막대 그래프

## Distribution des scores (점수 분포)

- 1% 단위 히스토그램 (0-100%)
- 101개 막대로 세밀한 분포 표시
- x축: 10단위 레이블 (0, 10, 20, ..., 100)
- 마우스 호버 시 해당 점수와 개수 표시

## Par niveau (레벨별 분포)

A1, A2, B1, B2, C1C2 레벨별 완료 비율

## Par catégorie (카테고리별 분포)

상위 10개 카테고리별 완료 횟수

## API

**Endpoint**: `GET /api/statistics`

**응답 예시**:
```json
{
  "totalCompleted": 45,
  "totalListenCount": 120,
  "firstCompletedAt": "2026-01-15T10:00:00.000Z",
  "averagePerDay": 1.5,
  "mostCompletedInOneDay": 5,
  "streak": {
    "current": 3,
    "longest": 10
  },
  "mostActiveDay": { "day": "Mardi", "count": 12 },
  "mostActiveHour": { "hour": 20, "count": 8, "label": "20h - 21h" },
  "byDayOfWeek": [...],
  "byHour": [...],
  "byMonth": [...],
  "byLevel": [...],
  "byCategory": [...],
  "scoreStats": {
    "count": 40,
    "averagePercent": 78.5,
    "highestPercent": 100,
    "lowestPercent": 45,
    "lowestExerciseId": "abc123",
    "perfectScores": 5
  },
  "scoreDistribution": { "0": 0, "1": 0, ..., "78": 3, ..., "100": 5 }
}
```

## 파일 구조

```
src/app/
├── statistics/
│   └── page.tsx          # 통계 페이지 UI
└── api/
    └── statistics/
        └── route.ts      # 통계 API
```
