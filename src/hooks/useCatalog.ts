import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Product } from '@/db/types';
import { searchKey, rank, debounce } from '@/lib/perf';

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

export function searchProducts(list: IndexedProduct[], query: string, limit = 0): IndexedProduct[] {
  const q = searchKey(query);
  if (!q) return limit ? list.slice(0, limit) : list;
  const out: { p: IndexedProduct; s: number }[] = [];
  for (const p of list) {
    const s = rank(q, p._key, p._tokens);
    if (s > 0) out.push({ p, s });
  }
  out.sort((a, b) => b.s - a.s);
  const res = out.map((x) => x.p);
  return limit ? res.slice(0, limit) : res;
}
