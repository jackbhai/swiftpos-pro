/* Off-main-thread analytics: ABC classification, basket affinity and forecasting.
   Heavy loops run here so the UI thread stays at 60 fps even with 50k+ sale lines. */

type Line = { productId: string; name: string; qty: number; price: number; cost: number; discount: number };
type Sale = { ts: number; total: number; profit: number; lines: Line[] };

function abc(sales: Sale[]) {
  const m = new Map<string, { name: string; qty: number; revenue: number; profit: number }>();
  for (const x of sales) {
    for (const l of x.lines) {
      const c = m.get(l.productId) || { name: l.name, qty: 0, revenue: 0, profit: 0 };
      c.qty += l.qty;
      c.revenue += l.price * l.qty - l.discount;
      c.profit += (l.price - l.cost) * l.qty - l.discount;
      m.set(l.productId, c);
    }
  }
  const arr = [...m].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.revenue - a.revenue);
  const total = arr.reduce((t, r) => t + r.revenue, 0) || 1;
  let cum = 0;
  return arr.map((r) => {
    cum += r.revenue;
    const share = (cum / total) * 100;
    return { ...r, share, cls: share <= 80 ? 'A' : share <= 95 ? 'B' : 'C' };
  });
}

function basket(sales: Sale[], maxItems = 12, limit = 40) {
  const m = new Map<string, { a: string; b: string; n: number }>();
  for (const x of sales) {
    const names: string[] = [];
    for (const l of x.lines) if (!names.includes(l.name)) names.push(l.name);
    const list = names.slice(0, maxItems);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i] < list[j] ? list[i] : list[j];
        const b = list[i] < list[j] ? list[j] : list[i];
        const k = a + '||' + b;
        const c = m.get(k) || { a, b, n: 0 };
        c.n++;
        m.set(k, c);
      }
    }
  }
  return [...m.values()].filter((p) => p.n > 1).sort((a, b) => b.n - a.n).slice(0, limit);
}

function velocity(sales: Sale[]) {
  if (!sales.length) return { perDay: {} as Record<string, number>, days: 1 };
  let min = Infinity; let max = -Infinity;
  const sold: Record<string, number> = {};
  for (const x of sales) {
    if (x.ts < min) min = x.ts;
    if (x.ts > max) max = x.ts;
    for (const l of x.lines) sold[l.productId] = (sold[l.productId] || 0) + l.qty;
  }
  const days = Math.max(1, (max - min) / 864e5);
  const perDay: Record<string, number> = {};
  for (const k in sold) perDay[k] = sold[k] / days;
  return { perDay, days };
}

self.onmessage = (e: MessageEvent) => {
  const { id, type, sales } = e.data || {};
  try {
    let result: any = null;
    if (type === 'abc') result = abc(sales);
    else if (type === 'basket') result = basket(sales);
    else if (type === 'velocity') result = velocity(sales);
    else if (type === 'all') result = { abc: abc(sales), basket: basket(sales), velocity: velocity(sales) };
    (self as any).postMessage({ id, ok: true, result });
  } catch (err: any) {
    (self as any).postMessage({ id, ok: false, error: String(err?.message || err) });
  }
};

export {};
