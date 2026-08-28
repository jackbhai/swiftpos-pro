import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Plus, Clock, MessageCircle, ShoppingCart, Trash2, UserCheck, CheckCircle2 } from 'lucide-react';
import { useAppointments, useCustomers, useStaff } from '@/hooks/useData';
import { db, uid, logActivity } from '@/db/db';
import { money, num, tOnly, dOnly, cx } from '@/lib/format';
import { Card, Stat, Modal, Field, Input, Select, Textarea, Empty, Badge, Tabs, SectionTitle } from '@/components/ui';
import { useSettings } from '@/store/settings';
import { useCart } from '@/store/cart';
import { toast, toastUndo } from '@/store/ui';
import { waLink } from '@/lib/receipt';
import type { Appointment } from '@/db/types';

const TONE: any = { booked: 'warn', confirmed: 'brand', arrived: 'ok', done: 'muted', 'no-show': 'bad', cancelled: 'bad' };
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 8am – 10pm

/** Appointments & bookings — salon, clinic, tailor, service centre, tuition, anything slot-based. */
export default function Appointments() {
  const appts = useAppointments() || [];
  const customers = useCustomers() || [];
  const staff = useStaff() || [];
  const s = useSettings();
  const nav = useNavigate();

  const [day, setDay] = useState(new Date().toISOString().slice(0, 10));
  const [tab, setTab] = useState<'day' | 'upcoming' | 'all'>('day');
  const [editor, setEditor] = useState<Appointment | null>(null);

  const dayStart = new Date(day + 'T00:00:00').getTime();
  const dayEnd = dayStart + 86399999;
  const dayList = appts.filter((a: Appointment) => a.ts >= dayStart && a.ts <= dayEnd);
  const upcoming = appts.filter((a: Appointment) => a.ts >= Date.now() && !['cancelled', 'done'].includes(a.status));
  const list = tab === 'day' ? dayList : tab === 'upcoming' ? upcoming : appts;

  const expected = dayList.filter((a: Appointment) => !['cancelled', 'no-show'].includes(a.status)).reduce((t: number, a: Appointment) => t + a.price, 0);
  const noShowRate = appts.length ? (appts.filter((a: Appointment) => a.status === 'no-show').length / appts.length) * 100 : 0;

  const setStatus = async (a: Appointment, status: Appointment['status']) => {
    await db.appointments.update(a.id, { status });
    toast(`${a.customerName} → ${status}`);
  };

  const bill = (a: Appointment) => {
    useCart.getState().load([{
      id: uid('l_'), productId: 'svc-' + a.id, name: a.service, qty: 1, price: a.price, basePrice: a.price,
      cost: 0, gst: s.defaultGst ?? 18, unit: 'pc', discount: 0,
    }], a.customerId, a.customerName);
    db.appointments.update(a.id, { status: 'done' });
    nav('/pos');
  };

  const slots = useMemo(() => HOURS.map((h) => ({
    h, items: dayList.filter((a: Appointment) => new Date(a.ts).getHours() === h).sort((x: Appointment, y: Appointment) => x.ts - y.ts),
  })), [dayList]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Today's bookings" value={num(dayList.length)} tone="brand" icon={<CalendarDays size={16} />} />
        <Stat label="Expected revenue" value={money(expected, s.currency)} tone="ok" />
        <Stat label="Upcoming" value={num(upcoming.length)} tone="warn" icon={<Clock size={16} />} />
        <Stat label="No-show rate" value={noShowRate.toFixed(1) + '%'} tone={noShowRate > 10 ? 'bad' : 'ok'} />
      </div>

      <Card>
        <SectionTitle title="Appointments & bookings" sub="Salon, clinic, tailor, tuition — slot-wise schedule with reminders"
          right={<div className="flex gap-2">
            <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="h-9" />
            <button className="btn-primary" onClick={() => setEditor(blank(day))}><Plus size={15} /> Book slot</button>
          </div>} />
        <Tabs active={tab} onChange={(t) => setTab(t as any)} tabs={[
          { id: 'day', label: 'Day view', count: dayList.length },
          { id: 'upcoming', label: 'Upcoming', count: upcoming.length },
          { id: 'all', label: 'All', count: appts.length },
        ]} />
      </Card>

      {tab === 'day' ? (
        <Card pad={false}>
          {slots.map(({ h, items }) => (
            <div key={h} className="flex gap-2 border-b border-line p-2 last:border-0">
              <span className="w-14 shrink-0 pt-1 font-mono text-[11px] text-ink3">{String(h).padStart(2, '0')}:00</span>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                {items.length === 0 ? (
                  <button className="rounded-lg border border-dashed border-line px-2 py-1.5 text-left text-[11px] text-ink3 hover:border-brand/50 hover:text-brand"
                    onClick={() => setEditor(blank(day, h))}>+ free slot</button>
                ) : items.map((a: Appointment) => (
                  <div key={a.id} className={cx('flex flex-wrap items-center gap-2 rounded-xl border p-2',
                    a.status === 'arrived' ? 'border-ok/40 bg-ok/5' : a.status === 'cancelled' || a.status === 'no-show' ? 'border-bad/30 bg-bad/5' : 'border-line')}>
                    <span className="font-mono text-[11px] text-ink3">{tOnly(a.ts)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-ink">{a.customerName} · {a.service}</p>
                      <p className="truncate text-[10px] text-ink3">{a.durationMin} min{a.staffName ? ' · ' + a.staffName : ''}{a.phone ? ' · ' + a.phone : ''}</p>
                    </div>
                    <Badge tone={TONE[a.status]}>{a.status}</Badge>
                    <span className="font-mono text-xs text-ink">{money(a.price, s.currency)}</span>
                    <button className="btn-soft px-2 py-1 text-[11px]" onClick={() => setStatus(a, 'arrived')}><UserCheck size={12} /></button>
                    <button className="btn-soft px-2 py-1 text-[11px]" onClick={() => bill(a)}><ShoppingCart size={12} /></button>
                    {a.phone && <button className="btn-soft px-2 py-1 text-[11px]" onClick={() => window.open(waLink(a.phone!, `Namaste ${a.customerName}, aapka ${a.service} appointment ${dOnly(a.ts)} ${tOnly(a.ts)} par confirm hai — ${s.shopName}`), '_blank')}><MessageCircle size={12} /></button>}
                    <button className="btn-ghost px-2 py-1 text-[11px]" onClick={() => setEditor(a)}>Edit</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Card>
      ) : list.length === 0 ? <Empty title="No appointments" icon={<CalendarDays size={22} />} /> : (
        <Card pad={false}>
          {list.map((a: Appointment) => (
            <div key={a.id} className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5 text-xs last:border-0">
              <span className="w-32 shrink-0 text-ink3">{dOnly(a.ts)} {tOnly(a.ts)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{a.customerName} · {a.service}</p>
                <p className="truncate text-[10px] text-ink3">{a.staffName || 'Any staff'} · {a.durationMin} min</p>
              </div>
              <Badge tone={TONE[a.status]}>{a.status}</Badge>
              <span className="font-mono text-ink">{money(a.price, s.currency)}</span>
              <button className="btn-soft px-2 py-1 text-[11px]" onClick={() => setStatus(a, 'done')}><CheckCircle2 size={12} /></button>
              <button className="btn-ghost px-2 py-1 text-[11px]" onClick={async () => {
                await db.appointments.delete(a.id);
                toastUndo('Appointment deleted', async () => { await db.appointments.put(a); toast('Restored'); });
              }}><Trash2 size={12} /></button>
            </div>
          ))}
        </Card>
      )}

      {editor && <ApptEditor appt={editor} customers={customers} staff={staff} onClose={() => setEditor(null)} />}
    </div>
  );
}

const blank = (day: string, hour = 10): Appointment => ({
  id: '', ts: new Date(`${day}T${String(hour).padStart(2, '0')}:00:00`).getTime(), durationMin: 30,
  customerName: '', service: '', price: 0, status: 'booked', createdAt: Date.now(),
});

function ApptEditor({ appt, customers, staff, onClose }: { appt: Appointment; customers: any[]; staff: any[]; onClose: () => void }) {
  const [f, setF] = useState<Appointment>(appt);
  const d = new Date(f.ts);
  const dateStr = d.toISOString().slice(0, 10);
  const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  const save = async () => {
    if (!f.customerName.trim()) return toast('Customer name required', 'err');
    if (!f.service.trim()) return toast('Service required', 'err');
    const rec = { ...f, id: f.id || uid('ap_') };
    await db.appointments.put(rec);
    await logActivity('appointment', `${rec.customerName} · ${rec.service} · ${dOnly(rec.ts)}`);
    toast('Appointment saved'); onClose();
  };

  return (
    <Modal open onClose={onClose} title={f.id ? 'Edit appointment' : 'Book appointment'}
      footer={<button className="btn-primary w-full" onClick={save}>Save booking</button>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Date"><Input type="date" value={dateStr} onChange={(e) => setF({ ...f, ts: new Date(`${e.target.value}T${timeStr}`).getTime() })} /></Field>
        <Field label="Time"><Input type="time" value={timeStr} onChange={(e) => setF({ ...f, ts: new Date(`${dateStr}T${e.target.value}`).getTime() })} /></Field>
        <Field label="Customer">
          <Select value={f.customerId || ''} onChange={(e) => { const c = customers.find((x: any) => x.id === e.target.value); setF({ ...f, customerId: c?.id, customerName: c?.name || f.customerName, phone: c?.phone }); }}>
            <option value="">New / walk-in</option>
            {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
          </Select>
        </Field>
        <Field label="Customer name"><Input value={f.customerName} onChange={(e) => setF({ ...f, customerName: e.target.value })} /></Field>
        <Field label="Phone"><Input value={f.phone || ''} onChange={(e) => setF({ ...f, phone: e.target.value })} inputMode="tel" /></Field>
        <Field label="Service"><Input value={f.service} onChange={(e) => setF({ ...f, service: e.target.value })} placeholder="Haircut / consultation / fitting" /></Field>
        <Field label="Duration (min)"><Input inputMode="numeric" value={f.durationMin} onChange={(e) => setF({ ...f, durationMin: +e.target.value || 30 })} /></Field>
        <Field label="Price"><Input inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: +e.target.value || 0 })} /></Field>
        <Field label="Staff">
          <Select value={f.staffId || ''} onChange={(e) => { const st = staff.find((x: any) => x.id === e.target.value); setF({ ...f, staffId: st?.id, staffName: st?.name }); }}>
            <option value="">Any staff</option>{staff.map((st: any) => <option key={st.id} value={st.id}>{st.name}</option>)}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as any })}>
            {['booked', 'confirmed', 'arrived', 'done', 'no-show', 'cancelled'].map((x) => <option key={x} value={x}>{x}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Note" className="mt-3"><Textarea rows={2} value={f.note || ''} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
    </Modal>
  );
}
