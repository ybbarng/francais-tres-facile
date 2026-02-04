import { type NextRequest, NextResponse } from "next/server";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export function verifyPassword(request: NextRequest): boolean {
  if (!ADMIN_PASSWORD) {
    // 암호가 설정되지 않으면 모든 요청 허용
    return true;
  }

  const password = request.headers.get("x-admin-password");
  return password === ADMIN_PASSWORD;
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
}
