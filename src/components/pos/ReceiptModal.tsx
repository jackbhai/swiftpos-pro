import { Printer, Share2, Download, MessageCircle, Copy } from 'lucide-react';
import { Modal } from '@/components/ui';
import type { Sale } from '@/db/types';
import { useSettings } from '@/store/settings';
import { receiptHTML, printHTML, saleText, waLink } from '@/lib/receipt';
import { download } from '@/lib/csv';
import { money, dt } from '@/lib/format';
import { toast } from '@/store/ui';

export default function ReceiptModal({ sale, onClose }: { sale: Sale | null; onClose: () => void }) {
  const s = useSettings();
  if (!sale) return null;
  const text = saleText(sale, s);
  return (
    <Modal open={!!sale} onClose={onClose} title={`Invoice ${sale.invoiceNo}`}
      footer={<button className="btn-primary w-full py-3" onClick={onClose}>Done · New sale</button>}>
      <div className="rounded-2xl border border-ok/30 bg-ok/5 p-4 text-center">
        <p className="text-[11px] uppercase tracking-widest text-ink3">Paid · {sale.payMode.toUpperCase()}</p>
        <p className="font-mono text-3xl font-extrabold text-ok">{money(sale.total, s.currency)}</p>
        {!!sale.change && <p className="text-xs text-ink2">Change returned {money(sale.change, s.currency)}</p>}
        {!!sale.pointsEarned && <p className="text-xs text-brand">+{sale.pointsEarned} loyalty points</p>}
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface2/50 p-3 font-mono text-[11px] text-ink2">
        <p className="text-center font-bold text-ink">{s.shopName}</p>
        <p className="text-center">{dt(sale.ts)}</p>
        <div className="my-2 border-t border-dashed border-line" />
        {sale.lines.map((l) => (
          <div key={l.id} className="flex justify-between gap-2"><span className="truncate">{l.name} ×{l.qty}</span><span>{(l.price * l.qty).toFixed(2)}</span></div>
        ))}
        <div className="my-2 border-t border-dashed border-line" />
        <div className="flex justify-between"><span>GST</span><span>{sale.gstAmount.toFixed(2)}</span></div>
        <div className="flex justify-between font-bold text-ink"><span>TOTAL</span><span>{sale.total.toFixed(2)}</span></div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="btn-soft" onClick={() => printHTML(receiptHTML(sale, s, '80mm'))}><Printer size={15} /> Print 80mm</button>
        <button className="btn-soft" onClick={() => printHTML(receiptHTML(sale, s, '58mm'))}><Printer size={15} /> Print 58mm</button>
        <button className="btn-soft" onClick={() => printHTML(receiptHTML(sale, s, 'a4'))}><Printer size={15} /> A4 Invoice</button>
        <button className="btn-soft" onClick={() => download(`${sale.invoiceNo}.html`, receiptHTML(sale, s, '80mm'), 'text/html')}><Download size={15} /> Download</button>
        <button className="btn-soft" onClick={() => window.open(waLink('', text), '_blank')}><MessageCircle size={15} /> WhatsApp</button>
        <button className="btn-soft" onClick={async () => {
          try { if (navigator.share) await navigator.share({ title: sale.invoiceNo, text }); else { await navigator.clipboard.writeText(text); toast('Receipt copied'); } }
          catch { /* cancelled */ }
        }}><Share2 size={15} /> Share</button>
        <button className="btn-soft col-span-2" onClick={() => { navigator.clipboard.writeText(text); toast('Copied to clipboard'); }}><Copy size={15} /> Copy text</button>
      </div>
    </Modal>
  );
}
