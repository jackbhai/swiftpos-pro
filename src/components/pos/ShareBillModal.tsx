import { useEffect, useState } from 'react';
import { MessageCircle, Image as ImageIcon, Download, Type, Loader2, Copy, Share2 } from 'lucide-react';
import { Modal, Field, Select, Input } from '@/components/ui';
import { useSettings } from '@/store/settings';
import { toast } from '@/store/ui';
import { allTemplates, saleText } from '@/lib/receipt';
import type { TemplateDef } from '@/lib/templates';
import { downloadSaleImage, shareSaleImage, shareSaleText, saleImageDataUrl } from '@/lib/billImage';
import type { Sale } from '@/db/types';

/**
 * One share sheet for a bill:
 *   • WhatsApp → as text
 *   • WhatsApp → as image (Web Share on mobile, auto-download + chat on desktop)
 *   • Download the bill as a PNG image
 */
export default function ShareBillModal({ sale, onClose }: { sale: Sale | null; onClose: () => void }) {
  const s = useSettings();
  const [templates, setTemplates] = useState<TemplateDef[]>([]);
  const [tpl, setTpl] = useState(s.defaultTemplate);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState<'' | 'img' | 'dl' | 'prev'>('');
  const [preview, setPreview] = useState('');

  useEffect(() => { allTemplates().then(setTemplates); }, []);
  useEffect(() => {
    if (!sale) return;
    setTpl(s.defaultTemplate);
    setPhone((sale as any).customerPhone || '');
    setPreview('');
  }, [sale?.id]);

  if (!sale) return null;

  const makePreview = async () => {
    setBusy('prev');
    try { setPreview(await saleImageDataUrl(sale, s as any, tpl)); }
    catch { toast('Preview banane me dikkat aayi', 'err'); }
    setBusy('');
  };

  const sendImage = async () => {
    setBusy('img');
    try {
      const r = await shareSaleImage(sale, s as any, tpl, phone);
      if (r === 'shared') toast('WhatsApp share sheet khul gaya');
      else if (r === 'downloaded') toast('Image download ho gayi — WhatsApp me attach kar dijiye', 'info');
      else toast('Image nahi ban paayi', 'err');
    } catch { toast('Image nahi ban paayi', 'err'); }
    setBusy('');
  };

  const saveImage = async () => {
    setBusy('dl');
    try { await downloadSaleImage(sale, s as any, tpl); toast('Bill image saved (PNG)'); }
    catch { toast('Image save nahi hui', 'err'); }
    setBusy('');
  };

  return (
    <Modal open={!!sale} onClose={onClose} title={`Share bill · ${sale.invoiceNo}`}
      footer={<button className="btn-soft w-full" onClick={onClose}>Close</button>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Bill template" hint="Image isi template ka banega">
          <Select value={tpl} onChange={(e) => { setTpl(e.target.value); setPreview(''); }}>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.paper}</option>)}
          </Select>
        </Field>
        <Field label="WhatsApp number" hint="Khaali chhodenge to chat picker khulega">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="9876543210" />
        </Field>
      </div>

      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-ink3">WhatsApp par bhejein</p>
      <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
        <button className="btn-primary py-3" onClick={() => { shareSaleText(sale, s as any, phone); toast('WhatsApp khul raha hai'); }}>
          <Type size={16} /> Text ke roop me
        </button>
        <button className="btn-primary py-3" disabled={busy === 'img'} onClick={sendImage}>
          {busy === 'img' ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />} Image ke roop me
        </button>
      </div>

      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-ink3">Aur options</p>
      <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <button className="btn-soft" disabled={busy === 'dl'} onClick={saveImage}>
          {busy === 'dl' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Save image
        </button>
        <button className="btn-soft" disabled={busy === 'prev'} onClick={makePreview}>
          {busy === 'prev' ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} />} Preview
        </button>
        <button className="btn-soft" onClick={() => { navigator.clipboard.writeText(saleText(sale, s as any)); toast('Bill text copied'); }}>
          <Copy size={15} /> Copy text
        </button>
        <button className="btn-soft" onClick={async () => {
          try {
            if (navigator.share) await navigator.share({ title: sale.invoiceNo, text: saleText(sale, s as any) });
            else { await navigator.clipboard.writeText(saleText(sale, s as any)); toast('Copied'); }
          } catch { /* cancelled */ }
        }}><Share2 size={15} /> Any app</button>
        <button className="btn-soft" onClick={() => { window.open(`sms:${phone}?body=${encodeURIComponent(saleText(sale, s as any))}`, '_blank'); }}>
          <MessageCircle size={15} /> SMS
        </button>
      </div>

      {preview && (
        <div className="mt-3 max-h-[420px] overflow-auto rounded-xl border border-line bg-white p-2">
          <img src={preview} alt="bill preview" className="mx-auto block w-full max-w-[420px]" />
        </div>
      )}

      <p className="mt-3 rounded-xl border border-line bg-surface2/40 p-2.5 text-[11px] leading-relaxed text-ink3">
        Mobile par "Image ke roop me" dabate hi WhatsApp share sheet khulti hai aur photo seedha chat me chali jaati hai.
        Laptop par image download ho jaati hai aur WhatsApp chat khul jaata hai — bas drag karke bhej dijiye.
      </p>
    </Modal>
  );
}
