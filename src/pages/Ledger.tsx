import { useMemo, useState } from 'react';
import { BookUser, Plus, Download, Printer, MessageCircle, ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';
import { useCustomers, useVendors, useLedger } from '@/hooks/useData';
import { db, uid, logActivity } from '@/db/db';
import { money, num, dt, dOnly, cx } from '@/lib/format';
import { downloadCSV } from '@/lib/csv';
import { Card, Stat, Modal, Field, Input, Select, Textarea, Empty, SearchBar, Badge, Tabs, SectionTitle } from '@/components/ui';
import { useSettings } from '@/store/settings';
import { toast } from '@/store/ui';
import { printHTML, waLink } from '@/lib/receipt';
import type { LedgerEntry } from '@/db/types';

/** Khata / ledger — customer dues, vendor payables, and every payment in or out. */
export default function Ledger() {
  const customers = useCustomers() || [];
  const vendors = useVendors() || [];
  const entries = useLedger() || [];
  const s = useSettings();

  const [tab, setTab] = useState<'customer' | 'vendor' | 'entries'>('customer');
  const [q, setQ] = useState('');
  const [pay, setPay] = useState<{ party: 'customer' | 'vendor'; id: string; name: string; balance: number } | null>(null);
  const [statement, setStatement] = useState<{ party: 'customer' | 'vendor'; id: string; name: string } | null>(null);

  const receivable = customers.reduce((t: number, c: any) => t + Math.max(0, c.credit), 0);
  const advance = customers.reduce((t: number, c: any) => t + Math.max(0, -c.credit), 0);
  const payable = vendors.reduce((t: number, v: any) => t + Math.max(0, v.payable), 0);
  const collectedToday = entries.filter((e: LedgerEntry) => e.direction === 'in' && new Date(e.ts).toDateString() === new Date().toDateString())
    .reduce((t: number, e: LedgerEntry) => t + e.amount, 0);

  const term = q.trim().toLowerCase();
  const custRows = customers.filter((c: any) => c.credit !== 0).filter((c: any) => !term || c.name.toLowerCase().includes(term) || (c.phone || '').includes(term))
    .sort((a: any, b: any) => b.credit - a.credit);
  const vendRows = vendors.filter((v: any) => v.payable !== 0).filter((v: any) => !term || v.name.toLowerCase().includes(term))
    .sort((a: any, b: any) => b.payable - a.payable);

  const remind = (c: any) => {
    const text = `Namaste ${c.name}, ${s.shopName} par aapka balance ${money(c.credit, s.currency)} pending hai. Kripya settle kar dijiye. Dhanyavaad!`;
    window.open(waLink(c.phone || '', text), '_blank');
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Receivable (udhaar)" value={money(receivable, s.currency)} tone="bad" icon={<ArrowDownLeft size={16} />} sub={`${custRows.filter((c: any) => c.credit > 0).length} customers`} />
        <Stat label="Payable to vendors" value={money(payable, s.currency)} tone="warn" icon={<ArrowUpRight size={16} />} />
        <Stat label="Customer advances" value={money(advance, s.currency)} tone="ok" />
        <Stat label="Collected today" value={money(collectedToday, s.currency)} tone="brand" icon={<Wallet size={16} />} />
      </div>

      <Card>
        <SectionTitle title="Khata / ledger" sub="Har udhaar, har payment — ek jagah, printable statement ke saath"
          right={<button className="btn-primary" onClick={() => setPay({ party: 'customer', id: '', name: '', balance: 0 })}><Plus size={15} /> Record payment</button>} />
        <Tabs active={tab} onChange={(t) => setTab(t as any)} tabs={[
          { id: 'customer', label: 'Customer dues', count: custRows.length },
          { id: 'vendor', label: 'Vendor payables', count: vendRows.length },
          { id: 'entries', label: 'All entries', count: entries.length },
        ]} />
        <div className="mt-2"><SearchBar value={q} onChange={setQ} placeholder="Name or phone…" /></div>
      </Card>

      {tab === 'customer' && (custRows.length === 0 ? <Empty title="No outstanding balances" sub="Sab hisaab clear hai 🎉" icon={<BookUser size={22} />} /> : (
        <Card pad={false}>
          {custRows.map((c: any) => (
            <div key={c.id} className="flex items-center gap-2 border-b border-line px-3 py-2.5 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
                <p className="truncate text-[11px] text-ink3">{c.phone}{c.lastVisit ? ' · last visit ' + dOnly(c.lastVisit) : ''}{c.creditLimit ? ' · limit ' + money(c.creditLimit, s.currency) : ''}</p>
              </div>
              {c.creditLimit && c.credit > c.creditLimit && <Badge tone="bad">over limit</Badge>}
              <span className={cx('font-mono text-sm font-bold', c.credit > 0 ? 'text-bad' : 'text-ok')}>{money(Math.abs(c.credit), s.currency)}</span>
              <button className="rounded-lg p-1.5 text-ink3 hover:text-ok" title="WhatsApp reminder" onClick={() => remind(c)}><MessageCircle size={15} /></button>
              <button className="rounded-lg p-1.5 text-ink3 hover:text-brand" title="Statement" onClick={() => setStatement({ party: 'customer', id: c.id, name: c.name })}><Printer size={15} /></button>
              <button className="btn-soft px-2 py-1 text-xs" onClick={() => setPay({ party: 'customer', id: c.id, name: c.name, balance: c.credit })}>Receive</button>
            </div>
          ))}
        </Card>
      ))}

      {tab === 'vendor' && (vendRows.length === 0 ? <Empty title="No vendor payables" icon={<BookUser size={22} />} /> : (
        <Card pad={false}>
          {vendRows.map((v: any) => (
            <div key={v.id} className="flex items-center gap-2 border-b border-line px-3 py-2.5 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{v.name}</p>
                <p className="truncate text-[11px] text-ink3">{v.phone || '—'}{v.gstin ? ' · ' + v.gstin : ''}</p>
              </div>
              <span className="font-mono text-sm font-bold text-warn">{money(v.payable, s.currency)}</span>
              <button className="rounded-lg p-1.5 text-ink3 hover:text-brand" onClick={() => setStatement({ party: 'vendor', id: v.id, name: v.name })}><Printer size={15} /></button>
              <button className="btn-soft px-2 py-1 text-xs" onClick={() => setPay({ party: 'vendor', id: v.id, name: v.name, balance: v.payable })}>Pay</button>
            </div>
          ))}
        </Card>
      ))}

      {tab === 'entries' && (entries.length === 0 ? <Empty title="No ledger entries yet" sub="Record a payment to start the khata." /> : (
        <Card pad={false}>
          <div className="flex items-center justify-between p-3">
            <SectionTitle title="Payment history" sub={`${num(entries.length)} entries`} />
            <button className="btn-ghost px-2 py-1 text-xs" onClick={() => downloadCSV('ledger.csv', entries.map((e: LedgerEntry) => ({
              date: dt(e.ts), party: e.partyName, type: e.party, direction: e.direction, amount: e.amount, mode: e.mode, ref: e.ref || '', note: e.note || '',
            })))}><Download size={13} /> CSV</button>
          </div>
          {entries.map((e: LedgerEntry) => (
            <div key={e.id} className="flex items-center gap-2 border-b border-line px-3 py-2 text-xs last:border-0">
              <span className={cx('rounded-lg p-1.5', e.direction === 'in' ? 'bg-ok/10 text-ok' : 'bg-bad/10 text-bad')}>
                {e.direction === 'in' ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-ink">{e.partyName}</p>
                <p className="truncate text-[10px] text-ink3">{dt(e.ts)} · {e.mode}{e.note ? ' · ' + e.note : ''}</p>
              </div>
              <span className={cx('font-mono font-bold', e.direction === 'in' ? 'text-ok' : 'text-bad')}>
                {e.direction === 'in' ? '+' : '−'}{money(e.amount, s.currency)}
              </span>
            </div>
          ))}
        </Card>
      ))}

      {pay && <PaymentEntry init={pay} customers={customers} vendors={vendors} onClose={() => setPay(null)} />}
      {statement && <StatementModal party={statement} entries={entries} onClose={() => setStatement(null)} />}
    </div>
  );
}

function PaymentEntry({ init, customers, vendors, onClose }:
  { init: { party: 'customer' | 'vendor'; id: string; name: string; balance: number }; customers: any[]; vendors: any[]; onClose: () => void }) {
  const s = useSettings();
  const [party, setParty] = useState(init.party);
  const [id, setId] = useState(init.id);
  const [amount, setAmount] = useState(init.balance > 0 ? String(Math.abs(init.balance)) : '');
  const [mode, setMode] = useState('cash');
  const [note, setNote] = useState('');

  const options = party === 'customer' ? customers : vendors;
  const selected = options.find((o: any) => o.id === id);
  const balance = selected ? (party === 'customer' ? selected.credit : selected.payable) : 0;
  const direction: 'in' | 'out' = party === 'customer' ? 'in' : 'out';

  const save = async () => {
    const amt = +amount;
    if (!id) return toast('Select a party', 'err');
    if (!amt || amt <= 0) return toast('Enter an amount', 'err');
    const after = +(balance - amt).toFixed(2);
    await db.ledger.add({
      id: uid('lg_'), ts: Date.now(), party, partyId: id, partyName: selected.name,
      direction, amount: amt, mode: mode as any, note, balanceAfter: after,
    });
    if (party === 'customer') await db.customers.update(id, { credit: after });
    else await db.vendors.update(id, { payable: after });
    await logActivity('ledger', `${direction === 'in' ? 'Received' : 'Paid'} ${money(amt, s.currency)} ${direction === 'in' ? 'from' : 'to'} ${selected.name}`);
    toast(`${direction === 'in' ? 'Received' : 'Paid'} ${money(amt, s.currency)}`);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={direction === 'in' ? 'Receive payment' : 'Pay vendor'}
      footer={<button className="btn-primary w-full" onClick={save}>Save entry</button>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Party type">
          <Select value={party} onChange={(e) => { setParty(e.target.value as any); setId(''); }}>
            <option value="customer">Customer (receive)</option>
            <option value="vendor">Vendor (pay)</option>
          </Select>
        </Field>
        <Field label={party === 'customer' ? 'Customer' : 'Vendor'}>
          <Select value={id} onChange={(e) => setId(e.target.value)}>
            <option value="">Select…</option>
            {options.map((o: any) => <option key={o.id} value={o.id}>{o.name}{o.phone ? ' · ' + o.phone : ''}</option>)}
          </Select>
        </Field>
      </div>
      {selected && (
        <p className={cx('mt-3 rounded-xl border p-3 text-xs', balance > 0 ? 'border-bad/30 bg-bad/10 text-bad' : 'border-ok/30 bg-ok/10 text-ok')}>
          Current balance: <b>{money(Math.abs(balance), s.currency)}</b> {balance > 0 ? (party === 'customer' ? 'to collect' : 'to pay') : 'advance'}
        </p>
      )}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Amount"><Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></Field>
        <Field label="Mode">
          <Select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="wallet">Wallet</option>
          </Select>
        </Field>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {[balance, balance / 2, 500, 1000, 5000].filter((v) => v > 0).map((v, i) => (
          <button key={i} className="btn-soft px-2 py-1 text-xs" onClick={() => setAmount(String(Math.round(v)))}>{money(Math.round(v), s.currency)}</button>
        ))}
      </div>
      <Field label="Note" className="mt-3"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Cheque no, remark…" /></Field>
      {selected && +amount > 0 && (
        <p className="mt-3 text-[11px] text-ink3">Balance after this entry: <b className="text-ink">{money(Math.abs(balance - +amount), s.currency)}</b></p>
      )}
    </Modal>
  );
}

function StatementModal({ party, entries, onClose }: { party: { party: 'customer' | 'vendor'; id: string; name: string }; entries: LedgerEntry[]; onClose: () => void }) {
  const s = useSettings();
  const rows = entries.filter((e) => e.partyId === party.id).sort((a, b) => a.ts - b.ts);
  const html = `<html><head><meta charset="utf-8"><title>Statement ${party.name}</title><style>
    body{font-family:system-ui,Arial;padding:22px;color:#111}table{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}
    td,th{border:1px solid #ddd;padding:6px}.r{text-align:right}.muted{color:#666;font-size:11px}
    </style></head><body>
    <h2 style="margin:0">${s.shopName || 'Shop'} — Account statement</h2>
    <p class=muted>${party.name} · generated ${dt(Date.now())}</p>
    <table><thead><tr><th>Date</th><th>Particulars</th><th class=r>In</th><th class=r>Out</th><th class=r>Balance</th></tr></thead><tbody>
    ${rows.map((e) => `<tr><td>${dt(e.ts)}</td><td>${e.mode}${e.note ? ' · ' + e.note : ''}</td><td class=r>${e.direction === 'in' ? e.amount.toFixed(2) : ''}</td><td class=r>${e.direction === 'out' ? e.amount.toFixed(2) : ''}</td><td class=r>${(e.balanceAfter ?? 0).toFixed(2)}</td></tr>`).join('')}
    </tbody></table>
    <p class=muted>E&OE. This statement is generated from ${s.shopName || 'shop'} records.</p></body></html>`;

  return (
    <Modal open onClose={onClose} wide title={`Statement · ${party.name}`}
      footer={<button className="btn-primary w-full" onClick={() => printHTML(html)}><Printer size={15} /> Print statement</button>}>
      {rows.length === 0 ? <Empty title="No entries for this party yet" /> : (
        <div className="max-h-96 overflow-auto">
          {rows.map((e) => (
            <div key={e.id} className="flex items-center gap-2 border-b border-line py-2 text-xs last:border-0">
              <span className="w-32 shrink-0 text-ink3">{dt(e.ts)}</span>
              <span className="min-w-0 flex-1 truncate text-ink2">{e.mode}{e.note ? ' · ' + e.note : ''}</span>
              <span className={cx('font-mono', e.direction === 'in' ? 'text-ok' : 'text-bad')}>{e.direction === 'in' ? '+' : '−'}{money(e.amount, s.currency)}</span>
              <span className="w-24 text-right font-mono text-ink">{money(e.balanceAfter ?? 0, s.currency)}</span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
