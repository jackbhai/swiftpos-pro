import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, CartesianGrid,
} from 'recharts';
import {
  IndianRupee, TrendingUp, ShoppingBag, Users, AlertTriangle, PackageX, CalendarClock,
  Percent, ArrowUpRight, ArrowDownRight, Zap,
} from 'lucide-react';
import { useSales, useCustomers, useExpenses } from '@/hooks/useData';
import { money, moneyShort, num, dayKey, rangeFor, ago, cx } from '@/lib/format';
import { stockState, expiryState } from '@/lib/calc';
import { Card, Stat, SectionTitle, Tabs, Badge, Empty } from '@/components/ui';
import { useCatalog } from '@/hooks/useCatalog';
import { useSettings } from '@/store/settings';

const PIE = ['#00e5ff', '#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#a3e635'];

export default function Dashboard() {
  const sales = useSales() || [];
  const { products } = useCatalog();
  const customers = useCustomers() || [];
  const expenses = useExpenses() || [];
  const s = useSettings();
  const [period, setPeriod] = useState<'today' | '7d' | '30d' | '90d'>('7d');

  const [from, to] = rangeFor(period);
  const inRange = useMemo(() => sales.filter((x: any) => x.ts >= from && x.ts <= to && x.status !== 'void'), [sales, from, to]);
  const prev = useMemo(() => {
    const span = to - from;
    return sales.filter((x: any) => x.ts >= from - span && x.ts < from);
  }, [sales, from, to]);

  const sum = (a: any[], k: string) => a.reduce((t, x) => t + (x[k] || 0), 0);
  const revenue = sum(inRange, 'total');
  const prevRevenue = sum(prev, 'total');
  const profit = sum(inRange, 'profit');
  const orders = inRange.length;
  const aov = orders ? revenue / orders : 0;
  const growth = prevRevenue ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
  const expenseTotal = expenses.filter((e: any) => e.ts >= from && e.ts <= to).reduce((t: number, e: any) => t + e.amount, 0);

  const series = useMemo(() => {
    const days = period === 'today' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const map = new Map<string, { day: string; revenue: number; profit: number; orders: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const k = dayKey(Date.now() - i * 864e5);
      map.set(k, { day: k.slice(5), revenue: 0, profit: 0, orders: 0 });
    }
    inRange.forEach((x: any) => {
      const k = dayKey(x.ts); const row = map.get(k);
      if (row) { row.revenue += x.total; row.profit += x.profit; row.orders += 1; }
    });
    return [...map.values()];
  }, [inRange, period]);

  const payMix = useMemo(() => {
    const m = new Map<string, number>();
    inRange.forEach((x: any) => m.set(x.payMode, (m.get(x.payMode) || 0) + x.total));
    return [...m].map(([name, value]) => ({ name: name.toUpperCase(), value: +value.toFixed(0) }));
  }, [inRange]);

  const topProducts = useMemo(() => {
    const m = new Map<string, { name: string; qty: number; revenue: number }>();
    inRange.forEach((x: any) => x.lines.forEach((l: any) => {
      const r = m.get(l.productId) || { name: l.name, qty: 0, revenue: 0 };
      r.qty += l.qty; r.revenue += l.price * l.qty; m.set(l.productId, r);
    }));
    return [...m.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6);
  }, [inRange]);

  const hourly = useMemo(() => {
    const arr = Array.from({ length: 24 }, (_, h) => ({ h: String(h).padStart(2, '0'), v: 0 }));
    inRange.forEach((x: any) => { arr[new Date(x.ts).getHours()].v += x.total; });
    return arr;
  }, [inRange]);

  const lowStock = products.filter((p: any) => stockState(p) === 'low');
  const outStock = products.filter((p: any) => stockState(p) === 'out');
  const expiring = products.filter((p: any) => ['soon', 'expired'].includes(expiryState(p, s.expiryAlertDays) as string));
  const dues = customers.filter((c: any) => c.credit > 0);
  const stockValue = products.reduce((t: number, p: any) => t + p.cost * p.stock, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs tabs={[{ id: 'today', label: 'Today' }, { id: '7d', label: '7 days' }, { id: '30d', label: '30 days' }, { id: '90d', label: '90 days' }]} active={period} onChange={(v) => setPeriod(v as any)} />
        <Link to="/pos" className="btn-primary"><Zap size={15} /> New Sale</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Revenue" value={moneyShort(revenue, s.currency)} icon={<IndianRupee size={16} />}
          sub={<span className={cx('inline-flex items-center gap-0.5 font-bold', growth >= 0 ? 'text-ok' : 'text-bad')}>
            {growth >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(growth).toFixed(1)}% vs prev</span>} />
        <Stat label="Gross Profit" value={moneyShort(profit, s.currency)} tone="ok" icon={<TrendingUp size={16} />} sub={`${revenue ? ((profit / revenue) * 100).toFixed(1) : 0}% margin`} />
        <Stat label="Orders" value={num(orders)} icon={<ShoppingBag size={16} />} sub={`AOV ${money(aov, s.currency)}`} />
        <Stat label="Expenses" value={moneyShort(expenseTotal, s.currency)} tone="warn" icon={<Percent size={16} />} sub={`Net ${moneyShort(profit - expenseTotal, s.currency)}`} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle title="Revenue & profit" sub="Daily trend" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ left: -22, right: 6, top: 6 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00e5ff" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#00e5ff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#667' }} axisLine={false} tickLine={false} minTickGap={18} />
                <YAxis tick={{ fontSize: 10, fill: '#667' }} axisLine={false} tickLine={false} tickFormatter={(v) => moneyShort(v, '')} />
                <Tooltip contentStyle={{ background: '#0b0b0d', border: '1px solid #222', borderRadius: 12, fontSize: 12 }} formatter={(v: any) => money(v as number, s.currency)} />
                <Area type="monotone" dataKey="revenue" stroke="#00e5ff" strokeWidth={2} fill="url(#g1)" />
                <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} fill="url(#g2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <SectionTitle title="Payment mix" sub="Share of revenue" />
          {payMix.length === 0 ? <Empty title="No sales yet" /> : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={payMix} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={3} stroke="none">
                    {payMix.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0b0b0d', border: '1px solid #222', borderRadius: 12, fontSize: 12 }} formatter={(v: any) => money(v as number, s.currency)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {payMix.map((p, i) => (
              <span key={p.name} className="flex items-center gap-1.5 text-[11px] text-ink2">
                <span className="h-2 w-2 rounded-full" style={{ background: PIE[i % PIE.length] }} />{p.name}
              </span>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card>
          <SectionTitle title="Hourly heatmap" sub="Peak billing hours" />
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourly} margin={{ left: -28, right: 4 }}>
                <XAxis dataKey="h" tick={{ fontSize: 9, fill: '#667' }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fontSize: 9, fill: '#667' }} axisLine={false} tickLine={false} tickFormatter={(v) => moneyShort(v, '')} />
                <Tooltip cursor={{ fill: '#ffffff08' }} contentStyle={{ background: '#0b0b0d', border: '1px solid #222', borderRadius: 12, fontSize: 12 }} formatter={(v: any) => money(v as number, s.currency)} />
                <Bar dataKey="v" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <SectionTitle title="Top products" sub="By revenue" right={<Link to="/reports" className="text-[11px] font-bold text-brand">All →</Link>} />
          <div className="space-y-2">
            {topProducts.length === 0 && <Empty title="No data" />}
            {topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-2.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-surface2 text-[11px] font-bold text-ink3">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-ink">{p.name}</p>
                  <div className="mt-1 h-1.5 rounded-full bg-surface2">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${(p.revenue / topProducts[0].revenue) * 100}%` }} />
                  </div>
                </div>
                <span className="shrink-0 font-mono text-[11px] text-ink2">{moneyShort(p.revenue, s.currency)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle title="Attention needed" sub="Live alerts" />
          <div className="space-y-2">
            <AlertRow to="/inventory" icon={<PackageX size={15} />} tone="bad" label="Out of stock" value={outStock.length} />
            <AlertRow to="/inventory" icon={<AlertTriangle size={15} />} tone="warn" label="Low stock" value={lowStock.length} />
            <AlertRow to="/inventory" icon={<CalendarClock size={15} />} tone="warn" label="Expiring soon" value={expiring.length} />
            <AlertRow to="/customers" icon={<Users size={15} />} tone="brand" label="Credit dues" value={dues.length} />
            <div className="mt-3 rounded-xl border border-line bg-surface2/60 p-3">
              <p className="text-[11px] uppercase tracking-wider text-ink3">Stock valuation (cost)</p>
              <p className="text-lg font-extrabold text-ink">{money(stockValue, s.currency)}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <SectionTitle title="Recent invoices" right={<Link to="/sales" className="text-[11px] font-bold text-brand">View all →</Link>} />
        <div className="divide-y divide-line">
          {sales.slice(0, 8).map((x: any) => (
            <div key={x.id} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{x.invoiceNo} <span className="text-ink3">· {x.customerName ?? 'Walk-in'}</span></p>
                <p className="text-[11px] text-ink3">{ago(x.ts)} · {x.lines.length} items · {x.payMode}</p>
              </div>
              {x.status !== 'completed' && <Badge tone="bad">{x.status}</Badge>}
              <span className="font-mono text-sm font-bold text-ink">{money(x.total, s.currency)}</span>
            </div>
          ))}
          {sales.length === 0 && <Empty title="No sales recorded" sub="Head to Billing to create your first invoice." />}
        </div>
      </Card>
    </div>
  );
}

function AlertRow({ to, icon, label, value, tone }: any) {
  const tones: any = { bad: 'text-bad bg-bad/10', warn: 'text-warn bg-warn/10', brand: 'text-brand bg-brand/10' };
  return (
    <Link to={to} className="flex items-center gap-2.5 rounded-xl border border-line px-3 py-2 transition hover:border-brand/40">
      <span className={cx('grid h-7 w-7 place-items-center rounded-lg', tones[tone])}>{icon}</span>
      <span className="flex-1 text-xs font-semibold text-ink2">{label}</span>
      <span className="text-sm font-extrabold text-ink">{value}</span>
    </Link>
  );
}
