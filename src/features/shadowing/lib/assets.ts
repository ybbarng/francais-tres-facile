const PUBLIC_BASE = "/shadowing/";

export function assetPath(relative: string): string {
  if (relative.startsWith("/") || relative.startsWith("http")) return relative;
  return `${PUBLIC_BASE}${relative}`;
}
