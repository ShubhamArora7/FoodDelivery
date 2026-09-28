import "server-only";

// Small in-memory cache for data that rarely changes (menu, shop settings), so most page
// loads don't need a database round trip. Any change made in the admin clears it (see api.ts).
type Entry = { value: unknown; expires: number; pending?: Promise<unknown> };
const g = globalThis as unknown as { __fgcCache?: Map<string, Entry> };
const store = (g.__fgcCache ??= new Map());

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expires > now) return hit.value as T;
  if (hit?.pending) return hit.pending as Promise<T>;
  const pending = load().then(
    (value) => {
      store.set(key, { value, expires: Date.now() + ttlMs });
      return value;
    },
    (e) => {
      store.delete(key);
      throw e;
    },
  );
  store.set(key, { value: hit?.value, expires: 0, pending });
  return pending;
}

export function clearCache() {
  store.clear();
}
