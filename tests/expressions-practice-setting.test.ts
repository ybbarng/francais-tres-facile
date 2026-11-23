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

  it("GET 은 암호 없이 range 키에 저장한 범위를 돌려준다", async () => {
    findUnique.mockResolvedValue({
      key: "range",
      value: '{"mode":"span","from":"10-15","to":"10-30"}',
    });
    const { GET } = await load();
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ range: { mode: "span", from: "10-15", to: "10-30" } });
    expect(findUnique).toHaveBeenCalledWith({ where: { key: "range" } });
  });

  it("GET 은 저장한 적이 없으면 null", async () => {
    findUnique.mockResolvedValue(null);
    const { GET } = await load();
    expect(await (await GET()).json()).toEqual({ range: null });
  });

  it("GET 은 저장된 값이 JSON 이 아니면 null", async () => {
    findUnique.mockResolvedValue({ key: "range", value: "45" });
    const { GET } = await load();
    expect(await (await GET()).json()).toEqual({ range: null });
  });

  it("POST 는 암호가 없으면 401 이고 저장하지 않는다", async () => {
    const { POST } = await load();
    const res = await POST(
      req({ range: { mode: "cumulative", to: "11-23" } }, undefined, "10.8.0.2")
    );
    expect(res.status).toBe(401);
    expect(upsert).not.toHaveBeenCalled();
  });

  it.each([
    ["모르는 방식", { mode: "all", to: "11-23" }],
    ["MM-DD 가 아닌 끝", { mode: "single", to: "2026-11-23" }],
    ["시작이 빠진 구간", { mode: "span", to: "11-23" }],
    ["옛 숫자 값", 53],
    ["빠짐", undefined],
  ])("POST 는 %s 를 400 으로 막는다", async (_label, value) => {
    const { POST } = await load();
    const res = await POST(req({ range: value }, "pw"));
    expect(res.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("POST 는 범위를 range 키에 JSON 문자열로 저장하고 저장한 값을 돌려준다", async () => {
    upsert.mockResolvedValue({});
    const { POST } = await load();
    const res = await POST(req({ range: { mode: "single", to: "11-05" } }, "pw"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ range: { mode: "single", to: "11-05" } });
    expect(upsert).toHaveBeenCalledWith({
      where: { key: "range" },
      update: { value: '{"mode":"single","to":"11-05"}' },
      create: { key: "range", value: '{"mode":"single","to":"11-05"}' },
    });
  });
});
