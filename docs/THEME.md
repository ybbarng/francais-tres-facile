# Français Très Facile - 테마 가이드

프랑스와 RFI에서 영감을 받은 색상 팔레트와 디자인 시스템 문서입니다.

## 색상 시스템 개요

이 프로젝트는 **OKLCH 색상 공간**을 사용합니다.
- 형식: `oklch(lightness chroma hue)`
- Lightness: 0 (검정) ~ 1 (흰색)
- Chroma: 채도 (0 = 무채색)
- Hue: 색상 각도 (260 = 파랑, 25 = 빨강, 85 = 금색)

---

## 브랜드 색상 (French Palette)

### 프랑스 국기 3색

| 이름 | 라이트 모드 | 다크 모드 | 용도 |
|------|-------------|-----------|------|
| **Bleu de France** | `oklch(0.35 0.15 260)` | `oklch(0.55 0.18 260)` | 프랑스 파랑, 로고 |
| **Blanc** | `oklch(1 0 0)` | `oklch(0.90 0.01 260)` | 흰색 |
| **Rouge Français** | `oklch(0.55 0.22 25)` | `oklch(0.60 0.20 25)` | 프랑스 빨강 |

### 보조 브랜드 색상

| 이름 | 값 | 용도 |
|------|-----|------|
| **Or (Gold)** | `oklch(0.75 0.12 85)` | 골드 악센트, 별점 |

---

## 테마별 색상

### 라이트 모드: "Tricolore Clair"
*따뜻한 오프화이트와 진한 파랑의 조화*

| 역할 | 이름 | 값 | 설명 |
|------|------|-----|------|
| **Background** | Papier Ancien | `oklch(0.985 0.005 90)` | 따뜻한 오프화이트 |
| **Foreground** | Encre Marine | `oklch(0.20 0.02 260)` | 짙은 네이비 텍스트 |
| **Card** | Blanc Pur | `oklch(1 0 0)` | 순수한 흰색 |
| **Primary** | Bleu Royal | `oklch(0.40 0.18 260)` | 진한 로열 블루 |
| **Secondary** | Gris Bleuté | `oklch(0.95 0.01 260)` | 연한 청회색 |
| **Muted** | Gris Élégant | `oklch(0.96 0.008 260)` | 은은한 회색 |
| **Accent** | Bleu Clair | `oklch(0.93 0.03 260)` | 연한 파랑 |
| **Border** | Ligne Douce | `oklch(0.90 0.01 260)` | 부드러운 테두리 |
| **Destructive** | Rouge Alerte | `oklch(0.55 0.22 25)` | 경고/삭제 빨강 |

### 다크 모드: "Nuit Parisienne"
*파리의 밤하늘을 연상시키는 깊은 네이비*

| 역할 | 이름 | 값 | 설명 |
|------|------|-----|------|
| **Background** | Ciel de Nuit | `oklch(0.16 0.025 260)` | 깊은 네이비 |
| **Foreground** | Lumière Douce | `oklch(0.95 0.01 260)` | 부드러운 흰색 |
| **Card** | Ardoise | `oklch(0.20 0.03 260)` | 슬레이트 |
| **Primary** | Bleu Lumineux | `oklch(0.60 0.18 260)` | 밝은 파랑 |
| **Secondary** | Marine Profond | `oklch(0.25 0.035 260)` | 진한 네이비 |
| **Muted** | Ombre | `oklch(0.25 0.03 260)` | 그림자 |
| **Accent** | Reflet Nocturne | `oklch(0.28 0.04 260)` | 야간 반사 |
| **Border** | Trait Subtil | `oklch(0.30 0.03 260)` | 미묘한 선 |
| **Destructive** | Rouge Sombre | `oklch(0.60 0.20 25)` | 어두운 빨강 |

---

## 컴포넌트별 색상

### Header (상단바)

CSS 변수: `--header` / Tailwind: `bg-header`

| 모드 | 이름 | 값 |
|------|------|-----|
| 라이트 | Bleu Royal | `oklch(0.40 0.18 260)` |
| 다크 | Marine Profond | `oklch(0.25 0.12 260)` |

*텍스트: 항상 흰색 (`text-white`)*

### Quick Action 버튼 (홈 화면)

홈 화면의 큰 네비게이션 버튼입니다.
라이트 모드에서는 밝은 색, 다크 모드에서는 어두운 색을 사용합니다.

**Exercices 버튼 (파랑):**

CSS 변수: `--action-blue` / Tailwind: `bg-action-blue`

| 모드 | 이름 | 값 |
|------|------|-----|
| 라이트 | Bleu Clair | `oklch(0.55 0.18 260)` |
| 다크 | Bleu Nuit | `oklch(0.35 0.15 260)` |

**Playlist 버튼 (빨강):**

CSS 변수: `--action-red` / Tailwind: `bg-action-red`

| 모드 | 이름 | 값 |
|------|------|-----|
| 라이트 | Rouge Clair | `oklch(0.60 0.22 25)` |
| 다크 | Rouge Sombre | `oklch(0.45 0.18 25)` |

*텍스트: 항상 흰색 (`text-white`)*

### French Tricolor Bar (삼색 바)

상단 헤더에 표시되는 프랑스 국기 색상의 가로 바입니다.

**라이트 모드:**
- 파랑: `oklch(0.45 0.18 260)`
- 흰색: `oklch(1 0 0)`
- 빨강: `oklch(0.55 0.22 25)`

**다크 모드:**
- 파랑: `oklch(0.55 0.18 260)`
- 흰색: `oklch(0.90 0.01 260)` (약간 어두운 흰색)
- 빨강: `oklch(0.60 0.20 25)`

### 레벨 뱃지 (CEFR Levels)

프랑스어 학습 레벨을 나타내는 뱃지 색상입니다.

| 레벨 | 배경색 | 텍스트색 | 다크 모드 |
|------|--------|----------|-----------|
| **A1** (입문) | `bg-green-100` | `text-green-700` | 동일 |
| **A2** (초급) | `bg-blue-100` | `text-blue-700` | 동일 |
| **B1** (중급) | `bg-yellow-100` | `text-yellow-700` | 동일 |
| **B2** (중상급) | `bg-orange-100` | `text-orange-700` | 동일 |

*참고: Tailwind 기본 색상 사용, 다크모드에서 자동 조정 필요할 수 있음*

### 상태 뱃지

| 상태 | 클래스 | 용도 |
|------|--------|------|
| **Success** | `bg-green-500 text-white` | 완료됨 |
| **Warning** | `bg-amber-100 text-amber-700` | 주의/비정형 |

### 상태 표시 색상 (카드 내)

완료 버튼, 학습 기록 등에 사용되는 색상입니다.

**완료 상태 (녹색 계열):**
| 모드 | 배경 | 테두리 | 텍스트 |
|------|------|--------|--------|
| 라이트 | `bg-green-50` | `border-green-300` | `text-green-700` |
| 다크 | `bg-green-950` | `border-green-700` | `text-green-400` |

**학습 기록 카드 (파란색 계열):**
| 모드 | 배경 | 테두리 | 제목 | 내용 |
|------|------|--------|------|------|
| 라이트 | `bg-blue-50` | `border-blue-200` | `text-blue-900` | `text-blue-700` |
| 다크 | `bg-blue-950` | `border-blue-800` | `text-blue-200` | `text-blue-300` |

**동기화 결과 (성공/경고):**

성공:
| 모드 | 배경 | 테두리 |
|------|------|--------|
| 라이트 | `bg-green-50` | `border-green-200` |
| 다크 | `bg-green-950` | `border-green-800` |

경고:
| 모드 | 배경 | 테두리 |
|------|------|--------|
| 라이트 | `bg-amber-50` | `border-amber-200` |
| 다크 | `bg-amber-950` | `border-amber-800` |

---

## 차트 색상

데이터 시각화에 사용되는 색상입니다.

| 번호 | 라이트 모드 | 다크 모드 | 의미 |
|------|-------------|-----------|------|
| Chart 1 | `oklch(0.45 0.18 260)` | `oklch(0.60 0.18 260)` | 파랑 |
| Chart 2 | `oklch(0.55 0.20 25)` | `oklch(0.60 0.18 25)` | 빨강 |
| Chart 3 | `oklch(0.70 0.12 85)` | `oklch(0.75 0.14 85)` | 금색 |
| Chart 4 | `oklch(0.55 0.12 200)` | `oklch(0.60 0.14 200)` | 청록 |
| Chart 5 | `oklch(0.60 0.15 320)` | `oklch(0.65 0.15 320)` | 보라 |

---

## 기타 디자인 토큰

### Border Radius

| 이름 | 값 | 용도 |
|------|-----|------|
| `--radius` | `0.5rem` (8px) | 기본 |
| `--radius-sm` | `0.25rem` (4px) | 작은 요소 |
| `--radius-md` | `0.375rem` (6px) | 중간 |
| `--radius-lg` | `0.5rem` (8px) | 큰 요소 |
| `--radius-xl` | `0.75rem` (12px) | 카드 |

### 전환 효과

모든 색상 전환에 150ms 부드러운 애니메이션이 적용됩니다:
```css
transition-property: background-color, border-color, color;
transition-duration: 150ms;
transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
```

---

## 색상 사용 가이드

### CSS 변수 사용

```css
/* 권장: CSS 변수 사용 */
.my-element {
  background: var(--primary);
  color: var(--primary-foreground);
}
```

### Tailwind 클래스 사용

```tsx
// 권장: 시맨틱 클래스
<div className="bg-primary text-primary-foreground" />
<div className="bg-muted text-muted-foreground" />

// 다크모드 대응 필요시
<div className="bg-blue-50 dark:bg-blue-950" />
```

### 하드코딩된 색상 사용 (특수한 경우)

```tsx
// Header처럼 테마와 독립적인 브랜드 색상
<header className="bg-[oklch(0.40_0.18_260)] dark:bg-[oklch(0.25_0.12_260)]" />
```

---

## 접근성 고려사항

- 모든 텍스트는 WCAG 2.1 AA 기준 대비율 4.5:1 이상 충족
- 다크 모드에서 Primary 색상이 더 밝아져 가독성 확보
- 포커스 링: `ring-2 ring-ring ring-offset-2`

---

## 파일 위치

- 테마 정의: `src/app/globals.css`
- Badge 변형: `src/components/ui/badge.tsx`
- Header 색상: `src/components/layout/Header.tsx`
- 홈 화면 버튼: `src/app/page.tsx`
- 로고: `src/components/Logo.tsx`
