import { useMemo, useState } from 'react';
import { CalendarCheck, Printer, Download, Coins, TrendingUp, Undo2, Wallet } from 'lucide-react';
import { useSales, useExpenses, useShifts, useStaff } from '@/hooks/useData';
import { money, num, dt, tOnly, startOfDay, endOfDay, cx } from '@/lib/format';
import { downloadCSV } from '@/lib/csv';
import { Card, Stat, Field, Input, SectionTitle, Badge } from '@/components/ui';
import { useSettings } from '@/store/settings';
import { printHTML } from '@/lib/receipt';
import { toast } from '@/store/ui';
import type { Sale, Expense } from '@/db/types';

const DENOMS = [500, 200, 100, 50, 20, 10, 5, 2, 1];

/** Day close / Z-report — the end-of-day reconciliation every shop needs. */
export default function DayClose() {
  const sales = useSales() || [];
  const expenses = useExpenses() || [];
  const shifts = useShifts() || [];
  const staff = useStaff() || [];
  const s = useSettings();

  const [day, setDay] = useState(new Date().toISOString().slice(0, 10));
  const [openingCash, setOpeningCash] = useState('0');
  const [counted, setCounted] = useState<Record<number, string>>({});

  const from = startOfDay(new Date(day + 'T00:00:00'));
  const to = endOfDay(new Date(day + 'T00:00:00'));

  const daySales = useMemo(() => sales.filter((x: Sale) => x.ts >= from && x.ts <= to && x.status !== 'void'), [sales, from, to]);
  const dayExp = useMemo(() => expenses.filter((e: Expense) => e.ts >= from && e.ts <= to), [expenses, from, to]);

  const gross = daySales.reduce((t: number, x: Sale) => t + x.total, 0);
  const refunds = daySales.reduce((t: number, x: Sale) => t + (x.refundedAmount || 0), 0);
  const net = gross - refunds;
  const profit = daySales.reduce((t: number, x: Sale) => t + x.profit, 0);
  const tax = daySales.reduce((t: number, x: Sale) => t + x.gstAmount, 0);
  const discount = daySales.reduce((t: number, x: Sale) => t + x.billDiscount + x.itemDiscount + x.couponValue, 0);
  const expTotal = dayExp.reduce((t: number, e: Expense) => t + e.amount, 0);
  const items = daySales.reduce((t: number, x: Sale) => t + x.lines.reduce((a, l) => a + l.qty, 0), 0);

  const byMode = useMemo(() => {
    const m = new Map<string, number>();
    daySales.forEach((x: Sale) => {
      if (x.payMode === 'split' && x.splits) x.splits.forEach((p) => m.set(p.mode, (m.get(p.mode) || 0) + p.amount));
      else m.set(x.payMode, (m.get(x.payMode) || 0) + x.total);
    });
    return [...m].sort((a, b) => b[1] - a[1]);
  }, [daySales]);

  const byStaff = useMemo(() => {
    const m = new Map<string, { n: number; v: number }>();
    daySales.forEach((x: Sale) => {
      const k = x.staffName || 'Unassigned';
      const c = m.get(k) || { n: 0, v: 0 }; c.n++; c.v += x.total; m.set(k, c);
    });
    return [...m].sort((a, b) => b[1].v - a[1].v);
  }, [daySales]);

  const byHour = useMemo(() => {
    const arr = Array(24).fill(0);
    daySales.forEach((x: Sale) => { arr[new Date(x.ts).getHours()] += x.total; });
    return arr;
  }, [daySales]);
  const peakHour = byHour.indexOf(Math.max(...byHour));

  const topItems = useMemo(() => {
    const m = new Map<string, { qty: number; v: number }>();
    daySales.forEach((x: Sale) => x.lines.forEach((l) => {
      const c = m.get(l.name) || { qty: 0, v: 0 }; c.qty += l.qty; c.v += l.price * l.qty - l.discount; m.set(l.name, c);
    }));
    return [...m].sort((a, b) => b[1].v - a[1].v).slice(0, 10);
  }, [daySales]);

  const cashSales = byMode.find(([m]) => m === 'cash')?.[1] || 0;
  const cashExpenses = dayExp.filter((e: Expense) => e.payMode === 'cash').reduce((t: number, e: Expense) => t + e.amount, 0);
  const expectedCash = +openingCash + cashSales - cashExpenses;
  const countedCash = DENOMS.reduce((t, d) => t + d * (+(counted[d] || 0)), 0);
  const variance = countedCash - expectedCash;

  const report = () => {
    const rows = (arr: [string, any][], fmt: (v: any) => string) =>
      arr.map(([k, v]) => `<tr><td>${k}</td><td class=r>${fmt(v)}</td></tr>`).join('');
    printHTML(`<html><head><meta charset="utf-8"><title>Z-Report ${day}</title><style>
      body{font-family:system-ui,Arial;padding:20px;color:#111;max-width:760px;margin:auto}
      h1{font-size:18px;margin:0}h2{font-size:14px;margin:16px 0 6px}
      table{width:100%;border-collapse:collapse;font-size:12px}td,th{border:1px solid #ddd;padding:5px}.r{text-align:right}
      .muted{color:#666;font-size:11px}.big{font-size:16px;font-weight:700}
      </style></head><body>
      <h1>${s.shopName || 'Shop'} — Z Report (Day Close)</h1>
      <p class=muted>${new Date(day).toDateString()} · generated ${dt(Date.now())}</p>
      <h2>Sales summary</h2>
      <table>
        <tr><td>Bills</td><td class=r>${daySales.length}</td></tr>
        <tr><td>Items sold</td><td class=r>${items.toFixed(2)}</td></tr>
        <tr><td>Gross sales</td><td class=r>${gross.toFixed(2)}</td></tr>
        <tr><td>Refunds</td><td class=r>-${refunds.toFixed(2)}</td></tr>
        <tr><td>Discounts given</td><td class=r>${discount.toFixed(2)}</td></tr>
        <tr><td>Tax collected</td><td class=r>${tax.toFixed(2)}</td></tr>
        <tr><td class=big>Net sales</td><td class="r big">${net.toFixed(2)}</td></tr>
        <tr><td>Gross profit</td><td class=r>${profit.toFixed(2)}</td></tr>
        <tr><td>Expenses</td><td class=r>-${expTotal.toFixed(2)}</td></tr>
        <tr><td class=big>Net profit</td><td class="r big">${(profit - expTotal).toFixed(2)}</td></tr>
      </table>
      <h2>Payment modes</h2><table>${rows(byMode as any, (v) => v.toFixed(2))}</table>
      <h2>Cash drawer</h2><table>
        <tr><td>Opening float</td><td class=r>${(+openingCash).toFixed(2)}</td></tr>
        <tr><td>Cash sales</td><td class=r>${cashSales.toFixed(2)}</td></tr>
        <tr><td>Cash expenses</td><td class=r>-${cashExpenses.toFixed(2)}</td></tr>
        <tr><td>Expected in drawer</td><td class=r>${expectedCash.toFixed(2)}</td></tr>
        <tr><td>Counted</td><td class=r>${countedCash.toFixed(2)}</td></tr>
        <tr><td class=big>Variance</td><td class="r big">${variance.toFixed(2)}</td></tr>
      </table>
      <h2>Staff</h2><table>${byStaff.map(([k, v]) => `<tr><td>${k}</td><td class=r>${v.n} bills</td><td class=r>${v.v.toFixed(2)}</td></tr>`).join('')}</table>
      <h2>Top items</h2><table>${topItems.map(([k, v]) => `<tr><td>${k}</td><td class=r>${v.qty}</td><td class=r>${v.v.toFixed(2)}</td></tr>`).join('')}</table>
      <p class=muted>Signature: ____________________ &nbsp;&nbsp; Manager: ____________________</p>
      </body></html>`);
  };

  const exportCSV = () => downloadCSV(`z-report-${day}.csv`, daySales.map((x: Sale) => ({
    invoice: x.invoiceNo, time: tOnly(x.ts), customer: x.customerName || 'Walk-in', items: x.lines.length,
    subtotal: x.subTotal, discount: x.billDiscount + x.itemDiscount, tax: x.gstAmount, total: x.total,
    profit: x.profit, mode: x.payMode, status: x.status, staff: x.staffName || '',
  })));

  return (
    <div className="space-y-3">
      <Card>
        <SectionTitle title="Day close · Z-report" sub="Reconcile the drawer, print the summary, start tomorrow clean"
          right={<div className="flex gap-2">
            <button className="btn-soft" onClick={exportCSV}><Download size={15} /> CSV</button>
            <button className="btn-primary" onClick={report}><Printer size={15} /> Print Z-report</button>
          </div>} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Business date"><Input type="date" value={day} onChange={(e) => setDay(e.target.value)} /></Field>
          <Field label="Opening cash float"><Input inputMode="decimal" value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} /></Field>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Net sales" value={money(net, s.currency)} tone="brand" icon={<TrendingUp size={16} />} sub={`${daySales.length} bills`} />
        <Stat label="Gross profit" value={money(profit, s.currency)} tone="ok" sub={`${net ? ((profit / net) * 100).toFixed(1) : 0}% margin`} />
        <Stat label="Refunds" value={money(refunds, s.currency)} tone="bad" icon={<Undo2 size={16} />} />
        <Stat label="Expenses" value={money(expTotal, s.currency)} tone="warn" icon={<Wallet size={16} />} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Cash count" sub="Enter note/coin counts — variance calculates live" />
          <div className="grid grid-cols-3 gap-2">
            {DENOMS.map((d) => (
              <div key={d} className="rounded-xl border border-line p-2">
                <p className="text-[10px] text-ink3">{s.currency}{d} ×</p>
                <input className="input h-8 w-full text-center font-mono text-sm" inputMode="numeric" value={counted[d] || ''}
                  onChange={(e) => setCounted({ ...counted, [d]: e.target.value })} placeholder="0" />
                <p className="mt-1 text-right font-mono text-[10px] text-ink3">{money(d * (+(counted[d] || 0)), s.currency)}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1 rounded-xl border border-line p-3 text-xs">
            <Row k="Opening float" v={money(+openingCash, s.currency)} />
            <Row k="Cash sales" v={money(cashSales, s.currency)} />
            <Row k="Cash expenses" v={'-' + money(cashExpenses, s.currency)} />
            <Row k="Expected" v={money(expectedCash, s.currency)} bold />
            <Row k="Counted" v={money(countedCash, s.currency)} bold />
            <div className={cx('mt-1 flex items-center justify-between rounded-lg px-2 py-1.5 font-bold',
              Math.abs(variance) < 1 ? 'bg-ok/10 text-ok' : variance < 0 ? 'bg-bad/10 text-bad' : 'bg-warn/10 text-warn')}>
              <span>{Math.abs(variance) < 1 ? 'Balanced' : variance < 0 ? 'Short' : 'Excess'}</span>
              <span className="font-mono">{money(Math.abs(variance), s.currency)}</span>
            </div>
          </div>
          <button className="btn-soft mt-3 w-full" onClick={() => { toast('Day closed & counted — Z-report ready'); report(); }}>
            <CalendarCheck size={15} /> Close the day
          </button>
        </Card>

        <div className="space-y-3">
          <Card>
            <SectionTitle title="Payment mix" />
            {byMode.length === 0 ? <p className="text-xs text-ink3">No sales for this day.</p> : byMode.map(([m, v]) => (
              <div key={m} className="mb-2">
                <div className="flex justify-between text-xs"><span className="capitalize text-ink2">{m}</span><span className="font-mono text-ink">{money(v, s.currency)}</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface2">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${gross ? (v / gross) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </Card>

          <Card>
            <SectionTitle title="Hourly sales" sub={`Peak hour: ${peakHour}:00 – ${peakHour + 1}:00`} />
            <div className="flex h-24 items-end gap-[2px]">
              {byHour.map((v, i) => (
                <div key={i} className="flex-1 rounded-t bg-brand/70" style={{ height: `${Math.max(2, (v / Math.max(...byHour, 1)) * 100)}%` }} title={`${i}:00 · ${money(v, s.currency)}`} />
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle title="Staff performance" />
            {byStaff.length === 0 ? <p className="text-xs text-ink3">No staff data.</p> : byStaff.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between border-b border-line py-1.5 text-xs last:border-0">
                <span className="text-ink2">{k}</span>
                <span className="text-ink3">{v.n} bills</span>
                <span className="font-mono text-ink">{money(v.v, s.currency)}</span>
              </div>
            ))}
          </Card>

          <Card>
            <SectionTitle title="Top sellers today" />
            {topItems.length === 0 ? <p className="text-xs text-ink3">Nothing sold yet.</p> : topItems.map(([k, v], i) => (
              <div key={k} className="flex items-center gap-2 border-b border-line py-1.5 text-xs last:border-0">
                <Badge tone={i === 0 ? 'ok' : 'muted'}>{i + 1}</Badge>
                <span className="min-w-0 flex-1 truncate text-ink2">{k}</span>
                <span className="text-ink3">{num(v.qty)}</span>
                <span className="font-mono text-ink">{money(v.v, s.currency)}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {shifts.length > 0 && (
        <Card>
          <SectionTitle title="Recent shifts" sub={`${staff.length} staff on record`} />
          {shifts.slice(0, 5).map((sh: any) => (
            <div key={sh.id} className="flex items-center justify-between border-b border-line py-1.5 text-xs last:border-0">
              <span className="text-ink2">{sh.staffName || 'Staff'}</span>
              <span className="text-ink3">{dt(sh.openedAt)}{sh.closedAt ? ' → ' + tOnly(sh.closedAt) : ' · open'}</span>
              <span className="font-mono text-ink"><Coins size={12} className="mr-1 inline" />{money(sh.closingCash ?? sh.openingCash, s.currency)}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

const Row = ({ k, v, bold }: { k: string; v: string; bold?: boolean }) => (
  <div className={cx('flex justify-between', bold ? 'font-bold text-ink' : 'text-ink2')}>
    <span>{k}</span><span className="font-mono">{v}</span>
  </div>
);
