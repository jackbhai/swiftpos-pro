import { useState, useMemo } from 'react';
import { Plus, Phone, Trash2, Pencil, Download, MessageCircle } from 'lucide-react';
import { useVendors, useProducts, usePOs } from '@/hooks/useData';
import { db, uid } from '@/db/db';
import { money, moneyShort, num, initials } from '@/lib/format';
import { downloadCSV } from '@/lib/csv';
import { Card, Stat, Modal, Field, Input, Empty, SearchBar, Badge, Textarea } from '@/components/ui';
import { useSettings, useShop } from '@/store/settings';
import { toast } from '@/store/ui';
import { waLink } from '@/lib/receipt';
import type { Vendor } from '@/db/types';

export default function Vendors() {
  const vendors = useVendors() || [];
  const products = useProducts() || [];
  const pos = usePOs() || [];
  const s = useSettings();
  const { terms } = useShop();
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<Vendor | null>(null);

  const list = useMemo(() => vendors.filter((v: Vendor) => !q || v.name.toLowerCase().includes(q.toLowerCase()) || (v.phone ?? '').includes(q)), [vendors, q]);
  const payable = vendors.reduce((t: number, v: Vendor) => t + v.payable, 0);

  const save = async (v: Vendor) => {
    if (!v.name.trim()) return toast('Name required', 'err');
    if (v.id) await db.vendors.put(v); else await db.vendors.add({ ...v, id: uid('v_'), createdAt: Date.now() });
    toast('Saved'); setEdit(null);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={terms.vendor + 's'} value={num(vendors.length)} />
        <Stat label="Total payable" value={moneyShort(payable, s.currency)} tone="bad" />
        <Stat label="Purchase orders" value={num(pos.length)} />
        <Stat label="Linked items" value={num(products.filter((p: any) => p.vendorId).length)} />
      </div>

      <Card className="flex flex-wrap gap-2">
        <SearchBar value={q} onChange={setQ} placeholder="Search vendors…" />
        <button className="btn-primary" onClick={() => setEdit({ id: '', name: '', payable: 0, createdAt: Date.now() } as Vendor)}><Plus size={16} /> Add</button>
        <button className="btn-ghost" onClick={() => downloadCSV('vendors.csv', list.map((v: Vendor) => ({ name: v.name, phone: v.phone ?? '', gstin: v.gstin ?? '', payable: v.payable })))}><Download size={15} /> CSV</button>
      </Card>

      {list.length === 0 ? <Empty title="No vendors" /> : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((v: Vendor) => {
            const items = products.filter((p: any) => p.vendorId === v.id).length;
            return (
              <Card key={v.id} className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/15 text-sm font-bold text-brand">{initials(v.name)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{v.name}</p>
                    <p className="text-[11px] text-ink3">{v.phone ?? 'No phone'} · {items} items</p>
                  </div>
                  {v.payable > 0 && <Badge tone="bad">{money(v.payable, s.currency)}</Badge>}
                </div>
                {v.gstin && <p className="text-[11px] text-ink3">GSTIN {v.gstin}</p>}
                <div className="flex gap-1.5">
                  {v.phone && <a className="chip" href={`tel:${v.phone}`}><Phone size={11} className="mr-1 inline" />Call</a>}
                  {v.phone && <button className="chip" onClick={() => window.open(waLink(v.phone!, `Hello ${v.name}, this is ${s.shopName}. We'd like to place an order.`), '_blank')}><MessageCircle size={11} className="mr-1 inline" />WhatsApp</button>}
                  <button className="chip" onClick={() => setEdit(v)}><Pencil size={11} /></button>
                  <button className="chip border-bad/40 text-bad" onClick={async () => { await db.vendors.delete(v.id); toast('Deleted'); }}><Trash2 size={11} /></button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <VendorEditor vendor={edit} onClose={() => setEdit(null)} onSave={save} />
    </div>
  );
}

function VendorEditor({ vendor, onClose, onSave }: any) {
  const [f, setF] = useState<Vendor | null>(vendor);
  useMemo(() => setF(vendor), [vendor]);
  if (!f) return null;
  const up = (k: keyof Vendor, v: any) => setF({ ...f, [k]: v } as Vendor);
  return (
    <Modal open={!!vendor} onClose={onClose} title={f.id ? 'Edit vendor' : 'New vendor'}
      footer={<div className="flex gap-2"><button className="btn-ghost flex-1" onClick={onClose}>Cancel</button><button className="btn-primary flex-1" onClick={() => onSave(f)}>Save</button></div>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2"><Input value={f.name} onChange={(e) => up('name', e.target.value)} autoFocus /></Field>
        <Field label="Phone"><Input value={f.phone ?? ''} onChange={(e) => up('phone', e.target.value)} /></Field>
        <Field label="Email"><Input value={f.email ?? ''} onChange={(e) => up('email', e.target.value)} /></Field>
        <Field label="GSTIN"><Input value={f.gstin ?? ''} onChange={(e) => up('gstin', e.target.value)} /></Field>
        <Field label="Payable"><Input inputMode="decimal" value={f.payable} onChange={(e) => up('payable', +e.target.value || 0)} /></Field>
        <Field label="Address" className="sm:col-span-2"><Textarea value={f.address ?? ''} onChange={(e) => up('address', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
