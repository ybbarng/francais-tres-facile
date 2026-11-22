import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("/api/expressions/practice-setting", () => {
  const upsert = vi.fn();
  const findUnique = vi.fn();

  const req = (body: unknown, password?: string, ip = "10.8.0.1"): NextRequest => {
    const headers = new Headers({ "x-forwarded-for": ip });
    if (password) headers.set("x-admin-password", password);
    return { headers, json: async () => body } as unknown as NextRequest;
  };

  const load = () => import("../src/app/api/expressions/practice-setting/route");

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("ADMIN_PASSWORD", "pw");
    upsert.mockReset();
    findUnique.mockReset();
    vi.doMock("@/lib/db", () => ({
      progressDb: { expressionPracticeSetting: { upsert, findUnique } },
    }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("@/lib/db");
  });

  it("GET 은 암호 없이 저장한 세션 번호를 숫자로 돌려준다", async () => {
    findUnique.mockResolvedValue({ key: "lastSession", value: "45" });
    const { GET } = await load();
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ lastSession: 45 });
    expect(findUnique).toHaveBeenCalledWith({ where: { key: "lastSession" } });
  });

  it("GET 은 저장한 적이 없으면 null", async () => {
    findUnique.mockResolvedValue(null);
    const { GET } = await load();
    expect(await (await GET()).json()).toEqual({ lastSession: null });
  });

  it("POST 는 암호가 없으면 401 이고 저장하지 않는다", async () => {
    const { POST } = await load();
    const res = await POST(req({ lastSession: 40 }, undefined, "10.8.0.2"));
    expect(res.status).toBe(401);
    expect(upsert).not.toHaveBeenCalled();
  });

  it.each([
    ["문자열", "40"],
    ["소수", 40.5],
    ["0", 0],
    ["너무 큰 수", 10001],
    ["빠짐", undefined],
  ])("POST 는 %s 를 400 으로 막는다", async (_label, value) => {
    const { POST } = await load();
    const res = await POST(req({ lastSession: value }, "pw"));
    expect(res.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("POST 는 세션 번호를 lastSession 키에 문자열로 저장한다", async () => {
    upsert.mockResolvedValue({});
    const { POST } = await load();
    const res = await POST(req({ lastSession: 57 }, "pw"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ lastSession: 57 });
    expect(upsert).toHaveBeenCalledWith({
      where: { key: "lastSession" },
      update: { value: "57" },
      create: { key: "lastSession", value: "57" },
    });
  });
});
