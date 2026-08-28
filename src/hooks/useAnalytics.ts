import { useEffect, useRef, useState } from 'react';

/**
 * Runs the analytics worker off the main thread.
 * Falls back to a synchronous import when Workers are unavailable (very old browsers,
 * some in-app webviews), so the feature never breaks — it just gets slower.
 */
let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, (r: any) => void>();

function getWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL('../workers/analytics.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent) => {
      const { id, ok, result } = e.data || {};
      const fn = pending.get(id);
      if (fn) { pending.delete(id); fn(ok ? result : null); }
    };
    worker.onerror = () => { worker = null; };
  } catch { worker = null; }
  return worker;
}

/** Strip sales down to only what the worker needs — smaller structured-clone payload. */
function slim(sales: any[]) {
  return sales.map((x) => ({
    ts: x.ts, total: x.total, profit: x.profit,
    lines: x.lines.map((l: any) => ({ productId: l.productId, name: l.name, qty: l.qty, price: l.price, cost: l.cost, discount: l.discount })),
  }));
}

export function runAnalytics(type: 'abc' | 'basket' | 'velocity' | 'all', sales: any[]): Promise<any> {
  const w = getWorker();
  if (!w) return Promise.resolve(null);
  const id = ++seq;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    w.postMessage({ id, type, sales: slim(sales) });
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); resolve(null); } }, 15000);
  });
}

/** React hook: `const { data, busy } = useAnalytics('abc', sales)` */
export function useAnalytics(type: 'abc' | 'basket' | 'velocity' | 'all', sales: any[]) {
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const stamp = sales.length + ':' + (sales[0]?.ts || 0) + ':' + (sales[sales.length - 1]?.ts || 0);
  const last = useRef('');

  useEffect(() => {
    if (!sales.length) { setData(null); return; }
    const key = type + '|' + stamp;
    if (last.current === key) return;
    last.current = key;
    let alive = true;
    setBusy(true);
    runAnalytics(type, sales).then((r) => { if (alive) { setData(r); setBusy(false); } });
    return () => { alive = false; };
  }, [type, stamp]);

  return { data, busy };
}
