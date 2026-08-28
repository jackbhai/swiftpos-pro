import { useMemo, useState } from 'react';
import { Star, Smile, Frown, MessageSquare, QrCode, Download, Plus, CheckCircle2, MessageCircle } from 'lucide-react';
import { useFeedback, useCustomers, useSales } from '@/hooks/useData';
import { db, uid, logActivity } from '@/db/db';
import { useSettings } from '@/store/settings';
import { money, num, pct, dt, cx } from '@/lib/format';
import { downloadCSV } from '@/lib/csv';
import { qrDataUrl } from '@/lib/upi';
import { waLink, printHTML } from '@/lib/receipt';
import { Card, Stat, Modal, Field, Input, Select, Textarea, Empty, Badge, Tabs, SectionTitle } from '@/components/ui';
import { toast, toastUndo } from '@/store/ui';
import type { Feedback as FB, Sale } from '@/db/types';

const TAGS = ['Service', 'Price', 'Quality', 'Staff', 'Waiting time', 'Cleanliness', 'Stock availability', 'Delivery'];

/** Customer feedback & NPS — collect ratings, track complaints and push happy customers to review you. */
export default function FeedbackPage() {
  const rows = (useFeedback() || []) as FB[];
  const customers = useCustomers() || [];
  const sales = (useSales() || []) as Sale[];
  const s = useSettings();
  const [tab, setTab] = useState<'all' | 'open' | 'qr'>('all');
  const [open, setOpen] = useState(false);
  const [reviewUrl, setReviewUrl] = useState('https://g.page/r/your-google-review-link');
  const [qr, setQr] = useState('');

  const promoters = rows.filter((r) => r.score >= 9).length;
  const passives = rows.filter((r) => r.score >= 7 && r.score < 9).length;
  const detractors = rows.filter((r) => r.score < 7).length;
  const nps = rows.length ? ((promoters - detractors) / rows.length) * 100 : 0;
  const avgStars = rows.length ? rows.reduce((t, r) => t + r.rating, 0) / rows.length : 0;
  const unresolved = rows.filter((r) => r.score < 7 && !r.resolved);

  const tagCounts = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => (r.tags || []).forEach((t) => m.set(t, (m.get(t) || 0) + 1)));
    return [...m].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [rows]);

  const list = tab === 'open' ? unresolved : rows;

  const makeQr = async () => { try { setQr(await qrDataUrl(reviewUrl, 320)); } catch { toast('QR banane me dikkat', 'err'); } };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="NPS score" value={nps.toFixed(0)} tone={nps >= 50 ? 'ok' : nps >= 0 ? 'warn' : 'bad'} icon={<Smile size={16} />} sub={`${num(rows.length)} responses`} />
        <Stat label="Average rating" value={avgStars.toFixed(1) + ' ★'} tone={avgStars >= 4 ? 'ok' : 'warn'} icon={<Star size={16} />} />
        <Stat label="Promoters" value={pct(rows.length ? (promoters / rows.length) * 100 : 0)} tone="ok" />
        <Stat label="Open complaints" value={num(unresolved.length)} tone="bad" icon={<Frown size={16} />} />
      </div>

      <Card>
        <SectionTitle title="Customer feedback & NPS" sub="Rating lijiye, complaint track kijiye, khush customers ko Google review par bhejiye"
          right={<div className="flex gap-2">
            <button className="btn-soft" onClick={() => downloadCSV('feedback.csv', rows.map((r) => ({
              date: dt(r.ts), customer: r.customerName || '', phone: r.phone || '', nps: r.score, stars: r.rating,
              tags: (r.tags || []).join('|'), comment: r.comment || '', resolved: r.resolved ? 'yes' : 'no', source: r.source,
            })))}><Download size={15} /> CSV</button>
            <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={15} /> Add feedback</button>
          </div>} />
        <div className="mb-2 flex flex-wrap gap-2 text-[11px]">
          <Badge tone="ok">Promoters {promoters}</Badge>
          <Badge tone="warn">Passives {passives}</Badge>
          <Badge tone="bad">Detractors {detractors}</Badge>
          {tagCounts.map(([t, c]) => <Badge key={t} tone="muted">{t} · {c}</Badge>)}
        </div>
        <Tabs active={tab} onChange={(t) => setTab(t as any)} tabs={[
          { id: 'all', label: 'All feedback', count: rows.length },
          { id: 'open', label: 'Needs follow-up', count: unresolved.length },
          { id: 'qr', label: 'Review QR' },
        ]} />
      </Card>

      {tab === 'qr' ? (
        <Card>
          <SectionTitle title="Google review QR" sub="Counter par rakhiye — 5-star customers seedha review page par jaenge" />
          <Field label="Your review link"><Input value={reviewUrl} onChange={(e) => setReviewUrl(e.target.value)} /></Field>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <button className="btn-primary" onClick={makeQr}><QrCode size={15} /> Generate QR</button>
            {qr && <>
              <div className="rounded-xl bg-white p-3 text-center"><img src={qr} className="h-48 w-48" alt="Review QR" /><p className="mt-1 text-[11px] font-bold text-black">Rate us ⭐</p></div>
              <button className="btn-soft" onClick={() => printHTML(`<div style="text-align:center;font-family:system-ui;padding:40px">
                <h1 style="margin:0">${s.shopName}</h1><p style="color:#555">Aapka feedback humare liye keemti hai 🙏<br/>Scan kar ke rating dijiye</p>
                <img src="${qr}" style="width:300px;height:300px"/></div>`)}>Print counter card</button>
            </>}
          </div>
        </Card>
      ) : list.length === 0 ? (
        <Empty title="Abhi koi feedback nahi" sub="Counter par QR lagaiye ya manually feedback add kijiye." icon={<MessageSquare size={22} />} />
      ) : (
        <Card pad={false}>
          {list.map((r) => (
            <div key={r.id} className="border-b border-line p-3 last:border-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={r.score >= 9 ? 'ok' : r.score >= 7 ? 'warn' : 'bad'}>NPS {r.score}</Badge>
                <span className="text-xs text-warn">{'★'.repeat(r.rating)}<span className="text-ink3">{'★'.repeat(5 - r.rating)}</span></span>
                <span className="min-w-0 flex-1 truncate text-xs text-ink">{r.customerName || 'Walk-in'} <span className="text-ink3">· {dt(r.ts)} · {r.source}</span></span>
                {r.resolved && <Badge tone="ok"><CheckCircle2 size={10} /> resolved</Badge>}
              </div>
              {r.comment && <p className="mt-1 text-xs text-ink2">{r.comment}</p>}
              {(r.tags || []).length > 0 && <div className="mt-1 flex flex-wrap gap-1">{(r.tags || []).map((t) => <Badge key={t} tone="muted">{t}</Badge>)}</div>}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {r.phone && <button className="btn-soft px-2 py-1 text-[11px]" onClick={() => window.open(waLink(r.phone!, `Namaste ${r.customerName || ''} 🙏\n\nAapke feedback ke liye dhanyavaad. ${r.score < 7 ? 'Humein afsos hai ki experience achha nahi raha — hum isse theek kar rahe hain.' : 'Aapka support hamari taakat hai!'}\n\n— ${s.shopName}`), '_blank')}><MessageCircle size={12} /> Reply on WhatsApp</button>}
                {!r.resolved && r.score < 7 && <button className="btn-soft px-2 py-1 text-[11px]" onClick={async () => { await db.feedback.update(r.id, { resolved: true }); toast('Marked resolved'); }}>Mark resolved</button>}
                <button className="btn-ghost px-2 py-1 text-[11px]" onClick={async () => { await db.feedback.delete(r.id); toastUndo('Feedback deleted', async () => { await db.feedback.put(r); toast('Restored'); }); }}>Delete</button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {open && <FeedbackModal customers={customers} sales={sales} onClose={() => setOpen(false)} />}
    </div>
  );
}

function FeedbackModal({ customers, sales, onClose }: { customers: any[]; sales: Sale[]; onClose: () => void }) {
  const s = useSettings();
  const [f, setF] = useState<FB>({ id: '', ts: Date.now(), score: 9, rating: 5, source: 'counter', tags: [] });
  const toggleTag = (t: string) => setF((x) => ({ ...x, tags: (x.tags || []).includes(t) ? x.tags!.filter((y) => y !== t) : [...(x.tags || []), t] }));
  const save = async () => {
    const rec = { ...f, id: uid('fb_') };
    await db.feedback.add(rec);
    await logActivity('feedback', `NPS ${rec.score}/10 from ${rec.customerName || 'walk-in'}`);
    toast('Feedback saved'); onClose();
  };
  const recent = sales.slice(0, 10);
  return (
    <Modal open onClose={onClose} title="Add customer feedback" footer={<button className="btn-primary w-full" onClick={save}>Save feedback</button>}>
      <Field label="Customer (optional)">
        <Select value={f.customerId || ''} onChange={(e) => { const c = customers.find((x: any) => x.id === e.target.value); setF({ ...f, customerId: c?.id, customerName: c?.name, phone: c?.phone }); }}>
          <option value="">Walk-in</option>{customers.slice(0, 500).map((c: any) => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
        </Select>
      </Field>
      <Field label={`Would they recommend you? (${f.score}/10)`} className="mt-3">
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: 11 }, (_, i) => (
            <button key={i} onClick={() => setF({ ...f, score: i })}
              className={cx('h-8 w-8 rounded-lg border text-xs font-bold', f.score === i ? (i >= 9 ? 'border-ok bg-ok/20 text-ok' : i >= 7 ? 'border-warn bg-warn/20 text-warn' : 'border-bad bg-bad/20 text-bad') : 'border-line text-ink3')}>{i}</button>
          ))}
        </div>
      </Field>
      <Field label="Star rating" className="mt-3">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setF({ ...f, rating: n })} className={cx('text-2xl', n <= f.rating ? 'text-warn' : 'text-ink3')}>★</button>
          ))}
        </div>
      </Field>
      <Field label="What was it about?" className="mt-3">
        <div className="flex flex-wrap gap-1.5">
          {TAGS.map((t) => <button key={t} className={cx('btn-soft px-2 py-1 text-[11px]', (f.tags || []).includes(t) && 'ring-1 ring-brand')} onClick={() => toggleTag(t)}>{t}</button>)}
        </div>
      </Field>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Source">
          <Select value={f.source} onChange={(e) => setF({ ...f, source: e.target.value as any })}>
            <option value="counter">At counter</option><option value="whatsapp">WhatsApp</option><option value="qr">QR / online</option><option value="phone">Phone call</option>
          </Select>
        </Field>
        <Field label="Link to bill (optional)">
          <Select value={f.saleId || ''} onChange={(e) => { const sale = recent.find((x) => x.id === e.target.value); setF({ ...f, saleId: sale?.id, billNo: sale?.invoiceNo }); }}>
            <option value="">None</option>{recent.map((x) => <option key={x.id} value={x.id}>{x.invoiceNo} · {money(x.total, s.currency)}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Comment" className="mt-3"><Textarea rows={3} value={f.comment || ''} onChange={(e) => setF({ ...f, comment: e.target.value })} placeholder="Customer ne kya kaha…" /></Field>
    </Modal>
  );
}
