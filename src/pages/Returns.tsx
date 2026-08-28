import { useMemo, useState } from 'react';
import { Undo2, Search, RotateCcw, PackageCheck, IndianRupee } from 'lucide-react';
import { useSales } from '@/hooks/useData';
import { db, uid, logActivity, addStockLog } from '@/db/db';
import { money, dt, cx } from '@/lib/format';
import { Card, Stat, Modal, Field, Input, Select, Empty, SearchBar, Badge, Textarea, SectionTitle } from '@/components/ui';
import { useSettings } from '@/store/settings';
import { toast } from '@/store/ui';
import { printSale } from '@/lib/receipt';
import ShareBillModal from '@/components/pos/ShareBillModal';
import { MessageCircle } from 'lucide-react';
import type { Sale } from '@/db/types';

/** Returns & exchange desk — line-level refunds with stock restock and credit-note options. */
export default function Returns() {
  const sales = useSales() || [];
  const s = useSettings();
  const [q, setQ] = useState('');
  const [active, setActive] = useState<Sale | null>(null);
  const [shareSale, setShareSale] = useState<Sale | null>(null);

  const recent = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = sales.filter((x: Sale) => x.status !== 'void');
    if (!term) return base.slice(0, 40);
    return base.filter((x: Sale) =>
      x.invoiceNo.toLowerCase().includes(term) ||
      (x.customerName || '').toLowerCase().includes(term) ||
      String(x.total).includes(term)).slice(0, 60);
  }, [sales, q]);

  const refunded = sales.filter((x: Sale) => x.status === 'refunded' || x.status === 'partial-refund');
  const refundValue = refunded.reduce((t: number, x: Sale) => t + (x.refundedAmount || 0), 0);
  const todayRefunds = refunded.filter((x: Sale) => new Date(x.ts).toDateString() === new Date().toDateString());

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Returns logged" value={refunded.length} tone="warn" icon={<Undo2 size={16} />} />
        <Stat label="Refund value" value={money(refundValue, s.currency)} tone="bad" icon={<IndianRupee size={16} />} />
        <Stat label="Today" value={todayRefunds.length} tone="brand" />
        <Stat label="Return rate" value={sales.length ? ((refunded.length / sales.length) * 100).toFixed(1) + '%' : '0%'} tone="ok" />
      </div>

      <Card>
        <SectionTitle title="Find the bill" sub="Scan or type invoice number, customer name, or amount" />
        <SearchBar value={q} onChange={setQ} placeholder="Invoice no / customer / amount…" autoFocus
          right={<Search size={15} className="text-ink3" />} />
      </Card>

      {recent.length === 0 ? <Empty title="No bills found" sub="Try another invoice number." icon={<Undo2 size={22} />} /> : (
        <Card pad={false}>
          {recent.map((x: Sale) => (
            <button key={x.id} onClick={() => setActive(x)}
              className="flex w-full items-center gap-3 border-b border-line px-3 py-2.5 text-left last:border-0 hover:bg-surface2/50">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{x.invoiceNo} · {x.customerName || 'Walk-in'}</p>
                <p className="text-[11px] text-ink3">{dt(x.ts)} · {x.lines.length} items · {x.payMode}</p>
              </div>
              {x.status === 'refunded' && <Badge tone="bad">refunded</Badge>}
              {x.status === 'partial-refund' && <Badge tone="warn">partial</Badge>}
              <span className="font-mono text-sm font-bold text-ink">{money(x.total, s.currency)}</span>
              <span role="button" tabIndex={0} className="btn-soft px-2 py-1 text-[11px]"
                onClick={(e) => { e.stopPropagation(); setShareSale(x); }}><MessageCircle size={12} /></span>
            </button>
          ))}
        </Card>
      )}

      <ShareBillModal sale={shareSale} onClose={() => setShareSale(null)} />
      {active && <ReturnModal sale={active} onClose={() => setActive(null)} />}
    </div>
  );
}

function ReturnModal({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const s = useSettings();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [restock, setRestock] = useState(true);
  const [mode, setMode] = useState<'cash' | 'upi' | 'credit-note' | 'exchange'>('cash');
  const [reason, setReason] = useState('Customer changed mind');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const refundTotal = sale.lines.reduce((t, l) => {
    const q = qty[l.id] || 0;
    const unit = (l.price * l.qty - l.discount) / Math.max(l.qty, 1);
    return t + unit * q;
  }, 0);
  const anySelected = Object.values(qty).some((v) => v > 0);

  const submit = async () => {
    if (!anySelected) return toast('Select at least one item & quantity', 'err');
    setBusy(true);
    const returnedLines = sale.lines.filter((l) => (qty[l.id] || 0) > 0);

    if (restock) {
      for (const l of returnedLines) {
        const p = await db.products.get(l.productId);
        if (!p) continue;
        const before = p.stock; const after = +(before + (qty[l.id] || 0)).toFixed(3);
        await db.products.update(p.id, { stock: after, updatedAt: Date.now() });
        await addStockLog(p.id, p.name, 'return', qty[l.id] || 0, before, after, sale.invoiceNo);
      }
    }

    const prevRefund = sale.refundedAmount || 0;
    const newRefund = +(prevRefund + refundTotal).toFixed(2);
    const fullyReturned = sale.lines.every((l) => (qty[l.id] || 0) >= l.qty) || newRefund >= sale.total - 0.5;
    await db.sales.update(sale.id, {
      refundedAmount: newRefund,
      status: fullyReturned ? 'refunded' : 'partial-refund',
      note: [sale.note, `Return: ${reason}${note ? ' — ' + note : ''}`].filter(Boolean).join(' | '),
    });

    if (mode === 'credit-note' && sale.customerId) {
      const c = await db.customers.get(sale.customerId);
      if (c) await db.customers.update(c.id, { credit: +(c.credit - refundTotal).toFixed(2) });
    }

    // Credit-note document stored as a quote-style record for reprint
    const noteNo = 'CN-' + Date.now().toString().slice(-6);
    await db.quotes.add({
      id: uid('cn_'), quoteNo: noteNo, ts: Date.now(), customerId: sale.customerId, customerName: sale.customerName,
      lines: returnedLines.map((l) => ({ ...l, qty: qty[l.id] || 0 })), total: +refundTotal.toFixed(2),
      note: `Credit note against ${sale.invoiceNo} · ${reason} · ${mode}`, status: 'converted',
    });

    await logActivity('return', `Return ${money(refundTotal, s.currency)} on ${sale.invoiceNo} (${mode})`);
    setBusy(false);
    toast(`Return processed · ${money(refundTotal, s.currency)}`);
    onClose();
  };

  return (
    <Modal open onClose={onClose} wide title={`Return · ${sale.invoiceNo}`}
      footer={
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-wide text-ink3">Refund amount</p>
            <p className="font-mono text-lg font-bold text-bad">{money(refundTotal, s.currency)}</p>
          </div>
          <button className="btn-soft" onClick={() => printSale(sale, s, undefined, 'RETURN COPY')}>Print bill</button>
          <button className="btn-primary" disabled={busy || !anySelected} onClick={submit}>
            <RotateCcw size={15} /> {busy ? 'Processing…' : 'Process return'}
          </button>
        </div>
      }>
      <p className="mb-2 text-[11px] text-ink3">{dt(sale.ts)} · {sale.customerName || 'Walk-in'} · paid by {sale.payMode}</p>

      <div className="space-y-1.5">
        {sale.lines.map((l) => {
          const sel = qty[l.id] || 0;
          const unit = (l.price * l.qty - l.discount) / Math.max(l.qty, 1);
          return (
            <div key={l.id} className={cx('flex items-center gap-2 rounded-xl border p-2', sel > 0 ? 'border-brand/50 bg-brand/5' : 'border-line')}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-ink">{l.name}</p>
                <p className="text-[10px] text-ink3">{l.qty} {l.unit} × {money(unit, s.currency)}</p>
              </div>
              <div className="flex items-center gap-1">
                <button className="btn-ghost h-7 w-7 justify-center p-0" onClick={() => setQty({ ...qty, [l.id]: Math.max(0, sel - 1) })}>−</button>
                <input className="input h-7 w-14 text-center font-mono text-xs" value={sel}
                  onChange={(e) => setQty({ ...qty, [l.id]: Math.max(0, Math.min(l.qty, +e.target.value || 0)) })} />
                <button className="btn-ghost h-7 w-7 justify-center p-0" onClick={() => setQty({ ...qty, [l.id]: Math.min(l.qty, sel + 1) })}>+</button>
              </div>
              <span className="w-20 text-right font-mono text-xs text-ink2">{money(unit * sel, s.currency)}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex gap-2">
        <button className="btn-soft flex-1 text-xs" onClick={() => setQty(Object.fromEntries(sale.lines.map((l) => [l.id, l.qty])))}>Select all</button>
        <button className="btn-ghost flex-1 text-xs" onClick={() => setQty({})}>Clear</button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Refund via">
          <Select value={mode} onChange={(e) => setMode(e.target.value as any)}>
            <option value="cash">Cash refund</option>
            <option value="upi">UPI / bank transfer</option>
            <option value="credit-note">Credit note (adjust dues)</option>
            <option value="exchange">Exchange for other goods</option>
          </Select>
        </Field>
        <Field label="Reason">
          <Select value={reason} onChange={(e) => setReason(e.target.value)}>
            <option>Customer changed mind</option>
            <option>Damaged / defective</option>
            <option>Wrong item billed</option>
            <option>Expired stock</option>
            <option>Short supply</option>
            <option>Price dispute</option>
          </Select>
        </Field>
      </div>

      <label className="mt-3 flex items-center gap-2 text-xs text-ink2">
        <input type="checkbox" className="h-4 w-4 accent-cyan-400" checked={restock} onChange={(e) => setRestock(e.target.checked)} />
        <PackageCheck size={14} /> Put items back into stock
      </label>

      <Field label="Note" className="mt-3"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional remark for the audit log" /></Field>
      <Field label="Reference" className="mt-3"><Input value={sale.invoiceNo} readOnly /></Field>
    </Modal>
  );
}
