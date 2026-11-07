/**
 * @vitest-environment jsdom
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DelfRunner from "@/features/delf/components/DelfRunner";
import sample from "./mocks/delf-sample-set.json";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("DelfRunner — 세트 풀기 화면", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "/delf/sets/a1-mini-00.json") return json(sample);
      if (url.startsWith("/api/delf/attempts") && init?.method === "POST") {
        return json({ attempt: {}, result: {} });
      }
      if (url.startsWith("/api/delf/attempts")) return json({ attempts: [], best: null });
      return json({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);
    // jsdom 은 미디어 재생을 하지 않는다
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  });

  afterEach(() => {
    // 화면을 먼저 내려야 audio.pause 대역이 풀리기 전에 정리된다
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    toast.success.mockReset();
    toast.error.mockReset();
    toast.info.mockReset();
  });

  /** 듣기 → 읽기 → 쓰기 순서로 답하고 제출한다(q3 만 틀리게) */
  async function solveAndSubmit() {
    render(<DelfRunner setId="a1-mini-00" />);
    await screen.findByText("Rendez-vous au café");

    fireEvent.click(screen.getByRole("button", { name: /samedi\./ }));
    fireEvent.click(screen.getByRole("button", { name: "Vrai" }));
    fireEvent.click(screen.getByRole("button", { name: /다음: 읽기/ }));

    fireEvent.click(screen.getByRole("button", { name: /le matin\./ }));
    fireEvent.click(screen.getByRole("button", { name: /De la musique\./ }));
    fireEvent.click(screen.getByRole("button", { name: /Des jeux\./ }));
    fireEvent.click(screen.getByRole("button", { name: /다음: 쓰기/ }));

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Salut Léa ! Viens à la fête samedi." },
    });
    expect(screen.getByText(/7 단어/)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /제출하고 채점/ }));
    });
  }

  it("대본은 제출 전에는 보이지 않고, 제출 뒤 점수·해설과 함께 보인다", async () => {
    localStorage.setItem("ftf-admin-password", "pw");
    render(<DelfRunner setId="a1-mini-00" />);
    await screen.findByText("Rendez-vous au café");
    expect(screen.getByText(/남은 재생/)).toBeInTheDocument();
    expect(screen.queryByText(/c'est Marie/)).toBeNull();
    // 다른 영역으로 가도 대본은 없다
    fireEvent.click(screen.getByRole("button", { name: /다음: 읽기/ }));
    expect(screen.queryByText(/c'est Marie/)).toBeNull();
  });

  it("제출하면 영역별 점수와 대본을 보이고, 답만 보내 서버에 저장한다", async () => {
    localStorage.setItem("ftf-admin-password", "pw");
    await solveAndSubmit();

    expect(await screen.findByText(/c'est Marie/)).toBeInTheDocument();
    expect(screen.getByText("대본 (Transcription)")).toBeInTheDocument();
    expect(screen.getByText("« de 14 h à 18 h » 이므로 오후다.")).toBeInTheDocument();
    expect(screen.getByText("합계 (듣기 + 읽기)").parentElement).toHaveTextContent("3 / 4");

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(post).toBeDefined();
    const [, init] = post as [string, RequestInit];
    expect(new Headers(init.headers).get("x-admin-password")).toBe("pw");
    expect(JSON.parse(init.body as string)).toEqual({
      setId: "a1-mini-00",
      answers: { q1: ["b"], q2: ["v"], q3: ["a"], q4: ["a", "c"] },
      writing: { w1: "Salut Léa ! Viens à la fête samedi." },
    });
  });

  it("암호가 없으면 채점 결과는 보이고 저장하지 않은 채 자물쇠 안내를 띄운다", async () => {
    await solveAndSubmit();

    expect(await screen.findByText(/c'est Marie/)).toBeInTheDocument();
    expect(toast.info).toHaveBeenCalledWith(expect.stringContaining("자물쇠"));
    expect(screen.getByText("저장하려면 위쪽 자물쇠로 암호를 넣으세요.")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("재생 횟수를 다 쓰면 막고, 다시 듣기 허용으로 푼다", async () => {
    render(<DelfRunner setId="a1-mini-00" />);
    await screen.findByText("Rendez-vous au café");
    const audio = document.querySelector("audio") as HTMLAudioElement;
    for (let i = 0; i < 2; i++) {
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /^(다시 )?듣기$/ }));
      });
      fireEvent.ended(audio);
    }
    expect(screen.getByRole("button", { name: /다 들었습니다/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /다시 듣기 허용/ }));
    expect(screen.getByRole("button", { name: /^다시 듣기$/ })).toBeEnabled();
  });
});
