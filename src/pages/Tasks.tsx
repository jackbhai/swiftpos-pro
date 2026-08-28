import { useMemo, useState } from 'react';
import { CheckSquare, Plus, Trash2, Repeat, Flag, Calendar, ListTodo } from 'lucide-react';
import { useTasks } from '@/hooks/useData';
import { db, uid, logActivity } from '@/db/db';
import { num, dOnly, cx } from '@/lib/format';
import { Card, Stat, Modal, Field, Input, Select, Textarea, Empty, Badge, Tabs, SectionTitle } from '@/components/ui';
import { toast, toastUndo } from '@/store/ui';
import type { Task } from '@/db/types';

const PRIO: Record<string, { label: string; tone: any }> = {
  high: { label: 'High', tone: 'bad' }, normal: { label: 'Normal', tone: 'brand' }, low: { label: 'Low', tone: 'muted' },
};
const QUICK = ['Bank deposit karna', 'Vendor payment', 'Stock order lagana', 'Shop cleaning', 'Expiry check', 'GST filing', 'Staff salary', 'Electricity bill'];

/** Daily task list / reminders for the shop — repeatable checklist with due dates. */
export default function Tasks() {
  const tasks = useTasks() || [];
  const [tab, setTab] = useState<'open' | 'today' | 'done'>('open');
  const [editor, setEditor] = useState<Task | null>(null);
  const [quick, setQuick] = useState('');

  const today = new Date().toISOString().slice(0, 10);
  const open = tasks.filter((t: Task) => !t.done);
  const dueToday = open.filter((t: Task) => t.due && t.due <= today);
  const overdue = open.filter((t: Task) => t.due && t.due < today);
  const done = tasks.filter((t: Task) => t.done);
  const list = tab === 'open' ? open : tab === 'today' ? dueToday : done;
  const sorted = useMemo(() => [...list].sort((a, b) => {
    const p = (x: Task) => (x.priority === 'high' ? 0 : x.priority === 'normal' ? 1 : 2);
    return (a.due || '9999').localeCompare(b.due || '9999') || p(a) - p(b);
  }), [list]);

  const addQuick = async () => {
    if (!quick.trim()) return;
    await db.tasks.add({ id: uid('tk_'), title: quick.trim(), done: false, priority: 'normal', createdAt: Date.now(), due: today });
    setQuick(''); toast('Task added');
  };

  const toggle = async (t: Task) => {
    const done = !t.done;
    await db.tasks.update(t.id, { done, doneAt: done ? Date.now() : undefined });
    if (done && t.repeat && t.repeat !== 'none') {
      const base = t.due ? new Date(t.due) : new Date();
      if (t.repeat === 'daily') base.setDate(base.getDate() + 1);
      if (t.repeat === 'weekly') base.setDate(base.getDate() + 7);
      if (t.repeat === 'monthly') base.setMonth(base.getMonth() + 1);
      await db.tasks.add({ ...t, id: uid('tk_'), done: false, doneAt: undefined, createdAt: Date.now(), due: base.toISOString().slice(0, 10) });
      toast('Done ✓ next one scheduled');
    } else if (done) toast('Task complete ✓');
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Open tasks" value={num(open.length)} tone="brand" icon={<ListTodo size={16} />} />
        <Stat label="Due today" value={num(dueToday.length)} tone="warn" icon={<Calendar size={16} />} />
        <Stat label="Overdue" value={num(overdue.length)} tone="bad" icon={<Flag size={16} />} />
        <Stat label="Completed" value={num(done.length)} tone="ok" icon={<CheckSquare size={16} />} />
      </div>

      <Card>
        <SectionTitle title="Shop tasks & reminders" sub="Roz ke kaam ki checklist — repeat bhi ho sakti hai"
          right={<button className="btn-primary" onClick={() => setEditor({ id: '', title: '', done: false, priority: 'normal', createdAt: Date.now(), due: today })}><Plus size={15} /> New task</button>} />
        <div className="flex gap-2">
          <Input value={quick} onChange={(e) => setQuick(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addQuick()} placeholder="Quick add — type & press Enter" />
          <button className="btn-soft" onClick={addQuick}><Plus size={15} /></button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {QUICK.map((q) => <button key={q} className="btn-soft px-2 py-1 text-[11px]" onClick={() => setQuick(q)}>{q}</button>)}
        </div>
        <Tabs active={tab} onChange={(t) => setTab(t as any)} tabs={[
          { id: 'open', label: 'Open', count: open.length },
          { id: 'today', label: 'Due today', count: dueToday.length },
          { id: 'done', label: 'Done', count: done.length },
        ]} />
      </Card>

      {sorted.length === 0 ? <Empty title="Nothing here" sub="Sab kaam ho gaya 🎉" icon={<CheckSquare size={22} />} /> : (
        <Card pad={false}>
          {sorted.map((t: Task) => {
            const late = !t.done && t.due && t.due < today;
            return (
              <div key={t.id} className="flex items-center gap-2 border-b border-line px-3 py-2.5 last:border-0">
                <button onClick={() => toggle(t)} className={cx('grid h-5 w-5 shrink-0 place-items-center rounded-md border', t.done ? 'border-ok bg-ok text-black' : 'border-line')}>
                  {t.done && <CheckSquare size={12} />}
                </button>
                <div className="min-w-0 flex-1" onClick={() => setEditor(t)}>
                  <p className={cx('truncate text-sm', t.done ? 'text-ink3 line-through' : 'text-ink')}>{t.title}</p>
                  <p className="truncate text-[10px] text-ink3">
                    {t.due ? (late ? '⚠️ overdue · ' : '') + dOnly(new Date(t.due).getTime()) : 'no due date'}
                    {t.assignee ? ' · ' + t.assignee : ''}{t.detail ? ' · ' + t.detail : ''}
                  </p>
                </div>
                {t.repeat && t.repeat !== 'none' && <Badge tone="muted"><Repeat size={10} /> {t.repeat}</Badge>}
                <Badge tone={late ? 'bad' : PRIO[t.priority].tone}>{PRIO[t.priority].label}</Badge>
                <button className="rounded-lg p-1 text-ink3 hover:text-bad" onClick={async () => {
                  await db.tasks.delete(t.id);
                  toastUndo('Task deleted', async () => { await db.tasks.put(t); toast('Restored'); });
                }}><Trash2 size={13} /></button>
              </div>
            );
          })}
          {tab === 'done' && done.length > 0 && (
            <div className="p-3">
              <button className="btn-soft w-full" onClick={async () => { await db.tasks.bulkDelete(done.map((t: Task) => t.id)); toast('Completed tasks cleared'); }}>Clear completed</button>
            </div>
          )}
        </Card>
      )}

      {editor && <TaskEditor task={editor} onClose={() => setEditor(null)} />}
    </div>
  );
}

function TaskEditor({ task, onClose }: { task: Task; onClose: () => void }) {
  const [f, setF] = useState<Task>(task);
  const save = async () => {
    if (!f.title.trim()) return toast('Title likhiye', 'err');
    const rec = { ...f, id: f.id || uid('tk_') };
    await db.tasks.put(rec);
    await logActivity('task', `task: ${rec.title}`);
    toast('Task saved'); onClose();
  };
  return (
    <Modal open onClose={onClose} title={f.id ? 'Edit task' : 'New task'} footer={<button className="btn-primary w-full" onClick={save}>Save task</button>}>
      <Field label="Title"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} autoFocus /></Field>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Due date"><Input type="date" value={f.due || ''} onChange={(e) => setF({ ...f, due: e.target.value })} /></Field>
        <Field label="Priority">
          <Select value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value as any })}>
            <option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option>
          </Select>
        </Field>
        <Field label="Repeat">
          <Select value={f.repeat || 'none'} onChange={(e) => setF({ ...f, repeat: e.target.value as any })}>
            <option value="none">No repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
          </Select>
        </Field>
        <Field label="Assign to"><Input value={f.assignee || ''} onChange={(e) => setF({ ...f, assignee: e.target.value })} placeholder="Staff name" /></Field>
      </div>
      <Field label="Note" className="mt-3"><Textarea rows={2} value={f.detail || ''} onChange={(e) => setF({ ...f, detail: e.target.value })} /></Field>
    </Modal>
  );
}
