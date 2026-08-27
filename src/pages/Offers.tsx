import { useState } from 'react';
import { Plus, Trash2, Ticket, Gift, Power } from 'lucide-react';
import { useCoupons, useCustomers } from '@/hooks/useData';
import { db, uid } from '@/db/db';
import { money, num } from '@/lib/format';
import { Card, Stat, Modal, Field, Input, Select, Empty, Badge, Toggle } from '@/components/ui';
import { useSettings } from '@/store/settings';
import { toast } from '@/store/ui';
import type { Coupon } from '@/db/types';

export default function Offers() {
  const coupons = useCoupons() || [];
  const customers = useCustomers() || [];
  const s = useSettings();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ code: '', type: 'percent', value: '10', minBill: '0', maxDiscount: '', usageLimit: '', expiry: '' });

  const save = async () => {
    if (!f.code.trim()) return toast('Code required', 'err');
    await db.coupons.add({
      id: uid('cp_'), code: f.code.toUpperCase().trim(), type: f.type as any, value: +f.value || 0,
      minBill: +f.minBill || 0, maxDiscount: f.maxDiscount ? +f.maxDiscount : undefined,
      usageLimit: f.usageLimit ? +f.usageLimit : undefined, used: 0, active: true, expiry: f.expiry || undefined,
    });
    toast('Coupon created'); setOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Coupons" value={num(coupons.length)} icon={<Ticket size={16} />} sub={`${coupons.filter((c: Coupon) => c.active).length} active`} />
        <Stat label="Redemptions" value={num(coupons.reduce((t: number, c: Coupon) => t + c.used, 0))} tone="ok" />
        <Stat label="Loyalty points issued" value={num(customers.reduce((t: number, c: any) => t + c.points, 0))} tone="warn" icon={<Gift size={16} />} />
        <Stat label="Point value" value={money(s.pointValue, s.currency)} sub={`${s.pointsPer100} pt per ${money(100, s.currency)}`} />
      </div>

      <Card className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-bold text-ink">Coupon codes</p>
        <button className="btn-primary ml-auto" onClick={() => setOpen(true)}><Plus size={16} /> New coupon</button>
      </Card>

      {coupons.length === 0 ? <Empty title="No coupons yet" /> : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {coupons.map((c: Coupon) => (
            <Card key={c.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-extrabold text-brand">{c.code}</span>
                <Badge tone={c.active ? 'ok' : 'muted'}>{c.active ? 'active' : 'paused'}</Badge>
                <button className="ml-auto text-ink3 hover:text-ink" onClick={() => db.coupons.update(c.id, { active: !c.active })}><Power size={14} /></button>
                <button className="text-ink3 hover:text-bad" onClick={async () => { await db.coupons.delete(c.id); toast('Deleted'); }}><Trash2 size={14} /></button>
              </div>
              <p className="text-xs text-ink2">{c.type === 'flat' ? money(c.value, s.currency) + ' off' : c.value + '% off'}{c.maxDiscount ? ` (max ${money(c.maxDiscount, s.currency)})` : ''} · min bill {money(c.minBill, s.currency)}</p>
              <p className="text-[11px] text-ink3">Used {c.used}{c.usageLimit ? ` / ${c.usageLimit}` : ''}{c.expiry ? ` · expires ${c.expiry}` : ''}</p>
            </Card>
          ))}
        </div>
      )}

      <Card className="space-y-3">
        <p className="text-sm font-bold text-ink">Loyalty programme</p>
        <Toggle checked={s.loyaltyEnabled} onChange={(v) => s.set({ loyaltyEnabled: v })} label="Enable loyalty points" hint="Points accrue on every attributed sale" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={`Points per ${money(100, s.currency)}`}><Input inputMode="decimal" value={s.pointsPer100} onChange={(e) => s.set({ pointsPer100: +e.target.value || 0 })} /></Field>
          <Field label="Value of 1 point"><Input inputMode="decimal" value={s.pointValue} onChange={(e) => s.set({ pointValue: +e.target.value || 0 })} /></Field>
          <Field label="Minimum redemption"><Input inputMode="numeric" value={s.minRedeem} onChange={(e) => s.set({ minRedeem: +e.target.value || 0 })} /></Field>
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="New coupon" footer={<button className="btn-primary w-full" onClick={save}>Create</button>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Code"><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="SAVE20" autoFocus /></Field>
          <Field label="Type"><Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="percent">Percent %</option><option value="flat">Flat ₹</option></Select></Field>
          <Field label="Value"><Input inputMode="decimal" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></Field>
          <Field label="Min bill"><Input inputMode="decimal" value={f.minBill} onChange={(e) => setF({ ...f, minBill: e.target.value })} /></Field>
          <Field label="Max discount"><Input inputMode="decimal" value={f.maxDiscount} onChange={(e) => setF({ ...f, maxDiscount: e.target.value })} /></Field>
          <Field label="Usage limit"><Input inputMode="numeric" value={f.usageLimit} onChange={(e) => setF({ ...f, usageLimit: e.target.value })} /></Field>
          <Field label="Expiry" className="sm:col-span-2"><Input type="date" value={f.expiry} onChange={(e) => setF({ ...f, expiry: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}
