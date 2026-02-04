// 클라이언트 측 암호 관리

const STORAGE_KEY = "ftf-admin-password";

export function getStoredPassword(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setStoredPassword(password: string): void {
  localStorage.setItem(STORAGE_KEY, password);
}

export function clearStoredPassword(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// 암호 헤더가 포함된 fetch wrapper
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const password = getStoredPassword();

  const headers = new Headers(options.headers);
  if (password) {
    headers.set("x-admin-password", password);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
