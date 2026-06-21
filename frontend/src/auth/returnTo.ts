const KEY = "returnTo";

export function SaveReturnTo(path: string): void {
  sessionStorage.setItem(KEY, path);
}

export function peekReturnTo(): string | null {
  return sessionStorage.getItem(KEY);
}

export function clearReturnTo(): void {
  sessionStorage.removeItem(KEY);
}
