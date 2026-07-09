// Client-side session token storage.
//
// The token lives in localStorage so every reader is consistent. "Remember me"
// is enforced server-side by the cookie's lifetime (login sets a 7-day cookie
// when remembered, a session cookie when not — the browser drops the latter on
// close, so middleware gates the protected app back to /login). We deliberately
// do NOT try to detect "browser closed" on the client: the only client signal
// (per-tab sessionStorage) can't tell a new tab from a restart, which previously
// logged users out just for opening a second tab.

const TOKEN_KEY = 'ah_session';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function storeSession(token: string, _remember: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}
