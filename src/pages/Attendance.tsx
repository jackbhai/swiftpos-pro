import { useMemo, useState } from 'react';
import { CalendarClock, LogIn, LogOut, Download, IndianRupee, UserCheck, Percent } from 'lucide-react';
import { useStaff, useAttendance, usePayroll, useSales } from '@/hooks/useData';
import { db, uid, logActivity } from '@/db/db';
import { money, num, tOnly, cx } from '@/lib/format';
import { downloadCSV } from '@/lib/csv';
import { Card, Stat, Modal, Field, Input, Select, Empty, Badge, Tabs, SectionTitle } from '@/components/ui';
import { useSettings } from '@/store/settings';
import { toast } from '@/store/ui';
import { printHTML } from '@/lib/receipt';
import type { Attendance as Att, PayrollRule, Staff, Sale } from '@/db/types';

const today = () => new Date().toISOString().slice(0, 10);
const monthOf = (d: string) => d.slice(0, 7);

/** Attendance & payroll — punch in/out, hours, salary, commission, payslips. */
export default function Attendance() {
  const staff = useStaff() || [];
  const rows = useAttendance() || [];
  const rules = usePayroll() || [];
  const sales = useSales() || [];
  const s = useSettings();

  const [tab, setTab] = useState<'today' | 'month' | 'payroll'>('today');
  const [month, setMonth] = useState(today().slice(0, 7));
  const [ruleFor, setRuleFor] = useState<Staff | null>(null);

  const day = today();
  const todayRows = rows.filter((r: Att) => r.date === day);
  const monthRows = rows.filter((r: Att) => monthOf(r.date) === month);

  const punch = async (st: Staff, dir: 'in' | 'out') => {
    const existing = rows.find((r: Att) => r.staffId === st.id && r.date === day);
    const now = Date.now();
    if (dir === 'in') {
      if (existing?.inTs) return toast('Already punched in', 'info');
      const rec: Att = existing
        ? { ...existing, inTs: now, status: 'present' }
        : { id: uid('at_'), staffId: st.id, staffName: st.name, date: day, inTs: now, minutes: 0, status: 'present' };
      await db.attendance.put(rec);
      toast(`${st.name} punched in`);
    } else {
      if (!existing?.inTs) return toast('Punch in first', 'err');
      const minutes = Math.max(0, Math.round((now - existing.inTs) / 60000));
      await db.attendance.put({ ...existing, outTs: now, minutes, status: minutes < 240 ? 'half' : 'present' });
      toast(`${st.name} punched out · ${(minutes / 60).toFixed(1)} h`);
    }
    await logActivity('attendance', `${st.name} punch ${dir}`);
  };

  const mark = async (st: Staff, status: Att['status']) => {
    const existing = rows.find((r: Att) => r.staffId === st.id && r.date === day);
    await db.attendance.put({ id: existing?.id || uid('at_'), staffId: st.id, staffName: st.name, date: day, minutes: existing?.minutes || 0, status, inTs: existing?.inTs, outTs: existing?.outTs });
    toast(`${st.name} marked ${status}`);
  };

  const payroll = useMemo(() => staff.map((st: Staff) => {
    const rule = rules.find((r: PayrollRule) => r.staffId === st.id);
    const mine = monthRows.filter((r: Att) => r.staffId === st.id);
    const present = mine.filter((r) => r.status === 'present').length;
    const half = mine.filter((r) => r.status === 'half').length;
    const leave = mine.filter((r) => r.status === 'leave').length;
    const hours = mine.reduce((t, r) => t + r.minutes, 0) / 60;
    const monthSales = sales.filter((x: Sale) => x.staffId === st.id && x.ts >= new Date(month + '-01').getTime()).reduce((t: number, x: Sale) => t + x.total, 0);
    const days = new Date(+month.slice(0, 4), +month.slice(5, 7), 0).getDate();
    const base = rule?.monthlySalary ? (rule.monthlySalary / days) * (present + half * 0.5) : (rule?.hourlyRate || 0) * hours;
    const commission = monthSales * ((rule?.commissionPct ?? st.commissionPct ?? 0) / 100);
    return { st, rule, present, half, leave, hours, monthSales, base, commission, net: base + commission };
  }), [staff, rules, monthRows, sales, month]);

  const payrollTotal = payroll.reduce((t, p) => t + p.net, 0);

  const payslip = (p: any) => printHTML(`<html><head><meta charset="utf-8"><title>Payslip</title><style>
    body{font-family:system-ui,Arial;padding:24px;color:#111;max-width:620px;margin:auto}
    table{width:100%;border-collapse:collapse;font-size:13px;margin-top:12px}td{border:1px solid #ddd;padding:7px}.r{text-align:right}
    .muted{color:#666;font-size:11px}</style></head><body>
    <h2 style="margin:0">${s.shopName || 'Shop'} — Payslip</h2>
    <p class=muted>${p.st.name} (${p.st.role}) · ${month}</p>
    <table>
      <tr><td>Days present</td><td class=r>${p.present}${p.half ? ' + ' + p.half + ' half' : ''}</td></tr>
      <tr><td>Hours logged</td><td class=r>${p.hours.toFixed(1)}</td></tr>
      <tr><td>Sales handled</td><td class=r>${p.monthSales.toFixed(2)}</td></tr>
      <tr><td>Basic / earned salary</td><td class=r>${p.base.toFixed(2)}</td></tr>
      <tr><td>Commission</td><td class=r>${p.commission.toFixed(2)}</td></tr>
      <tr><td><b>Net payable</b></td><td class=r><b>${p.net.toFixed(2)}</b></td></tr>
    </table>
    <p class=muted>Signature: ______________________</p></body></html>`);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Present today" value={`${todayRows.filter((r: Att) => r.status === 'present').length}/${staff.length}`} tone="ok" icon={<UserCheck size={16} />} />
        <Stat label="Hours today" value={(todayRows.reduce((t: number, r: Att) => t + r.minutes, 0) / 60).toFixed(1)} tone="brand" icon={<CalendarClock size={16} />} />
        <Stat label="Payroll this month" value={money(payrollTotal, s.currency)} tone="warn" icon={<IndianRupee size={16} />} />
        <Stat label="On leave" value={num(todayRows.filter((r: Att) => r.status === 'leave').length)} tone="bad" />
      </div>

      <Card>
        <SectionTitle title="Attendance & payroll" sub="Punch in/out, hours, salary aur commission — sab automatic"
          right={<div className="flex gap-2">
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-9" />
            <button className="btn-soft" onClick={() => downloadCSV(`attendance-${month}.csv`, monthRows.map((r: Att) => ({
              date: r.date, staff: r.staffName, in: r.inTs ? tOnly(r.inTs) : '', out: r.outTs ? tOnly(r.outTs) : '', hours: +(r.minutes / 60).toFixed(2), status: r.status,
            })))}><Download size={15} /> CSV</button>
          </div>} />
        <Tabs active={tab} onChange={(t) => setTab(t as any)} tabs={[
          { id: 'today', label: 'Today' }, { id: 'month', label: 'Month sheet' }, { id: 'payroll', label: 'Payroll' },
        ]} />
      </Card>

      {tab === 'today' && (staff.length === 0 ? <Empty title="No staff yet" sub="Staff page se users add kijiye." /> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {staff.map((st: Staff) => {
            const r = todayRows.find((x: Att) => x.staffId === st.id);
            return (
              <Card key={st.id}>
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/15 text-sm font-bold text-brand">{st.name.slice(0, 2).toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{st.name}</p>
                    <p className="text-[11px] capitalize text-ink3">{st.role}</p>
                  </div>
                  <Badge tone={r?.status === 'present' ? 'ok' : r?.status === 'half' ? 'warn' : r?.status === 'leave' ? 'bad' : 'muted'}>{r?.status || 'not marked'}</Badge>
                </div>
                <p className="mt-2 text-[11px] text-ink3">
                  In: {r?.inTs ? tOnly(r.inTs) : '—'} · Out: {r?.outTs ? tOnly(r.outTs) : '—'} · {(  (r?.minutes || 0) / 60).toFixed(1)} h
                </p>
                <div className="mt-2 flex gap-1.5">
                  <button className="btn-primary flex-1 px-2 py-1.5 text-xs" onClick={() => punch(st, 'in')}><LogIn size={13} /> In</button>
                  <button className="btn-soft flex-1 px-2 py-1.5 text-xs" onClick={() => punch(st, 'out')}><LogOut size={13} /> Out</button>
                  <button className="btn-ghost px-2 py-1.5 text-xs" onClick={() => mark(st, 'leave')}>Leave</button>
                  <button className="btn-ghost px-2 py-1.5 text-xs" onClick={() => setRuleFor(st)}><Percent size={13} /></button>
                </div>
              </Card>
            );
          })}
        </div>
      ))}

      {tab === 'month' && (monthRows.length === 0 ? <Empty title="No attendance recorded this month" /> : (
        <Card pad={false}>
          {monthRows.sort((a: Att, b: Att) => b.date.localeCompare(a.date)).map((r: Att) => (
            <div key={r.id} className="flex items-center gap-2 border-b border-line px-3 py-2 text-xs last:border-0">
              <span className="w-24 shrink-0 text-ink3">{r.date}</span>
              <span className="min-w-0 flex-1 truncate text-ink">{r.staffName}</span>
              <span className="text-ink3">{r.inTs ? tOnly(r.inTs) : '—'} → {r.outTs ? tOnly(r.outTs) : '—'}</span>
              <span className="w-14 text-right font-mono text-ink2">{(r.minutes / 60).toFixed(1)}h</span>
              <Badge tone={r.status === 'present' ? 'ok' : r.status === 'half' ? 'warn' : 'bad'}>{r.status}</Badge>
            </div>
          ))}
        </Card>
      ))}

      {tab === 'payroll' && (
        <Card pad={false}>
          <div className="flex items-center justify-between p-3">
            <SectionTitle title={`Payroll · ${month}`} sub="Attendance + commission se auto-calculated" />
            <button className="btn-ghost px-2 py-1 text-xs" onClick={() => downloadCSV(`payroll-${month}.csv`, payroll.map((p) => ({
              staff: p.st.name, role: p.st.role, present: p.present, half: p.half, hours: +p.hours.toFixed(1),
              sales: +p.monthSales.toFixed(2), salary: +p.base.toFixed(2), commission: +p.commission.toFixed(2), net: +p.net.toFixed(2),
            })))}><Download size={13} /> CSV</button>
          </div>
          {payroll.map((p) => (
            <div key={p.st.id} className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5 text-xs last:border-0">
              <span className="min-w-0 flex-1 truncate font-semibold text-ink">{p.st.name}</span>
              <span className="text-ink3">{p.present}d{p.half ? ` +${p.half}½` : ''} · {p.hours.toFixed(1)}h</span>
              <span className="font-mono text-ink3">sales {money(p.monthSales, s.currency)}</span>
              <span className="font-mono text-ink2">+{money(p.commission, s.currency)}</span>
              <span className="w-24 text-right font-mono font-bold text-ink">{money(p.net, s.currency)}</span>
              <button className="btn-soft px-2 py-1 text-[11px]" onClick={() => payslip(p)}>Payslip</button>
              <button className="btn-ghost px-2 py-1 text-[11px]" onClick={() => setRuleFor(p.st)}>Rules</button>
            </div>
          ))}
          <div className="flex justify-between border-t border-line p-3 text-sm font-bold text-ink">
            <span>Total payable</span><span className="font-mono">{money(payrollTotal, s.currency)}</span>
          </div>
        </Card>
      )}

      {ruleFor && <RuleModal st={ruleFor} rule={rules.find((r: PayrollRule) => r.staffId === ruleFor.id)} onClose={() => setRuleFor(null)} />}
    </div>
  );
}

function RuleModal({ st, rule, onClose }: { st: Staff; rule?: PayrollRule; onClose: () => void }) {
  const [f, setF] = useState({
    monthlySalary: String(rule?.monthlySalary ?? 0),
    hourlyRate: String(rule?.hourlyRate ?? 0),
    commissionPct: String(rule?.commissionPct ?? st.commissionPct ?? 0),
    note: rule?.note ?? '',
  });
  const save = async () => {
    await db.payroll.put({
      id: rule?.id || uid('pr_'), staffId: st.id, monthlySalary: +f.monthlySalary || 0,
      hourlyRate: +f.hourlyRate || 0, commissionPct: +f.commissionPct || 0, note: f.note,
    });
    toast('Payroll rules saved'); onClose();
  };
  return (
    <Modal open onClose={onClose} title={`Payroll rules · ${st.name}`} footer={<button className="btn-primary w-full" onClick={save}>Save</button>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Monthly salary" hint="Pro-rated by attendance"><Input inputMode="decimal" value={f.monthlySalary} onChange={(e) => setF({ ...f, monthlySalary: e.target.value })} /></Field>
        <Field label="Hourly rate" hint="Used when salary is 0"><Input inputMode="decimal" value={f.hourlyRate} onChange={(e) => setF({ ...f, hourlyRate: e.target.value })} /></Field>
        <Field label="Commission %" hint="On sales handled by this user"><Input inputMode="decimal" value={f.commissionPct} onChange={(e) => setF({ ...f, commissionPct: e.target.value })} /></Field>
        <Field label="Note"><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}
