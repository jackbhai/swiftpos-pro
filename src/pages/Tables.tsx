import { useState } from 'react';
import { Plus, Utensils, Trash2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTables, useHolds } from '@/hooks/useData';
import { db, uid } from '@/db/db';
import { Card, Stat, Modal, Field, Input, Select, Empty, Badge } from '@/components/ui';
import { useCart } from '@/store/cart';
import { useShop } from '@/store/settings';
import { toast } from '@/store/ui';
import { cx } from '@/lib/format';
import type { Table } from '@/db/types';

export default function Tables() {
  const tables = useTables() || [];
  const holds = useHolds() || [];
  const cart = useCart();
  const nav = useNavigate();
  const { modules } = useShop();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', area: 'Indoor', seats: '4' });

  const add = async () => {
    if (!f.name.trim()) return toast('Name required', 'err');
    await db.restaurantTables.add({ id: uid('t_'), name: f.name, area: f.area, seats: +f.seats || 2, status: 'free' });
    toast('Table added'); setOpen(false); setF({ name: '', area: 'Indoor', seats: '4' });
  };

  const areas = [...new Set(tables.map((t: Table) => t.area))];

  return (
    <div className="space-y-3">
      {!modules.tables && (
        <Card className="border-warn/40 bg-warn/5 text-xs text-warn">
          Table service is not part of your current shop type. Enable it in Settings → Shop Type → modules, or switch to Restaurant/Cafe.
        </Card>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Tables" value={tables.length} icon={<Utensils size={16} />} />
        <Stat label="Occupied" value={tables.filter((t: Table) => t.status !== 'free').length} tone="warn" />
        <Stat label="Free" value={tables.filter((t: Table) => t.status === 'free').length} tone="ok" />
        <Stat label="Open KOTs" value={holds.length} icon={<Users size={16} />} />
      </div>

      <Card className="flex items-center gap-2">
        <p className="text-sm font-bold text-ink">Floor plan</p>
        <button className="btn-primary ml-auto" onClick={() => setOpen(true)}><Plus size={16} /> Add table</button>
      </Card>

      {tables.length === 0 ? <Empty title="No tables configured" /> : areas.map((area) => (
        <Card key={area}>
          <p className="label">{area}</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
            {tables.filter((t: Table) => t.area === area).map((t: Table) => (
              <button key={t.id} onClick={() => { cart.setTable(t.id); cart.setChannel('counter'); db.restaurantTables.update(t.id, { status: 'occupied' }); toast(`${t.name} selected`); nav('/pos'); }}
                onContextMenu={async (e) => { e.preventDefault(); await db.restaurantTables.update(t.id, { status: 'free' }); toast(`${t.name} cleared`); }}
                className={cx('flex aspect-square flex-col items-center justify-center rounded-xl border text-xs font-bold transition',
                  t.status === 'free' ? 'border-line bg-surface2 text-ink2 hover:border-brand/50' : 'border-warn/50 bg-warn/10 text-warn')}>
                <Utensils size={16} className="mb-1" />{t.name}
                <span className="text-[10px] font-normal opacity-70">{t.seats} seats</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-ink3">Tap to start an order · long-press / right-click to free the table.</p>
        </Card>
      ))}

      <Modal open={open} onClose={() => setOpen(false)} title="Add table" footer={<button className="btn-primary w-full" onClick={add}>Add</button>}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="T9" autoFocus /></Field>
          <Field label="Area"><Input value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} /></Field>
          <Field label="Seats"><Input inputMode="numeric" value={f.seats} onChange={(e) => setF({ ...f, seats: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}
