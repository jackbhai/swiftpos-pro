import { useMemo, useState } from 'react';
import { Plus, Trash2, Download, Wallet, TrendingDown, Repeat } from 'lucide-react';
import { useExpenses, useSales } from '@/hooks/useData';
import { db, uid } from '@/db/db';
import { money, moneyShort, num, dt, rangeFor } from '@/lib/format';
import { downloadCSV } from '@/lib/csv';
import { Card, Stat, Modal, Field, Input, Select, Empty, Tabs, Badge, Textarea } from '@/components/ui';
import { useSettings } from '@/store/settings';
import { toast } from '@/store/ui';
import type { Expense } from '@/db/types';

const CATS = ['Rent', 'Salary', 'Utilities', 'Supplies', 'Transport', 'Marketing', 'Maintenance', 'Tax', 'Misc'];

export default function Expenses() {
  const expenses = useExpenses() || [];
  const sales = useSales() || [];
  const s = useSettings();
  const [period, setPeriod] = useState<'today' | '7d' | '30d' | 'month' | 'all'>('30d');
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: '', amount: '', category: 'Misc', payMode: 'cash', note: '', recurring: false });

  const [from, to] = rangeFor(period as any);
  const list = useMemo(() => expenses.filter((e: Expense) => e.ts >= from && e.ts <= to), [expenses, from, to]);
  const total = list.reduce((t: number, e: Expense) => t + e.amount, 0);
  const revenue = sales.filter((x: any) => x.ts >= from && x.ts <= to).reduce((t: number, x: any) => t + x.total, 0);
  const grossProfit = sales.filter((x: any) => x.ts >= from && x.ts <= to).reduce((t: number, x: any) => t + x.profit, 0);

  const byCat = useMemo(() => {
    const m = new Map<string, number>();
    list.forEach((e: Expense) => m.set(e.category, (m.get(e.category) || 0) + e.amount));
    return [...m].sort((a, b) => b[1] - a[1]);
  }, [list]);

  const save = async () => {
    if (!f.title.trim() || !+f.amount) return toast('Title & amount required', 'err');
    await db.expenses.add({ id: uid('e_'), title: f.title, amount: +f.amount, category: f.category, ts: Date.now(), payMode: f.payMode as any, note: f.note, recurring: f.recurring });
    toast('Expense recorded'); setOpen(false); setF({ title: '', amount: '', category: 'Misc', payMode: 'cash', note: '', recurring: false });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Expenses" value={moneyShort(total, s.currency)} tone="bad" icon={<Wallet size={16} />} sub={`${list.length} entries`} />
        <Stat label="Revenue" value={moneyShort(revenue, s.currency)} tone="ok" />
        <Stat label="Gross profit" value={moneyShort(grossProfit, s.currency)} tone="ok" />
        <Stat label="Net profit" value={moneyShort(grossProfit - total, s.currency)} tone={grossProfit - total >= 0 ? 'ok' : 'bad'} icon={<TrendingDown size={16} />} />
      </div>

      <Card className="flex flex-wrap items-center gap-2">
        <Tabs active={period} onChange={(v) => setPeriod(v as any)} tabs={[
          { id: 'today', label: 'Today' }, { id: '7d', label: '7d' }, { id: '30d', label: '30d' }, { id: 'month', label: 'Month' }, { id: 'all', label: 'All' }]} />
        <button className="btn-primary ml-auto" onClick={() => setOpen(true)}><Plus size={16} /> Add expense</button>
        <button className="btn-ghost" onClick={() => downloadCSV('expenses.csv', list.map((e: Expense) => ({ date: dt(e.ts), title: e.title, category: e.category, amount: e.amount, mode: e.payMode, note: e.note ?? '' })))}><Download size={15} /></button>
      </Card>

      {byCat.length > 0 && (
        <Card>
          <p className="label">By category</p>
          <div className="space-y-2">
            {byCat.map(([c, v]) => (
              <div key={c} className="flex items-center gap-2">
                <span className="w-24 shrink-0 text-xs text-ink2">{c}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface2"><div className="h-full rounded-full bg-bad/70" style={{ width: `${(v / byCat[0][1]) * 100}%` }} /></div>
                <span className="w-20 shrink-0 text-right font-mono text-xs text-ink">{money(v, s.currency)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {list.length === 0 ? <Empty title="No expenses in range" /> : (
        <div className="space-y-2">
          {list.map((e: Expense) => (
            <Card key={e.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-sm font-semibold text-ink">{e.title} {e.recurring && <Repeat size={12} className="text-brand" />}</p>
                <p className="text-[11px] text-ink3">{dt(e.ts)} · {e.payMode}</p>
              </div>
              <Badge>{e.category}</Badge>
              <span className="font-mono text-sm font-bold text-bad">−{money(e.amount, s.currency)}</span>
              <button className="text-ink3 hover:text-bad" onClick={async () => { await db.expenses.delete(e.id); toast('Deleted'); }}><Trash2 size={14} /></button>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Record expense"
        footer={<button className="btn-primary w-full" onClick={save}>Save expense</button>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title" className="sm:col-span-2"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} autoFocus /></Field>
          <Field label="Amount"><Input inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
          <Field label="Category"><Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="Paid via"><Select value={f.payMode} onChange={(e) => setF({ ...f, payMode: e.target.value })}>{['cash', 'upi', 'card', 'wallet'].map((m) => <option key={m}>{m}</option>)}</Select></Field>
          <Field label="Note" className="sm:col-span-2"><Textarea value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}
