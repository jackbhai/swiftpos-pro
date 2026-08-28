import { useMemo, useState } from 'react';
import { Wand2, Truck, Download, ShoppingCart, Sparkles, MessageCircle, RefreshCw } from 'lucide-react';
import { useSales, useVendors, usePOs } from '@/hooks/useData';
import { useCatalog } from '@/hooks/useCatalog';
import { db, uid, logActivity } from '@/db/db';
import { money, num, moneyShort, cx } from '@/lib/format';
import { downloadCSV } from '@/lib/csv';
import { Card, Stat, Empty, Badge, Input, Select, SectionTitle, Toggle } from '@/components/ui';
import { useSettings } from '@/store/settings';
import { toast } from '@/store/ui';
import { waLink } from '@/lib/receipt';
import type { Sale, PurchaseOrder, POItem } from '@/db/types';

interface Sugg {
  id: string; name: string; vendorId?: string; vendorName: string; stock: number; unit: string;
  cost: number; sold: number; perDay: number; daysLeft: number; suggest: number; value: number; reason: string;
}

/** Smart reorder — analyses sales velocity and builds one-click purchase orders per vendor. */
export default function AutoPO() {
  const sales = useSales() || [];
  const vendors = useVendors() || [];
  const pos = usePOs() || [];
  const { products } = useCatalog();
  const s = useSettings();

  const [days, setDays] = useState(30);
  const [cover, setCover] = useState(21);
  const [onlyLow, setOnlyLow] = useState(true);
  const [vendorFilter, setVendorFilter] = useState('');
  const [skip, setSkip] = useState<Record<string, boolean>>({});
  const [qtyOverride, setQtyOverride] = useState<Record<string, number>>({});

  const since = Date.now() - days * 864e5;
  const soldMap = useMemo(() => {
    const m = new Map<string, number>();
    sales.filter((x: Sale) => x.ts >= since && x.status !== 'void').forEach((x: Sale) =>
      x.lines.forEach((l) => m.set(l.productId, (m.get(l.productId) || 0) + l.qty)));
    return m;
  }, [sales, since]);

  const suggestions = useMemo<Sugg[]>(() => {
    const out: Sugg[] = [];
    for (const p of products as any[]) {
      if (p.trackStock === false) continue;
      const sold = soldMap.get(p.id) || 0;
      const perDay = sold / days;
      const daysLeft = perDay > 0 ? p.stock / perDay : p.stock > 0 ? 999 : 0;
      const need = Math.max(0, Math.ceil(perDay * cover + (p.lowStock || 0) - p.stock));
      let reason = '';
      if (p.stock <= 0 && sold > 0) reason = 'Out of stock & selling';
      else if (p.stock <= (p.lowStock || 0)) reason = 'Below low-stock level';
      else if (daysLeft < cover && perDay > 0) reason = `Only ${daysLeft.toFixed(0)} days cover left`;
      if (!reason && onlyLow) continue;
      const suggest = Math.max(need, p.stock <= 0 && sold > 0 ? Math.ceil(perDay * cover) || 1 : 0);
      if (suggest <= 0) continue;
      const v = vendors.find((x: any) => x.id === p.vendorId);
      out.push({
        id: p.id, name: p.name, vendorId: p.vendorId, vendorName: v?.name || 'Unassigned vendor',
        stock: p.stock, unit: p.unit, cost: p.cost || 0, sold, perDay, daysLeft,
        suggest, value: suggest * (p.cost || 0), reason: reason || 'Top-up',
      });
    }
    return out.sort((a, b) => b.value - a.value);
  }, [products, soldMap, days, cover, onlyLow, vendors]);

  const active = suggestions.filter((x) => !skip[x.id] && (!vendorFilter || (x.vendorId || 'none') === vendorFilter));
  const qtyOf = (x: Sugg) => (qtyOverride[x.id] ?? x.suggest);
  const totalValue = active.reduce((t, x) => t + qtyOf(x) * x.cost, 0);

  const groups = useMemo(() => {
    const m = new Map<string, Sugg[]>();
    active.forEach((x) => { const k = x.vendorId || 'none'; m.set(k, [...(m.get(k) || []), x]); });
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [active]);

  const createPO = async (key: string, rows: Sugg[]) => {
    const vendor = vendors.find((v: any) => v.id === key);
    const items: POItem[] = rows.map((r) => ({ productId: r.id, name: r.name, qty: qtyOf(r), cost: r.cost, received: 0 }));
    const total = items.reduce((t, i) => t + i.qty * i.cost, 0);
    const po: PurchaseOrder = {
      id: uid('po_'), poNo: 'PO-' + String(pos.length + 1).padStart(4, '0') + '-' + Math.random().toString(36).slice(2, 5).toUpperCase(),
      vendorId: vendor?.id || '', vendorName: vendor?.name || 'Unassigned vendor', items,
      status: 'draft', total: +total.toFixed(2), paid: 0, createdAt: Date.now(), note: `Auto-generated from ${days}-day sales velocity (${cover}-day cover)`,
    };
    await db.purchaseOrders.add(po);
    await logActivity('po', `Auto PO ${po.poNo} · ${items.length} items · ${money(po.total, s.currency)}`);
    setSkip((sk) => ({ ...sk, ...Object.fromEntries(rows.map((r) => [r.id, true])) }));
    toast(`PO created · ${items.length} items · ${money(po.total, s.currency)}`);
  };

  const createAll = async () => { for (const [k, rows] of groups) await createPO(k, rows); };

  const waOrder = (vendorName: string, rows: Sugg[], phone?: string) => {
    const text = [`*Order from ${s.shopName}*`, '', ...rows.map((r, i) => `${i + 1}. ${r.name} — ${qtyOf(r)} ${r.unit}`), '',
      `Total items: ${rows.length}`, 'Kripya confirm kijiye. Dhanyavaad!'].join('\n');
    window.open(waLink(phone || '', text), '_blank');
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Reorder suggestions" value={num(active.length)} tone="brand" icon={<Sparkles size={16} />} />
        <Stat label="Purchase value" value={moneyShort(totalValue, s.currency)} tone="warn" icon={<ShoppingCart size={16} />} />
        <Stat label="Vendors to order from" value={num(groups.length)} tone="ok" icon={<Truck size={16} />} />
        <Stat label="Out of stock & selling" value={num(suggestions.filter((x) => x.stock <= 0 && x.sold > 0).length)} tone="bad" />
      </div>

      <Card>
        <SectionTitle title="Smart auto reorder" sub="Sales speed dekh kar app khud batata hai kya, kitna aur kis vendor se mangwana hai"
          right={<div className="flex flex-wrap gap-2">
            <button className="btn-soft" onClick={() => { setSkip({}); setQtyOverride({}); toast('Suggestions refreshed'); }}><RefreshCw size={15} /> Reset</button>
            <button className="btn-soft" onClick={() => downloadCSV('reorder-plan.csv', active.map((x) => ({
              product: x.name, vendor: x.vendorName, stock: x.stock, unit: x.unit, sold_period: x.sold,
              per_day: x.perDay.toFixed(2), days_cover: Math.round(x.daysLeft), order_qty: qtyOf(x), cost: x.cost, value: (qtyOf(x) * x.cost).toFixed(2), reason: x.reason,
            })))}><Download size={15} /> CSV</button>
            <button className="btn-primary" onClick={createAll} disabled={!groups.length}><Wand2 size={15} /> Create all POs</button>
          </div>} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs text-ink3">Sales history (days)
            <Input type="number" value={days} onChange={(e) => setDays(Math.max(1, +e.target.value || 30))} className="mt-1" /></label>
          <label className="text-xs text-ink3">Stock cover wanted (days)
            <Input type="number" value={cover} onChange={(e) => setCover(Math.max(1, +e.target.value || 21))} className="mt-1" /></label>
          <label className="text-xs text-ink3">Vendor
            <Select value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} className="mt-1">
              <option value="">All vendors</option>
              {vendors.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
              <option value="none">Unassigned</option>
            </Select></label>
          <div className="flex items-end"><Toggle checked={onlyLow} onChange={setOnlyLow} label="Only low / out of stock" /></div>
        </div>
      </Card>

      {groups.length === 0 ? (
        <Empty title="Kuch order karne ki zaroorat nahi 🎉" sub="Stock levels theek hain. Cover days badha kar dobara dekhiye." icon={<Wand2 size={22} />} />
      ) : groups.map(([key, rows]) => {
        const vendor = vendors.find((v: any) => v.id === key);
        const val = rows.reduce((t, r) => t + qtyOf(r) * r.cost, 0);
        return (
          <Card key={key} pad={false}>
            <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
              <Truck size={16} className="text-brand" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink">{vendor?.name || 'Unassigned vendor'}</p>
                <p className="text-[11px] text-ink3">{rows.length} items · {money(val, s.currency)}{vendor?.phone ? ' · ' + vendor.phone : ''}</p>
              </div>
              {vendor?.phone && <button className="btn-soft px-2 py-1.5 text-xs" onClick={() => waOrder(vendor.name, rows, vendor.phone)}><MessageCircle size={13} /> WhatsApp</button>}
              <button className="btn-primary px-3 py-1.5 text-xs" onClick={() => createPO(key, rows)}><Wand2 size={13} /> Create PO</button>
            </div>
            {rows.slice(0, 60).map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2 text-xs last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-ink">{r.name}</p>
                  <p className="truncate text-[10px] text-ink3">
                    stock {r.stock} {r.unit} · {r.sold} sold/{days}d · {r.perDay.toFixed(2)}/day · <span className={cx(r.daysLeft < 7 ? 'text-bad' : 'text-ink3')}>{r.daysLeft > 900 ? '∞' : Math.round(r.daysLeft) + 'd'} cover</span>
                  </p>
                </div>
                <Badge tone={r.stock <= 0 ? 'bad' : 'warn'}>{r.reason}</Badge>
                <Input className="h-8 w-20 text-center" inputMode="decimal" value={qtyOf(r)}
                  onChange={(e) => setQtyOverride((q) => ({ ...q, [r.id]: +e.target.value || 0 }))} />
                <span className="w-20 text-right font-mono text-ink">{money(qtyOf(r) * r.cost, s.currency)}</span>
                <button className="btn-ghost px-2 py-1 text-[11px]" onClick={() => setSkip((sk) => ({ ...sk, [r.id]: true }))}>Skip</button>
              </div>
            ))}
          </Card>
        );
      })}
    </div>
  );
}
