import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, cleanupExpiredRecords, recordFailedAttempt } from "../src/lib/rate-limit";

describe("rate-limit", () => {
  beforeEach(() => {
    // 각 테스트 전에 상태 초기화를 위해 cleanup 호출
    cleanupExpiredRecords();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("checkRateLimit", () => {
    it("should allow first request", () => {
      const result = checkRateLimit("192.168.1.1");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // 5 - 1 = 4
    });

    it("should track multiple requests from same IP", () => {
      const ip = "192.168.1.2";

      const r1 = checkRateLimit(ip);
      expect(r1.remaining).toBe(4);

      const r2 = checkRateLimit(ip);
      expect(r2.remaining).toBe(3);

      const r3 = checkRateLimit(ip);
      expect(r3.remaining).toBe(2);
    });

    it("should block after max attempts exceeded", () => {
      const ip = "192.168.1.3";

      // 5번 요청
      for (let i = 0; i < 5; i++) {
        checkRateLimit(ip);
      }

      // 6번째 요청은 차단
      const result = checkRateLimit(ip);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
    });

    it("should track different IPs separately", () => {
      const ip1 = "192.168.1.4";
      const ip2 = "192.168.1.5";

      // ip1에서 5번 요청
      for (let i = 0; i < 5; i++) {
        checkRateLimit(ip1);
      }

      // ip1은 차단
      expect(checkRateLimit(ip1).allowed).toBe(false);

      // ip2는 허용
      expect(checkRateLimit(ip2).allowed).toBe(true);
    });

    it("should reset after window expires", () => {
      vi.useFakeTimers();
      const ip = "192.168.1.6";

      // 5번 요청하여 한도 초과
      for (let i = 0; i < 5; i++) {
        checkRateLimit(ip);
      }
      expect(checkRateLimit(ip).allowed).toBe(false);

      // 15분 + 1초 후
      vi.advanceTimersByTime(15 * 60 * 1000 + 1000);

      // 다시 허용
      const result = checkRateLimit(ip);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });
  });

  describe("recordFailedAttempt", () => {
    it("should increment count for existing IP", () => {
      const ip = "192.168.1.7";

      checkRateLimit(ip); // count: 1
      recordFailedAttempt(ip); // count: 2

      const result = checkRateLimit(ip); // count: 3
      expect(result.remaining).toBe(2); // 5 - 3 = 2
    });

    it("should create new record for unknown IP", () => {
      const ip = "192.168.1.8";

      recordFailedAttempt(ip); // count: 1

      const result = checkRateLimit(ip); // count: 2
      expect(result.remaining).toBe(3); // 5 - 2 = 3
    });
  });

  describe("cleanupExpiredRecords", () => {
    it("should remove expired records", () => {
      vi.useFakeTimers();
      const ip = "192.168.1.9";

      // 요청 생성
      checkRateLimit(ip);

      // 15분 + 1초 후
      vi.advanceTimersByTime(15 * 60 * 1000 + 1000);

      // 정리 실행
      cleanupExpiredRecords();

      // 새로운 요청은 처음부터 시작
      const result = checkRateLimit(ip);
      expect(result.remaining).toBe(4);
    });
  });
});
