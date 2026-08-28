import { useEffect, useState } from 'react';
import { Printer, Share2, Download, MessageCircle, Copy, FileText, ChefHat, Eye, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Modal, Select, Field } from '@/components/ui';
import type { Sale } from '@/db/types';
import { useSettings, useShop } from '@/store/settings';
import { renderReceipt, printHTML, saleText, allTemplates } from '@/lib/receipt';
import type { TemplateDef } from '@/lib/templates';
import { download } from '@/lib/csv';
import { money } from '@/lib/format';
import { toast } from '@/store/ui';
import UpiPay from './UpiPay';
import { downloadSaleImage } from '@/lib/billImage';
import ShareBillModal from './ShareBillModal';

export default function ReceiptModal({ sale, onClose }: { sale: Sale | null; onClose: () => void }) {
  const s = useSettings();
  const { modules } = useShop();
  const [templates, setTemplates] = useState<TemplateDef[]>([]);
  const [tplId, setTplId] = useState(s.defaultTemplate);
  const [preview, setPreview] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [imgBusy, setImgBusy] = useState<'' | 'wa' | 'dl'>('');
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => { allTemplates().then(setTemplates); }, [sale]);
  useEffect(() => { setTplId(s.defaultTemplate); }, [sale?.id]);
  useEffect(() => {
    if (!sale || !showPreview) return;
    renderReceipt(sale, s, tplId).then(setPreview);
  }, [sale?.id, tplId, showPreview]);

  if (!sale) return null;
  const text = saleText(sale, s);
  const doPrint = async (id: string, copyLabel?: string) => printHTML(await renderReceipt(sale, s, id, { copyLabel }), s.printCopies);

  return (
    <Modal open={!!sale} onClose={onClose} title={`Invoice ${sale.invoiceNo}`} wide
      footer={<button className="btn-primary w-full py-3" onClick={onClose}>Done · New sale</button>}>
      <div className="rounded-2xl border border-ok/30 bg-ok/5 p-4 text-center">
        <p className="text-[11px] uppercase tracking-widest text-ink3">Paid · {sale.payMode.toUpperCase()}</p>
        <p className="font-mono text-3xl font-extrabold text-ok">{money(sale.total, s.currency)}</p>
        {!!sale.change && <p className="text-xs text-ink2">Change returned {money(sale.change, s.currency)}</p>}
        {!!sale.pointsEarned && <p className="text-xs text-brand">+{sale.pointsEarned} loyalty points</p>}
      </div>

      {sale.payMode === 'upi' && s.showUpiQrOnPayment && s.upiAccounts.some((u) => u.active) && (
        <div className="mt-3"><UpiPay amount={sale.total} note={sale.invoiceNo} compact /></div>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Field label="Print template">
          <Select value={tplId} onChange={(e) => setTplId(e.target.value)}>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.paper}</option>)}
          </Select>
        </Field>
        <Field label="Copies">
          <Select value={s.printCopies} onChange={(e) => s.set({ printCopies: +e.target.value })}>
            {[1, 2, 3].map((n) => <option key={n} value={n}>{n} cop{n > 1 ? 'ies' : 'y'}</option>)}
          </Select>
        </Field>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <button className="btn-primary" onClick={() => doPrint(tplId)}><Printer size={15} /> Print</button>
        <button className="btn-soft" onClick={() => doPrint(s.a4Template)}><FileText size={15} /> A4 invoice</button>
        {modules.tables && <button className="btn-soft" onClick={() => doPrint(s.kotTemplate)}><ChefHat size={15} /> Kitchen KOT</button>}
        <button className="btn-soft" onClick={() => doPrint(tplId, s.duplicateLabel)}><Copy size={15} /> Duplicate</button>
        <button className="btn-soft" onClick={() => setShowPreview((v) => !v)}><Eye size={15} /> {showPreview ? 'Hide' : 'Preview'}</button>
        <button className="btn-soft" onClick={async () => download(`${sale.invoiceNo}.html`, await renderReceipt(sale, s, tplId), 'text/html')}><Download size={15} /> Save HTML</button>
        <button className="btn-primary" onClick={() => setShareOpen(true)}><MessageCircle size={15} /> WhatsApp</button>
        <button className="btn-soft" disabled={imgBusy === 'dl'} onClick={async () => {
          setImgBusy('dl');
          try { await downloadSaleImage(sale, s as any, tplId); toast('Bill image saved (PNG)'); }
          catch { toast('Image save nahi hui', 'err'); }
          setImgBusy('');
        }}>{imgBusy === 'dl' ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} />} Download image</button>
        <button className="btn-soft" onClick={async () => {
          try { if (navigator.share) await navigator.share({ title: sale.invoiceNo, text }); else { await navigator.clipboard.writeText(text); toast('Receipt copied'); } } catch { /* cancelled */ }
        }}><Share2 size={15} /> Share</button>
        <button className="btn-soft" onClick={() => { navigator.clipboard.writeText(text); toast('Copied'); }}><Copy size={15} /> Copy text</button>
      </div>

      {shareOpen && <ShareBillModal sale={sale} onClose={() => setShareOpen(false)} />}

      {showPreview && (
        <div className="mt-3 overflow-hidden rounded-xl border border-line bg-white">
          <iframe title="preview" srcDoc={preview} className="h-[420px] w-full" />
        </div>
      )}
    </Modal>
  );
}
