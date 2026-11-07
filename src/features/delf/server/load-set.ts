import { readFile } from "node:fs/promises";
import path from "node:path";
import { DELF_SET_ID_PATTERN, type DelfSet, parseDelfSet } from "../lib/set";

export class DelfSetNotFoundError extends Error {}

/**
 * setId 로 세트 파일을 읽어 확인한다. setId 는 정해진 모양만 받아 경로 조작을 막는다.
 * 모양이 틀리면 RangeError, 파일이 없으면 DelfSetNotFoundError, 형식이 틀리면 DelfSetError.
 * dir 은 테스트에서 임시 폴더를 넣을 때 쓴다.
 */
export async function loadDelfSet(
  setId: string,
  dir: string = path.join(process.cwd(), "public", "delf", "sets")
): Promise<DelfSet> {
  if (!DELF_SET_ID_PATTERN.test(setId)) throw new RangeError(`잘못된 setId: ${setId}`);
  let raw: string;
  try {
    raw = await readFile(path.join(dir, `${setId}.json`), "utf-8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      throw new DelfSetNotFoundError(`세트 ${setId} 가 없습니다`);
    }
    throw e;
  }
  return parseDelfSet(JSON.parse(raw));
}
