"use client";

/**
 * Replaces the Firebase auth hooks. `useUser()` keeps the same shape the pages already use:
 * { user, isUserLoading, userError } with user.uid / email / displayName / photoURL.
 */
import { useEffect, type ReactNode } from 'react';
import { loadSession, signOutSession, startDataSync, useDataState } from './data-store';

export function DataProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    startDataSync();
  }, []);
  return <>{children}</>;
}

export function useUser() {
  const s = useDataState();
  return { user: s.session?.user ?? null, isUserLoading: !s.sessionLoaded, userError: null as Error | null };
}

/** Closes the session on the server and clears the data kept in the browser. */
export const signOut = () => signOutSession();

/** Re-read the session after signing in. */
export const refreshSession = () => loadSession();
