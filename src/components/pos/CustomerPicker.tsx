import { useState } from 'react';
import { UserPlus, Search } from 'lucide-react';
import { Modal, Input, Field, Empty } from '@/components/ui';
import { useCustomers } from '@/hooks/useData';
import { db, uid, logActivity } from '@/db/db';
import { useCart } from '@/store/cart';
import { money, initials } from '@/lib/format';
import { toast } from '@/store/ui';

export default function CustomerPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const customers = useCustomers() || [];
  const cart = useCart();
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });

  const list = customers.filter((c: any) =>
    !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q)).slice(0, 40);

  const create = async () => {
    if (!form.name.trim() || form.phone.replace(/\D/g, '').length < 6) return toast('Name & valid phone required', 'err');
    const c = { id: uid('c_'), name: form.name.trim(), phone: form.phone.trim(), points: 0, credit: 0, totalSpend: 0, visits: 0, createdAt: Date.now() };
    await db.customers.add(c as any);
    await logActivity('customer', `Added ${c.name}`);
    cart.setCustomer(c.id, c.name); toast('Customer added & attached'); onClose(); setCreating(false); setForm({ name: '', phone: '' });
  };

  return (
    <Modal open={open} onClose={onClose} title="Attach customer">
      {creating ? (
        <div className="space-y-3">
          <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></Field>
          <Field label="Phone"><Input inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <div className="flex gap-2"><button className="btn-ghost flex-1" onClick={() => setCreating(false)}>Back</button><button className="btn-primary flex-1" onClick={create}>Save</button></div>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3" />
              <Input autoFocus className="pl-9" placeholder="Name or phone…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <button className="btn-primary" onClick={() => setCreating(true)}><UserPlus size={16} /></button>
          </div>
          {cart.customerId && (
            <button className="mt-2 w-full rounded-xl border border-bad/40 bg-bad/10 py-2 text-xs font-bold text-bad" onClick={() => { cart.setCustomer(undefined, undefined); onClose(); }}>
              Remove {cart.customerName} from bill
            </button>
          )}
          <div className="mt-3 max-h-[46vh] space-y-1.5 overflow-y-auto">
            {list.length === 0 && <Empty title="No customers found" sub="Create one with the + button" />}
            {list.map((c: any) => (
              <button key={c.id} onClick={() => { cart.setCustomer(c.id, c.name); toast(`${c.name} attached`); onClose(); }}
                className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2 text-left transition hover:border-brand/50">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-brand/15 text-xs font-bold text-brand">{initials(c.name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{c.name}</span>
                  <span className="block text-[11px] text-ink3">{c.phone} · {c.points} pts{c.credit > 0 ? ` · due ${money(c.credit)}` : ''}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
