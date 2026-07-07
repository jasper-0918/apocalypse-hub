// Client-side session token storage with an optional "remember me".
//
// The token always lives in localStorage while the session is active (so every
// existing `localStorage.getItem('ah_session')` reader keeps working). When the
// user opts out of "remember me", we also drop a per-tab keepalive marker in
// sessionStorage; on the next page load, if that marker is gone (browser was
// closed) we clear the token so the user starts logged out.

const TOKEN_KEY = 'ah_session';
const REMEMBER_KEY = 'ah_remember';
const KEEPALIVE_KEY = 'ah_keepalive';

let pruned = false;

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function storeSession(token: string, remember: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  if (remember) {
    localStorage.removeItem(REMEMBER_KEY);
    sessionStorage.removeItem(KEEPALIVE_KEY);
  } else {
    localStorage.setItem(REMEMBER_KEY, 'false');
    sessionStorage.setItem(KEEPALIVE_KEY, '1');
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REMEMBER_KEY);
  sessionStorage.removeItem(KEEPALIVE_KEY);
}

/**
 * If the last sign-in was "don't remember me" and the browser has since been
 * closed (sessionStorage wiped), drop the persisted token. Runs at most once
 * per page load; safe to call during render.
 */
export function pruneEphemeralSessionOnce(): void {
  if (pruned || typeof window === 'undefined') return;
  pruned = true;
  if (localStorage.getItem(REMEMBER_KEY) === 'false' && !sessionStorage.getItem(KEEPALIVE_KEY)) {
    clearSession();
  }
}
