# Français Très Facile

RFI(Radio France Internationale) 프랑스어 학습 콘텐츠를 더 편리하게 학습할 수 있는 웹앱입니다.

## 주요 기능

- RFI 학습 콘텐츠 동기화 (H5P 퀴즈, 오디오, 스크립트)
- 학습 진도 추적 (완료 상태, 점수, 메모)
- 레벨별 필터링 (A1, A2, B1, B2)
- 퀴즈 자동 크기 조절
- 스크립트(Transcription) 표시
- 비전형적 콘텐츠 표시 (오디오/스크립트 누락 시 "Atypique" 배지)

## 시작하기

### 설치

```bash
pnpm install
```

### 데이터베이스 설정

```bash
pnpm prisma migrate dev
```

### 개발 서버 실행

```bash
pnpm dev
```

[http://localhost:3000](http://localhost:3000)에서 앱을 확인할 수 있습니다.

## 동기화 명령어

RFI 사이트에서 콘텐츠를 가져오는 동기화 스크립트입니다.

```bash
# 도움말
pnpm sync help

# 전체 동기화 (모든 섹션 스크래핑 + H5P 추출)
pnpm sync full

# H5P URL만 업데이트 (기본값)
pnpm sync update-h5p

# 스크립트(Transcription)만 업데이트
pnpm sync update-transcript
```

## 테스트

```bash
pnpm test
```

## 린트

```bash
pnpm lint
```

## 기술 스택

- **프레임워크**: Next.js 16 (App Router)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS
- **데이터베이스**: SQLite + Prisma ORM
- **테스트**: Vitest + React Testing Library
- **크롤링**: Cheerio + Playwright (H5P 추출)
