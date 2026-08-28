import { useEffect, useState } from 'react';
import { Plus, Trash2, Star, QrCode, Copy, Download, Landmark, Pencil } from 'lucide-react';
import { Card, SectionTitle, Field, Input, Toggle, Modal, Badge, Empty, Select } from '@/components/ui';
import { useSettings, type UpiAccount } from '@/store/settings';
import { upiLink, qrDataUrl, validVpa } from '@/lib/upi';
import { toast } from '@/store/ui';
import { cx } from '@/lib/format';
import { download } from '@/lib/csv';

const PAY_MODES = ['cash', 'upi', 'card', 'wallet', 'credit', 'split'];

export default function PaymentsTab() {
  const s = useSettings();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UpiAccount | null>(null);
  const [form, setForm] = useState({ label: '', vpa: '', payeeName: '', merchantCode: '', note: '' });
  const [qrs, setQrs] = useState<Record<string, string>>({});

  useEffect(() => {
    s.upiAccounts.forEach((u) => {
      if (qrs[u.id]) return;
      qrDataUrl(upiLink(u), 200).then((d) => setQrs((q) => ({ ...q, [u.id]: d }))).catch(() => {});
    });
  }, [s.upiAccounts]);

  const save = () => {
    if (!form.label.trim()) return toast('Give this UPI a label', 'err');
    if (!validVpa(form.vpa)) return toast('Enter a valid UPI ID like name@bank', 'err');
    if (editing) { s.updateUpi(editing.id, { ...form }); toast('UPI updated'); }
    else { s.addUpi({ ...form, payeeName: form.payeeName || s.shopName, active: true, isDefault: s.upiAccounts.length === 0 }); toast('UPI ID added'); }
    setOpen(false); setEditing(null); setForm({ label: '', vpa: '', payeeName: '', merchantCode: '', note: '' });
  };

  return (
    <div className="space-y-3">
      <Card>
        <SectionTitle title="UPI IDs" sub="Add as many as you like — pick which one is used for QR codes on bills and at payment."
          right={<button className="btn-primary" onClick={() => { setEditing(null); setForm({ label: '', vpa: '', payeeName: s.shopName, merchantCode: '', note: '' }); setOpen(true); }}><Plus size={16} /> Add UPI</button>} />
        {s.upiAccounts.length === 0 ? (
          <Empty title="No UPI IDs yet" sub="Add your VPA (like shop@okhdfcbank) to accept instant payments with a QR code." icon={<QrCode size={26} />} />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {s.upiAccounts.map((u) => (
              <div key={u.id} className={cx('rounded-2xl border p-3', u.isDefault ? 'border-brand/60 bg-brand/5' : 'border-line')}>
                <div className="flex items-start gap-3">
                  <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-white p-1">
                    {qrs[u.id] ? <img src={qrs[u.id]} className="h-full w-full" alt="qr" /> : <QrCode size={22} className="text-black/30" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-bold text-ink">
                      {u.label}{u.isDefault && <Badge tone="brand">default</Badge>}{!u.active && <Badge tone="muted">off</Badge>}
                    </p>
                    <p className="truncate font-mono text-xs text-ink2">{u.vpa}</p>
                    <p className="truncate text-[11px] text-ink3">{u.payeeName}{u.merchantCode ? ` · MCC ${u.merchantCode}` : ''}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {!u.isDefault && <button className="chip" onClick={() => { s.setDefaultUpi(u.id); toast('Default UPI set'); }}><Star size={10} className="mr-1 inline" />Default</button>}
                      <button className="chip" onClick={() => { navigator.clipboard.writeText(u.vpa); toast('Copied'); }}><Copy size={10} className="mr-1 inline" />Copy</button>
                      <button className="chip" onClick={() => qrs[u.id] && download(`${u.label}-upi-qr.png`, dataUrlToBlob(qrs[u.id]), 'image/png')}><Download size={10} className="mr-1 inline" />QR</button>
                      <button className="chip" onClick={() => { setEditing(u); setForm({ label: u.label, vpa: u.vpa, payeeName: u.payeeName, merchantCode: u.merchantCode ?? '', note: u.note ?? '' }); setOpen(true); }}><Pencil size={10} /></button>
                      <button className="chip" onClick={() => s.updateUpi(u.id, { active: !u.active })}>{u.active ? 'Disable' : 'Enable'}</button>
                      <button className="chip border-bad/40 text-bad" onClick={() => { s.removeUpi(u.id); toast('Removed'); }}><Trash2 size={10} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 space-y-2">
          <Toggle checked={s.showUpiQrOnPayment} onChange={(v) => s.set({ showUpiQrOnPayment: v })} label="Show UPI QR on the payment screen" hint="Customer scans while you bill" />
          <Toggle checked={s.showUpiQrOnBill} onChange={(v) => s.set({ showUpiQrOnBill: v })} label="Print UPI QR on receipts" hint="Templates with a QR block will render it" />
          <Field label="QR size on receipts (px)"><Input inputMode="numeric" value={s.upiQrSize} onChange={(e) => s.set({ upiQrSize: +e.target.value || 220 })} /></Field>
        </div>
      </Card>

      <Card>
        <SectionTitle title="Accepted payment modes" sub="Turn off what you don't use — the payment screen adapts." />
        <div className="flex flex-wrap gap-2">
          {PAY_MODES.map((m) => {
            const on = s.enabledPayModes.includes(m);
            return (
              <button key={m} className={cx('chip uppercase', on && 'chip-on')}
                onClick={() => s.set({ enabledPayModes: on ? s.enabledPayModes.filter((x) => x !== m) : [...s.enabledPayModes, m] })}>{m}</button>
            );
          })}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Default payment mode">
            <Select value={s.defaultPayMode} onChange={(e) => s.set({ defaultPayMode: e.target.value })}>
              {s.enabledPayModes.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
            </Select>
          </Field>
          <div className="space-y-2">
            <Toggle checked={s.askTender} onChange={(v) => s.set({ askTender: v })} label="Ask for cash tendered" hint="Shows change calculator" />
            <Toggle checked={s.allowCredit} onChange={(v) => s.set({ allowCredit: v })} label="Allow credit (udhaar) sales" />
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle title="Bank details for invoices" sub="Printed on A4 templates that include a bank block." right={<Landmark size={16} className="text-ink3" />} />
        <BankFields />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit UPI ID' : 'Add UPI ID'}
        footer={<button className="btn-primary w-full" onClick={save}>{editing ? 'Save changes' : 'Add UPI ID'}</button>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Label" hint="e.g. Counter GPay, HDFC Current"><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} autoFocus /></Field>
          <Field label="UPI ID (VPA)" hint="shop@okhdfcbank, 98100xxxxx@ybl…"><Input value={form.vpa} onChange={(e) => setForm({ ...form, vpa: e.target.value.trim() })} /></Field>
          <Field label="Payee name" hint="Shown inside the customer's UPI app"><Input value={form.payeeName} onChange={(e) => setForm({ ...form, payeeName: e.target.value })} /></Field>
          <Field label="Merchant code (optional)"><Input value={form.merchantCode} onChange={(e) => setForm({ ...form, merchantCode: e.target.value })} /></Field>
          <Field label="Note" className="sm:col-span-2"><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}

function BankFields() {
  const s = useSettings();
  const b = s.bankAccounts[0] ?? { id: 'b1', label: 'Primary', bank: '', accountName: '', accountNo: '', ifsc: '', active: true };
  const up = (p: Partial<typeof b>) => s.set({ bankAccounts: [{ ...b, ...p }] });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Bank name"><Input value={b.bank} onChange={(e) => up({ bank: e.target.value })} /></Field>
      <Field label="Account holder"><Input value={b.accountName} onChange={(e) => up({ accountName: e.target.value })} /></Field>
      <Field label="Account number"><Input value={b.accountNo} onChange={(e) => up({ accountNo: e.target.value })} /></Field>
      <Field label="IFSC"><Input value={b.ifsc} onChange={(e) => up({ ifsc: e.target.value })} /></Field>
    </div>
  );
}

function dataUrlToBlob(dataUrl: string) {
  const [head, b64] = dataUrl.split(',');
  const mime = head.match(/:(.*?);/)?.[1] ?? 'image/png';
  const bin = atob(b64); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
