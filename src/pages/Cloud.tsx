import { useEffect, useMemo, useState } from 'react';
import {
  Cloud as CloudIcon, RefreshCw, Upload, Download, Wifi, WifiOff, Smartphone,
  Stethoscope, CheckCircle2, AlertTriangle, Copy, Trash2, Plug, Activity as ActIcon,
} from 'lucide-react';
import { useCloud } from '@/store/cloud';
import { PROVIDER_INFO, SUPABASE_SQL, getAdapter, type ProviderId } from '@/lib/cloud/providers';
import { syncNow, startAutoSync, stopAutoSync, tableStats, fullPush, fullPull, resetSyncState, heartbeat, SYNC_TABLES } from '@/lib/cloud/engine';
import { repairLocalDb, logSync } from '@/lib/cloud/doctor';
import { useSyncLog, useDevices, useSyncState } from '@/hooks/useData';
import { db } from '@/db/db';
import { num, ago, dt, pct, cx } from '@/lib/format';
import { Card, Stat, Empty, Badge, Input, Select, Field, Tabs, Toggle, SectionTitle, Spinner } from '@/components/ui';
import { toast } from '@/store/ui';

/** Cloud database: connect Firebase / Supabase / your own API, sync live, run many devices. */
export default function CloudPage() {
  const c = useCloud();
  const logs = useSyncLog() || [];
  const devices = useDevices() || [];
  const states = useSyncState() || [];
  const [tab, setTab] = useState<'connect' | 'live' | 'devices' | 'doctor'>('connect');
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState('');
  const [stats, setStats] = useState<any[]>([]);

  useEffect(() => { tableStats().then(setStats); }, [c.lastSync, c.running]);
  useEffect(() => { heartbeat(); }, []);
  useEffect(() => { if (c.enabled && c.autoSync) startAutoSync(); else stopAutoSync(); return () => stopAutoSync(); }, [c.enabled, c.autoSync, c.intervalSec]);

  const totals = useMemo(() => stats.reduce((a, x) => ({
    total: a.total + x.total, synced: a.synced + x.synced, pending: a.pending + x.pending, failed: a.failed + x.failed,
  }), { total: 0, synced: 0, pending: 0, failed: 0 }), [stats]);
  const donePct = totals.total ? (totals.synced / totals.total) * 100 : 0;

  const info = PROVIDER_INFO.find((p) => p.id === c.cfg.provider);
  const fixes = logs.filter((l: any) => l.level === 'fix').length;
  const errors = logs.filter((l: any) => l.level === 'error').length;

  const test = async () => {
    const ad = getAdapter(c.cfg.provider);
    if (!ad) return toast('Pehle provider chuniye', 'err');
    setTesting(true); setTestMsg('');
    const r = await ad.test(c.cfg);
    setTestMsg(r.message);
    c.set({ connected: r.ok });
    await logSync(r.ok ? 'info' : 'error', `Connection test: ${r.message}`, { code: r.code });
    toast(r.ok ? 'Connected ✅' : r.message, r.ok ? 'ok' : 'err');
    setTesting(false);
  };

  const run = async () => {
    if (!c.enabled) return toast('Sync abhi off hai — pehle enable kijiye', 'err');
    const r = await syncNow();
    setStats(await tableStats());
    toast(`Sync done · ${r.pushed} up · ${r.pulled} down${r.errors ? ` · ${r.errors} errors auto-handled` : ''}`);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Cloud status" value={c.connected ? 'Connected' : c.cfg.provider === 'none' ? 'Not set' : 'Offline'}
          tone={c.connected ? 'ok' : 'bad'} icon={c.connected ? <Wifi size={16} /> : <WifiOff size={16} />} sub={info?.label || '—'} />
        <Stat label="Records synced" value={`${num(totals.synced)} / ${num(totals.total)}`} tone="brand" sub={pct(donePct)} icon={<CloudIcon size={16} />} />
        <Stat label="Pending upload" value={num(totals.pending)} tone={totals.pending ? 'warn' : 'ok'} icon={<Upload size={16} />} />
        <Stat label="Devices" value={num(devices.length)} tone="ok" icon={<Smartphone size={16} />} sub={`${fixes} auto-fixes`} />
      </div>

      <Card>
        <SectionTitle title="Cloud database & multi-device sync"
          sub="Firebase, Supabase ya apna API jodiye — data cloud par jaega aur saare devices ek saath chalenge"
          right={<div className="flex flex-wrap gap-2">
            <button className="btn-soft" onClick={test} disabled={testing}>{testing ? <Spinner /> : <Plug size={15} />} Test</button>
            <button className="btn-soft" onClick={run} disabled={c.running}><RefreshCw size={15} className={cx(c.running && 'animate-spin')} /> Sync now</button>
            <Toggle checked={c.enabled} onChange={(v) => { c.set({ enabled: v }); toast(v ? 'Cloud sync ON' : 'Cloud sync OFF'); }} label="Sync on" />
          </div>} />
        {c.running && (
          <div className="rounded-xl border border-brand/30 bg-brand/10 p-3 text-xs text-brand">
            <b>Syncing…</b> {c.phase}
          </div>
        )}
        <Tabs active={tab} onChange={(t) => setTab(t as any)} tabs={[
          { id: 'connect', label: 'Connection' },
          { id: 'live', label: 'Live sync', count: totals.pending },
          { id: 'devices', label: 'Devices', count: devices.length },
          { id: 'doctor', label: 'Error doctor', count: errors },
        ]} />
      </Card>

      {tab === 'connect' && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {PROVIDER_INFO.map((p) => (
              <button key={p.id} onClick={() => c.setCfg({ provider: p.id as ProviderId })}
                className={cx('card p-3 text-left transition', c.cfg.provider === p.id ? 'border-brand ring-1 ring-brand' : 'hover:border-brand/40')}>
                <p className="text-lg">{p.emoji} <span className="text-sm font-bold text-ink">{p.label}</span></p>
                <p className="mt-1 text-[11px] text-ink3">{p.blurb}</p>
              </button>
            ))}
          </div>

          {info && (
            <Card>
              <SectionTitle title={`${info.emoji} ${info.label} setup`} sub="Ye details sirf aapke device par save hoti hain" />
              <div className="grid gap-3 sm:grid-cols-2">
                {info.fields.map((f) => (
                  <Field key={String(f.key)} label={f.label} hint={f.hint}>
                    <Input type={f.secret ? 'password' : 'text'} value={(c.cfg as any)[f.key] || ''}
                      onChange={(e) => c.setCfg({ [f.key]: e.target.value } as any)} />
                  </Field>
                ))}
                <Field label="Device name" hint="Is device ka naam — device list me dikhega">
                  <Input value={c.cfg.deviceName || ''} onChange={(e) => c.setCfg({ deviceName: e.target.value })} />
                </Field>
              </div>
              {testMsg && <p className={cx('mt-2 rounded-xl border p-2 text-xs', c.connected ? 'border-ok/30 bg-ok/10 text-ok' : 'border-bad/30 bg-bad/10 text-bad')}>{testMsg}</p>}

              {c.cfg.provider === 'supabase' && (
                <div className="mt-3">
                  <p className="mb-1 text-[11px] uppercase tracking-widest text-ink3">Ek baar ye SQL Supabase → SQL editor me chalaiye</p>
                  <pre className="max-h-48 overflow-auto rounded-xl border border-line bg-black p-3 text-[10px] leading-relaxed text-ink2">{SUPABASE_SQL}</pre>
                  <button className="btn-soft mt-2" onClick={() => { navigator.clipboard.writeText(SUPABASE_SQL); toast('SQL copied'); }}><Copy size={14} /> Copy SQL</button>
                </div>
              )}

              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Auto sync"><Toggle checked={c.autoSync} onChange={(v) => c.set({ autoSync: v })} label="Background" /></Field>
                <Field label="Interval (seconds)"><Input inputMode="numeric" value={c.intervalSec} onChange={(e) => c.set({ intervalSec: Math.max(15, +e.target.value || 60) })} /></Field>
                <Field label="Batch size"><Input inputMode="numeric" value={c.batchSize} onChange={(e) => c.set({ batchSize: Math.max(5, +e.target.value || 50) })} /></Field>
                <Field label="Direction">
                  <Select value={c.direction} onChange={(e) => c.set({ direction: e.target.value as any })}>
                    <option value="both">Two-way</option><option value="push">Upload only</option><option value="pull">Download only</option>
                  </Select>
                </Field>
                <Field label="Conflict rule">
                  <Select value={c.conflict} onChange={(e) => c.set({ conflict: e.target.value as any })}>
                    <option value="newest">Newest wins</option><option value="cloud">Cloud wins</option><option value="local">Local wins</option>
                  </Select>
                </Field>
                <Field label="Auto error fix"><Toggle checked={c.autoFix} onChange={(v) => c.set({ autoFix: v })} label="Self-healing" /></Field>
              </div>
            </Card>
          )}
        </>
      )}

      {tab === 'live' && (
        <>
          <Card>
            <SectionTitle title="Live sync view" sub={`Kitna data cloud par chala gaya, kitna baaki hai · last sync ${c.lastSync ? ago(c.lastSync) : 'never'}`}
              right={<div className="flex flex-wrap gap-2">
                <button className="btn-soft" onClick={async () => { toast('Full upload shuru…'); await fullPush(); setStats(await tableStats()); }}><Upload size={15} /> Full upload</button>
                <button className="btn-soft" onClick={async () => { toast('Full download shuru…'); await fullPull(); setStats(await tableStats()); }}><Download size={15} /> Full download</button>
                <button className="btn-ghost" onClick={async () => { await resetSyncState(); setStats(await tableStats()); toast('Sync state reset'); }}><Trash2 size={15} /> Reset</button>
              </div>} />
            <div className="mb-1 flex justify-between text-xs text-ink3"><span>Overall</span><span className="font-mono text-ink">{num(totals.synced)} / {num(totals.total)} ({pct(donePct)})</span></div>
            <div className="h-3 overflow-hidden rounded-full bg-surface2">
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${donePct}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
              <Badge tone="ok">Synced {num(totals.synced)}</Badge>
              <Badge tone="warn">Pending {num(totals.pending)}</Badge>
              <Badge tone={totals.failed ? 'bad' : 'muted'}>Failed {num(totals.failed)}</Badge>
              <Badge tone="brand">{SYNC_TABLES.length} tables</Badge>
            </div>
          </Card>

          <Card pad={false}>
            {stats.map((s) => {
              const p = s.total ? (s.synced / s.total) * 100 : 100;
              return (
                <div key={s.table} className="border-b border-line px-3 py-2 last:border-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="min-w-0 flex-1 truncate text-ink">{s.table}</span>
                    <span className="font-mono text-ink3">{num(s.synced)}/{num(s.total)}</span>
                    {s.pending > 0 && <Badge tone="warn">{num(s.pending)} pending</Badge>}
                    {s.failed > 0 && <Badge tone="bad">{num(s.failed)} failed</Badge>}
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface2">
                    <div className={cx('h-full rounded-full', p >= 100 ? 'bg-ok' : 'bg-brand')} style={{ width: `${p}%` }} />
                  </div>
                </div>
              );
            })}
          </Card>
        </>
      )}

      {tab === 'devices' && (
        <Card pad={false}>
          <div className="flex items-center justify-between border-b border-line p-3">
            <div>
              <p className="text-sm font-bold text-ink">Connected devices</p>
              <p className="text-[11px] text-ink3">Ek hi cloud se jitne chahe counter / mobile chalaiye</p>
            </div>
            <button className="btn-soft" onClick={async () => { await heartbeat(); toast('Device registered'); }}><Smartphone size={15} /> Register this device</button>
          </div>
          {devices.length === 0 ? <Empty title="Abhi koi device register nahi" sub="Cloud connect karte hi devices yahan dikhne lagenge." icon={<Smartphone size={22} />} /> : devices.map((d: any) => (
            <div key={d.id} className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2 text-xs last:border-0">
              <span className={cx('h-2 w-2 rounded-full', Date.now() - d.lastSeen < 120000 ? 'bg-ok' : 'bg-ink3')} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-ink">{d.name} {d.current && <Badge tone="brand">this device</Badge>}</p>
                <p className="truncate text-[10px] text-ink3">{d.platform} · {d.id} · last seen {ago(d.lastSeen)}</p>
              </div>
              <Badge tone="muted">↑{num(d.pushes || 0)}</Badge>
              <Badge tone="muted">↓{num(d.pulls || 0)}</Badge>
              {!d.current && <button className="btn-ghost px-2 py-1 text-[11px]" onClick={async () => { await db.devices.delete(d.id); toast('Device removed'); }}>Remove</button>}
            </div>
          ))}
        </Card>
      )}

      {tab === 'doctor' && (
        <>
          <Card>
            <SectionTitle title="Auto error doctor" sub="Har error khud pehchana jata hai aur mumkin ho to khud theek bhi ho jata hai"
              right={<div className="flex gap-2">
                <button className="btn-soft" onClick={async () => { const f = await repairLocalDb(); toast(f.length ? `Fixed: ${f.join(', ')}` : 'Sab theek hai ✅'); }}><Stethoscope size={15} /> Repair local DB</button>
                <button className="btn-ghost" onClick={async () => { await db.syncLog.clear(); toast('Log cleared'); }}><Trash2 size={15} /> Clear log</button>
              </div>} />
            <div className="flex flex-wrap gap-2 text-[11px]">
              <Badge tone="ok">{fixes} auto-fixes applied</Badge>
              <Badge tone={errors ? 'bad' : 'muted'}>{errors} unresolved errors</Badge>
              <Badge tone="muted">Retry: 3 attempts + backoff</Badge>
              <Badge tone="muted">Conflict: {c.conflict} wins</Badge>
            </div>
            <div className="mt-3 grid gap-2 text-[11px] text-ink3 sm:grid-cols-2">
              {[
                ['Internet gaya', 'Queue me rakh kar wapas aate hi bhej deta hai'],
                ['Rate limit / 429', 'Batch aadha + cooldown'],
                ['Payload bada', 'Bade fields hata kar chhote batch'],
                ['Table missing', 'Auto-create try + SQL dikhata hai'],
                ['Conflict', 'Last-write-wins merge'],
                ['Corrupt local data', 'IndexedDB self-repair'],
              ].map(([a, b]) => (
                <div key={a} className="rounded-xl border border-line p-2"><b className="text-ink">{a}</b> → {b}</div>
              ))}
            </div>
          </Card>

          <Card pad={false}>
            {logs.length === 0 ? <Empty title="Log khali hai" sub="Abhi tak koi sync event nahi." icon={<ActIcon size={22} />} /> : logs.map((l: any) => (
              <div key={l.id} className="flex gap-2 border-b border-line px-3 py-2 text-xs last:border-0">
                <span className="shrink-0">
                  {l.level === 'fix' ? <CheckCircle2 size={13} className="text-ok" />
                    : l.level === 'error' ? <AlertTriangle size={13} className="text-bad" />
                    : l.level === 'warn' ? <AlertTriangle size={13} className="text-warn" />
                    : <ActIcon size={13} className="text-ink3" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cx('truncate', l.level === 'error' ? 'text-bad' : l.level === 'fix' ? 'text-ok' : 'text-ink2')}>{l.message}</p>
                  <p className="text-[10px] text-ink3">{dt(l.ts)}{l.table ? ' · ' + l.table : ''}{l.code ? ' · code ' + l.code : ''}{l.attempt ? ' · attempt ' + l.attempt : ''}</p>
                </div>
                {l.fixed && <Badge tone="ok">auto-fixed</Badge>}
              </div>
            ))}
          </Card>
        </>
      )}

      {states.length > 0 && tab === 'live' && (
        <p className="px-1 text-[11px] text-ink3">Cursor info: {states.length} tables tracked · conflict rule <b>{c.conflict}</b> · batch {c.batchSize} · every {c.intervalSec}s</p>
      )}
    </div>
  );
}
