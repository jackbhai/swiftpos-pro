import { useEffect, useMemo, useState } from 'react';
import { ListChecks, Search, Download, RefreshCw } from 'lucide-react';
import { Card, Stat, Empty, Badge, SearchBar, SectionTitle, Spinner } from '@/components/ui';
import { num, cx } from '@/lib/format';
import { download } from '@/lib/csv';
import { downloadCSV } from '@/lib/csv';
import { toast } from '@/store/ui';

const BUILD = { version: 'v' + __APP_VERSION__, commit: __COMMIT__ };

interface Item { n: number; text: string; section: string; release: string }

/** In-app feature index — every documented feature of the app, searchable. */
export default function Features() {
  const [raw, setRaw] = useState('');
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [rel, setRel] = useState('');

  useEffect(() => {
    const url = new URL('features.md', document.baseURI).href;
    fetch(url).then((r) => (r.ok ? r.text() : Promise.reject(r.status)))
      .then(setRaw).catch(() => setRaw('')).finally(() => setLoading(false));
  }, []);

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    let section = 'General'; let release = 'v7';
    raw.split('\n').forEach((line) => {
      const h2 = line.match(/^##\s+(.+)/);
      const h3 = line.match(/^###\s+(.+)/);
      if (h2) { release = h2[1].replace(/\s*—.*$/, '').trim(); section = h2[1].trim(); }
      else if (h3) section = h3[1].trim();
      const m = line.match(/^(\d+)\.\s+(.+)/);
      if (m) out.push({ n: +m[1], text: clean(m[2]), section: clean(section), release: clean(release) });
    });
    return out;
  }, [raw]);

  const releases = useMemo(() => [...new Set(items.map((i) => i.release))], [items]);
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return items.filter((i) => (!rel || i.release === rel) && (!t || i.text.toLowerCase().includes(t) || i.section.toLowerCase().includes(t) || String(i.n) === t));
  }, [items, q, rel]);

  const grouped = useMemo(() => {
    const m = new Map<string, Item[]>();
    filtered.forEach((i) => m.set(i.section, [...(m.get(i.section) || []), i]));
    return [...m.entries()];
  }, [filtered]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total features" value={num(items.length)} tone="brand" icon={<ListChecks size={16} />} />
        <Stat label="Matching search" value={num(filtered.length)} tone="ok" />
        <Stat label="Sections" value={num(new Set(items.map((i) => i.section)).size)} tone="warn" />
        <Stat label="App version" value={BUILD.version} tone="ok" sub={BUILD.commit} />
      </div>

      <Card>
        <SectionTitle title="Feature index" sub="App ke saare documented features — search kar ke dekhiye kahan kya hai"
          right={<div className="flex gap-2">
            <button className="btn-soft" onClick={() => downloadCSV('swiftpos-features.csv', filtered.map((i) => ({ no: i.n, feature: i.text, section: i.section, release: i.release })))}><Download size={15} /> CSV</button>
            <button className="btn-soft" onClick={() => { download('FEATURES.md', raw, 'text/markdown'); toast('FEATURES.md downloaded'); }}><Download size={15} /> Markdown</button>
            <button className="btn-soft" onClick={() => location.reload()}><RefreshCw size={15} /> Reload</button>
          </div>} />
        <SearchBar value={q} onChange={setQ} placeholder="Search 700+ features — e.g. gift card, expiry, target…" />
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button className={cx('btn-soft px-2 py-1 text-[11px]', !rel && 'ring-1 ring-brand')} onClick={() => setRel('')}>All releases</button>
          {releases.map((r) => (
            <button key={r} className={cx('btn-soft px-2 py-1 text-[11px]', rel === r && 'ring-1 ring-brand')} onClick={() => setRel(r)}>{r}</button>
          ))}
        </div>
      </Card>

      {loading ? <div className="grid place-items-center py-10"><Spinner /></div>
        : items.length === 0 ? <Empty title="Feature list load nahi hui" sub="Offline cache purana ho sakta hai — Update button dabaiye." icon={<ListChecks size={22} />} />
        : filtered.length === 0 ? <Empty title="Kuch nahi mila" sub="Doosra shabd try kijiye." icon={<Search size={22} />} />
        : grouped.map(([sec, list]) => (
          <Card key={sec} pad={false}>
            <div className="flex items-center gap-2 border-b border-line p-3">
              <p className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{sec}</p>
              <Badge tone="muted">{list.length}</Badge>
            </div>
            {list.map((i) => (
              <div key={i.n} className="flex gap-2 border-b border-line px-3 py-2 text-xs last:border-0">
                <span className="w-10 shrink-0 font-mono text-ink3">{i.n}</span>
                <span className="min-w-0 flex-1 text-ink2">{i.text}</span>
              </div>
            ))}
          </Card>
        ))}
    </div>
  );
}

const clean = (x: string) => x.replace(/\*\*/g, '').replace(/`/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1').trim();
