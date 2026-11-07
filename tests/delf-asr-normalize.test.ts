import { describe, expect, it } from "vitest";
import { frenchNumber, normalizeHeard } from "../scripts/delf-asr-normalize.ts";

describe("frenchNumber", () => {
  it.each([
    [0, "zéro"],
    [16, "seize"],
    [17, "dix-sept"],
    [21, "vingt et un"],
    [45, "quarante-cinq"],
    [71, "soixante et onze"],
    [80, "quatre-vingts"],
    [91, "quatre-vingt-onze"],
    [99, "quatre-vingt-dix-neuf"],
    [200, "deux cents"],
    [499, "quatre cent quatre-vingt-dix-neuf"],
    [615, "six cent quinze"],
    [1000, "mille"],
    [2026, "deux mille vingt-six"],
  ])("%i → %s", (n, words) => {
    expect(frenchNumber(n)).toBe(words);
  });
});

describe("normalizeHeard", () => {
  // Whisper 가 실제로 A2 음성에서 적은 모양들
  it("시각·퍼센트·전화번호를 대본처럼 낱말로 바꾼다", () => {
    expect(normalizeHeard("Il part à 14h.")).toBe("Il part à quatorze heures.");
    expect(normalizeHeard("à 10h15")).toBe("à dix heures quinze");
    expect(normalizeHeard("moins 50%")).toBe("moins cinquante pour cent");
    expect(normalizeHeard("04 91")).toBe("zéro quatre quatre-vingt-onze");
  });

  it("끝에 지어낸 자막 문구를 뺀다", () => {
    expect(normalizeHeard("Merci. Sous-titrage Société Radio-Canada").trim()).toBe("Merci.");
    expect(normalizeHeard("Au revoir. Sous-titrage FR 2021").trim()).toBe("Au revoir.");
  });
});
