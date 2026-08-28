import { useState } from 'react';
import { Trash2, Download, Activity as Act } from 'lucide-react';
import { useActivity } from '@/hooks/useData';
import { db } from '@/db/db';
import { dt, ago } from '@/lib/format';
import { downloadCSV } from '@/lib/csv';
import { Card, Empty, Badge, SearchBar, ConfirmBtn } from '@/components/ui';
import { VirtualList } from '@/components/ui/Virtual';
import { toast } from '@/store/ui';

export default function ActivityPage() {
  const activity = useActivity() || [];
  const [q, setQ] = useState('');
  const list = activity.filter((a: any) => !q || a.message.toLowerCase().includes(q.toLowerCase()) || a.type.includes(q.toLowerCase()));

  return (
    <div className="space-y-3">
      <Card className="flex flex-wrap gap-2">
        <SearchBar value={q} onChange={setQ} placeholder="Search audit log…" />
        <button className="btn-ghost" onClick={() => downloadCSV('activity.csv', list.map((a: any) => ({ time: dt(a.ts), type: a.type, message: a.message, by: a.by ?? '' })))}><Download size={15} /> Export</button>
        <ConfirmBtn onConfirm={async () => { await db.activity.clear(); toast('Log cleared'); }}><Trash2 size={15} /> Clear log</ConfirmBtn>
      </Card>
      {list.length === 0 ? <Empty title="Nothing logged yet" icon={<Act size={26} />} /> : (
        <Card pad={false}>
          <VirtualList
            items={list}
            rowHeight={46}
            columns={1}
            height="calc(100dvh - 240px)"
            render={(a: any) => (
              <div className="flex h-full items-center gap-3 border-b border-line px-3">
                <Badge tone={a.type === 'sale' ? 'ok' : a.type === 'refund' ? 'bad' : 'brand'}>{a.type}</Badge>
                <span className="min-w-0 flex-1 truncate text-xs text-ink">{a.message}</span>
                {a.by && <span className="text-[11px] text-ink3">{a.by}</span>}
                <span className="shrink-0 text-[11px] text-ink3">{ago(a.ts)}</span>
              </div>
            )}
          />
        </Card>
      )}
    </div>
  );
}
