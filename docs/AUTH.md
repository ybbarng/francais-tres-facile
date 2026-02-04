# 인증 시스템

## 개요

데이터 수정 API는 암호로 보호됩니다. 암호가 올바르게 설정되지 않으면 모든 수정 요청이 차단됩니다.

## 설정

### 환경 변수

`.env` 파일에 `ADMIN_PASSWORD`를 설정합니다:

```bash
ADMIN_PASSWORD=your-secure-password
```

**중요**: 암호가 설정되지 않으면 모든 수정 API가 503 에러를 반환합니다.

## 보호되는 API

| Endpoint | Method | 설명 |
|----------|--------|------|
| `/api/sync` | POST | RFI 데이터 동기화 |
| `/api/progress/[exerciseId]` | POST/PATCH | 학습 진도 저장 |
| `/api/exercises/[id]/refresh` | POST | 개별 연습 새로고침 |

## 클라이언트 사용법

### 암호 입력

헤더의 자물쇠 아이콘을 클릭하여 암호를 입력합니다. 암호는 세션 스토리지에 저장되어 브라우저 탭을 닫으면 삭제됩니다.

### 인증된 요청

`fetchWithAuth` 함수를 사용하면 저장된 암호가 자동으로 헤더에 포함됩니다:

```typescript
import { fetchWithAuth } from "@/lib/password";

const res = await fetchWithAuth("/api/sync", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ section: "comprendre-actualite" }),
});
```

## 보안 기능

### Rate Limiting

Brute force 공격 방지를 위해 IP당 요청 제한이 적용됩니다:

- **최대 시도 횟수**: 5회
- **제한 기간**: 15분
- **제한 초과 시**: 429 응답 + 재시도 가능 시간 안내

### 응답 코드

| 코드 | 상황 | 메시지 |
|------|------|--------|
| 200 | 성공 | - |
| 401 | 암호 틀림 | "Mot de passe incorrect. N tentative(s) restante(s)." |
| 429 | 시도 횟수 초과 | "Trop de tentatives. Réessayez dans N minute(s)." |
| 503 | 암호 미설정 | "ADMIN_PASSWORD non configuré sur le serveur." |

### 한계 (서버리스 환경)

In-memory rate limiting의 한계:
- 함수 인스턴스 재시작 시 카운터 초기화
- 여러 인스턴스에서 각각 별도 카운팅

더 견고한 보안이 필요하면:
- Upstash Redis
- Vercel KV
- Cloudflare WAF

## 파일 구조

```
src/lib/
├── auth.ts         # 서버사이드 인증 로직
├── password.ts     # 클라이언트사이드 암호 관리
└── rate-limit.ts   # Rate limiting 로직
```
