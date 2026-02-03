/**
 * URL을 기반으로 짧은 고유 ID 생성 (djb2 해시 + Base36)
 * 충돌 시 suffix를 증가시켜 다른 해시 생성
 */
export function generateShortId(url: string, suffix = 0): string {
  const input = suffix ? `${url}#${suffix}` : url;
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

/**
 * URL에서 고유 ID를 가져오거나 생성
 * 충돌 검사를 위해 existingIds Set을 받음
 */
export function getOrCreateShortId(
  url: string,
  existingIds: Map<string, string> // id -> sourceUrl 매핑
): string {
  let suffix = 0;
  while (true) {
    const id = generateShortId(url, suffix);
    const existingUrl = existingIds.get(id);

    if (!existingUrl) {
      // 새 ID
      existingIds.set(id, url);
      return id;
    }
    if (existingUrl === url) {
      // 같은 URL, 기존 ID 반환
      return id;
    }

    // 충돌 → 다시 시도
    suffix++;
  }
}
