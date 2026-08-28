import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Plus, Printer, MessageCircle, ShoppingCart, Clock, IndianRupee, ShieldCheck, Trash2 } from 'lucide-react';
import { useServiceJobs, useCustomers, useStaff } from '@/hooks/useData';
import { db, uid, logActivity } from '@/db/db';
import { money, num, dt, dOnly, cx } from '@/lib/format';
import { downloadCSV } from '@/lib/csv';
import { Card, Stat, Modal, Field, Input, Select, Textarea, Empty, SearchBar, Badge, Tabs, SectionTitle } from '@/components/ui';
import { useSettings } from '@/store/settings';
import { useCart } from '@/store/cart';
import { toast, toastUndo } from '@/store/ui';
import { printHTML, waLink } from '@/lib/receipt';
import type { ServiceJob } from '@/db/types';

const STATUSES: ServiceJob['status'][] = ['received', 'diagnosing', 'awaiting-parts', 'repairing', 'ready', 'delivered', 'returned'];
const TONE: any = { received: 'warn', diagnosing: 'brand', 'awaiting-parts': 'bad', repairing: 'brand', ready: 'ok', delivered: 'muted', returned: 'bad' };

/** Service / repair job cards — mobile, electronics, appliances, tailoring, anything that comes back later. */
export default function Service() {
  const jobs = useServiceJobs() || [];
  const customers = useCustomers() || [];
  const staff = useStaff() || [];
  const s = useSettings();
  const nav = useNavigate();
  const [tab, setTab] = useState<'open' | 'ready' | 'all'>('open');
  const [q, setQ] = useState('');
  const [editor, setEditor] = useState<ServiceJob | null>(null);

  const open = jobs.filter((j: ServiceJob) => !['delivered', 'returned'].includes(j.status));
  const ready = jobs.filter((j: ServiceJob) => j.status === 'ready');
  const term = q.trim().toLowerCase();
  const list = (tab === 'open' ? open : tab === 'ready' ? ready : jobs)
    .filter((j: ServiceJob) => !term || j.jobNo.toLowerCase().includes(term) || j.customerName.toLowerCase().includes(term) || (j.phone || '').includes(term) || j.item.toLowerCase().includes(term));

  const pipelineValue = open.reduce((t: number, j: ServiceJob) => t + (j.finalAmount ?? j.estimate) - j.advance, 0);
  const overdue = open.filter((j: ServiceJob) => j.promisedAt && Date.now() > j.promisedAt);

  const advance = async (j: ServiceJob) => {
    const next = STATUSES[Math.min(STATUSES.indexOf(j.status) + 1, STATUSES.length - 3)];
    await db.serviceJobs.update(j.id, { status: next });
    if (next === 'ready' && j.phone) {
      const text = `Namaste ${j.customerName}, aapka ${j.item} repair ho gaya hai. ${money(j.finalAmount ?? j.estimate, s.currency)} · ${s.shopName}. Aa kar collect kar lijiye.`;
      window.open(waLink(j.phone, text), '_blank');
    }
    toast(`${j.jobNo} → ${next}`);
  };

  const billJob = (j: ServiceJob) => {
    const amount = j.finalAmount ?? j.estimate;
    useCart.getState().load([{
      id: uid('l_'), productId: 'service-' + j.id, name: `Service: ${j.item} (${j.jobNo})`, qty: 1,
      price: Math.max(0, amount - j.advance), basePrice: amount, cost: (j.parts || []).reduce((t, p) => t + p.cost * p.qty, 0),
      gst: s.defaultGst ?? 18, unit: 'pc', discount: 0,
    }], j.customerId, j.customerName);
    db.serviceJobs.update(j.id, { status: 'delivered', deliveredAt: Date.now() });
    nav('/pos');
  };

  const jobCard = (j: ServiceJob) => printHTML(`<html><head><meta charset="utf-8"><title>${j.jobNo}</title><style>
    body{font-family:system-ui,Arial;padding:20px;color:#111;max-width:620px;margin:auto}
    table{width:100%;border-collapse:collapse;font-size:12px;margin-top:10px}td{border:1px solid #ddd;padding:6px}
    .muted{color:#666;font-size:11px}.big{font-size:15px;font-weight:700}</style></head><body>
    <h2 style="margin:0">${s.shopName || 'Shop'} — Service job card</h2>
    <p class=muted>${j.jobNo} · ${dt(j.ts)}${j.promisedAt ? ' · promised ' + dOnly(j.promisedAt) : ''}</p>
    <table>
      <tr><td>Customer</td><td>${j.customerName} ${j.phone || ''}</td></tr>
      <tr><td>Item</td><td>${j.item} ${j.brand || ''} ${j.serial ? '· SN ' + j.serial : ''}</td></tr>
      <tr><td>Reported issue</td><td>${j.issue}</td></tr>
      <tr><td>Accessories received</td><td>${j.accessories || '—'}</td></tr>
      <tr><td>Estimate</td><td>${j.estimate.toFixed(2)}</td></tr>
      <tr><td>Advance paid</td><td>${j.advance.toFixed(2)}</td></tr>
      <tr><td class=big>Balance</td><td class=big>${((j.finalAmount ?? j.estimate) - j.advance).toFixed(2)}</td></tr>
      ${j.warrantyDays ? `<tr><td>Service warranty</td><td>${j.warrantyDays} days</td></tr>` : ''}
    </table>
    <p class=muted>Goods once delivered will not be accepted back without this job card. Items not collected within 90 days may be disposed of.</p>
    <p class=muted>Customer sign: ______________  ·  Received by: ______________</p></body></html>`);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Open jobs" value={num(open.length)} tone="brand" icon={<Wrench size={16} />} />
        <Stat label="Ready to collect" value={num(ready.length)} tone="ok" icon={<ShieldCheck size={16} />} />
        <Stat label="Overdue" value={num(overdue.length)} tone={overdue.length ? 'bad' : 'ok'} icon={<Clock size={16} />} />
        <Stat label="Pipeline value" value={money(pipelineValue, s.currency)} tone="warn" icon={<IndianRupee size={16} />} />
      </div>

      <Card>
        <SectionTitle title="Service & repair jobs" sub="Mobile, electronics, appliance, tailoring — job card se delivery tak"
          right={<div className="flex gap-2">
            <button className="btn-soft" onClick={() => downloadCSV('service-jobs.csv', jobs.map((j: ServiceJob) => ({
              job: j.jobNo, date: dt(j.ts), customer: j.customerName, phone: j.phone || '', item: j.item, issue: j.issue,
              status: j.status, estimate: j.estimate, advance: j.advance, final: j.finalAmount ?? '', technician: j.technician || '',
            })))}>Export</button>
            <button className="btn-primary" onClick={() => setEditor(blank(s.defaultGst))}><Plus size={15} /> New job</button>
          </div>} />
        <Tabs active={tab} onChange={(t) => setTab(t as any)} tabs={[
          { id: 'open', label: 'Open', count: open.length },
          { id: 'ready', label: 'Ready', count: ready.length },
          { id: 'all', label: 'All', count: jobs.length },
        ]} />
        <div className="mt-2"><SearchBar value={q} onChange={setQ} placeholder="Job no, customer, phone or item…" /></div>
      </Card>

      {list.length === 0 ? <Empty title="No jobs here" sub="Naya repair aaye to job card banaiye." icon={<Wrench size={22} />}
        action={<button className="btn-primary mt-2" onClick={() => setEditor(blank(s.defaultGst))}><Plus size={15} /> New job</button>} /> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((j: ServiceJob) => {
            const late = j.promisedAt && Date.now() > j.promisedAt && !['delivered', 'returned'].includes(j.status);
            return (
              <Card key={j.id} className={cx(late && 'ring-1 ring-bad/50')}>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{j.jobNo} · {j.item}</p>
                    <p className="truncate text-[11px] text-ink3">{j.customerName}{j.phone ? ' · ' + j.phone : ''}</p>
                  </div>
                  <Badge tone={TONE[j.status]}>{j.status}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] text-ink2">{j.issue}</p>
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="text-ink3">{j.technician ? 'Tech: ' + j.technician : 'Unassigned'}{late ? ' · OVERDUE' : ''}</span>
                  <span className="font-mono font-bold text-brand">{money((j.finalAmount ?? j.estimate) - j.advance, s.currency)}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {!['delivered', 'returned'].includes(j.status) && <button className="btn-primary flex-1 px-2 py-1.5 text-xs" onClick={() => advance(j)}>Next stage</button>}
                  <button className="btn-soft px-2 py-1.5 text-xs" onClick={() => jobCard(j)}><Printer size={13} /></button>
                  {j.phone && <button className="btn-soft px-2 py-1.5 text-xs" onClick={() => window.open(waLink(j.phone!, `Namaste ${j.customerName}, aapke ${j.item} (${j.jobNo}) ka status: ${j.status}. — ${s.shopName}`), '_blank')}><MessageCircle size={13} /></button>}
                  <button className="btn-soft px-2 py-1.5 text-xs" onClick={() => billJob(j)}><ShoppingCart size={13} /> Bill</button>
                  <button className="btn-ghost px-2 py-1.5 text-xs" onClick={() => setEditor(j)}>Edit</button>
                  <button className="btn-ghost px-2 py-1.5 text-xs" onClick={async () => {
                    await db.serviceJobs.delete(j.id);
                    toastUndo(`${j.jobNo} deleted`, async () => { await db.serviceJobs.put(j); toast('Restored'); });
                  }}><Trash2 size={13} /></button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {editor && <JobEditor job={editor} customers={customers} staff={staff} onClose={() => setEditor(null)} />}
    </div>
  );
}

const blank = (_gst?: number): ServiceJob => ({
  id: '', jobNo: 'JOB-' + Date.now().toString().slice(-6), ts: Date.now(), customerName: '',
  item: '', issue: '', status: 'received', estimate: 0, advance: 0, warrantyDays: 30,
  promisedAt: Date.now() + 3 * 864e5, parts: [],
});

function JobEditor({ job, customers, staff, onClose }: { job: ServiceJob; customers: any[]; staff: any[]; onClose: () => void }) {
  const s = useSettings();
  const [f, setF] = useState<ServiceJob>(job);

  const partsCost = (f.parts || []).reduce((t, p) => t + p.cost * p.qty, 0);

  const save = async () => {
    if (!f.customerName.trim()) return toast('Customer name required', 'err');
    if (!f.item.trim()) return toast('Item required', 'err');
    const rec = { ...f, id: f.id || uid('sj_') };
    await db.serviceJobs.put(rec);
    await logActivity('service', `Job ${rec.jobNo} · ${rec.item} · ${rec.status}`);
    toast('Job saved'); onClose();
  };

  return (
    <Modal open onClose={onClose} wide title={f.id ? `Edit ${f.jobNo}` : 'New service job'}
      footer={<button className="btn-primary w-full" onClick={save}>Save job card</button>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Job no"><Input value={f.jobNo} onChange={(e) => setF({ ...f, jobNo: e.target.value })} /></Field>
        <Field label="Customer">
          <Select value={f.customerId || ''} onChange={(e) => { const c = customers.find((x: any) => x.id === e.target.value); setF({ ...f, customerId: c?.id, customerName: c?.name || f.customerName, phone: c?.phone }); }}>
            <option value="">New / walk-in</option>
            {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
          </Select>
        </Field>
        <Field label="Customer name"><Input value={f.customerName} onChange={(e) => setF({ ...f, customerName: e.target.value })} /></Field>
        <Field label="Phone"><Input value={f.phone || ''} onChange={(e) => setF({ ...f, phone: e.target.value })} inputMode="tel" /></Field>
        <Field label="Item"><Input value={f.item} onChange={(e) => setF({ ...f, item: e.target.value })} placeholder="Mobile / TV / Mixer…" /></Field>
        <Field label="Brand & model"><Input value={f.brand || ''} onChange={(e) => setF({ ...f, brand: e.target.value })} /></Field>
        <Field label="Serial / IMEI"><Input value={f.serial || ''} onChange={(e) => setF({ ...f, serial: e.target.value })} /></Field>
        <Field label="Technician">
          <Select value={f.technician || ''} onChange={(e) => setF({ ...f, technician: e.target.value })}>
            <option value="">Unassigned</option>{staff.map((st: any) => <option key={st.id} value={st.name}>{st.name}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Reported issue" className="mt-3"><Textarea rows={2} value={f.issue} onChange={(e) => setF({ ...f, issue: e.target.value })} /></Field>
      <Field label="Accessories received" className="mt-3"><Input value={f.accessories || ''} onChange={(e) => setF({ ...f, accessories: e.target.value })} placeholder="Charger, cover, bill…" /></Field>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Estimate"><Input inputMode="decimal" value={f.estimate} onChange={(e) => setF({ ...f, estimate: +e.target.value || 0 })} /></Field>
        <Field label="Advance"><Input inputMode="decimal" value={f.advance} onChange={(e) => setF({ ...f, advance: +e.target.value || 0 })} /></Field>
        <Field label="Final amount"><Input inputMode="decimal" value={f.finalAmount ?? ''} onChange={(e) => setF({ ...f, finalAmount: e.target.value === '' ? undefined : +e.target.value })} /></Field>
        <Field label="Warranty (days)"><Input inputMode="numeric" value={f.warrantyDays ?? 0} onChange={(e) => setF({ ...f, warrantyDays: +e.target.value || 0 })} /></Field>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Status">
          <Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as any })}>
            {STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
          </Select>
        </Field>
        <Field label="Promised date">
          <Input type="date" value={new Date(f.promisedAt || Date.now()).toISOString().slice(0, 10)}
            onChange={(e) => setF({ ...f, promisedAt: new Date(e.target.value).getTime() })} />
        </Field>
      </div>

      <div className="mt-3 rounded-xl border border-line p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink3">Parts used · cost {money(partsCost, s.currency)}</p>
          <button className="btn-soft px-2 py-1 text-[11px]" onClick={() => setF({ ...f, parts: [...(f.parts || []), { name: '', qty: 1, cost: 0 }] })}><Plus size={12} /> Add part</button>
        </div>
        {(f.parts || []).map((p, i) => (
          <div key={i} className="mb-1.5 flex items-center gap-2">
            <input className="input h-8 flex-1 text-xs" placeholder="Part name" value={p.name}
              onChange={(e) => setF({ ...f, parts: f.parts!.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
            <input className="input h-8 w-16 text-center font-mono text-xs" value={p.qty}
              onChange={(e) => setF({ ...f, parts: f.parts!.map((x, j) => (j === i ? { ...x, qty: +e.target.value || 0 } : x)) })} />
            <input className="input h-8 w-20 text-center font-mono text-xs" value={p.cost}
              onChange={(e) => setF({ ...f, parts: f.parts!.map((x, j) => (j === i ? { ...x, cost: +e.target.value || 0 } : x)) })} />
            <button className="rounded-lg p-1 text-ink3 hover:text-bad" onClick={() => setF({ ...f, parts: f.parts!.filter((_, j) => j !== i) })}><Trash2 size={13} /></button>
          </div>
        ))}
      </div>

      <Field label="Internal note" className="mt-3"><Textarea rows={2} value={f.note || ''} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
    </Modal>
  );
}
