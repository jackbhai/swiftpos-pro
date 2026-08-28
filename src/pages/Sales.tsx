import { useMemo, useState } from 'react';
import { Download, Printer, RotateCcw, Search, Eye, MessageCircle, Trash2 } from 'lucide-react';
import { useSales } from '@/hooks/useData';
import { VirtualList } from '@/components/ui/Virtual';
import ShareBillModal from '@/components/pos/ShareBillModal';
import { db } from '@/db/db';
import { money, moneyShort, dt, rangeFor, cx, num } from '@/lib/format';
import { downloadCSV } from '@/lib/csv';
import { Card, Stat, Modal, Empty, SearchBar, Badge, Tabs, Field, Input } from '@/components/ui';
import { useSettings, useShop } from '@/store/settings';
import { receiptHTML, printHTML, saleText, waLink } from '@/lib/receipt';
import { refundSale } from '@/lib/sale';
import { toast } from '@/store/ui';
import type { Sale } from '@/db/types';

export default function SalesPage() {
  const sales = useSales() || [];
  const s = useSettings();
  const { terms } = useShop();
  const [q, setQ] = useState('');
  const [period, setPeriod] = useState<'today' | '7d' | '30d' | 'month' | 'all'>('today');
  const [mode, setMode] = useState('all');
  const [view, setView] = useState<Sale | null>(null);
  const [refund, setRefund] = useState<Sale | null>(null);
  const [limit, setLimit] = useState(40);
  const [share, setShare] = useState<Sale | null>(null);

  const [from, to] = rangeFor(period as any);
  const list = useMemo(() => sales.filter((x: Sale) => {
    if (x.ts < from || x.ts > to) return false;
    if (mode !== 'all' && x.payMode !== mode) return false;
    if (q.trim()) {
      const t = q.toLowerCase();
      return x.invoiceNo.toLowerCase().includes(t) || (x.customerName ?? '').toLowerCase().includes(t)
        || x.lines.some((l) => l.name.toLowerCase().includes(t)) || String(x.total).includes(t);
    }
    return true;
  }), [sales, from, to, mode, q]);

  const revenue = list.reduce((t: number, x: Sale) => t + (x.status === 'refunded' ? 0 : x.total), 0);
  const profit = list.reduce((t: number, x: Sale) => t + x.profit, 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={terms.sales} value={num(list.length)} />
        <Stat label="Revenue" value={moneyShort(revenue, s.currency)} tone="ok" />
        <Stat label="Profit" value={moneyShort(profit, s.currency)} tone="ok" />
        <Stat label="Avg ticket" value={moneyShort(list.length ? revenue / list.length : 0, s.currency)} />
      </div>

      <Card className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBar value={q} onChange={setQ} placeholder="Invoice, customer, item…" />
          <button className="btn-ghost" onClick={() => downloadCSV(`sales-${period}.csv`, list.map((x: Sale) => ({
            invoice: x.invoiceNo, date: dt(x.ts), customer: x.customerName ?? 'Walk-in', items: x.lines.length,
            subtotal: x.subTotal, discount: x.billDiscount + x.itemDiscount + x.couponValue, gst: x.gstAmount,
            total: x.total, profit: x.profit, mode: x.payMode, status: x.status, staff: x.staffName ?? '',
          })))}><Download size={15} /> Export</button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Tabs active={period} onChange={(v) => setPeriod(v as any)} tabs={[
            { id: 'today', label: 'Today' }, { id: '7d', label: '7d' }, { id: '30d', label: '30d' },
            { id: 'month', label: 'This month' }, { id: 'all', label: 'All' },
          ]} />
          <Tabs active={mode} onChange={setMode} tabs={[
            { id: 'all', label: 'All modes' }, { id: 'cash', label: 'Cash' }, { id: 'upi', label: 'UPI' },
            { id: 'card', label: 'Card' }, { id: 'credit', label: 'Credit' },
          ]} />
        </div>
      </Card>

      {list.length === 0 ? <Empty title={`No ${terms.sales.toLowerCase()} in this range`} /> : (
        <Card pad={false}>
          <VirtualList
            items={list}
            rowHeight={64}
            columns={1}
            height="calc(100dvh - 330px)"
            render={(x: Sale) => (
              <div className="flex h-full flex-wrap items-center gap-3 border-b border-line px-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-bold text-ink">
                    {x.invoiceNo}
                    <Badge tone={x.status === 'completed' ? 'ok' : 'bad'}>{x.status}</Badge>
                    <Badge tone="muted">{x.payMode}</Badge>
                  </p>
                  <p className="truncate text-[11px] text-ink3">{dt(x.ts)} · {x.customerName ?? 'Walk-in'} · {x.lines.length} items{x.staffName ? ' · ' + x.staffName : ''}</p>
                </div>
                <span className="font-mono text-base font-extrabold text-ink">{money(x.total, s.currency)}</span>
                <div className="flex gap-1">
                  <button className="btn-ghost px-2 py-1.5" onClick={() => setView(x)}><Eye size={14} /></button>
                  <button className="btn-ghost px-2 py-1.5" onClick={() => printHTML(receiptHTML(x, s, '80mm'))}><Printer size={14} /></button>
                  <button className="btn-ghost px-2 py-1.5" onClick={() => setShare(x)} title="Share / WhatsApp"><MessageCircle size={14} /></button>
                  <button className="btn-ghost px-2 py-1.5" onClick={() => setRefund(x)} disabled={x.status !== 'completed'}><RotateCcw size={14} /></button>
                </div>
              </div>
            )}
          />
        </Card>
      )}

      <ShareBillModal sale={share} onClose={() => setShare(null)} />

      <Modal open={!!view} onClose={() => setView(null)} title={view?.invoiceNo} wide
        footer={view && <div className="flex gap-2">
          <button className="btn-soft flex-1" onClick={() => printHTML(receiptHTML(view, s, 'a4'))}><Printer size={15} /> A4</button>
          <button className="btn-soft flex-1" onClick={() => printHTML(receiptHTML(view, s, '80mm'))}><Printer size={15} /> Thermal</button>
        </div>}>
        {view && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Info label="Date" value={dt(view.ts)} /><Info label="Customer" value={view.customerName ?? 'Walk-in'} />
              <Info label="Payment" value={view.payMode.toUpperCase()} /><Info label="Billed by" value={view.staffName ?? '—'} />
              <Info label="Channel" value={view.channel ?? 'counter'} /><Info label="Status" value={view.status} />
            </div>
            <div className="overflow-hidden rounded-xl border border-line">
              <table className="w-full text-xs">
                <thead className="bg-surface2"><tr><th className="th">Item</th><th className="th text-right">Qty</th><th className="th text-right">Rate</th><th className="th text-right">Total</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {view.lines.map((l) => (
                    <tr key={l.id}><td className="td text-ink">{l.name}</td><td className="td text-right">{l.qty}</td>
                      <td className="td text-right font-mono">{money(l.price, s.currency)}</td>
                      <td className="td text-right font-mono text-ink">{money(l.price * l.qty - l.discount, s.currency)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-1 rounded-xl border border-line bg-surface2/50 p-3 text-xs">
              <Line label="Subtotal" v={view.subTotal} /><Line label="Discounts" v={-(view.billDiscount + view.itemDiscount + view.couponValue)} />
              <Line label="Taxable" v={view.taxable} /><Line label="CGST" v={view.gstAmount / 2} /><Line label="SGST" v={view.gstAmount / 2} />
              <Line label="Round off" v={view.roundOff} />
              <div className="flex justify-between border-t border-line pt-1 text-sm font-extrabold text-ink"><span>Total</span><span className="font-mono">{money(view.total, s.currency)}</span></div>
              <div className="flex justify-between text-ok"><span>Profit</span><span className="font-mono">{money(view.profit, s.currency)}</span></div>
            </div>
          </div>
        )}
      </Modal>

      <RefundModal sale={refund} onClose={() => setRefund(null)} />
    </div>
  );
}

const Info = ({ label, value }: any) => (
  <div className="rounded-lg border border-line px-2.5 py-1.5"><p className="text-[10px] uppercase tracking-wider text-ink3">{label}</p><p className="truncate font-semibold text-ink">{value}</p></div>
);
const Line = ({ label, v }: any) => {
  const s = useSettings();
  return <div className="flex justify-between text-ink2"><span>{label}</span><span className="font-mono">{money(v, s.currency)}</span></div>;
};

function RefundModal({ sale, onClose }: { sale: Sale | null; onClose: () => void }) {
  const [amt, setAmt] = useState('');
  const s = useSettings();
  if (!sale) return null;
  return (
    <Modal open={!!sale} onClose={onClose} title={`Refund ${sale.invoiceNo}`}
      footer={<div className="flex gap-2">
        <button className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
        <button className="btn-danger flex-1" onClick={async () => { await refundSale(sale.id, parseFloat(amt) || undefined); toast('Refund processed'); onClose(); }}>Confirm refund</button>
      </div>}>
      <p className="text-sm text-ink2">Full amount <b className="text-ink">{money(sale.total, s.currency)}</b>. Leave blank for a full refund (stock is restored automatically).</p>
      <Field label="Partial refund amount" className="mt-3"><Input inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder={String(sale.total)} /></Field>
    </Modal>
  );
}
