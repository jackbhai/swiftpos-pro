import { useMemo, useState } from 'react';
import { FlaskConical, TrendingUp, Percent, Calculator, Target as TargetIcon } from 'lucide-react';
import { useSales } from '@/hooks/useData';
import { useCatalog } from '@/hooks/useCatalog';
import { useSettings } from '@/store/settings';
import { money, moneyShort, num, pct, cx } from '@/lib/format';
import { Card, Stat, Input, SectionTitle, Tabs, Badge } from '@/components/ui';
import type { Sale } from '@/db/types';

/** What-if lab — simulate price changes, discounts, costs and breakeven before you commit. */
export default function Simulator() {
  const sales = useSales() || [];
  const { products } = useCatalog();
  const s = useSettings();
  const [tab, setTab] = useState<'whatif' | 'margin' | 'breakeven' | 'discount'>('whatif');

  const last30 = useMemo(() => {
    const from = Date.now() - 30 * 864e5;
    return (sales as Sale[]).filter((x) => x.ts >= from && x.status !== 'void');
  }, [sales]);
  const revenue = last30.reduce((t, x) => t + x.total, 0);
  const profit = last30.reduce((t, x) => t + x.profit, 0);
  const bills = last30.length;
  const atv = bills ? revenue / bills : 0;
  const cogs = revenue - profit;

  // What-if levers
  const [priceUp, setPriceUp] = useState(0);
  const [volumeChange, setVolumeChange] = useState(0);
  const [costChange, setCostChange] = useState(0);
  const [fixedCost, setFixedCost] = useState(0);

  const sim = useMemo(() => {
    const vol = 1 + volumeChange / 100;
    const newRevenue = revenue * (1 + priceUp / 100) * vol;
    const newCogs = cogs * (1 + costChange / 100) * vol;
    const newProfit = newRevenue - newCogs - fixedCost;
    return { newRevenue, newCogs, newProfit, delta: newProfit - (profit - fixedCost) };
  }, [revenue, cogs, profit, priceUp, volumeChange, costChange, fixedCost]);

  // Margin calculator
  const [cost, setCost] = useState(100);
  const [sell, setSell] = useState(150);
  const [gst, setGst] = useState(s.defaultGst ?? 5);
  const [wantMargin, setWantMargin] = useState(30);
  const base = s.taxInclusive ? sell / (1 + gst / 100) : sell;
  const marginRs = base - cost;
  const marginPct = base > 0 ? (marginRs / base) * 100 : 0;
  const markupPct = cost > 0 ? (marginRs / cost) * 100 : 0;
  const priceForMargin = wantMargin < 100 ? (cost / (1 - wantMargin / 100)) * (s.taxInclusive ? 1 + gst / 100 : 1) : 0;

  // Breakeven
  const [monthlyFixed, setMonthlyFixed] = useState(60000);
  const gm = revenue > 0 ? profit / revenue : 0.25;
  const beRevenue = gm > 0 ? monthlyFixed / gm : 0;
  const beBills = atv > 0 ? beRevenue / atv : 0;
  const beDaily = beRevenue / 30;

  // Discount impact
  const [disc, setDisc] = useState(10);
  const needExtra = gm > disc / 100 ? (disc / 100) / (gm - disc / 100) * 100 : Infinity;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Revenue (30d)" value={moneyShort(revenue, s.currency)} tone="brand" icon={<TrendingUp size={16} />} />
        <Stat label="Profit (30d)" value={moneyShort(profit, s.currency)} tone="ok" />
        <Stat label="Gross margin" value={pct(gm * 100)} tone="warn" icon={<Percent size={16} />} />
        <Stat label="Avg bill" value={money(atv, s.currency)} tone="ok" sub={`${num(bills)} bills`} />
      </div>

      <Card>
        <SectionTitle title="What-if lab" sub="Decision lene se pehle numbers try kar ke dekhiye — sab kuch aapke asli 30-din ke data par" />
        <Tabs active={tab} onChange={(t) => setTab(t as any)} tabs={[
          { id: 'whatif', label: 'Price / volume' }, { id: 'margin', label: 'Margin calc' },
          { id: 'breakeven', label: 'Breakeven' }, { id: 'discount', label: 'Discount impact' },
        ]} />
      </Card>

      {tab === 'whatif' && (
        <Card>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <Slider label="Prices change by" value={priceUp} set={setPriceUp} min={-30} max={30} suffix="%" />
              <Slider label="Sales volume changes by" value={volumeChange} set={setVolumeChange} min={-50} max={100} suffix="%" />
              <Slider label="Purchase cost changes by" value={costChange} set={setCostChange} min={-30} max={50} suffix="%" />
              <label className="block text-xs text-ink3">Extra fixed cost per month
                <Input className="mt-1" inputMode="numeric" value={fixedCost} onChange={(e) => setFixedCost(+e.target.value || 0)} /></label>
            </div>
            <div className="space-y-2">
              <Row k="Revenue" a={revenue} b={sim.newRevenue} cur={s.currency} />
              <Row k="Cost of goods" a={cogs} b={sim.newCogs} cur={s.currency} invert />
              <Row k="Profit" a={profit} b={sim.newProfit} cur={s.currency} big />
              <div className={cx('rounded-xl border p-3 text-xs', sim.delta >= 0 ? 'border-ok/30 bg-ok/10 text-ok' : 'border-bad/30 bg-bad/10 text-bad')}>
                {sim.delta >= 0
                  ? `✅ Is scenario me mahine ka profit ${money(sim.delta, s.currency)} badhega.`
                  : `⚠️ Is scenario me mahine ka profit ${money(Math.abs(sim.delta), s.currency)} ghatega.`}
                <div className="mt-1 text-ink3">New margin: {pct(sim.newRevenue > 0 ? (sim.newProfit / sim.newRevenue) * 100 : 0)}</div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button className="btn-soft px-2 py-1 text-[11px]" onClick={() => { setPriceUp(5); setVolumeChange(-5); setCostChange(0); }}>+5% price, −5% volume</button>
                <button className="btn-soft px-2 py-1 text-[11px]" onClick={() => { setPriceUp(0); setVolumeChange(20); setCostChange(0); }}>Push volume +20%</button>
                <button className="btn-soft px-2 py-1 text-[11px]" onClick={() => { setPriceUp(0); setVolumeChange(0); setCostChange(10); }}>Supplier hikes 10%</button>
                <button className="btn-soft px-2 py-1 text-[11px]" onClick={() => { setPriceUp(0); setVolumeChange(0); setCostChange(0); setFixedCost(0); }}>Reset</button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {tab === 'margin' && (
        <Card>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <label className="block text-xs text-ink3">Cost price<Input className="mt-1" inputMode="decimal" value={cost} onChange={(e) => setCost(+e.target.value || 0)} /></label>
              <label className="block text-xs text-ink3">Selling price ({s.taxInclusive ? 'tax inclusive' : 'tax extra'})<Input className="mt-1" inputMode="decimal" value={sell} onChange={(e) => setSell(+e.target.value || 0)} /></label>
              <label className="block text-xs text-ink3">GST %<Input className="mt-1" inputMode="decimal" value={gst} onChange={(e) => setGst(+e.target.value || 0)} /></label>
              <label className="block text-xs text-ink3">Target margin %<Input className="mt-1" inputMode="decimal" value={wantMargin} onChange={(e) => setWantMargin(+e.target.value || 0)} /></label>
            </div>
            <div className="space-y-2 text-sm">
              <KV k="Base price (ex-GST)" v={money(base, s.currency)} />
              <KV k="Profit per unit" v={money(marginRs, s.currency)} tone={marginRs >= 0 ? 'ok' : 'bad'} />
              <KV k="Margin on selling price" v={pct(marginPct)} tone={marginPct >= 20 ? 'ok' : marginPct >= 8 ? 'warn' : 'bad'} />
              <KV k="Markup on cost" v={pct(markupPct)} />
              <KV k="GST amount" v={money(s.taxInclusive ? sell - base : (sell * gst) / 100, s.currency)} />
              <KV k={`Price needed for ${wantMargin}% margin`} v={money(priceForMargin, s.currency)} tone="brand" />
              <div className="rounded-xl border border-line bg-surface2 p-3 text-xs text-ink3">
                Catalogue average margin: <b className="text-ink">{pct(avgMargin(products))}</b> · items below cost: <b className="text-bad">{num((products as any[]).filter((p) => p.price > 0 && p.price < p.cost).length)}</b>
              </div>
            </div>
          </div>
        </Card>
      )}

      {tab === 'breakeven' && (
        <Card>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <label className="block text-xs text-ink3">Monthly fixed costs (rent, salary, bijli…)
                <Input className="mt-1" inputMode="numeric" value={monthlyFixed} onChange={(e) => setMonthlyFixed(+e.target.value || 0)} /></label>
              <div className="flex flex-wrap gap-1.5">
                {[30000, 60000, 100000, 200000].map((v) => <button key={v} className="btn-soft px-2 py-1 text-[11px]" onClick={() => setMonthlyFixed(v)}>{moneyShort(v, s.currency)}</button>)}
              </div>
              <p className="text-[11px] text-ink3">Gross margin {pct(gm * 100)} aapke pichle 30 din ke asli bills se liya gaya hai.</p>
            </div>
            <div className="space-y-2 text-sm">
              <KV k="Breakeven revenue / month" v={money(beRevenue, s.currency)} tone="brand" />
              <KV k="Breakeven per day" v={money(beDaily, s.currency)} />
              <KV k="Bills needed / month" v={num(Math.ceil(beBills))} />
              <KV k="Bills needed / day" v={num(Math.ceil(beBills / 30))} />
              <KV k="Current monthly revenue" v={money(revenue, s.currency)} tone={revenue >= beRevenue ? 'ok' : 'bad'} />
              <div className={cx('rounded-xl border p-3 text-xs', revenue >= beRevenue ? 'border-ok/30 bg-ok/10 text-ok' : 'border-bad/30 bg-bad/10 text-bad')}>
                {revenue >= beRevenue
                  ? `✅ Aap breakeven se ${money(revenue - beRevenue, s.currency)} upar hain.`
                  : `⚠️ Breakeven ke liye ${money(beRevenue - revenue, s.currency)} aur sales chahiye (${pct(((beRevenue - revenue) / Math.max(1, revenue)) * 100)} growth).`}
              </div>
            </div>
          </div>
        </Card>
      )}

      {tab === 'discount' && (
        <Card>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <Slider label="Discount you want to give" value={disc} set={setDisc} min={1} max={50} suffix="%" />
              <div className="flex flex-wrap gap-1.5">
                {[5, 10, 15, 20, 25].map((d) => <button key={d} className="btn-soft px-2 py-1 text-[11px]" onClick={() => setDisc(d)}>{d}%</button>)}
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <KV k="Your gross margin" v={pct(gm * 100)} />
              <KV k="Extra sales needed to stay even" v={Number.isFinite(needExtra) ? pct(needExtra) : 'Not possible'} tone={Number.isFinite(needExtra) && needExtra < 50 ? 'warn' : 'bad'} />
              <KV k="Profit per ₹100 bill before" v={money(gm * 100, s.currency)} />
              <KV k="Profit per ₹100 bill after" v={money(gm * 100 - disc, s.currency)} tone={gm * 100 - disc > 0 ? 'warn' : 'bad'} />
              <div className="rounded-xl border border-warn/30 bg-warn/10 p-3 text-xs text-warn">
                {Number.isFinite(needExtra)
                  ? `${disc}% discount dene par utna hi profit kamane ke liye sales ${pct(needExtra)} badhani padengi.`
                  : `${disc}% discount aapke margin se zyada hai — har bill par nuksaan hoga.`}
              </div>
              <Badge tone="muted"><TargetIcon size={10} /> Tip: discount ki jagah bundle ya loyalty points behtar rehte hain</Badge>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

const avgMargin = (products: any[]) => {
  const rows = products.filter((p) => p.price > 0 && p.cost > 0);
  if (!rows.length) return 0;
  return rows.reduce((t, p) => t + ((p.price - p.cost) / p.price) * 100, 0) / rows.length;
};

function Slider({ label, value, set, min, max, suffix }: { label: string; value: number; set: (n: number) => void; min: number; max: number; suffix: string }) {
  return (
    <label className="block text-xs text-ink3">
      <span className="flex justify-between">{label} <b className="font-mono text-ink">{value > 0 ? '+' : ''}{value}{suffix}</b></span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => set(+e.target.value)} className="mt-1 w-full accent-[color:var(--brand,#22d3a5)]" />
    </label>
  );
}
const KV = ({ k, v, tone }: { k: string; v: string; tone?: string }) => (
  <div className="flex items-center justify-between border-b border-line py-1.5 last:border-0">
    <span className="text-xs text-ink3">{k}</span>
    <span className={cx('font-mono text-sm font-bold', tone === 'ok' ? 'text-ok' : tone === 'bad' ? 'text-bad' : tone === 'warn' ? 'text-warn' : tone === 'brand' ? 'text-brand' : 'text-ink')}>{v}</span>
  </div>
);
const Row = ({ k, a, b, cur, big, invert }: { k: string; a: number; b: number; cur: string; big?: boolean; invert?: boolean }) => {
  const up = b >= a;
  const good = invert ? !up : up;
  return (
    <div className="flex items-center justify-between rounded-xl border border-line px-3 py-2">
      <span className="text-xs text-ink3">{k}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono text-xs text-ink3 line-through">{money(a, cur)}</span>
        <span className={cx('font-mono font-bold', big ? 'text-lg' : 'text-sm', good ? 'text-ok' : 'text-bad')}>{money(b, cur)}</span>
      </span>
    </div>
  );
};
