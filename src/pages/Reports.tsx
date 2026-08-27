import { useMemo, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { Download, FileText, TrendingUp, Percent, Users, Package } from 'lucide-react';
import { useSales, useProducts, useCustomers, useExpenses, useStaff } from '@/hooks/useData';
import { money, moneyShort, num, dayKey, rangeFor, dt, pct } from '@/lib/format';
import { downloadCSV } from '@/lib/csv';
import { Card, Stat, Tabs, SectionTitle, Empty, Badge } from '@/components/ui';
import { useSettings } from '@/store/settings';
import { expiryState, stockState } from '@/lib/calc';

const TABS = [
  { id: 'sales', label: 'Sales' }, { id: 'products', label: 'Products' }, { id: 'gst', label: 'GST' },
  { id: 'profit', label: 'Profit & loss' }, { id: 'customers', label: 'Customers' },
  { id: 'stock', label: 'Stock health' }, { id: 'staff', label: 'Staff' },
];

export default function Reports() {
  const sales = useSales() || [];
  const products = useProducts() || [];
  const customers = useCustomers() || [];
  const expenses = useExpenses() || [];
  const staff = useStaff() || [];
  const s = useSettings();
  const [tab, setTab] = useState('sales');
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'month' | 'year' | 'all'>('30d');
  const [from, to] = rangeFor(period as any);
  const list = useMemo(() => sales.filter((x: any) => x.ts >= from && x.ts <= to && x.status !== 'void'), [sales, from, to]);

  const revenue = list.reduce((t: number, x: any) => t + x.total, 0);
  const profit = list.reduce((t: number, x: any) => t + x.profit, 0);
  const expenseTotal = expenses.filter((e: any) => e.ts >= from && e.ts <= to).reduce((t: number, e: any) => t + e.amount, 0);
  const gst = list.reduce((t: number, x: any) => t + x.gstAmount, 0);

  const daily = useMemo(() => {
    const m = new Map<string, any>();
    list.forEach((x: any) => {
      const k = dayKey(x.ts);
      const r = m.get(k) || { day: k.slice(5), revenue: 0, profit: 0, orders: 0, gst: 0 };
      r.revenue += x.total; r.profit += x.profit; r.orders++; r.gst += x.gstAmount; m.set(k, r);
    });
    return [...m.entries()].sort().map(([, v]) => v);
  }, [list]);

  const productStats = useMemo(() => {
    const m = new Map<string, any>();
    list.forEach((x: any) => x.lines.forEach((l: any) => {
      const r = m.get(l.productId) || { name: l.name, qty: 0, revenue: 0, profit: 0, orders: 0 };
      r.qty += l.qty; r.revenue += l.price * l.qty; r.profit += (l.price - l.cost) * l.qty; r.orders++;
      m.set(l.productId, r);
    }));
    return [...m.values()].sort((a, b) => b.revenue - a.revenue);
  }, [list]);

  const gstSlabs = useMemo(() => {
    const m = new Map<number, any>();
    list.forEach((x: any) => x.lines.forEach((l: any) => {
      const r = m.get(l.gst) || { slab: l.gst + '%', taxable: 0, cgst: 0, sgst: 0, total: 0 };
      const gross = l.price * l.qty - (l.discount || 0);
      const tax = s.taxInclusive ? (gross * l.gst) / (100 + l.gst) : (gross * l.gst) / 100;
      r.taxable += gross - (s.taxInclusive ? tax : 0); r.cgst += tax / 2; r.sgst += tax / 2; r.total += gross;
      m.set(l.gst, r);
    }));
    return [...m.values()].sort((a, b) => parseFloat(a.slab) - parseFloat(b.slab));
  }, [list, s.taxInclusive]);

  const staffStats = useMemo(() => {
    const m = new Map<string, any>();
    list.forEach((x: any) => {
      const k = x.staffName ?? 'Unassigned';
      const r = m.get(k) || { name: k, orders: 0, revenue: 0, profit: 0 };
      r.orders++; r.revenue += x.total; r.profit += x.profit; m.set(k, r);
    });
    return [...m.values()].sort((a, b) => b.revenue - a.revenue);
  }, [list]);

  const custStats = useMemo(() => [...customers].sort((a: any, b: any) => b.totalSpend - a.totalSpend).slice(0, 25), [customers]);
  const dead = useMemo(() => {
    const sold = new Set<string>();
    list.forEach((x: any) => x.lines.forEach((l: any) => sold.add(l.productId)));
    return products.filter((p: any) => !sold.has(p.id) && p.stock > 0).sort((a: any, b: any) => b.stock * b.cost - a.stock * a.cost);
  }, [products, list]);

  const chartTip = { contentStyle: { background: '#0b0b0d', border: '1px solid #222', borderRadius: 12, fontSize: 12 } };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Revenue" value={moneyShort(revenue, s.currency)} icon={<TrendingUp size={16} />} sub={`${list.length} bills`} />
        <Stat label="Gross profit" value={moneyShort(profit, s.currency)} tone="ok" sub={pct(revenue ? (profit / revenue) * 100 : 0) + ' margin'} />
        <Stat label="GST collected" value={moneyShort(gst, s.currency)} tone="warn" icon={<Percent size={16} />} />
        <Stat label="Net profit" value={moneyShort(profit - expenseTotal, s.currency)} tone={profit - expenseTotal >= 0 ? 'ok' : 'bad'} sub={`Expenses ${moneyShort(expenseTotal, s.currency)}`} />
      </div>

      <Card className="flex flex-wrap items-center gap-2">
        <Tabs active={period} onChange={(v) => setPeriod(v as any)} tabs={[
          { id: '7d', label: '7d' }, { id: '30d', label: '30d' }, { id: '90d', label: '90d' },
          { id: 'month', label: 'Month' }, { id: 'year', label: 'Year' }, { id: 'all', label: 'All' }]} />
      </Card>

      <Card pad={false} className="p-3"><Tabs active={tab} onChange={setTab} tabs={TABS} /></Card>

      {tab === 'sales' && (
        <>
          <Card>
            <SectionTitle title="Daily revenue vs profit" right={<button className="btn-ghost px-2 py-1 text-xs" onClick={() => downloadCSV('daily-sales.csv', daily)}><Download size={13} /> CSV</button>} />
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily} margin={{ left: -20, right: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1c1c22" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#667' }} axisLine={false} tickLine={false} minTickGap={16} />
                  <YAxis tick={{ fontSize: 10, fill: '#667' }} axisLine={false} tickLine={false} tickFormatter={(v) => moneyShort(v, '')} />
                  <Tooltip {...chartTip} formatter={(v: any) => money(v as number, s.currency)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="revenue" fill="#00e5ff" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card>
            <SectionTitle title="Order count trend" />
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={daily} margin={{ left: -26, right: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1c1c22" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#667' }} axisLine={false} tickLine={false} minTickGap={16} />
                  <YAxis tick={{ fontSize: 10, fill: '#667' }} axisLine={false} tickLine={false} />
                  <Tooltip {...chartTip} />
                  <Line type="monotone" dataKey="orders" stroke="#7c3aed" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}

      {tab === 'products' && (
        <Card pad={false}>
          <div className="flex items-center justify-between p-3">
            <SectionTitle title="Product performance" sub={`${productStats.length} products sold`} />
            <button className="btn-ghost px-2 py-1 text-xs" onClick={() => downloadCSV('product-performance.csv', productStats)}><Download size={13} /> CSV</button>
          </div>
          <Table head={['Product', 'Qty', 'Revenue', 'Profit', 'Margin']} rows={productStats.slice(0, 60).map((p) => [
            p.name, num(p.qty), money(p.revenue, s.currency), money(p.profit, s.currency), pct(p.revenue ? (p.profit / p.revenue) * 100 : 0),
          ])} />
        </Card>
      )}

      {tab === 'gst' && (
        <Card pad={false}>
          <div className="flex items-center justify-between p-3">
            <SectionTitle title="GST summary (GSTR-1 style)" sub={`${dt(from)} → ${dt(to)}`} />
            <button className="btn-ghost px-2 py-1 text-xs" onClick={() => downloadCSV('gst-summary.csv', gstSlabs)}><FileText size={13} /> CSV</button>
          </div>
          <Table head={['Slab', 'Taxable', 'CGST', 'SGST', 'Gross']} rows={gstSlabs.map((g) => [
            g.slab, money(g.taxable, s.currency), money(g.cgst, s.currency), money(g.sgst, s.currency), money(g.total, s.currency),
          ])} />
          <div className="border-t border-line p-3 text-xs text-ink3">GSTIN {s.gstin || '—'} · {s.taxInclusive ? 'Prices are tax inclusive' : 'Tax added on top'}</div>
        </Card>
      )}

      {tab === 'profit' && (
        <Card>
          <SectionTitle title="Profit & loss statement" />
          <div className="space-y-1.5 text-sm">
            <PL label="Gross revenue" v={revenue} />
            <PL label="Cost of goods sold" v={-(revenue - profit)} />
            <PL label="Gross profit" v={profit} bold />
            <PL label="Operating expenses" v={-expenseTotal} />
            <PL label="Net profit" v={profit - expenseTotal} bold big />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Gross margin" value={pct(revenue ? (profit / revenue) * 100 : 0)} />
            <Stat label="Net margin" value={pct(revenue ? ((profit - expenseTotal) / revenue) * 100 : 0)} />
            <Stat label="Avg ticket" value={money(list.length ? revenue / list.length : 0, s.currency)} />
            <Stat label="Expense ratio" value={pct(revenue ? (expenseTotal / revenue) * 100 : 0)} />
          </div>
        </Card>
      )}

      {tab === 'customers' && (
        <Card pad={false}>
          <div className="flex items-center justify-between p-3"><SectionTitle title="Top customers" /><button className="btn-ghost px-2 py-1 text-xs" onClick={() => downloadCSV('top-customers.csv', custStats.map((c: any) => ({ name: c.name, phone: c.phone, spend: c.totalSpend, visits: c.visits, points: c.points, credit: c.credit })))}><Download size={13} /></button></div>
          <Table head={['Customer', 'Visits', 'Spend', 'Points', 'Credit']} rows={custStats.map((c: any) => [
            c.name, num(c.visits), money(c.totalSpend, s.currency), num(c.points), money(c.credit, s.currency)])} />
        </Card>
      )}

      {tab === 'stock' && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Dead stock items" value={num(dead.length)} tone="warn" icon={<Package size={16} />} />
            <Stat label="Dead stock value" value={moneyShort(dead.reduce((t: number, p: any) => t + p.cost * p.stock, 0), s.currency)} tone="bad" />
            <Stat label="Low stock" value={num(products.filter((p: any) => stockState(p) === 'low').length)} tone="warn" />
            <Stat label="Expiring soon" value={num(products.filter((p: any) => expiryState(p, s.expiryAlertDays) === 'soon').length)} tone="warn" />
          </div>
          <Card pad={false}>
            <div className="flex items-center justify-between p-3"><SectionTitle title="Dead stock (no sales in period)" /><button className="btn-ghost px-2 py-1 text-xs" onClick={() => downloadCSV('dead-stock.csv', dead.map((p: any) => ({ name: p.name, stock: p.stock, cost: p.cost, value: p.stock * p.cost })))}><Download size={13} /></button></div>
            <Table head={['Product', 'Stock', 'Cost', 'Locked value']} rows={dead.slice(0, 50).map((p: any) => [
              p.name, `${p.stock} ${p.unit}`, money(p.cost, s.currency), money(p.stock * p.cost, s.currency)])} />
          </Card>
        </>
      )}

      {tab === 'staff' && (
        <Card pad={false}>
          <div className="p-3"><SectionTitle title="Staff performance" sub={`${staff.length} users registered`} /></div>
          {staffStats.length === 0 ? <Empty title="No attributed sales" /> :
            <Table head={['Staff', 'Orders', 'Revenue', 'Profit', 'Avg ticket']} rows={staffStats.map((x) => [
              x.name, num(x.orders), money(x.revenue, s.currency), money(x.profit, s.currency), money(x.revenue / x.orders, s.currency)])} />}
        </Card>
      )}
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  if (!rows.length) return <Empty title="No data for this period" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px]">
        <thead className="border-y border-line bg-surface2/40"><tr>{head.map((h, i) => <th key={h} className={`th ${i ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-surface2/40">
              {r.map((c, j) => <td key={j} className={`td ${j ? 'text-right font-mono' : 'text-ink'}`}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PL({ label, v, bold, big }: any) {
  const s = useSettings();
  return (
    <div className={`flex justify-between border-b border-line py-1.5 ${bold ? 'font-extrabold text-ink' : 'text-ink2'} ${big ? 'text-lg' : ''}`}>
      <span>{label}</span><span className={`font-mono ${v < 0 ? 'text-bad' : bold ? 'text-ok' : ''}`}>{money(v, s.currency)}</span>
    </div>
  );
}
