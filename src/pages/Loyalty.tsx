import { useMemo, useState } from 'react';
import {
  Gift, Plus, Search, Wallet, Trash2, Printer, MessageCircle, Ticket, TrendingUp, Copy, QrCode,
} from 'lucide-react';
import { useGiftCards, useCustomers, useSales } from '@/hooks/useData';
import { db, uid, logActivity } from '@/db/db';
import { money, num, dt, dOnly, cx } from '@/lib/format';
import { downloadCSV } from '@/lib/csv';
import { Card, Stat, Modal, Field, Input, Select, Textarea, Empty, SearchBar, Badge, Tabs, SectionTitle } from '@/components/ui';
import { useSettings } from '@/store/settings';
import { toast, toastUndo } from '@/store/ui';
import { printHTML, waLink } from '@/lib/receipt';
import { qrDataUrl } from '@/lib/upi';
import type { GiftCard, Customer, Sale } from '@/db/types';

const randomCode = (p = 'GC') => p + Math.random().toString(36).slice(2, 7).toUpperCase() + Date.now().toString().slice(-4);

/** Gift cards, prepaid wallets, vouchers and referral codes. */
export default function Loyalty() {
  const cards = useGiftCards() || [];
  const customers = useCustomers() || [];
  const sales = useSales() || [];
  const s = useSettings();

  const [tab, setTab] = useState<'active' | 'used' | 'all'>('active');
  const [q, setQ] = useState('');
  const [editor, setEditor] = useState<GiftCard | null>(null);
  const [redeem, setRedeem] = useState<GiftCard | null>(null);

  const term = q.trim().toLowerCase();
  const list = cards
    .filter((c: GiftCard) => (tab === 'active' ? c.active && c.balance > 0 : tab === 'used' ? c.balance <= 0 || !c.active : true))
    .filter((c: GiftCard) => !term || c.code.toLowerCase().includes(term) || (c.issuedName || '').toLowerCase().includes(term) || (c.phone || '').includes(term))
    .sort((a: GiftCard, b: GiftCard) => b.issuedAt - a.issuedAt);

  const liability = cards.filter((c: GiftCard) => c.active).reduce((t: number, c: GiftCard) => t + c.balance, 0);
  const issued = cards.reduce((t: number, c: GiftCard) => t + c.faceValue, 0);
  const redeemed = issued - cards.reduce((t: number, c: GiftCard) => t + c.balance, 0);

  const pointsOutstanding = customers.reduce((t: number, c: Customer) => t + (c.points || 0), 0);
  const pointsValue = pointsOutstanding * (s.pointValue ?? 0.25);
  const topSpenders = [...customers].sort((a: Customer, b: Customer) => b.totalSpend - a.totalSpend).slice(0, 5);
  const salesWithPoints = sales.filter((x: Sale) => (x.pointsRedeemed || 0) > 0).length;

  const printCard = async (c: GiftCard) => {
    const qr = await qrDataUrl(c.code, 220);
    printHTML(`<html><head><meta charset="utf-8"><title>${c.code}</title><style>
      body{font-family:system-ui,Arial;padding:24px;display:flex;justify-content:center}
      .card{width:340px;border:2px dashed #444;border-radius:16px;padding:18px;text-align:center}
      h2{margin:0;font-size:18px}.amt{font-size:30px;font-weight:800;margin:6px 0}
      .code{font-family:monospace;font-size:20px;letter-spacing:2px;margin:8px 0}
      .muted{color:#666;font-size:11px}</style></head><body>
      <div class=card>
        <h2>${s.shopName || 'Gift Card'}</h2>
        <p class=muted>${c.kind.toUpperCase()} CARD</p>
        <p class=amt>${(s.currency || '₹')}${c.balance.toFixed(2)}</p>
        <img src="${qr}" width="150" height="150"/>
        <p class=code>${c.code}</p>
        ${c.issuedName ? `<p class=muted>For: ${c.issuedName}</p>` : ''}
        ${c.expiry ? `<p class=muted>Valid till ${c.expiry}</p>` : ''}
        <p class=muted>Present this card at the counter to redeem. Not exchangeable for cash.</p>
      </div></body></html>`);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Outstanding balance" value={money(liability, s.currency)} tone="bad" icon={<Wallet size={16} />} sub="your liability" />
        <Stat label="Total issued" value={money(issued, s.currency)} tone="brand" icon={<Gift size={16} />} sub={`${num(cards.length)} cards`} />
        <Stat label="Redeemed" value={money(redeemed, s.currency)} tone="ok" />
        <Stat label="Loyalty points live" value={num(pointsOutstanding)} tone="warn" icon={<Ticket size={16} />} sub={`≈ ${money(pointsValue, s.currency)}`} />
      </div>

      <Card>
        <SectionTitle title="Gift cards, wallets & vouchers" sub="Prepaid balance, gifting aur referral — sab yahan"
          right={<div className="flex gap-2">
            <button className="btn-soft" onClick={() => downloadCSV('gift-cards.csv', cards.map((c: GiftCard) => ({
              code: c.code, kind: c.kind, name: c.issuedName || '', phone: c.phone || '', face: c.faceValue,
              balance: c.balance, issued: dOnly(c.issuedAt), expiry: c.expiry || '', active: c.active ? 'yes' : 'no',
            })))}>Export</button>
            <button className="btn-primary" onClick={() => setEditor(blank())}><Plus size={15} /> Issue card</button>
          </div>} />
        <Tabs active={tab} onChange={(t) => setTab(t as any)} tabs={[
          { id: 'active', label: 'Active', count: cards.filter((c: GiftCard) => c.active && c.balance > 0).length },
          { id: 'used', label: 'Used / expired' },
          { id: 'all', label: 'All', count: cards.length },
        ]} />
        <div className="mt-2"><SearchBar value={q} onChange={setQ} placeholder="Card code, name or phone…" right={<Search size={15} className="text-ink3" />} /></div>
      </Card>

      {list.length === 0 ? (
        <Empty title="No cards here" sub="Gift card ya prepaid wallet issue kijiye — customer paisa pehle de dega." icon={<Gift size={22} />}
          action={<button className="btn-primary mt-2" onClick={() => setEditor(blank())}><Plus size={15} /> Issue card</button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c: GiftCard) => (
            <Card key={c.id} className={cx(!c.active && 'opacity-60')}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-extrabold tracking-wider text-brand">{c.code}</p>
                  <p className="truncate text-[11px] text-ink3">{c.issuedName || 'Bearer'}{c.phone ? ' · ' + c.phone : ''}</p>
                </div>
                <Badge tone={c.kind === 'wallet' ? 'brand' : c.kind === 'voucher' ? 'warn' : 'ok'}>{c.kind}</Badge>
              </div>
              <div className="mt-2 flex items-end justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-ink3">Balance</p>
                  <p className="font-mono text-xl font-extrabold text-ink">{money(c.balance, s.currency)}</p>
                </div>
                <p className="text-[11px] text-ink3">of {money(c.faceValue, s.currency)}</p>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface2">
                <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, (c.balance / Math.max(1, c.faceValue)) * 100)}%` }} />
              </div>
              <p className="mt-1 text-[10px] text-ink3">Issued {dOnly(c.issuedAt)}{c.expiry ? ` · valid till ${c.expiry}` : ''} · {c.history.length} entries</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button className="btn-primary flex-1 px-2 py-1.5 text-xs" disabled={!c.active || c.balance <= 0} onClick={() => setRedeem(c)}><Wallet size={13} /> Redeem</button>
                <button className="btn-soft px-2 py-1.5 text-xs" onClick={() => printCard(c)}><Printer size={13} /></button>
                <button className="btn-soft px-2 py-1.5 text-xs" onClick={() => { navigator.clipboard.writeText(c.code); toast('Code copied'); }}><Copy size={13} /></button>
                {c.phone && <button className="btn-soft px-2 py-1.5 text-xs" onClick={() => window.open(waLink(c.phone!, `Namaste ${c.issuedName || ''}, aapka ${s.shopName} gift card code hai ${c.code} — balance ${money(c.balance, s.currency)}.`), '_blank')}><MessageCircle size={13} /></button>}
                <button className="btn-ghost px-2 py-1.5 text-xs" onClick={() => setEditor(c)}>Edit</button>
                <button className="btn-ghost px-2 py-1.5 text-xs" onClick={async () => {
                  await db.giftCards.delete(c.id);
                  toastUndo(`${c.code} deleted`, async () => { await db.giftCards.put(c); toast('Restored'); });
                }}><Trash2 size={13} /></button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Loyalty programme" sub={`${s.pointsPer100 ?? 1} points per ${money(100, s.currency)} · 1 point = ${money(s.pointValue ?? 0.25, s.currency)}`} />
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Points outstanding" value={num(pointsOutstanding)} tone="warn" />
            <Stat label="Point liability" value={money(pointsValue, s.currency)} tone="bad" />
            <Stat label="Bills with redemption" value={num(salesWithPoints)} tone="ok" />
            <Stat label="Members" value={num(customers.filter((c: Customer) => c.points > 0).length)} tone="brand" />
          </div>
          <p className="mt-2 text-[11px] text-ink3">Rates Settings → Loyalty me badal sakte hain.</p>
        </Card>
        <Card>
          <SectionTitle title="Top members" sub="Lifetime spend ke hisaab se" />
          {topSpenders.length === 0 ? <Empty title="No customers yet" /> : topSpenders.map((c: Customer, i: number) => (
            <div key={c.id} className="flex items-center gap-2 border-b border-line py-1.5 text-xs last:border-0">
              <Badge tone={i === 0 ? 'ok' : 'muted'}>{i + 1}</Badge>
              <span className="min-w-0 flex-1 truncate text-ink2">{c.name}</span>
              <span className="text-ink3">{num(c.points)} pts</span>
              <span className="font-mono text-ink">{money(c.totalSpend, s.currency)}</span>
              <button className="btn-soft px-2 py-1 text-[10px]" onClick={() => window.open(waLink(c.phone, `Namaste ${c.name}, aapke paas ${c.points} loyalty points hain (≈ ${money(c.points * (s.pointValue ?? 0.25), s.currency)}). Agli kharidari par use kijiye — ${s.shopName}`), '_blank')}>
                <MessageCircle size={11} />
              </button>
            </div>
          ))}
        </Card>
      </div>

      {editor && <CardEditor card={editor} customers={customers} onClose={() => setEditor(null)} />}
      {redeem && <RedeemModal card={redeem} onClose={() => setRedeem(null)} />}
    </div>
  );
}

const blank = (): GiftCard => ({
  id: '', code: randomCode(), kind: 'gift', faceValue: 500, balance: 500, issuedAt: Date.now(),
  active: true, history: [], expiry: new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10),
});

function CardEditor({ card, customers, onClose }: { card: GiftCard; customers: any[]; onClose: () => void }) {
  const s = useSettings();
  const [f, setF] = useState<GiftCard>(card);
  const save = async () => {
    if (!f.code.trim()) return toast('Code required', 'err');
    const isNew = !f.id;
    const rec: GiftCard = {
      ...f, id: f.id || uid('gc_'),
      balance: isNew ? f.faceValue : f.balance,
      history: isNew ? [{ ts: Date.now(), amount: f.faceValue, type: 'issue' }] : f.history,
    };
    await db.giftCards.put(rec);
    await logActivity('giftcard', `${isNew ? 'Issued' : 'Updated'} ${rec.code} ${money(rec.faceValue, s.currency)}`);
    toast(isNew ? 'Card issued' : 'Card updated'); onClose();
  };
  return (
    <Modal open onClose={onClose} title={f.id ? `Edit ${f.code}` : 'Issue new card'}
      footer={<button className="btn-primary w-full" onClick={save}>{f.id ? 'Save' : 'Issue card'}</button>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Card code">
          <div className="flex gap-2">
            <Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} />
            <button className="btn-soft px-2" onClick={() => setF({ ...f, code: randomCode(f.kind === 'wallet' ? 'WL' : f.kind === 'voucher' ? 'VC' : 'GC') })}><QrCode size={15} /></button>
          </div>
        </Field>
        <Field label="Type">
          <Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as any })}>
            <option value="gift">Gift card</option><option value="wallet">Prepaid wallet</option><option value="voucher">Voucher</option>
          </Select>
        </Field>
        <Field label="Value"><Input inputMode="decimal" value={f.faceValue} onChange={(e) => setF({ ...f, faceValue: +e.target.value || 0 })} /></Field>
        <Field label="Expiry"><Input type="date" value={f.expiry || ''} onChange={(e) => setF({ ...f, expiry: e.target.value })} /></Field>
        <Field label="Customer">
          <Select value={f.issuedTo || ''} onChange={(e) => { const c = customers.find((x: any) => x.id === e.target.value); setF({ ...f, issuedTo: c?.id, issuedName: c?.name, phone: c?.phone }); }}>
            <option value="">Bearer / walk-in</option>
            {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
          </Select>
        </Field>
        <Field label="Phone"><Input value={f.phone || ''} onChange={(e) => setF({ ...f, phone: e.target.value })} inputMode="tel" /></Field>
      </div>
      <Field label="Note" className="mt-3"><Textarea rows={2} value={f.note || ''} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
    </Modal>
  );
}

function RedeemModal({ card, onClose }: { card: GiftCard; onClose: () => void }) {
  const s = useSettings();
  const [amount, setAmount] = useState(String(card.balance));
  const [mode, setMode] = useState<'redeem' | 'topup'>('redeem');
  const [ref, setRef] = useState('');

  const apply = async () => {
    const amt = +amount;
    if (!amt || amt <= 0) return toast('Enter an amount', 'err');
    if (mode === 'redeem' && amt > card.balance) return toast('Amount exceeds balance', 'err');
    const balance = mode === 'redeem' ? +(card.balance - amt).toFixed(2) : +(card.balance + amt).toFixed(2);
    await db.giftCards.update(card.id, {
      balance,
      faceValue: mode === 'topup' ? +(card.faceValue + amt).toFixed(2) : card.faceValue,
      history: [...card.history, { ts: Date.now(), amount: amt, type: mode === 'redeem' ? 'redeem' : 'topup', ref }],
      active: balance > 0 ? card.active : false,
    });
    await logActivity('giftcard', `${mode} ${money(amt, s.currency)} on ${card.code}`);
    toast(`${mode === 'redeem' ? 'Redeemed' : 'Topped up'} ${money(amt, s.currency)}`);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={`${card.code} · ${money(card.balance, s.currency)}`}
      footer={<button className="btn-primary w-full" onClick={apply}>{mode === 'redeem' ? 'Redeem' : 'Top up'}</button>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Action">
          <Select value={mode} onChange={(e) => setMode(e.target.value as any)}>
            <option value="redeem">Redeem (customer uses balance)</option>
            <option value="topup">Top up (customer adds money)</option>
          </Select>
        </Field>
        <Field label="Amount"><Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></Field>
      </div>
      <Field label="Reference (invoice no)" className="mt-3"><Input value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
      <div className="mt-3 rounded-xl border border-line p-3">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink3">History</p>
        {card.history.length === 0 ? <p className="text-xs text-ink3">No entries yet.</p> : card.history.slice(-8).reverse().map((h, i) => (
          <div key={i} className="flex justify-between text-[11px] text-ink2">
            <span>{dt(h.ts)} · {h.type}{h.ref ? ' · ' + h.ref : ''}</span>
            <span className={cx('font-mono', h.type === 'redeem' ? 'text-bad' : 'text-ok')}>{h.type === 'redeem' ? '−' : '+'}{money(h.amount, s.currency)}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
