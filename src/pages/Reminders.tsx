import { useMemo, useState } from 'react';
import { MessageCircle, Send, Copy, Users, IndianRupee, Cake, Clock, Package } from 'lucide-react';
import { useCustomers, useSales } from '@/hooks/useData';
import { useCatalog } from '@/hooks/useCatalog';
import { money, num, dOnly, ago, cx } from '@/lib/format';
import { downloadCSV } from '@/lib/csv';
import { Card, Stat, Field, Input, Select, Textarea, SectionTitle, Empty, Badge, Tabs } from '@/components/ui';
import { useSettings } from '@/store/settings';
import { toast } from '@/store/ui';
import { waLink } from '@/lib/receipt';
import type { Customer, Sale } from '@/db/types';

type Seg = 'dues' | 'lapsed' | 'birthday' | 'top' | 'all';

const PRESETS: Record<Seg, string> = {
  dues: 'Namaste {name}, aapka {shop} par {due} ka balance pending hai. Kripya jaldi settle kar dijiye. Dhanyavaad!',
  lapsed: 'Hi {name}, we miss you at {shop}! It has been {last} since your last visit. Special discount waiting for you 🎁',
  birthday: 'Happy Birthday {name}! 🎂 {shop} wishes you a great year — show this message for a special birthday discount.',
  top: 'Hi {name}, thank you for being one of our best customers at {shop}. New stock has arrived — visit us soon!',
  all: 'Hello {name}, greetings from {shop}. {custom}',
};

/** Bulk WhatsApp reminders — dues collection, win-back, birthdays, restock alerts. */
export default function Reminders() {
  const customers = useCustomers() || [];
  const sales = useSales() || [];
  const { products } = useCatalog();
  const s = useSettings();

  const [seg, setSeg] = useState<Seg>('dues');
  const [minDue, setMinDue] = useState('1');
  const [lapsedDays, setLapsedDays] = useState('30');
  const [msg, setMsg] = useState(PRESETS.dues);
  const [custom, setCustom] = useState('');
  const [sent, setSent] = useState<Set<string>>(new Set());

  const lastVisitOf = useMemo(() => {
    const m = new Map<string, number>();
    sales.forEach((x: Sale) => { if (x.customerId) m.set(x.customerId, Math.max(m.get(x.customerId) || 0, x.ts)); });
    return m;
  }, [sales]);

  const list = useMemo(() => {
    const now = Date.now();
    let arr: Customer[] = customers.filter((c: Customer) => !c.blocked && c.phone);
    if (seg === 'dues') arr = arr.filter((c) => c.credit >= (+minDue || 1)).sort((a, b) => b.credit - a.credit);
    if (seg === 'lapsed') arr = arr.filter((c) => {
      const lv = lastVisitOf.get(c.id) || c.lastVisit || 0;
      return lv > 0 && now - lv > (+lapsedDays || 30) * 864e5;
    }).sort((a, b) => b.totalSpend - a.totalSpend);
    if (seg === 'birthday') arr = arr.filter((c) => {
      if (!c.birthday) return false;
      const b = new Date(c.birthday); const t = new Date();
      const diff = (new Date(t.getFullYear(), b.getMonth(), b.getDate()).getTime() - new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime()) / 864e5;
      return diff >= 0 && diff <= 7;
    });
    if (seg === 'top') arr = [...arr].sort((a, b) => b.totalSpend - a.totalSpend).slice(0, 50);
    return arr;
  }, [customers, seg, minDue, lapsedDays, lastVisitOf]);

  const totalDue = customers.reduce((t: number, c: Customer) => t + Math.max(0, c.credit), 0);
  const lowStock = products.filter((p: any) => p.trackStock && p.stock <= p.lowStock).length;

  const build = (c: Customer) => {
    const lv = lastVisitOf.get(c.id) || c.lastVisit || 0;
    return msg
      .replace(/{name}/g, c.name)
      .replace(/{shop}/g, s.shopName || 'our shop')
      .replace(/{due}/g, money(Math.max(0, c.credit), s.currency))
      .replace(/{points}/g, String(c.points || 0))
      .replace(/{spend}/g, money(c.totalSpend, s.currency))
      .replace(/{last}/g, lv ? ago(lv) : 'a while')
      .replace(/{phone}/g, s.phone || '')
      .replace(/{custom}/g, custom);
  };

  const sendOne = (c: Customer) => {
    window.open(waLink(c.phone, build(c)), '_blank');
    setSent((p) => new Set(p).add(c.id));
  };

  const sendAll = () => {
    if (!list.length) return toast('No customers in this segment', 'err');
    list.slice(0, 10).forEach((c, i) => setTimeout(() => sendOne(c), i * 700));
    toast(`Opening WhatsApp for first ${Math.min(10, list.length)} customers`);
  };

  const copyAll = async () => {
    const text = list.map((c) => `${c.phone}: ${build(c)}`).join('\n\n');
    await navigator.clipboard.writeText(text);
    toast(`${list.length} messages copied`);
  };

  const exportList = () => downloadCSV(`reminders-${seg}-${Date.now()}.csv`, list.map((c) => ({
    name: c.name, phone: c.phone, due: c.credit, points: c.points, total_spend: c.totalSpend,
    last_visit: (lastVisitOf.get(c.id) || c.lastVisit) ? dOnly(lastVisitOf.get(c.id) || c.lastVisit!) : '',
    message: build(c),
  })));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Outstanding dues" value={money(totalDue, s.currency)} tone="bad" icon={<IndianRupee size={16} />} />
        <Stat label="Customers" value={num(customers.length)} tone="brand" icon={<Users size={16} />} />
        <Stat label="In this segment" value={num(list.length)} tone="warn" icon={<MessageCircle size={16} />} />
        <Stat label="Low stock alerts" value={num(lowStock)} tone="warn" icon={<Package size={16} />} />
      </div>

      <Card>
        <SectionTitle title="Bulk reminders" sub="Segment your customers and fire off WhatsApp messages in seconds"
          right={<div className="flex gap-2">
            <button className="btn-soft" onClick={copyAll}><Copy size={15} /> Copy all</button>
            <button className="btn-soft" onClick={exportList}>Export</button>
            <button className="btn-primary" onClick={sendAll}><Send size={15} /> Send batch</button>
          </div>} />
        <Tabs active={seg} onChange={(id) => { setSeg(id as Seg); setMsg(PRESETS[id as Seg]); }}
          tabs={[
            { id: 'dues', label: 'Dues' }, { id: 'lapsed', label: 'Win-back' },
            { id: 'birthday', label: 'Birthdays' }, { id: 'top', label: 'VIPs' }, { id: 'all', label: 'Everyone' },
          ]} />
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {seg === 'dues' && <Field label="Minimum due amount"><Input inputMode="decimal" value={minDue} onChange={(e) => setMinDue(e.target.value)} /></Field>}
          {seg === 'lapsed' && <Field label="Not seen for (days)"><Input inputMode="numeric" value={lapsedDays} onChange={(e) => setLapsedDays(e.target.value)} /></Field>}
          <Field label="Template">
            <Select value={seg} onChange={(e) => setMsg(PRESETS[e.target.value as Seg])}>
              <option value="dues">Payment reminder</option>
              <option value="lapsed">Win-back offer</option>
              <option value="birthday">Birthday wish</option>
              <option value="top">VIP new stock</option>
              <option value="all">Custom broadcast</option>
            </Select>
          </Field>
        </div>
        <Field label="Message" className="mt-3" hint="Tokens: {name} {shop} {due} {points} {spend} {last} {phone} {custom}">
          <Textarea rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} />
        </Field>
        {msg.includes('{custom}') && (
          <Field label="Custom text" className="mt-3"><Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Your offer / announcement" /></Field>
        )}
        {list[0] && <p className="mt-3 rounded-xl border border-line bg-surface2/40 p-3 text-[11px] text-ink2">Preview → {build(list[0])}</p>}
      </Card>

      {list.length === 0 ? <Empty title="No customers in this segment" sub="Try a different filter or add customer phone numbers." icon={<MessageCircle size={22} />} /> : (
        <Card pad={false}>
          {list.slice(0, 300).map((c) => {
            const lv = lastVisitOf.get(c.id) || c.lastVisit || 0;
            return (
              <div key={c.id} className={cx('flex items-center gap-2 border-b border-line px-3 py-2.5 last:border-0', sent.has(c.id) && 'bg-ok/5')}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
                  <p className="truncate text-[11px] text-ink3">{c.phone}{lv ? ' · last ' + ago(lv) : ''}{c.birthday ? ' · 🎂 ' + c.birthday.slice(5) : ''}</p>
                </div>
                {c.credit > 0 && <Badge tone="bad">{money(c.credit, s.currency)}</Badge>}
                {c.points > 0 && <Badge tone="ok">{c.points} pts</Badge>}
                {sent.has(c.id) && <Badge tone="ok">sent</Badge>}
                <button className="btn-soft px-2 py-1 text-xs" onClick={() => sendOne(c)}><MessageCircle size={13} /> WhatsApp</button>
              </div>
            );
          })}
          {list.length > 300 && <p className="p-3 text-center text-[11px] text-ink3">Showing first 300 of {num(list.length)} — export CSV for the full list.</p>}
        </Card>
      )}

      <Card>
        <SectionTitle title="Tips" />
        <ul className="space-y-1 text-[11px] text-ink3">
          <li className="flex gap-2"><Clock size={13} className="mt-0.5 shrink-0 text-brand" /> WhatsApp opens 10 chats at a time so your browser doesn't block popups — repeat "Send batch" for the rest.</li>
          <li className="flex gap-2"><Cake size={13} className="mt-0.5 shrink-0 text-brand" /> Birthdays segment looks 7 days ahead so you can wish people early.</li>
          <li className="flex gap-2"><IndianRupee size={13} className="mt-0.5 shrink-0 text-brand" /> Dues are pulled live from the customer ledger — settle a bill and the customer drops off this list.</li>
        </ul>
      </Card>
    </div>
  );
}
