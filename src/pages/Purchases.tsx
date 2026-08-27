import { useMemo, useState } from 'react';
import { Plus, Truck, Check, Trash2, Download, PackageCheck, X } from 'lucide-react';
import { usePOs, useVendors, useProducts } from '@/hooks/useData';
import { db, uid, addStockLog, logActivity } from '@/db/db';
import { money, moneyShort, num, dt } from '@/lib/format';
import { downloadCSV } from '@/lib/csv';
import { Card, Stat, Modal, Field, Input, Select, Empty, Badge, Tabs, SearchBar } from '@/components/ui';
import { useSettings, useShop } from '@/store/settings';
import { toast } from '@/store/ui';
import type { POItem, PurchaseOrder } from '@/db/types';

export default function Purchases() {
  const pos = usePOs() || [];
  const vendors = useVendors() || [];
  const products = useProducts() || [];
  const s = useSettings();
  const { terms } = useShop();
  const [tab, setTab] = useState('all');
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<PurchaseOrder | null>(null);

  const list = pos.filter((p: PurchaseOrder) => tab === 'all' || p.status === tab);
  const pending = pos.filter((p: PurchaseOrder) => ['ordered', 'partial', 'draft'].includes(p.status));
  const spend = pos.filter((p: PurchaseOrder) => p.status === 'received').reduce((t: number, p: PurchaseOrder) => t + p.total, 0);

  const receive = async (po: PurchaseOrder) => {
    await db.transaction('rw', [db.products, db.purchaseOrders, db.stockLogs, db.activity], async () => {
      for (const it of po.items) {
        const p = await db.products.get(it.productId);
        if (!p) continue;
        const after = +(p.stock + it.qty).toFixed(3);
        await db.products.update(p.id, { stock: after, cost: it.cost || p.cost, updatedAt: Date.now() });
        await addStockLog(p.id, p.name, 'purchase', it.qty, p.stock, after, po.poNo);
      }
      await db.purchaseOrders.update(po.id, { status: 'received', receivedAt: Date.now(), items: po.items.map((i) => ({ ...i, received: i.qty })) });
    });
    await logActivity('purchase', `Received ${po.poNo} · ₹${po.total}`);
    toast('Stock received'); setDetail(null);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Purchase orders" value={num(pos.length)} icon={<Truck size={16} />} />
        <Stat label="Pending" value={num(pending.length)} tone="warn" />
        <Stat label="Received spend" value={moneyShort(spend, s.currency)} tone="ok" />
        <Stat label="Open value" value={moneyShort(pending.reduce((t: number, p: PurchaseOrder) => t + p.total, 0), s.currency)} />
      </div>

      <Card className="flex flex-wrap items-center gap-2">
        <Tabs active={tab} onChange={setTab} tabs={[
          { id: 'all', label: 'All' }, { id: 'draft', label: 'Draft' }, { id: 'ordered', label: 'Ordered' },
          { id: 'received', label: 'Received' }, { id: 'cancelled', label: 'Cancelled' },
        ]} />
        <button className="btn-primary ml-auto" onClick={() => setOpen(true)}><Plus size={16} /> New PO</button>
        <button className="btn-ghost" onClick={() => downloadCSV('purchase-orders.csv', pos.map((p: PurchaseOrder) => ({ po: p.poNo, vendor: p.vendorName, items: p.items.length, total: p.total, status: p.status, created: dt(p.createdAt) })))}><Download size={15} /></button>
      </Card>

      {list.length === 0 ? <Empty title="No purchase orders" sub="Create one to restock from a vendor." /> : (
        <div className="space-y-2">
          {list.map((p: PurchaseOrder) => (
            <Card key={p.id} className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-bold text-ink">{p.poNo} <Badge tone={p.status === 'received' ? 'ok' : p.status === 'cancelled' ? 'bad' : 'warn'}>{p.status}</Badge></p>
                <p className="text-[11px] text-ink3">{p.vendorName} · {p.items.length} items · {dt(p.createdAt)}</p>
              </div>
              <span className="font-mono text-sm font-bold text-ink">{money(p.total, s.currency)}</span>
              <div className="flex gap-1">
                <button className="btn-ghost px-2 py-1.5" onClick={() => setDetail(p)}>View</button>
                {p.status !== 'received' && p.status !== 'cancelled' && <button className="btn-primary px-2 py-1.5" onClick={() => receive(p)}><PackageCheck size={14} /></button>}
                <button className="btn-ghost px-2 py-1.5" onClick={async () => { await db.purchaseOrders.delete(p.id); toast('Deleted'); }}><Trash2 size={14} /></button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <POBuilder open={open} onClose={() => setOpen(false)} vendors={vendors} products={products} count={pos.length} />
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.poNo} wide
        footer={detail && detail.status !== 'received' && <button className="btn-primary w-full" onClick={() => receive(detail)}><Check size={15} /> Receive all & update stock</button>}>
        {detail && (
          <table className="w-full text-xs">
            <thead><tr><th className="th">Item</th><th className="th text-right">Qty</th><th className="th text-right">Cost</th><th className="th text-right">Total</th></tr></thead>
            <tbody className="divide-y divide-line">
              {detail.items.map((i, k) => (
                <tr key={k}><td className="td text-ink">{i.name}</td><td className="td text-right">{i.qty}</td>
                  <td className="td text-right font-mono">{money(i.cost, s.currency)}</td><td className="td text-right font-mono text-ink">{money(i.qty * i.cost, s.currency)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>
    </div>
  );
}

function POBuilder({ open, onClose, vendors, products, count }: any) {
  const s = useSettings();
  const [vendorId, setVendorId] = useState('');
  const [items, setItems] = useState<POItem[]>([]);
  const [q, setQ] = useState('');
  const matches = useMemo(() => q.trim() ? products.filter((p: any) => p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8) : [], [q, products]);
  const total = items.reduce((t, i) => t + i.qty * i.cost, 0);
  const vendor = vendors.find((v: any) => v.id === vendorId);

  const save = async (status: 'draft' | 'ordered') => {
    if (!vendorId) return toast('Select a vendor', 'err');
    if (!items.length) return toast('Add at least one item', 'err');
    await db.purchaseOrders.add({
      id: uid('po_'), poNo: 'PO-' + String(count + 1).padStart(4, '0'), vendorId, vendorName: vendor?.name ?? '',
      items, status, total, paid: 0, createdAt: Date.now(),
    });
    toast('Purchase order created'); setItems([]); setVendorId(''); onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="New purchase order" wide
      footer={<div className="flex gap-2"><button className="btn-ghost flex-1" onClick={() => save('draft')}>Save draft</button><button className="btn-primary flex-1" onClick={() => save('ordered')}>Place order · {money(total, s.currency)}</button></div>}>
      <Field label="Vendor">
        <Select value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
          <option value="">Select vendor…</option>{vendors.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </Select>
      </Field>
      <div className="mt-3"><SearchBar value={q} onChange={setQ} placeholder="Search products to add…" /></div>
      {matches.length > 0 && (
        <div className="mt-2 space-y-1">
          {matches.map((p: any) => (
            <button key={p.id} className="flex w-full items-center gap-2 rounded-lg border border-line px-3 py-2 text-left text-xs hover:border-brand/50"
              onClick={() => { setItems([...items, { productId: p.id, name: p.name, qty: Math.max(1, p.lowStock * 2 - p.stock), cost: p.cost, received: 0 }]); setQ(''); }}>
              <span className="flex-1 truncate text-ink">{p.name}</span><span className="text-ink3">stock {p.stock}</span>
            </button>
          ))}
        </div>
      )}
      <div className="mt-3 space-y-1.5">
        {items.map((i, k) => (
          <div key={k} className="flex items-center gap-2 rounded-xl border border-line p-2">
            <span className="min-w-0 flex-1 truncate text-xs text-ink">{i.name}</span>
            <Input className="w-16 py-1 text-center text-xs" value={i.qty} onChange={(e) => setItems(items.map((x, j) => j === k ? { ...x, qty: +e.target.value || 0 } : x))} />
            <Input className="w-20 py-1 text-center text-xs" value={i.cost} onChange={(e) => setItems(items.map((x, j) => j === k ? { ...x, cost: +e.target.value || 0 } : x))} />
            <button className="text-ink3 hover:text-bad" onClick={() => setItems(items.filter((_, j) => j !== k))}><X size={14} /></button>
          </div>
        ))}
      </div>
    </Modal>
  );
}
