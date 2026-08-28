import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Product } from '@/db/types';
import { searchKey, rank, rankMulti, debounce, lru } from '@/lib/perf';

export interface IndexedProduct extends Product { _key: string; _tokens: string[] }

let cache: { stamp: string; list: IndexedProduct[] } = { stamp: '', list: [] };

/** One shared, memoised, search-indexed catalogue for the whole app. */
export function useCatalog() {
  const products = useLiveQuery(() => db.products.toArray(), [], undefined);
  const [ready, setReady] = useState(false);

  const indexed = useMemo(() => {
    if (!products) return cache.list;
    const stamp = products.length + ':' + products.reduce((m, p) => Math.max(m, p.updatedAt || 0), 0);
    if (cache.stamp === stamp) return cache.list;
    const list = products.map((p) => {
      const key = searchKey(`${p.name} ${p.brand ?? ''} ${p.sku} ${p.barcode ?? ''} ${p.category}`);
      return Object.assign(Object.create(Object.getPrototypeOf(p) || Object.prototype), p, {
        _key: key, _tokens: key.split(' '),
      }) as IndexedProduct;
    });
    cache = { stamp, list };
    qCache.clear();
    lastQuery = { stamp: '', q: '', res: [] };
    return list;
  }, [products]);

  useEffect(() => { if (products) setReady(true); }, [products]);
  return { products: indexed, loading: !ready, count: indexed.length };
}

/** Debounced search term — keeps typing buttery even with 30k rows. */
export function useDebounced<T>(value: T, ms = 160) {
  const [v, setV] = useState(value);
  const fn = useRef(debounce((x: T) => setV(x), ms)).current;
  useEffect(() => { fn(value); }, [value]);
  return v;
}

const qCache = lru<string, IndexedProduct[]>(60);
let lastQuery = { stamp: '', q: '', res: [] as IndexedProduct[] };

/**
 * Ranked search over the shared catalogue index.
 * Three layers of optimisation:
 *   1. LRU cache — repeated queries (backspace, tab switches) are instant.
 *   2. Prefix narrowing — "para" only re-scans the results of "par".
 *   3. Multi-word AND ranking with early rejection.
 */
export function searchProducts(list: IndexedProduct[], query: string, limit = 0): IndexedProduct[] {
  const q = searchKey(query);
  if (!q) return limit ? list.slice(0, limit) : list;

  const stamp = cache.stamp + ':' + list.length;
  const ck = stamp + '|' + q + '|' + limit;
  const hit = qCache.get(ck);
  if (hit) return hit;

  // narrow: if the user just typed one more character, search only the previous hits
  let source = list;
  if (lastQuery.stamp === stamp && lastQuery.q && q.startsWith(lastQuery.q) && lastQuery.res.length) {
    source = lastQuery.res;
  }

  const words = q.split(' ').filter(Boolean);
  const out: { p: IndexedProduct; s: number }[] = [];
  for (let i = 0; i < source.length; i++) {
    const p = source[i];
    const sc = words.length > 1 ? rankMulti(words, p._key, p._tokens) : rank(q, p._key, p._tokens);
    if (sc > 0) out.push({ p, s: sc });
  }
  out.sort((a, b) => b.s - a.s);
  const full = out.map((x) => x.p);
  lastQuery = { stamp, q, res: full };
  const res = limit ? full.slice(0, limit) : full;
  qCache.set(ck, res);
  return res;
}

/** Clear memoised search results (called automatically when the catalogue changes). */
export const clearSearchCache = () => { qCache.clear(); lastQuery = { stamp: '', q: '', res: [] }; };
