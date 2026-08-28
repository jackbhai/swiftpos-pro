import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, TrendingUp, TrendingDown, AlertTriangle, PiggyBank, Users, Package, Percent,
  ShieldCheck, Clock, ArrowRight,
} from 'lucide-react';
import { useSales, useCustomers, useExpenses } from '@/hooks/useData';
import { useCatalog } from '@/hooks/useCatalog';
import { money, moneyShort, num, pct, ago, cx } from '@/lib/format';
import { Card, Stat, Badge, SectionTitle, Empty } from '@/components/ui';
import { useSettings } from '@/store/settings';
import { stockState, expiryState } from '@/lib/calc';
import type { Sale, Customer } from '@/db/types';

interface Insight {
  id: string; severity: 'critical' | 'warn' | 'good' | 'info';
  title: string; body: string; action?: { label: string; to: string }; icon: ReactNode; impact?: string;
}

/** Insights — a rules engine that reads your data and tells you what to do next. */
export default function Insights() {
  const sales = useSales() || [];
  const customers = useCustomers() || [];
  const expenses = useExpenses() || [];
  const { products, loading } = useCatalog();
  const s = useSettings();

  const data = useMemo(() => {
    const now = Date.now();
    const d30 = sales.filter((x: Sale) => x.ts > now - 30 * 864e5 && x.status !== 'void');
    const dPrev = sales.filter((x: Sale) => x.ts <= now - 30 * 864e5 && x.ts > now - 60 * 864e5 && x.status !== 'void');
    const rev30 = d30.reduce((t: number, x: Sale) => t + x.total, 0);
    const revPrev = dPrev.reduce((t: number, x: Sale) => t + x.total, 0);
    const profit30 = d30.reduce((t: number, x: Sale) => t + x.profit, 0);
    const exp30 = expenses.filter((e: any) => e.ts > now - 30 * 864e5).reduce((t: number, e: any) => t + e.amount, 0);
    const growth = revPrev ? ((rev30 - revPrev) / revPrev) * 100 : 0;
    const margin = rev30 ? (profit30 / rev30) * 100 : 0;
    const avgTicket = d30.length ? rev30 / d30.length : 0;
    const discount30 = d30.reduce((t: number, x: Sale) => t + x.billDiscount + x.itemDiscount + x.couponValue, 0);
    const refunds30 = d30.reduce((t: number, x: Sale) => t + (x.refundedAmount || 0), 0);

    const out = products.filter((p: any) => p.active && stockState(p) === 'out');
    const low = products.filter((p: any) => p.active && stockState(p) === 'low');
    const expiring = products.filter((p: any) => expiryState(p, s.expiryAlertDays) === 'soon');
    const expired = products.filter((p: any) => expiryState(p, s.expiryAlertDays) === 'expired');
    const stockValue = products.reduce((t: number, p: any) => t + p.cost * p.stock, 0);
    const negMargin = products.filter((p: any) => p.active && p.price > 0 && p.price < p.cost);

    const soldIds = new Set<string>();
    d30.forEach((x: Sale) => x.lines.forEach((l) => soldIds.add(l.productId)));
    const dead = products.filter((p: any) => p.active && p.stock > 0 && !soldIds.has(p.id));
    const deadValue = dead.reduce((t: number, p: any) => t + p.cost * p.stock, 0);

    const dues = customers.reduce((t: number, c: Customer) => t + Math.max(0, c.credit), 0);
    const overLimit = customers.filter((c: Customer) => c.creditLimit && c.credit > c.creditLimit);
    const lapsed = customers.filter((c: Customer) => c.lastVisit && now - c.lastVisit > 45 * 864e5);
    const repeatRate = customers.length ? (customers.filter((c: Customer) => c.visits > 1).length / customers.length) * 100 : 0;

    const hours = Array(24).fill(0);
    d30.forEach((x: Sale) => { hours[new Date(x.ts).getHours()] += x.total; });
    const peak = hours.indexOf(Math.max(...hours));
    const dow = Array(7).fill(0);
    d30.forEach((x: Sale) => { dow[new Date(x.ts).getDay()] += x.total; });
    const bestDow = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dow.indexOf(Math.max(...dow))];

    return { d30, rev30, revPrev, profit30, exp30, growth, margin, avgTicket, discount30, refunds30, out, low, expiring, expired, stockValue, negMargin, dead, deadValue, dues, overLimit, lapsed, repeatRate, peak, bestDow };
  }, [sales, products, customers, expenses, s.expiryAlertDays]);

  const insights = useMemo<Insight[]>(() => {
    const L: Insight[] = [];
    const d = data;

    if (d.out.length) L.push({ id: 'out', severity: 'critical', icon: <Package size={16} />, title: `${num(d.out.length)} items are out of stock`, body: 'Har out-of-stock item ek lost sale hai. Sabse pehle fast movers reorder kijiye.', action: { label: 'Reorder plan', to: '/reports' }, impact: 'lost sales' });
    if (d.expired.length) L.push({ id: 'expired', severity: 'critical', icon: <AlertTriangle size={16} />, title: `${num(d.expired.length)} expired items still in stock`, body: 'Inhe turant shelf se hataiye — legal risk aur customer trust dono ka sawaal hai.', action: { label: 'Open inventory', to: '/inventory' }, impact: 'compliance risk' });
    if (d.negMargin.length) L.push({ id: 'neg', severity: 'critical', icon: <TrendingDown size={16} />, title: `${num(d.negMargin.length)} products sell below cost`, body: 'Selling price cost se kam hai — har sale par nuksaan. Bulk edit se price fix kar dijiye.', action: { label: 'Bulk edit prices', to: '/inventory' }, impact: 'direct loss' });
    if (d.overLimit.length) L.push({ id: 'limit', severity: 'warn', icon: <ShieldCheck size={16} />, title: `${num(d.overLimit.length)} customers crossed their credit limit`, body: 'Naya udhaar rokiye aur collection call kijiye.', action: { label: 'Open khata', to: '/ledger' }, impact: money(d.overLimit.reduce((t, c) => t + c.credit, 0), s.currency) });
    if (d.dues > 0) L.push({ id: 'dues', severity: d.dues > d.rev30 * 0.2 ? 'warn' : 'info', icon: <PiggyBank size={16} />, title: `${money(d.dues, s.currency)} udhaar pending hai`, body: 'Ye paisa aapke business me stuck hai. Bulk WhatsApp reminder bhej dijiye.', action: { label: 'Send reminders', to: '/reminders' }, impact: 'cash flow' });
    if (d.expiring.length) L.push({ id: 'exp', severity: 'warn', icon: <Clock size={16} />, title: `${num(d.expiring.length)} items expiring soon`, body: 'Combo offer ya discount lagakar inhe pehle clear kijiye.', action: { label: 'Create offer', to: '/offers' } });
    if (d.deadValue > 0) L.push({ id: 'dead', severity: 'warn', icon: <Package size={16} />, title: `${moneyShort(d.deadValue, s.currency)} dead stock me phansa hai`, body: `${num(d.dead.length)} items 30 din me ek baar bhi nahi bike. Clearance ya vendor return sochiye.`, action: { label: 'ABC analysis', to: '/reports' }, impact: moneyShort(d.deadValue, s.currency) });
    if (d.low.length) L.push({ id: 'low', severity: 'warn', icon: <Package size={16} />, title: `${num(d.low.length)} items below low-stock level`, body: 'Purchase order banaiye taaki weekend rush miss na ho.', action: { label: 'New PO', to: '/purchases' } });
    if (d.rev30 && d.discount30 / d.rev30 > 0.08) L.push({ id: 'disc', severity: 'warn', icon: <Percent size={16} />, title: `Discounts are ${pct((d.discount30 / d.rev30) * 100)} of sales`, body: 'Margin par asar pad raha hai. Cashier discount cap set kijiye.', action: { label: 'Security settings', to: '/settings?tab=security' }, impact: money(d.discount30, s.currency) });
    if (d.margin && d.margin < 15) L.push({ id: 'margin', severity: 'warn', icon: <TrendingDown size={16} />, title: `Gross margin only ${pct(d.margin)}`, body: 'Top sellers ki pricing review kijiye — 5% margin badhne se profit double ho sakta hai.', action: { label: 'Profit report', to: '/reports' } });
    if (d.growth > 5) L.push({ id: 'growth', severity: 'good', icon: <TrendingUp size={16} />, title: `Sales up ${pct(d.growth)} vs last month`, body: `Best day ${d.bestDow} hai aur peak hour ${d.peak}:00 — us waqt extra staff rakhiye.`, action: { label: 'Forecast', to: '/reports' } });
    if (d.growth < -5) L.push({ id: 'drop', severity: 'critical', icon: <TrendingDown size={16} />, title: `Sales down ${pct(Math.abs(d.growth))} vs last month`, body: 'Lapsed customers ko win-back message bhejiye aur top items ka stock check kijiye.', action: { label: 'Win-back campaign', to: '/reminders' } });
    if (d.lapsed.length) L.push({ id: 'lapsed', severity: 'info', icon: <Users size={16} />, title: `${num(d.lapsed.length)} customers haven't returned in 45 days`, body: 'Ek offer message inme se 10-20% wapas laa sakta hai.', action: { label: 'Win-back', to: '/reminders' } });
    if (d.repeatRate) L.push({ id: 'repeat', severity: d.repeatRate > 40 ? 'good' : 'info', icon: <Users size={16} />, title: `Repeat rate is ${pct(d.repeatRate)}`, body: d.repeatRate > 40 ? 'Bahut accha — loyalty program isi tarah chalne dijiye.' : 'Loyalty points ya subscription plan se repeat badhaiye.', action: { label: 'Subscriptions', to: '/subscriptions' } });
    if (d.rev30 && d.refunds30 / d.rev30 > 0.03) L.push({ id: 'ref', severity: 'warn', icon: <AlertTriangle size={16} />, title: `Refunds are ${pct((d.refunds30 / d.rev30) * 100)} of sales`, body: 'Return reasons check kijiye — quality ya wrong-billing issue ho sakta hai.', action: { label: 'Returns desk', to: '/returns' } });
    if (d.exp30 > d.profit30) L.push({ id: 'exp', severity: 'critical', icon: <TrendingDown size={16} />, title: 'Expenses are higher than gross profit', body: 'Is mahine net loss ban raha hai. Fixed costs aur discount policy review kijiye.', action: { label: 'P&L', to: '/reports' }, impact: money(d.exp30 - d.profit30, s.currency) });
    if (!s.appLockPin) L.push({ id: 'pin', severity: 'info', icon: <ShieldCheck size={16} />, title: 'App lock PIN is not set', body: 'Counter chhodte waqt app lock karne ke liye PIN set kijiye.', action: { label: 'Set PIN', to: '/settings?tab=security' } });
    if (d.avgTicket) L.push({ id: 'ticket', severity: 'info', icon: <Sparkles size={16} />, title: `Average bill is ${money(d.avgTicket, s.currency)}`, body: 'Basket affinity report se combo banaiye — average bill 10-15% tak badh sakta hai.', action: { label: 'Basket affinity', to: '/reports' } });

    const order = { critical: 0, warn: 1, good: 2, info: 3 };
    return L.sort((a, b) => order[a.severity] - order[b.severity]);
  }, [data, s]);

  const score = useMemo(() => {
    let v = 100;
    v -= Math.min(20, data.out.length * 0.5);
    v -= Math.min(15, data.expired.length * 2);
    v -= Math.min(10, data.negMargin.length);
    v -= data.margin < 15 ? 10 : 0;
    v -= data.growth < -5 ? 12 : 0;
    v -= data.rev30 && data.dues > data.rev30 * 0.2 ? 10 : 0;
    v -= data.rev30 && data.discount30 / data.rev30 > 0.08 ? 6 : 0;
    v -= data.exp30 > data.profit30 ? 12 : 0;
    v += data.growth > 5 ? 5 : 0;
    return Math.max(5, Math.min(100, Math.round(v)));
  }, [data]);

  const tone = score >= 80 ? 'ok' : score >= 60 ? 'warn' : 'bad';

  if (loading) return <div className="grid h-64 place-items-center text-ink3">Analysing your business…</div>;

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative grid h-24 w-24 shrink-0 place-items-center">
            <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="9" className="text-surface2" />
              <circle cx="50" cy="50" r="42" fill="none" strokeWidth="9" strokeLinecap="round"
                stroke={score >= 80 ? '#34d399' : score >= 60 ? '#fbbf24' : '#fb7185'}
                strokeDasharray={`${(score / 100) * 264} 264`} />
            </svg>
            <div className="text-center">
              <p className={cx('text-2xl font-extrabold', tone === 'ok' ? 'text-ok' : tone === 'warn' ? 'text-warn' : 'text-bad')}>{score}</p>
              <p className="text-[9px] uppercase tracking-wide text-ink3">health</p>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <SectionTitle title="Business insights" sub="Aapke data se nikale gaye actionable suggestions — sab kuch device par, private" />
            <div className="flex flex-wrap gap-2">
              <Badge tone="bad">{insights.filter((i) => i.severity === 'critical').length} critical</Badge>
              <Badge tone="warn">{insights.filter((i) => i.severity === 'warn').length} warnings</Badge>
              <Badge tone="ok">{insights.filter((i) => i.severity === 'good').length} wins</Badge>
              <Badge>{insights.filter((i) => i.severity === 'info').length} ideas</Badge>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Revenue (30d)" value={moneyShort(data.rev30, s.currency)} tone="brand" sub={`${data.growth >= 0 ? '+' : ''}${data.growth.toFixed(1)}% vs prev`} icon={<TrendingUp size={16} />} />
        <Stat label="Gross margin" value={pct(data.margin)} tone={data.margin > 25 ? 'ok' : 'warn'} icon={<Percent size={16} />} />
        <Stat label="Stock value" value={moneyShort(data.stockValue, s.currency)} tone="warn" icon={<Package size={16} />} />
        <Stat label="Money on udhaar" value={moneyShort(data.dues, s.currency)} tone="bad" icon={<PiggyBank size={16} />} />
      </div>

      {insights.length === 0 ? <Empty title="Not enough data yet" sub="Kuch bills banaiye, phir yahan insights aayenge." icon={<Sparkles size={22} />} /> : (
        <div className="grid gap-3 lg:grid-cols-2">
          {insights.map((i) => (
            <Card key={i.id} className={cx('border-l-4',
              i.severity === 'critical' ? 'border-l-bad' : i.severity === 'warn' ? 'border-l-warn' : i.severity === 'good' ? 'border-l-ok' : 'border-l-brand')}>
              <div className="flex items-start gap-2">
                <span className={cx('mt-0.5 rounded-lg p-1.5',
                  i.severity === 'critical' ? 'bg-bad/10 text-bad' : i.severity === 'warn' ? 'bg-warn/10 text-warn' : i.severity === 'good' ? 'bg-ok/10 text-ok' : 'bg-brand/10 text-brand')}>
                  {i.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink">{i.title}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-ink2">{i.body}</p>
                  <div className="mt-2 flex items-center gap-2">
                    {i.action && <Link to={i.action.to} className="btn-soft px-2 py-1 text-xs">{i.action.label} <ArrowRight size={12} /></Link>}
                    {i.impact && <span className="text-[11px] text-ink3">impact: {i.impact}</span>}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <SectionTitle title="Quick facts" />
        <div className="grid gap-2 text-[12px] text-ink2 sm:grid-cols-2">
          <p>• Peak selling hour: <b className="text-ink">{data.peak}:00 – {data.peak + 1}:00</b></p>
          <p>• Strongest weekday: <b className="text-ink">{data.bestDow}</b></p>
          <p>• Average bill: <b className="text-ink">{money(data.avgTicket, s.currency)}</b></p>
          <p>• Repeat customer rate: <b className="text-ink">{pct(data.repeatRate)}</b></p>
          <p>• Bills in last 30 days: <b className="text-ink">{num(data.d30.length)}</b></p>
          <p>• Catalogue size: <b className="text-ink">{num(products.length)}</b> products</p>
          {customers[0]?.lastVisit && <p>• Last customer visit: <b className="text-ink">{ago(Math.max(...customers.map((c: Customer) => c.lastVisit || 0)))}</b></p>}
          <p>• Expenses (30d): <b className="text-ink">{money(data.exp30, s.currency)}</b></p>
        </div>
      </Card>
    </div>
  );
}
