/* Performance helpers: debounce, throttle, idle work, chunked mapping. */

export function debounce<T extends (...a: any[]) => void>(fn: T, ms = 150) {
  let t: any;
  const wrapped = (...args: Parameters<T>) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  (wrapped as any).cancel = () => clearTimeout(t);
  return wrapped as T & { cancel: () => void };
}

export function throttle<T extends (...a: any[]) => void>(fn: T, ms = 100) {
  let last = 0; let queued: any = null;
  return ((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn(...args); }
    else { clearTimeout(queued); queued = setTimeout(() => { last = Date.now(); fn(...args); }, ms - (now - last)); }
  }) as T;
}

export const idle = (fn: () => void, timeout = 500) =>
  ('requestIdleCallback' in window ? (window as any).requestIdleCallback(fn, { timeout }) : setTimeout(fn, 1));

/** Normalised, lowercase, accent-free search key. */
export const searchKey = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

/** Rank a query against a pre-normalised haystack — 0 means "no match". */
export function rank(q: string, key: string, tokens?: string[]): number {
  if (!q) return 1;
  if (key === q) return 1000;
  if (key.startsWith(q)) return 500 - Math.min(key.length, 200);
  const idx = key.indexOf(q);
  if (idx >= 0) return 300 - idx;
  if (tokens) for (const t of tokens) if (t.startsWith(q)) return 200;
  // subsequence fallback (typo tolerant-ish)
  let i = 0;
  for (let c = 0; c < key.length && i < q.length; c++) if (key[c] === q[i]) i++;
  return i === q.length ? 60 : 0;
}

/** Split a big job across frames so the UI never freezes. */
export async function chunkedForEach<T>(items: T[], fn: (item: T, i: number) => void, size = 500) {
  for (let i = 0; i < items.length; i += size) {
    items.slice(i, i + size).forEach((it, j) => fn(it, i + j));
    await new Promise((r) => setTimeout(r, 0));
  }
}

/** Tiny LRU memo cache for expensive pure lookups. */
export function lru<K, V>(max = 40) {
  const m = new Map<K, V>();
  return {
    get(k: K) { const v = m.get(k); if (v !== undefined) { m.delete(k); m.set(k, v); } return v; },
    set(k: K, v: V) { if (m.has(k)) m.delete(k); m.set(k, v); if (m.size > max) m.delete(m.keys().next().value as K); },
    clear() { m.clear(); },
    get size() { return m.size; },
  };
}

/** Rank a multi-word query: every word must hit somewhere (AND semantics). */
export function rankMulti(words: string[], key: string, tokens?: string[]): number {
  if (words.length === 0) return 1;
  if (words.length === 1) return rank(words[0], key, tokens);
  let total = 0;
  for (const w of words) {
    const r = rank(w, key, tokens);
    if (r === 0) return 0;
    total += r;
  }
  return total / words.length + 20;
}
