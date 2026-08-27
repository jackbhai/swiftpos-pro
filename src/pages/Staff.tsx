import { useState } from 'react';
import { Plus, Trash2, LogIn, LogOut, Shield, Clock } from 'lucide-react';
import { useStaff, useShifts, useSales } from '@/hooks/useData';
import { db, uid, logActivity } from '@/db/db';
import { money, moneyShort, dt, num } from '@/lib/format';
import { Card, Stat, Modal, Field, Input, Select, Empty, Badge } from '@/components/ui';
import { useSession } from '@/store/session';
import { useSettings } from '@/store/settings';
import { toast } from '@/store/ui';
import type { Staff, Shift } from '@/db/types';

export default function StaffPage() {
  const staff = useStaff() || [];
  const shifts = useShifts() || [];
  const sales = useSales() || [];
  const session = useSession();
  const s = useSettings();
  const [open, setOpen] = useState(false);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [f, setF] = useState({ name: '', pin: '', role: 'cashier', commissionPct: '0' });
  const [cash, setCash] = useState('');

  const activeShift = shifts.find((x: Shift) => !x.closedAt);
  const shiftSales = activeShift ? sales.filter((x: any) => x.ts >= activeShift.openedAt) : [];
  const shiftCash = shiftSales.filter((x: any) => x.payMode === 'cash').reduce((t: number, x: any) => t + x.total, 0);

  const add = async () => {
    if (!f.name.trim() || f.pin.length < 4) return toast('Name and 4-digit PIN required', 'err');
    await db.staff.add({ id: uid('st_'), name: f.name, pin: f.pin, role: f.role as any, active: true, commissionPct: +f.commissionPct || 0, createdAt: Date.now() });
    toast('Staff added'); setOpen(false); setF({ name: '', pin: '', role: 'cashier', commissionPct: '0' });
  };

  const openShift = async () => {
    const id = uid('sh_');
    await db.shifts.add({ id, staffId: session.staff?.id, staffName: session.staff?.name, openedAt: Date.now(), openingCash: +cash || 0 });
    session.setShift(id); await logActivity('shift', `Shift opened with ${money(+cash || 0, s.currency)}`);
    toast('Shift opened'); setShiftOpen(false); setCash('');
  };

  const closeShift = async () => {
    if (!activeShift) return;
    const expected = activeShift.openingCash + shiftCash;
    await db.shifts.update(activeShift.id, { closedAt: Date.now(), closingCash: +cash || expected, expected, variance: (+cash || expected) - expected });
    session.setShift(undefined); await logActivity('shift', `Shift closed · expected ${money(expected, s.currency)}`);
    toast('Shift closed'); setShiftOpen(false); setCash('');
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Team members" value={num(staff.length)} icon={<Shield size={16} />} />
        <Stat label="Signed in as" value={session.staff?.name ?? 'Nobody'} />
        <Stat label="Active shift" value={activeShift ? 'Open' : 'Closed'} tone={activeShift ? 'ok' : 'warn'} icon={<Clock size={16} />} />
        <Stat label="Cash in drawer" value={moneyShort(activeShift ? activeShift.openingCash + shiftCash : 0, s.currency)} />
      </div>

      <Card className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-bold text-ink">Team</p>
        <button className="btn-primary ml-auto" onClick={() => setOpen(true)}><Plus size={16} /> Add staff</button>
        <button className="btn-soft" onClick={() => setShiftOpen(true)}>{activeShift ? <><LogOut size={15} /> Close shift</> : <><LogIn size={15} /> Open shift</>}</button>
      </Card>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {staff.map((m: Staff) => (
          <Card key={m.id} className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/15 text-sm font-bold text-brand">{m.name[0]}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink">{m.name}</p>
              <p className="text-[11px] text-ink3">{m.role} · PIN ••••{m.commissionPct ? ` · ${m.commissionPct}% commission` : ''}</p>
            </div>
            {session.staff?.id === m.id ? <Badge tone="ok">signed in</Badge> :
              <button className="chip" onClick={() => { session.login(m); toast(`Signed in as ${m.name}`); }}>Sign in</button>}
            <button className="text-ink3 hover:text-bad" onClick={async () => { await db.staff.delete(m.id); toast('Removed'); }}><Trash2 size={14} /></button>
          </Card>
        ))}
      </div>

      <Card pad={false}>
        <p className="label p-3 pb-0">Shift history</p>
        {shifts.length === 0 ? <Empty title="No shifts recorded" /> : (
          <div className="divide-y divide-line">
            {shifts.slice(0, 20).map((x: Shift) => (
              <div key={x.id} className="flex items-center gap-3 px-3 py-2 text-xs">
                <span className="flex-1 text-ink">{x.staffName ?? 'Staff'} · {dt(x.openedAt)}</span>
                <span className="text-ink3">open {money(x.openingCash, s.currency)}</span>
                {x.closedAt ? <>
                  <span className="text-ink3">close {money(x.closingCash ?? 0, s.currency)}</span>
                  <Badge tone={Math.abs(x.variance ?? 0) < 1 ? 'ok' : 'bad'}>{(x.variance ?? 0) >= 0 ? '+' : ''}{money(x.variance ?? 0, s.currency)}</Badge>
                </> : <Badge tone="warn">running</Badge>}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Add staff" footer={<button className="btn-primary w-full" onClick={add}>Add</button>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
          <Field label="4-digit PIN"><Input inputMode="numeric" maxLength={4} value={f.pin} onChange={(e) => setF({ ...f, pin: e.target.value })} /></Field>
          <Field label="Role"><Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="cashier">Cashier</option><option value="manager">Manager</option><option value="owner">Owner</option></Select></Field>
          <Field label="Commission %"><Input inputMode="decimal" value={f.commissionPct} onChange={(e) => setF({ ...f, commissionPct: e.target.value })} /></Field>
        </div>
      </Modal>

      <Modal open={shiftOpen} onClose={() => setShiftOpen(false)} title={activeShift ? 'Close shift' : 'Open shift'}
        footer={<button className="btn-primary w-full" onClick={activeShift ? closeShift : openShift}>{activeShift ? 'Close & reconcile' : 'Open shift'}</button>}>
        {activeShift && (
          <div className="mb-3 space-y-1 rounded-xl border border-line bg-surface2/50 p-3 text-xs">
            <div className="flex justify-between"><span className="text-ink3">Opening cash</span><span className="font-mono text-ink">{money(activeShift.openingCash, s.currency)}</span></div>
            <div className="flex justify-between"><span className="text-ink3">Cash sales</span><span className="font-mono text-ink">{money(shiftCash, s.currency)}</span></div>
            <div className="flex justify-between font-bold"><span className="text-ink3">Expected drawer</span><span className="font-mono text-brand">{money(activeShift.openingCash + shiftCash, s.currency)}</span></div>
            <div className="flex justify-between"><span className="text-ink3">Bills in shift</span><span className="font-mono text-ink">{shiftSales.length}</span></div>
          </div>
        )}
        <Field label={activeShift ? 'Counted cash' : 'Opening float'}><Input inputMode="decimal" value={cash} onChange={(e) => setCash(e.target.value)} autoFocus /></Field>
      </Modal>
    </div>
  );
}
