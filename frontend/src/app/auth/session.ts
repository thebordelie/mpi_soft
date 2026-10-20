import type { AuthSession } from '../types';

const SESSION_KEY = 'inception.auth.session';

export function saveSession(session: AuthSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSession(): AuthSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function hasPrivilege(session: AuthSession | null, privilege: string): boolean {
  return session?.privileges.includes(privilege) ?? false;
}
