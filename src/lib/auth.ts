import { type NextRequest, NextResponse } from "next/server";
import { checkRateLimit, recordFailedAttempt } from "./rate-limit";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function getClientIp(request: NextRequest): string {
  // Vercel, Cloudflare 등의 프록시 헤더 확인
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  return "unknown";
}

export type AuthResult = { success: true } | { success: false; response: NextResponse };

export function verifyPasswordWithRateLimit(request: NextRequest): AuthResult {
  // 암호가 설정되지 않으면 모든 요청 허용
  if (!ADMIN_PASSWORD) {
    return { success: true };
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip);

  // Rate limit 초과
  if (!rateLimit.allowed) {
    return {
      success: false,
      response: rateLimitedResponse(rateLimit.retryAfterSeconds || 0),
    };
  }

  const password = request.headers.get("x-admin-password");
  const isValid = password === ADMIN_PASSWORD;

  if (!isValid) {
    recordFailedAttempt(ip);
    return {
      success: false,
      response: unauthorizedResponse(rateLimit.remaining),
    };
  }

  return { success: true };
}

// 기존 함수 유지 (하위 호환성)
export function verifyPassword(request: NextRequest): boolean {
  if (!ADMIN_PASSWORD) {
    return true;
  }
  const password = request.headers.get("x-admin-password");
  return password === ADMIN_PASSWORD;
}

export function unauthorizedResponse(remainingAttempts?: number) {
  const message =
    remainingAttempts !== undefined
      ? `Mot de passe incorrect. ${remainingAttempts} tentative(s) restante(s).`
      : "Mot de passe incorrect";
  return NextResponse.json({ error: message }, { status: 401 });
}

export function rateLimitedResponse(retryAfterSeconds: number) {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return NextResponse.json(
    { error: `Trop de tentatives. Réessayez dans ${minutes} minute(s).` },
    { status: 429 }
  );
}
