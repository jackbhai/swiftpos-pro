import { useEffect, useState } from 'react';
import {
  Activity, HardDrive, Cpu, ShieldCheck, Copy, RefreshCw, Stethoscope, Download, Trash2, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { db } from '@/db/db';
import { repairLocalDb } from '@/lib/cloud/doctor';
import { useSyncLog } from '@/hooks/useData';
import { exportBackup } from '@/lib/backup';
import { num, dt, cx } from '@/lib/format';
import { Card, Stat, Badge, SectionTitle, Empty, Spinner } from '@/components/ui';
import { toast } from '@/store/ui';
import { useCloud } from '@/store/cloud';
import { useSettings } from '@/store/settings';

const BUILD = { version: __APP_VERSION__, time: __BUILD_TIME__, commit: __COMMIT__ };

/** Support & diagnostics — everything a shopkeeper (or support agent) needs to debug a device. */
export default function Diagnostics() {
  const logs = (useSyncLog() || []).filter((l: any) => l.level === 'error' || l.level === 'fix');
  const cloud = useCloud();
  const s = useSettings();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [storage, setStorage] = useState<{ usage: number; quota: number; persisted: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    const tables = ['products', 'sales', 'customers', 'vendors', 'purchaseOrders', 'expenses', 'ledger', 'orders', 'giftCards', 'feedback', 'tasks', 'syncLog'];
    const out: Record<string, number> = {};
    for (const t of tables) { try { out[t] = await (db as any)[t].count(); } catch { out[t] = -1; } }
    setCounts(out);
    try {
      const est: any = (await navigator.storage?.estimate?.()) || {};
      const persisted = (await navigator.storage?.persisted?.()) || false;
      setStorage({ usage: est.usage || 0, quota: est.quota || 0, persisted });
    } catch { setStorage(null); }
    setBusy(false);
  };
  useEffect(() => { load(); }, []);

  const mb = (n: number) => (n / 1048576).toFixed(1) + ' MB';
  const usedPct = storage?.quota ? (storage.usage / storage.quota) * 100 : 0;

  const report = () => [
    `SwiftPOS Pro ${BUILD.version} (${BUILD.commit}) built ${BUILD.time}`,
    `URL: ${location.href}`,
    `UA: ${navigator.userAgent}`,
    `Online: ${navigator.onLine} · Installed: ${window.matchMedia('(display-mode: standalone)').matches}`,
    `Language: ${navigator.language} · Screen: ${screen.width}x${screen.height} · DPR ${devicePixelRatio}`,
    `System: ${s.systemId} · Shop: ${s.shopName} · Currency: ${s.currency}`,
    `Cloud: ${cloud.cfg.provider} · enabled ${cloud.enabled} · lastSync ${cloud.lastSync ? dt(cloud.lastSync) : 'never'}`,
    `Storage: ${storage ? `${mb(storage.usage)} / ${mb(storage.quota)} (persisted: ${storage.persisted})` : 'n/a'}`,
    'Rows: ' + Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(', '),
    'Recent issues:',
    ...logs.slice(0, 10).map((l: any) => ` - [${l.level}] ${dt(l.ts)} ${l.message}`),
  ].join('\n');

  const askPersist = async () => {
    const ok = await navigator.storage?.persist?.();
    toast(ok ? 'Storage ab persistent hai — browser data delete nahi karega ✅' : 'Browser ne persistent storage mana kar diya', ok ? 'ok' : 'err');
    load();
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="App version" value={BUILD.version} tone="brand" icon={<Cpu size={16} />} sub={BUILD.commit} />
        <Stat label="Storage used" value={storage ? mb(storage.usage) : '—'} tone={usedPct > 80 ? 'bad' : 'ok'} icon={<HardDrive size={16} />} sub={storage ? `of ${mb(storage.quota)}` : ''} />
        <Stat label="Data safety" value={storage?.persisted ? 'Protected' : 'Standard'} tone={storage?.persisted ? 'ok' : 'warn'} icon={<ShieldCheck size={16} />} />
        <Stat label="Issues logged" value={num(logs.length)} tone={logs.some((l: any) => l.level === 'error') ? 'warn' : 'ok'} icon={<Activity size={16} />} />
      </div>

      <Card>
        <SectionTitle title="Support & diagnostics" sub="Koi dikkat ho to yahan se report copy kar ke support ko bhej dijiye"
          right={<div className="flex flex-wrap gap-2">
            <button className="btn-soft" onClick={load} disabled={busy}>{busy ? <Spinner /> : <RefreshCw size={15} />} Refresh</button>
            <button className="btn-soft" onClick={() => { navigator.clipboard.writeText(report()); toast('Diagnostic report copied'); }}><Copy size={15} /> Copy report</button>
            <button className="btn-primary" onClick={() => exportBackup()}><Download size={15} /> Backup now</button>
          </div>} />
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="space-y-1 text-xs">
            <KV k="Build time" v={new Date(BUILD.time).toLocaleString('en-IN')} />
            <KV k="Commit" v={BUILD.commit} />
            <KV k="Installed as app" v={window.matchMedia('(display-mode: standalone)').matches ? 'Yes' : 'No (browser tab)'} />
            <KV k="Online" v={navigator.onLine ? 'Yes' : 'No — offline mode'} />
            <KV k="Service worker" v={'serviceWorker' in navigator ? 'Active' : 'Unsupported'} />
            <KV k="Business system" v={s.systemId} />
            <KV k="Cloud provider" v={cloud.cfg.provider === 'none' ? 'Not connected' : cloud.cfg.provider} />
            <KV k="Last cloud sync" v={cloud.lastSync ? dt(cloud.lastSync) : 'never'} />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs text-ink3"><span>Device storage</span><span className="font-mono text-ink">{usedPct.toFixed(1)}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-surface2"><div className={cx('h-full rounded-full', usedPct > 80 ? 'bg-bad' : 'bg-brand')} style={{ width: `${Math.min(100, usedPct)}%` }} /></div>
            {!storage?.persisted && (
              <button className="btn-soft mt-2 w-full" onClick={askPersist}><ShieldCheck size={15} /> Data ko permanent banaiye</button>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn-soft" onClick={async () => { const f = await repairLocalDb(); toast(f.length ? `Fixed: ${f.join(', ')}` : 'Database bilkul theek hai ✅'); load(); }}><Stethoscope size={15} /> Run self-repair</button>
              <button className="btn-ghost" onClick={async () => { await db.syncLog.clear(); toast('Log cleared'); }}><Trash2 size={15} /> Clear log</button>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle title="Local database" sub="Har table me kitne records hain" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Object.entries(counts).map(([k, v]) => (
            <div key={k} className="rounded-xl border border-line px-3 py-2">
              <p className="truncate text-[11px] text-ink3">{k}</p>
              <p className="font-mono text-sm font-bold text-ink">{v < 0 ? 'error' : num(v)}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card pad={false}>
        <div className="border-b border-line p-3"><p className="text-sm font-bold text-ink">Recent errors & auto-fixes</p></div>
        {logs.length === 0 ? <Empty title="Koi error nahi 🎉" sub="App bilkul saaf chal raha hai." icon={<CheckCircle2 size={22} />} /> : logs.slice(0, 40).map((l: any) => (
          <div key={l.id} className="flex gap-2 border-b border-line px-3 py-2 text-xs last:border-0">
            {l.level === 'fix' ? <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-ok" /> : <AlertTriangle size={13} className="mt-0.5 shrink-0 text-bad" />}
            <div className="min-w-0 flex-1">
              <p className={cx('break-words', l.level === 'fix' ? 'text-ok' : 'text-bad')}>{l.message}</p>
              <p className="text-[10px] text-ink3">{dt(l.ts)}{l.table ? ' · ' + l.table : ''}</p>
            </div>
            {l.fixed && <Badge tone="ok">auto-fixed</Badge>}
          </div>
        ))}
      </Card>
    </div>
  );
}

const KV = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between border-b border-line py-1 last:border-0"><span className="text-ink3">{k}</span><span className="max-w-[60%] truncate font-mono text-ink">{v}</span></div>
);
