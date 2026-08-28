import { useMemo, useState } from 'react';
import { Megaphone, MessageCircle, Users, Copy, Download, Cake, HeartCrack, Crown, Wallet } from 'lucide-react';
import { useCustomers, useSales } from '@/hooks/useData';
import { useSettings } from '@/store/settings';
import { money, num, moneyShort, dOnly, cx } from '@/lib/format';
import { downloadCSV } from '@/lib/csv';
import { waLink } from '@/lib/receipt';
import { Card, Stat, Empty, Badge, Input, Textarea, SectionTitle, Tabs } from '@/components/ui';
import { toast } from '@/store/ui';
import type { Customer, Sale } from '@/db/types';

type SegId = 'all' | 'vip' | 'lapsed' | 'birthday' | 'dues' | 'new' | 'points';

const TEMPLATES: { id: string; title: string; body: string }[] = [
  { id: 'offer', title: 'Festival offer', body: 'Namaste {name} 🙏\n\n{shop} par is hafte *20% tak ki chhoot*! Aapke liye special offer — jaldi aaiye.\n\n📞 {phone}' },
  { id: 'lapsed', title: 'We miss you', body: 'Hello {name}, bahut din se aap nahi aaye 🙂\nAapke liye ek special discount ready hai — is hafte {shop} par aaiye.\n\n📞 {phone}' },
  { id: 'birthday', title: 'Birthday wish', body: 'Happy Birthday {name}! 🎂🎉\n{shop} ki taraf se aapko dher saari shubhkaamnaayein. Aaj shopping par special gift aapka intezaar kar raha hai!' },
  { id: 'dues', title: 'Payment reminder', body: 'Namaste {name},\nAapka {shop} par *{due}* ka balance pending hai. Kripya jald settle kar dijiye.\n\nDhanyavaad 🙏' },
  { id: 'newstock', title: 'New stock arrived', body: 'Hi {name}! 🆕\nNaya stock aa gaya hai {shop} par. Aa kar dekhiye — limited quantity!\n\n📞 {phone}' },
  { id: 'points', title: 'Points reminder', body: 'Hi {name}, aapke paas *{points} loyalty points* jama hain 🎁\nAgli shopping par redeem kar ke paise bachaiye. — {shop}' },
];

/** Marketing campaigns — segment customers and blast personalised WhatsApp messages. */
export default function Campaigns() {
  const customers = useCustomers() || [];
  const sales = useSales() || [];
  const s = useSettings();
  const [seg, setSeg] = useState<SegId>('vip');
  const [msg, setMsg] = useState(TEMPLATES[0].body);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [lapseDays, setLapseDays] = useState(45);
  const [minSpend, setMinSpend] = useState(5000);
  const [tab, setTab] = useState<'compose' | 'list'>('compose');

  const now = Date.now();
  const todayMD = new Date().toISOString().slice(5, 10);
  const segments = useMemo(() => {
    const c = customers as Customer[];
    return {
      all: c.filter((x) => x.phone && !x.blocked),
      vip: c.filter((x) => x.totalSpend >= minSpend && x.phone),
      lapsed: c.filter((x) => x.phone && x.lastVisit && now - x.lastVisit > lapseDays * 864e5),
      birthday: c.filter((x) => x.phone && x.birthday && x.birthday.slice(5, 10) === todayMD),
      dues: c.filter((x) => x.phone && x.credit > 0),
      new: c.filter((x) => x.phone && now - x.createdAt < 30 * 864e5),
      points: c.filter((x) => x.phone && x.points >= (s.minRedeem || 50)),
    } as Record<SegId, Customer[]>;
  }, [customers, minSpend, lapseDays, todayMD, now, s.minRedeem]);

  const list = segments[seg] || [];
  const SEGS: { id: SegId; label: string; icon: any; tone: any }[] = [
    { id: 'vip', label: `VIP (≥${moneyShort(minSpend, s.currency)})`, icon: <Crown size={13} />, tone: 'brand' },
    { id: 'lapsed', label: `Lapsed ${lapseDays}d+`, icon: <HeartCrack size={13} />, tone: 'warn' },
    { id: 'birthday', label: 'Birthday today', icon: <Cake size={13} />, tone: 'ok' },
    { id: 'dues', label: 'Has dues', icon: <Wallet size={13} />, tone: 'bad' },
    { id: 'points', label: 'Points to redeem', icon: <Megaphone size={13} />, tone: 'brand' },
    { id: 'new', label: 'New (30d)', icon: <Users size={13} />, tone: 'ok' },
    { id: 'all', label: 'Everyone', icon: <Users size={13} />, tone: 'muted' },
  ];

  const render = (c: Customer) => msg
    .replace(/{name}/g, c.name.split(' ')[0])
    .replace(/{fullname}/g, c.name)
    .replace(/{shop}/g, s.shopName)
    .replace(/{phone}/g, s.phone || '')
    .replace(/{due}/g, money(c.credit, s.currency))
    .replace(/{points}/g, String(c.points || 0))
    .replace(/{spend}/g, money(c.totalSpend, s.currency));

  const potential = list.reduce((t, c) => t + c.totalSpend, 0) / Math.max(1, list.length);
  const revenueSeg = useMemo(() => {
    const ids = new Set(list.map((c) => c.id));
    return (sales as Sale[]).filter((x) => x.customerId && ids.has(x.customerId)).reduce((t, x) => t + x.total, 0);
  }, [sales, list]);

  const sendOne = (c: Customer) => { window.open(waLink(c.phone, render(c)), '_blank'); setSent((p) => ({ ...p, [c.id]: true })); };
  const sendAll = () => {
    if (!list.length) return toast('Is segment me koi customer nahi', 'err');
    list.slice(0, 20).forEach((c, i) => setTimeout(() => sendOne(c), i * 900));
    toast(`Opening WhatsApp for ${Math.min(20, list.length)} customers…`);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Audience size" value={num(list.length)} tone="brand" icon={<Megaphone size={16} />} />
        <Stat label="Avg spend in segment" value={moneyShort(potential || 0, s.currency)} tone="ok" />
        <Stat label="Lifetime revenue" value={moneyShort(revenueSeg, s.currency)} tone="warn" />
        <Stat label="Messages opened" value={num(Object.keys(sent).length)} tone="ok" icon={<MessageCircle size={16} />} />
      </div>

      <Card>
        <SectionTitle title="Marketing campaigns" sub="Customer segment chuniye, message likhiye, ek click me WhatsApp par bhejiye"
          right={<div className="flex gap-2">
            <button className="btn-soft" onClick={() => downloadCSV(`segment-${seg}.csv`, list.map((c) => ({
              name: c.name, phone: c.phone, spend: c.totalSpend, visits: c.visits, points: c.points, due: c.credit,
              last_visit: c.lastVisit ? dOnly(c.lastVisit) : '', message: render(c).replace(/\n/g, ' '),
            })))}><Download size={15} /> Export</button>
            <button className="btn-primary" onClick={sendAll}><MessageCircle size={15} /> Send to all</button>
          </div>} />
        <div className="flex flex-wrap gap-1.5">
          {SEGS.map((x) => (
            <button key={x.id} className={cx('btn-soft px-2.5 py-1.5 text-[11px]', seg === x.id && 'ring-1 ring-brand')} onClick={() => setSeg(x.id)}>
              {x.icon} {x.label} <span className="text-ink3">({segments[x.id]?.length || 0})</span>
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-ink3">VIP minimum spend<Input className="mt-1" inputMode="numeric" value={minSpend} onChange={(e) => setMinSpend(+e.target.value || 0)} /></label>
          <label className="text-xs text-ink3">Lapsed after (days)<Input className="mt-1" inputMode="numeric" value={lapseDays} onChange={(e) => setLapseDays(+e.target.value || 30)} /></label>
        </div>
        <Tabs active={tab} onChange={(t) => setTab(t as any)} tabs={[{ id: 'compose', label: 'Compose' }, { id: 'list', label: 'Audience', count: list.length }]} />
      </Card>

      {tab === 'compose' && (
        <Card>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATES.map((t) => <button key={t.id} className="btn-soft px-2 py-1 text-[11px]" onClick={() => setMsg(t.body)}>{t.title}</button>)}
          </div>
          <Textarea className="mt-2" rows={7} value={msg} onChange={(e) => setMsg(e.target.value)} />
          <p className="mt-1 text-[10px] text-ink3">Variables: {'{name} {fullname} {shop} {phone} {due} {points} {spend}'} · *bold* WhatsApp me kaam karta hai</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button className="btn-soft" onClick={() => { navigator.clipboard.writeText(msg); toast('Message copied'); }}><Copy size={15} /> Copy</button>
            <span className="self-center text-[11px] text-ink3">{msg.length} characters</span>
          </div>
          {list[0] && (
            <div className="mt-3 rounded-xl border border-line bg-surface2 p-3">
              <p className="mb-1 text-[10px] uppercase tracking-widest text-ink3">Preview for {list[0].name}</p>
              <pre className="whitespace-pre-wrap break-words text-xs text-ink">{render(list[0])}</pre>
            </div>
          )}
        </Card>
      )}

      {tab === 'list' && (list.length === 0 ? <Empty title="Segment khali hai" sub="Doosra segment chuniye ya filters badliye." icon={<Users size={22} />} /> : (
        <Card pad={false}>
          {list.slice(0, 300).map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2 text-xs last:border-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-ink">{c.name} {sent[c.id] && <Badge tone="ok">sent</Badge>}</p>
                <p className="truncate text-[10px] text-ink3">{c.phone} · {c.visits} visits · {money(c.totalSpend, s.currency)}{c.credit > 0 ? ` · due ${money(c.credit, s.currency)}` : ''}{c.lastVisit ? ` · last ${dOnly(c.lastVisit)}` : ''}</p>
              </div>
              {c.points > 0 && <Badge tone="brand">{c.points} pts</Badge>}
              <button className="btn-soft px-2 py-1 text-[11px]" onClick={() => sendOne(c)}><MessageCircle size={12} /> Send</button>
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
}
