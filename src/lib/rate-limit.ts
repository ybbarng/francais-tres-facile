// 간단한 In-Memory Rate Limiting
// 서버리스 환경에서는 인스턴스 재시작 시 리셋됨

interface AttemptRecord {
  count: number;
  resetAt: number;
}

const attempts = new Map<string, AttemptRecord>();

const MAX_ATTEMPTS = 5; // 최대 시도 횟수
const WINDOW_MS = 15 * 60 * 1000; // 15분

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
}

export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const record = attempts.get(ip);

  // 기록이 없거나 윈도우가 지났으면 리셋
  if (!record || now > record.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }

  // 최대 시도 횟수 초과
  if (record.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((record.resetAt - now) / 1000),
    };
  }

  record.count++;
  return { allowed: true, remaining: MAX_ATTEMPTS - record.count };
}

export function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record || now > record.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    record.count++;
  }
}

export function clearFailedAttempts(ip: string): void {
  attempts.delete(ip);
}

// 메모리 정리 (오래된 기록 삭제)
export function cleanupExpiredRecords(): void {
  const now = Date.now();
  for (const [ip, record] of attempts.entries()) {
    if (now > record.resetAt) {
      attempts.delete(ip);
    }
  }
}
