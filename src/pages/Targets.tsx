import { useMemo, useState } from 'react';
import { Target as TargetIcon, Plus, Trash2, TrendingUp, Trophy, Flag, CalendarClock } from 'lucide-react';
import { useTargets, useSales, useStaff } from '@/hooks/useData';
import { db, uid, logActivity } from '@/db/db';
import { money, moneyShort, num, pct, cx } from '@/lib/format';
import { Card, Stat, Modal, Field, Input, Select, Empty, Badge, SectionTitle } from '@/components/ui';
import { useSettings } from '@/store/settings';
import { toast, toastUndo } from '@/store/ui';
import type { Target, Sale } from '@/db/types';

/** Goals & targets — monthly shop, staff and category targets with live progress. */
export default function Targets() {
  const targets = useTargets() || [];
  const sales = useSales() || [];
  const staff = useStaff() || [];
  const s = useSettings();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [editor, setEditor] = useState<Target | null>(null);

  const from = new Date(month + '-01T00:00:00').getTime();
  const to = new Date(new Date(from).getFullYear(), new Date(from).getMonth() + 1, 0, 23, 59, 59).getTime();
  const monthSales = useMemo(() => sales.filter((x: Sale) => x.ts >= from && x.ts <= to && x.status !== 'void'), [sales, from, to]);

  const daysInMonth = new Date(new Date(from).getFullYear(), new Date(from).getMonth() + 1, 0).getDate();
  const dayNow = Math.min(daysInMonth, Math.max(1, Math.ceil((Date.now() - from) / 864e5)));
  const monthProgress = (dayNow / daysInMonth) * 100;

  const achievedFor = (t: Target) => {
    let rows = monthSales;
    if (t.scope === 'staff' && t.refId) rows = rows.filter((x: Sale) => x.staffId === t.refId);
    if (t.scope === 'category' && t.refName) rows = rows.filter((x: Sale) => x.lines.some((l) => (l as any).category === t.refName));
    switch (t.metric) {
      case 'revenue': return rows.reduce((a: number, x: Sale) => a + x.total, 0);
      case 'profit': return rows.reduce((a: number, x: Sale) => a + x.profit, 0);
      case 'bills': return rows.length;
      case 'items': return rows.reduce((a: number, x: Sale) => a + x.lines.reduce((b, l) => b + l.qty, 0), 0);
      case 'customers': return new Set(rows.map((x: Sale) => x.customerId).filter(Boolean)).size;
      default: return 0;
    }
  };

  const list = targets.filter((t: Target) => t.period === month);
  const fmt = (t: Target, v: number) => (t.metric === 'revenue' || t.metric === 'profit' ? money(v, s.currency) : num(Math.round(v)));

  const shopTarget = list.find((t: Target) => t.scope === 'shop' && t.metric === 'revenue');
  const shopAchieved = shopTarget ? achievedFor(shopTarget) : monthSales.reduce((a: number, x: Sale) => a + x.total, 0);
  const runRate = (shopAchieved / dayNow) * daysInMonth;
  const onTrack = shopTarget ? runRate >= shopTarget.value : true;
  const needPerDay = shopTarget ? Math.max(0, (shopTarget.value - shopAchieved) / Math.max(1, daysInMonth - dayNow)) : 0;

  const quickSet = async () => {
    const last = new Date(from); last.setMonth(last.getMonth() - 1);
    const lm = last.toISOString().slice(0, 7);
    const lmFrom = new Date(lm + '-01T00:00:00').getTime();
    const lmTo = new Date(last.getFullYear(), last.getMonth() + 1, 0, 23, 59, 59).getTime();
    const lastRevenue = sales.filter((x: Sale) => x.ts >= lmFrom && x.ts <= lmTo).reduce((a: number, x: Sale) => a + x.total, 0);
    const value = Math.round(lastRevenue * 1.1);
    if (!value) return toast('Pichle mahine ka data nahi mila', 'err');
    await db.targets.add({ id: uid('tg_'), period: month, scope: 'shop', metric: 'revenue', value, createdAt: Date.now(), note: 'Auto: last month +10%' });
    toast(`Target set ${money(value, s.currency)} (last month +10%)`);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Achieved this month" value={moneyShort(shopAchieved, s.currency)} tone="brand" icon={<TrendingUp size={16} />} sub={`${num(monthSales.length)} bills`} />
        <Stat label="Projected (run rate)" value={moneyShort(runRate, s.currency)} tone={onTrack ? 'ok' : 'bad'} icon={<Flag size={16} />} />
        <Stat label="Month progress" value={pct(monthProgress)} tone="warn" icon={<CalendarClock size={16} />} sub={`day ${dayNow}/${daysInMonth}`} />
        <Stat label="Targets set" value={num(list.length)} tone="ok" icon={<TargetIcon size={16} />} />
      </div>

      <Card>
        <SectionTitle title="Goals & targets" sub="Mahine ka target rakhiye — app roz bataega kitna peeche/aage hain"
          right={<div className="flex gap-2">
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-9" />
            <button className="btn-soft" onClick={quickSet}><Trophy size={15} /> Auto target</button>
            <button className="btn-primary" onClick={() => setEditor({ id: '', period: month, scope: 'shop', metric: 'revenue', value: 0, createdAt: Date.now() })}><Plus size={15} /> New target</button>
          </div>} />
        {shopTarget && (
          <div className={cx('rounded-xl border p-3', onTrack ? 'border-ok/30 bg-ok/5' : 'border-bad/30 bg-bad/5')}>
            <p className="text-xs font-semibold text-ink">
              {onTrack ? '✅ On track' : '⚠️ Behind target'} — {fmt(shopTarget, shopAchieved)} of {fmt(shopTarget, shopTarget.value)}
            </p>
            <p className="mt-0.5 text-[11px] text-ink3">
              Aaj tak {pct((shopAchieved / Math.max(1, shopTarget.value)) * 100)} pura hua · target hit karne ke liye baaki {daysInMonth - dayNow} din me roz {money(needPerDay, s.currency)} chahiye.
            </p>
          </div>
        )}
      </Card>

      {list.length === 0 ? (
        <Empty title="No targets for this month" sub="Shop ka revenue target ya staff-wise target set kijiye." icon={<TargetIcon size={22} />}
          action={<button className="btn-primary mt-2" onClick={quickSet}><Trophy size={15} /> Auto-set from last month</button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((t: Target) => {
            const got = achievedFor(t);
            const p = Math.min(100, (got / Math.max(1, t.value)) * 100);
            const expected = monthProgress;
            const ahead = p >= expected;
            return (
              <Card key={t.id}>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink capitalize">{t.scope === 'shop' ? 'Shop' : t.refName || t.scope} · {t.metric}</p>
                    <p className="text-[11px] text-ink3">{t.period}{t.note ? ' · ' + t.note : ''}</p>
                  </div>
                  <Badge tone={p >= 100 ? 'ok' : ahead ? 'brand' : 'bad'}>{p.toFixed(0)}%</Badge>
                </div>
                <p className="mt-2 font-mono text-lg font-extrabold text-ink">{fmt(t, got)}</p>
                <p className="text-[11px] text-ink3">of {fmt(t, t.value)} target</p>
                <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-surface2">
                  <div className={cx('h-full rounded-full', p >= 100 ? 'bg-ok' : ahead ? 'bg-brand' : 'bg-warn')} style={{ width: `${p}%` }} />
                  <div className="absolute top-0 h-full w-[2px] bg-ink3/60" style={{ left: `${expected}%` }} title="Where you should be today" />
                </div>
                <p className="mt-1 text-[10px] text-ink3">{ahead ? 'Pace se aage 🎉' : `Pace se ${(expected - p).toFixed(0)}% peeche`}</p>
                <div className="mt-2 flex gap-1.5">
                  <button className="btn-soft flex-1 px-2 py-1.5 text-xs" onClick={() => setEditor(t)}>Edit</button>
                  <button className="btn-ghost px-2 py-1.5 text-xs" onClick={async () => {
                    await db.targets.delete(t.id);
                    toastUndo('Target deleted', async () => { await db.targets.put(t); toast('Restored'); });
                  }}><Trash2 size={13} /></button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {editor && <TargetEditor target={editor} staff={staff} onClose={() => setEditor(null)} />}
    </div>
  );
}

function TargetEditor({ target, staff, onClose }: { target: Target; staff: any[]; onClose: () => void }) {
  const [f, setF] = useState<Target>(target);
  const save = async () => {
    if (!f.value) return toast('Enter a target value', 'err');
    const rec = { ...f, id: f.id || uid('tg_') };
    await db.targets.put(rec);
    await logActivity('target', `${rec.scope} ${rec.metric} target ${rec.value} for ${rec.period}`);
    toast('Target saved'); onClose();
  };
  return (
    <Modal open onClose={onClose} title={f.id ? 'Edit target' : 'New target'} footer={<button className="btn-primary w-full" onClick={save}>Save target</button>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Month"><Input type="month" value={f.period} onChange={(e) => setF({ ...f, period: e.target.value })} /></Field>
        <Field label="Scope">
          <Select value={f.scope} onChange={(e) => setF({ ...f, scope: e.target.value as any, refId: undefined, refName: undefined })}>
            <option value="shop">Whole shop</option><option value="staff">Per staff</option><option value="category">Per category</option>
          </Select>
        </Field>
        {f.scope === 'staff' && (
          <Field label="Staff member">
            <Select value={f.refId || ''} onChange={(e) => { const st = staff.find((x: any) => x.id === e.target.value); setF({ ...f, refId: st?.id, refName: st?.name }); }}>
              <option value="">Select…</option>{staff.map((st: any) => <option key={st.id} value={st.id}>{st.name}</option>)}
            </Select>
          </Field>
        )}
        {f.scope === 'category' && <Field label="Category"><Input value={f.refName || ''} onChange={(e) => setF({ ...f, refName: e.target.value })} /></Field>}
        <Field label="Metric">
          <Select value={f.metric} onChange={(e) => setF({ ...f, metric: e.target.value as any })}>
            <option value="revenue">Revenue</option><option value="profit">Profit</option>
            <option value="bills">Number of bills</option><option value="items">Items sold</option><option value="customers">Unique customers</option>
          </Select>
        </Field>
        <Field label="Target value"><Input inputMode="decimal" value={f.value} onChange={(e) => setF({ ...f, value: +e.target.value || 0 })} /></Field>
      </div>
      <Field label="Note" className="mt-3"><Input value={f.note || ''} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Festival push, new branch…" /></Field>
    </Modal>
  );
}
