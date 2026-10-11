"use client";

/**
 * In-memory copy of the data the UI shows, shared by every useAgriStock()/useUser() call.
 *
 * Replaces Firestore's realtime listeners:
 * - loads everything once after sign-in (or the public catalog for visitors),
 * - after each change made here, reloads only the affected data sets,
 * - every few seconds asks the server which data sets changed (tiny request) and reloads
 *   just those, so changes made by other people show up without reloading the page.
 */
import { useSyncExternalStore } from 'react';

export type Resource =
  | 'products'
  | 'movements'
  | 'purchaseOrders'
  | 'expenses'
  | 'orders'
  | 'quotations'
  | 'quotationCollections'
  | 'quotationImportTrackings'
  | 'credits'
  | 'creditCollections'
  | 'audits'
  | 'expenseCategories'
  | 'purchaseOrderStatusDefinitions'
  | 'conversions'
  | 'users'
  | 'invitations'
  | 'customers'
  | 'animalTypes'
  | 'categories'
  | 'suppliers'
  | 'trucks'
  | 'transportServices'
  | 'transportCollections'
  | 'config';

export interface SessionInfo {
  user: { uid: string; email: string; displayName: string | null; photoURL: string | null; hasPassword?: boolean; googleLinked?: boolean };
  profile: any;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isEnabled: boolean;
}

interface State {
  sessionLoaded: boolean;
  session: SessionInfo | null;
  data: Partial<Record<Resource, any>>;
  dataLoaded: boolean;
  publicLoaded: boolean;
  error: string | null;
}

const POLL_MS = 10_000;

let state: State = { sessionLoaded: false, session: null, data: {}, dataLoaded: false, publicLoaded: false, error: null };
let versions: Record<string, number> = {};
const listeners = new Set<() => void>();
let started = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;

function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export class RequestError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/** fetch() for our API: JSON in/out, cookies included, readable errors. */
export async function api<T = any>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const text = await res.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    /* not JSON */
  }
  if (!res.ok) {
    if (res.status === 401 && state.session) void loadSession(); // session expired
    throw new RequestError(res.status, payload?.error || 'HTTP_ERROR', payload?.message || `Error ${res.status}`);
  }
  return payload as T;
}

// ---- Loading -----------------------------------------------------------------------------

async function loadPublic() {
  try {
    const cat = await api<{ products: any[]; categories: any[]; animalTypes: any[]; config: any }>('GET', '/api/public/catalog');
    setState({
      data: { ...state.data, products: cat.products, categories: cat.categories, animalTypes: cat.animalTypes, config: cat.config },
      publicLoaded: true,
    });
  } catch (err) {
    setState({ publicLoaded: true, error: (err as Error).message });
  }
}

async function loadData(only?: Resource[]) {
  const url = only ? `/api/data?only=${only.join(',')}` : '/api/data';
  const res = await api<{ versions: Record<string, number>; data: Partial<Record<Resource, any>> }>('GET', url);
  for (const r of Object.keys(res.data)) versions[r] = res.versions[r] ?? 0;
  setState({ data: { ...state.data, ...res.data }, dataLoaded: true, error: null });
}

export async function loadSession() {
  try {
    const me = await api<SessionInfo | { user: null }>('GET', '/api/auth/me');
    const session = me.user ? (me as SessionInfo) : null;
    const changedUser = state.session?.user.uid !== session?.user.uid;
    if (changedUser) {
      versions = {};
      setState({ data: {}, dataLoaded: false, publicLoaded: false });
    }
    setState({ session, sessionLoaded: true });
    if (session?.isEnabled) {
      if (changedUser || !state.dataLoaded) await loadData();
    } else if (changedUser || !state.publicLoaded) {
      await loadPublic();
    }
  } catch (err) {
    setState({ sessionLoaded: true, error: (err as Error).message });
  }
}

/** Ask which data sets changed and reload only those. */
async function poll() {
  if (!state.session?.isEnabled || document.visibilityState === 'hidden') return;
  try {
    const { versions: server } = await api<{ versions: Record<string, number> }>('GET', '/api/data/versions');
    const stale = (Object.keys(state.data) as Resource[]).filter((r) => (server[r] ?? 0) !== (versions[r] ?? 0));
    if (stale.length) await loadData(stale);
  } catch {
    /* offline or signed out; try again on the next tick */
  }
}

export function startDataSync() {
  if (started || typeof window === 'undefined') return;
  started = true;
  void loadSession();
  pollTimer = setInterval(poll, POLL_MS);
  window.addEventListener('focus', () => void poll());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void poll();
  });
}

export function stopDataSync() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
  started = false;
}

// ---- Refresh after own changes (coalesced) -------------------------------------------------

let pending = new Set<Resource>();
let pendingPromise: Promise<void> | null = null;

/** Reload these data sets soon; several calls in a row become one request. */
export function refresh(resources: Resource[]): Promise<void> {
  if (!state.session?.isEnabled) return loadPublic();
  resources.forEach((r) => pending.add(r));
  if (!pendingPromise) {
    pendingPromise = new Promise<void>((resolve) => {
      setTimeout(async () => {
        const batch = [...pending].filter((r) => r in state.data || !state.dataLoaded);
        pending = new Set();
        pendingPromise = null;
        try {
          if (batch.length) await loadData(batch);
        } catch {
          /* the next poll will catch up */
        }
        resolve();
      }, 30);
    });
  }
  return pendingPromise;
}

export async function signOutSession() {
  try {
    await api('POST', '/api/auth/logout');
  } finally {
    versions = {};
    setState({ session: null, data: {}, dataLoaded: false, publicLoaded: false });
    await loadPublic();
  }
}

// ---- React bindings ------------------------------------------------------------------------

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
const getSnapshot = () => state;
const serverSnapshot: State = { sessionLoaded: false, session: null, data: {}, dataLoaded: false, publicLoaded: false, error: null };

export function useDataState(): State {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}
