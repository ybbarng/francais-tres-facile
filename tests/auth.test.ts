import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// 환경변수 모킹을 위해 auth 모듈을 동적으로 import
describe("auth", () => {
  const createMockRequest = (password?: string, ip?: string): NextRequest => {
    const headers = new Headers();
    if (password) {
      headers.set("x-admin-password", password);
    }
    if (ip) {
      headers.set("x-forwarded-for", ip);
    }
    return {
      headers,
    } as unknown as NextRequest;
  };

  describe("verifyPasswordWithRateLimit", () => {
    beforeEach(() => {
      vi.resetModules();
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("should return 503 when ADMIN_PASSWORD is not set", async () => {
      vi.stubEnv("ADMIN_PASSWORD", "");

      const { verifyPasswordWithRateLimit } = await import("../src/lib/auth");
      const request = createMockRequest("any-password", "192.168.2.1");

      const result = verifyPasswordWithRateLimit(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        const json = await result.response.json();
        expect(result.response.status).toBe(503);
        expect(json.error).toContain("ADMIN_PASSWORD");
      }
    });

    it("should return success when password matches", async () => {
      vi.stubEnv("ADMIN_PASSWORD", "correct-password");

      const { verifyPasswordWithRateLimit } = await import("../src/lib/auth");
      const request = createMockRequest("correct-password", "192.168.2.2");

      const result = verifyPasswordWithRateLimit(request);

      expect(result.success).toBe(true);
    });

    it("should return 401 when password is incorrect", async () => {
      vi.stubEnv("ADMIN_PASSWORD", "correct-password");

      const { verifyPasswordWithRateLimit } = await import("../src/lib/auth");
      const request = createMockRequest("wrong-password", "192.168.2.3");

      const result = verifyPasswordWithRateLimit(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(401);
      }
    });

    it("should return 401 when no password provided", async () => {
      vi.stubEnv("ADMIN_PASSWORD", "correct-password");

      const { verifyPasswordWithRateLimit } = await import("../src/lib/auth");
      const request = createMockRequest(undefined, "192.168.2.4");

      const result = verifyPasswordWithRateLimit(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(401);
      }
    });

    it("should return 429 after too many failed attempts", async () => {
      vi.stubEnv("ADMIN_PASSWORD", "correct-password");

      const { verifyPasswordWithRateLimit } = await import("../src/lib/auth");
      const ip = "192.168.2.5";

      // 5번 실패
      for (let i = 0; i < 5; i++) {
        const request = createMockRequest("wrong", ip);
        verifyPasswordWithRateLimit(request);
      }

      // 6번째 시도
      const request = createMockRequest("wrong", ip);
      const result = verifyPasswordWithRateLimit(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(429);
        const json = await result.response.json();
        expect(json.error).toContain("Trop de tentatives");
      }
    });

    it("should show remaining attempts on failed login", async () => {
      vi.stubEnv("ADMIN_PASSWORD", "correct-password");

      const { verifyPasswordWithRateLimit } = await import("../src/lib/auth");
      const request = createMockRequest("wrong", "192.168.2.6");

      const result = verifyPasswordWithRateLimit(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        const json = await result.response.json();
        expect(json.error).toContain("tentative");
      }
    });
  });

  describe("verifyPassword (legacy)", () => {
    beforeEach(() => {
      vi.resetModules();
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("should return false when ADMIN_PASSWORD is not set", async () => {
      vi.stubEnv("ADMIN_PASSWORD", "");

      const { verifyPassword } = await import("../src/lib/auth");
      const request = createMockRequest("any-password");

      expect(verifyPassword(request)).toBe(false);
    });

    it("should return true when password matches", async () => {
      vi.stubEnv("ADMIN_PASSWORD", "test-password");

      const { verifyPassword } = await import("../src/lib/auth");
      const request = createMockRequest("test-password");

      expect(verifyPassword(request)).toBe(true);
    });

    it("should return false when password is incorrect", async () => {
      vi.stubEnv("ADMIN_PASSWORD", "test-password");

      const { verifyPassword } = await import("../src/lib/auth");
      const request = createMockRequest("wrong-password");

      expect(verifyPassword(request)).toBe(false);
    });
  });
});
