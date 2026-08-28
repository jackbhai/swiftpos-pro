import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, Boxes, Layers, CalendarDays, Network, TrendingUp } from 'lucide-react';
import { money, moneyShort, num, pct, cx, dayKey } from '@/lib/format';
import { downloadCSV } from '@/lib/csv';
import { Card, SectionTitle, Empty, Badge, Stat } from '@/components/ui';
import { useSettings } from '@/store/settings';

const COLORS = ['#22d3ee', '#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#60a5fa', '#fb7185', '#4ade80', '#c084fc', '#facc15'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** ABC (Pareto) inventory classification — where your money actually lives. */
export function ABCReport({ sales, products }: { sales: any[]; products: any[] }) {
  const s = useSettings();
  const rows = useMemo(() => {
    const m = new Map<string, { name: string; qty: number; revenue: number; profit: number }>();
    sales.forEach((x: any) => x.lines.forEach((l: any) => {
      const c = m.get(l.productId) || { name: l.name, qty: 0, revenue: 0, profit: 0 };
      c.qty += l.qty; c.revenue += l.price * l.qty - l.discount; c.profit += (l.price - l.cost) * l.qty - l.discount;
      m.set(l.productId, c);
    }));
    const arr = [...m].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.revenue - a.revenue);
    const total = arr.reduce((t, r) => t + r.revenue, 0) || 1;
    let cum = 0;
    return arr.map((r) => {
      cum += r.revenue;
      const share = (cum / total) * 100;
      return { ...r, share, cls: share <= 80 ? 'A' : share <= 95 ? 'B' : 'C' };
    });
  }, [sales]);

  const counts = { A: rows.filter((r) => r.cls === 'A'), B: rows.filter((r) => r.cls === 'B'), C: rows.filter((r) => r.cls === 'C') };
  const notSold = products.length - rows.length;

  if (!rows.length) return <Empty title="No sales in this period" sub="ABC analysis needs sales data." icon={<Layers size={22} />} />;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Class A (top 80%)" value={num(counts.A.length)} tone="ok" icon={<Layers size={16} />} sub="Never let these go out of stock" />
        <Stat label="Class B (next 15%)" value={num(counts.B.length)} tone="warn" sub="Steady movers" />
        <Stat label="Class C (last 5%)" value={num(counts.C.length)} tone="bad" sub="Review or discontinue" />
        <Stat label="Zero-sale items" value={num(Math.max(0, notSold))} tone="bad" icon={<Boxes size={16} />} />
      </div>
      <Card pad={false}>
        <div className="flex items-center justify-between p-3">
          <SectionTitle title="ABC classification" sub="Pareto: 80 / 95 / 100 % cumulative revenue" />
          <button className="btn-ghost px-2 py-1 text-xs" onClick={() => downloadCSV('abc-analysis.csv', rows.map((r) => ({
            product: r.name, class: r.cls, qty: r.qty, revenue: +r.revenue.toFixed(2), profit: +r.profit.toFixed(2), cumulative_pct: +r.share.toFixed(2),
          })))}><Download size={13} /> CSV</button>
        </div>
        <div className="max-h-[520px] overflow-auto">
          {rows.slice(0, 200).map((r, i) => (
            <div key={r.id} className="flex items-center gap-2 border-b border-line px-3 py-2 text-xs last:border-0">
              <span className="w-6 text-ink3">{i + 1}</span>
              <Badge tone={r.cls === 'A' ? 'ok' : r.cls === 'B' ? 'warn' : 'bad'}>{r.cls}</Badge>
              <span className="min-w-0 flex-1 truncate text-ink2">{r.name}</span>
              <span className="w-16 text-right font-mono text-ink3">{num(+r.qty.toFixed(1))}</span>
              <span className="w-24 text-right font-mono text-ink">{money(r.revenue, s.currency)}</span>
              <span className="hidden w-16 text-right font-mono text-ink3 sm:block">{pct(r.share)}</span>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

/** Category mix + day-of-week + hour-of-day demand patterns. */
export function MixReport({ sales }: { sales: any[] }) {
  const s = useSettings();
  const byCat = useMemo(() => {
    const m = new Map<string, number>();
    sales.forEach((x: any) => x.lines.forEach((l: any) => {
      const k = String(l.name || '').split(' ')[0];
      m.set(k, (m.get(k) || 0) + (l.price * l.qty - l.discount));
    }));
    return [...m].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [sales]);

  const byDay = useMemo(() => {
    const arr = DAYS.map((d) => ({ day: d, revenue: 0, orders: 0 }));
    sales.forEach((x: any) => { const d = new Date(x.ts).getDay(); arr[d].revenue += x.total; arr[d].orders++; });
    return arr;
  }, [sales]);

  const byHour = useMemo(() => {
    const arr = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}`, revenue: 0 }));
    sales.forEach((x: any) => { arr[new Date(x.ts).getHours()].revenue += x.total; });
    return arr;
  }, [sales]);

  const best = [...byDay].sort((a, b) => b.revenue - a.revenue)[0];

  if (!sales.length) return <Empty title="No sales in this period" icon={<CalendarDays size={22} />} />;

  return (
    <>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Revenue by day of week" sub={best ? `Best day: ${best.day}` : ''} />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="day" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} tickFormatter={(v) => moneyShort(v, s.currency)} />
                <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #1f2937', borderRadius: 12 }} formatter={(v: any) => money(v, s.currency)} />
                <Bar dataKey="revenue" fill="#22d3ee" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <SectionTitle title="Product mix (top 10)" sub="Share of revenue" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byCat} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {byCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #1f2937', borderRadius: 12 }} formatter={(v: any) => money(v, s.currency)} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <Card>
        <SectionTitle title="Hour-of-day demand" sub="Staff your counter where the bars are tall" />
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byHour}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="hour" stroke="#6b7280" fontSize={10} />
              <YAxis stroke="#6b7280" fontSize={10} tickFormatter={(v) => moneyShort(v, s.currency)} />
              <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #1f2937', borderRadius: 12 }} formatter={(v: any) => money(v, s.currency)} />
              <Bar dataKey="revenue" fill="#a78bfa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </>
  );
}

/** Market-basket affinity — "customers who buy X also buy Y". */
export function BasketReport({ sales }: { sales: any[] }) {
  const s = useSettings();
  const pairs = useMemo(() => {
    const m = new Map<string, { a: string; b: string; n: number }>();
    sales.forEach((x: any) => {
      const names = Array.from(new Set<string>(x.lines.map((l: any) => String(l.name)))).slice(0, 12);
      for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
        const [a, b] = [names[i], names[j]].sort();
        const k = a + '||' + b;
        const c = m.get(k) || { a, b, n: 0 }; c.n++; m.set(k, c);
      }
    });
    return [...m.values()].filter((p) => p.n > 1).sort((a, b) => b.n - a.n).slice(0, 40);
  }, [sales]);

  const avgBasket = sales.length ? sales.reduce((t: number, x: any) => t + x.lines.length, 0) / sales.length : 0;
  const avgTicket = sales.length ? sales.reduce((t: number, x: any) => t + x.total, 0) / sales.length : 0;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Avg basket size" value={avgBasket.toFixed(2) + ' items'} tone="brand" icon={<Network size={16} />} />
        <Stat label="Avg ticket" value={money(avgTicket, s.currency)} tone="ok" />
        <Stat label="Bills analysed" value={num(sales.length)} tone="warn" />
        <Stat label="Strong pairs" value={num(pairs.length)} tone="ok" />
      </div>
      <Card pad={false}>
        <div className="flex items-center justify-between p-3">
          <SectionTitle title="Frequently bought together" sub="Use these for combos, shelf placement and upsell prompts" />
          {pairs.length > 0 && <button className="btn-ghost px-2 py-1 text-xs" onClick={() => downloadCSV('basket-affinity.csv', pairs.map((p) => ({ item_a: p.a, item_b: p.b, times_together: p.n })))}><Download size={13} /> CSV</button>}
        </div>
        {pairs.length === 0 ? <Empty title="Not enough multi-item bills" sub="Affinity needs bills with 2+ different items." /> :
          pairs.map((p, i) => (
            <div key={i} className="flex items-center gap-2 border-b border-line px-3 py-2 text-xs last:border-0">
              <span className="min-w-0 flex-1 truncate text-ink2">{p.a}</span>
              <span className="text-ink3">+</span>
              <span className="min-w-0 flex-1 truncate text-ink2">{p.b}</span>
              <Badge tone={p.n > 4 ? 'ok' : 'muted'}>{p.n}x</Badge>
            </div>
          ))}
      </Card>
    </>
  );
}

/** Simple moving-average sales forecast + reorder suggestions. */
export function ForecastReport({ sales, products }: { sales: any[]; products: any[] }) {
  const s = useSettings();

  const daily = useMemo(() => {
    const m = new Map<string, number>();
    sales.forEach((x: any) => m.set(dayKey(x.ts), (m.get(dayKey(x.ts)) || 0) + x.total));
    return [...m].sort((a, b) => a[0].localeCompare(b[0])).map(([day, revenue]) => ({ day: day.slice(5), revenue }));
  }, [sales]);

  const ma = useMemo(() => daily.map((d, i) => {
    const w = daily.slice(Math.max(0, i - 6), i + 1);
    return { ...d, trend: w.reduce((t, x) => t + x.revenue, 0) / w.length };
  }), [daily]);

  const last7 = daily.slice(-7).reduce((t, d) => t + d.revenue, 0) / Math.max(1, Math.min(7, daily.length));
  const prev7 = daily.slice(-14, -7).reduce((t, d) => t + d.revenue, 0) / Math.max(1, Math.min(7, Math.max(0, daily.length - 7)));
  const growth = prev7 ? ((last7 - prev7) / prev7) * 100 : 0;
  const proj30 = last7 * 30 * (1 + growth / 200);

  const reorder = useMemo(() => {
    if (!sales.length) return [] as any[];
    const times = sales.map((x: any) => x.ts);
    const days = Math.max(1, (Math.max(...times) - Math.min(...times)) / 864e5);
    const sold = new Map<string, number>();
    sales.forEach((x: any) => x.lines.forEach((l: any) => sold.set(l.productId, (sold.get(l.productId) || 0) + l.qty)));
    return products.map((p: any) => {
      const perDay = (sold.get(p.id) || 0) / days;
      const cover = perDay > 0 ? p.stock / perDay : Infinity;
      return { ...p, perDay, cover, suggest: Math.max(0, Math.ceil(perDay * 14 - p.stock)) };
    }).filter((p: any) => p.perDay > 0 && p.cover < 14)
      .sort((a: any, b: any) => a.cover - b.cover).slice(0, 60);
  }, [sales, products]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Avg daily sales" value={money(last7, s.currency)} tone="brand" icon={<TrendingUp size={16} />} sub="last 7 days" />
        <Stat label="Week-on-week" value={(growth >= 0 ? '+' : '') + growth.toFixed(1) + '%'} tone={growth >= 0 ? 'ok' : 'bad'} />
        <Stat label="30-day projection" value={moneyShort(proj30, s.currency)} tone="ok" />
        <Stat label="Reorder now" value={num(reorder.length)} tone="warn" sub="under 14 days cover" />
      </div>
      <Card>
        <SectionTitle title="Sales trend & 7-day moving average" />
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ma}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="day" stroke="#6b7280" fontSize={10} />
              <YAxis stroke="#6b7280" fontSize={10} tickFormatter={(v) => moneyShort(v, s.currency)} />
              <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #1f2937', borderRadius: 12 }} formatter={(v: any) => money(v, s.currency)} />
              <Line type="monotone" dataKey="revenue" stroke="#22d3ee" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="trend" stroke="#a78bfa" dot={false} strokeWidth={2} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card pad={false}>
        <div className="flex items-center justify-between p-3">
          <SectionTitle title="Reorder suggestions" sub="Based on observed daily velocity, targeting 14 days of cover" />
          {reorder.length > 0 && <button className="btn-ghost px-2 py-1 text-xs" onClick={() => downloadCSV('reorder-plan.csv', reorder.map((p: any) => ({
            product: p.name, sku: p.sku, stock: p.stock, per_day: +p.perDay.toFixed(2), days_cover: +p.cover.toFixed(1), suggested_order: p.suggest, est_cost: +(p.suggest * p.cost).toFixed(2),
          })))}><Download size={13} /> CSV</button>}
        </div>
        {reorder.length === 0 ? <Empty title="Nothing urgent" sub="No fast-moving item is below 14 days of cover." /> :
          reorder.map((p: any) => (
            <div key={p.id} className="flex items-center gap-2 border-b border-line px-3 py-2 text-xs last:border-0">
              <span className="min-w-0 flex-1 truncate text-ink2">{p.name}</span>
              <span className="w-20 text-right font-mono text-ink3">{p.stock} {p.unit}</span>
              <span className={cx('w-20 text-right font-mono', p.cover < 3 ? 'text-bad' : p.cover < 7 ? 'text-warn' : 'text-ink3')}>{p.cover.toFixed(1)}d</span>
              <Badge tone="brand">order {p.suggest}</Badge>
            </div>
          ))}
      </Card>
    </>
  );
}
