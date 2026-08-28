/** Sync engine: offline-first outbox → cloud, cloud → local merge,
 *  live progress, multi-device registry and self-healing retries. */
import { db, uid } from '@/db/db';
import { getAdapter } from './providers';
import { diagnose, logSync, stripHeavy, repairLocalDb } from './doctor';
import { useCloud, guessDevice } from '@/store/cloud';
import type { TableProgress } from '@/store/cloud';
import type { SyncState } from '@/db/types';

export const SYNC_TABLES = [
  'products', 'sales', 'customers', 'vendors', 'purchaseOrders', 'expenses', 'stockLogs',
  'coupons', 'staff', 'shifts', 'restaurantTables', 'quotes', 'ledger', 'orders',
  'attendance', 'recipes', 'subscriptions', 'branches', 'transfers', 'serviceJobs',
  'appointments', 'priceLists', 'giftCards', 'writeOffs', 'targets', 'tasks', 'feedback',
] as const;

const rowTime = (r: any) => r?.updatedAt || r?.ts || r?.createdAt || 0;
const table = (name: string): any => (db as any)[name];

export async function tableStats(): Promise<TableProgress[]> {
  const states = await db.syncState.toArray();
  const map = new Map(states.map((s) => [s.table, s]));
  const out: TableProgress[] = [];
  for (const t of SYNC_TABLES) {
    try {
      const tbl = table(t);
      if (!tbl) continue;
      const total = await tbl.count();
      const st = map.get(t);
      const since = st?.lastPush || 0;
      const rows = await tbl.toArray();
      const pending = rows.filter((r: any) => rowTime(r) > since).length;
      out.push({ table: t, total, synced: Math.max(0, total - pending), pending, failed: st?.failed || 0 });
    } catch { /* skip broken table */ }
  }
  return out;
}

async function saveState(t: string, patch: Partial<SyncState>) {
  const cur = (await db.syncState.get(t)) || { table: t, lastPush: 0, lastPull: 0, pushed: 0, pulled: 0, failed: 0 };
  await db.syncState.put({ ...cur, ...patch });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Push one table with automatic error handling. Returns rows pushed. */
async function pushTable(t: string, onTick: (msg: string) => void): Promise<number> {
  const st = useCloud.getState();
  const ad = getAdapter(st.cfg.provider);
  if (!ad) return 0;
  const tbl = table(t);
  if (!tbl) return 0;

  const state = await db.syncState.get(t);
  const since = state?.lastPush || 0;
  let rows: any[] = (await tbl.toArray()).filter((r: any) => rowTime(r) > since);
  if (!rows.length) return 0;

  let batch = st.batchSize;
  let pushed = 0;
  let attempt = 0;

  while (rows.length) {
    const slice = rows.slice(0, batch);
    const res = await ad.push(st.cfg, t, slice);
    if (res.ok) {
      pushed += res.count;
      rows = rows.slice(batch);
      onTick(`${t}: ${pushed} rows pushed`);
      await saveState(t, { lastPush: Date.now(), pushed: (state?.pushed || 0) + pushed, failed: 0, lastError: undefined });
      continue;
    }
    attempt++;
    const d = diagnose(res.code, res.error);
    await logSync(d.autoFixable ? 'warn' : 'error', `${t}: ${d.title} — ${res.error || ''}`, { table: t, code: res.code, attempt });
    if (!st.autoFix || attempt > 3 || !d.retry) {
      await saveState(t, { failed: (state?.failed || 0) + slice.length, lastError: res.error });
      await logSync('error', `${t}: gave up after ${attempt} attempts. ${d.hindi}`, { table: t, code: res.code });
      break;
    }
    // --- auto fixes ---
    const fixes: string[] = [];
    if (d.shrinkBatch && batch > 5) { batch = Math.max(5, Math.floor(batch / 2)); fixes.push(`batch → ${batch}`); }
    if (d.stripBig) { rows = rows.map((r) => stripHeavy(r)); fixes.push('heavy fields stripped'); }
    if (d.resetCursor) { await saveState(t, { lastPush: 0 }); fixes.push('cursor reset'); }
    if (d.kind === 'schema') { await repairLocalDb(); fixes.push('local db repaired'); }
    await logSync('fix', `${t}: auto-fix applied — ${fixes.join(', ') || d.fix}. ${d.hindi}`, { table: t, code: res.code, fix: d.fix, fixed: true, attempt });
    onTick(`${t}: auto-fixing (${d.title})…`);
    await sleep(d.backoffMs);
  }
  return pushed;
}

/** Pull one table and merge into local storage. */
async function pullTable(t: string, onTick: (msg: string) => void): Promise<number> {
  const st = useCloud.getState();
  const ad = getAdapter(st.cfg.provider);
  if (!ad) return 0;
  const tbl = table(t);
  if (!tbl) return 0;

  const state = await db.syncState.get(t);
  const since = state?.lastPull || 0;
  const res = await ad.pull(st.cfg, t, since);
  if (!res.ok) {
    const d = diagnose(res.code, res.error);
    await logSync(d.autoFixable ? 'warn' : 'error', `${t} pull: ${d.title} — ${res.error || ''}`, { table: t, code: res.code });
    if (st.autoFix && d.retry) {
      if (d.resetCursor) await saveState(t, { lastPull: 0 });
      await logSync('fix', `${t} pull: auto-fix — ${d.fix}. ${d.hindi}`, { table: t, fixed: true, fix: d.fix });
    }
    return 0;
  }
  let merged = 0;
  for (const row of res.rows) {
    if (!row?.id) continue;
    try {
      const local = await tbl.get(row.id);
      if (!local) { await tbl.put(row); merged++; continue; }
      const keepCloud = st.conflict === 'cloud' || (st.conflict === 'newest' && rowTime(row) > rowTime(local));
      if (keepCloud) { await tbl.put({ ...local, ...row }); merged++; }
    } catch (e: any) {
      await logSync('warn', `${t}: row ${row.id} merge failed — ${e?.message || e}`, { table: t });
    }
  }
  await saveState(t, { lastPull: Date.now(), pulled: (state?.pulled || 0) + merged });
  if (merged) onTick(`${t}: ${merged} rows pulled`);
  return merged;
}

/** Heartbeat so every device shows up in the device list. */
export async function heartbeat(pushes = 0, pulls = 0) {
  const st = useCloud.getState();
  const id = st.cfg.deviceId || 'dev_local';
  const cur = await db.devices.get(id);
  const rec = {
    id, name: st.cfg.deviceName || guessDevice(), platform: guessDevice(),
    version: 'v12.0', lastSeen: Date.now(),
    pushes: (cur?.pushes || 0) + pushes, pulls: (cur?.pulls || 0) + pulls, current: true,
  };
  await db.devices.put(rec);
  const ad = getAdapter(st.cfg.provider);
  if (ad && st.enabled) { try { await ad.push(st.cfg, 'devices', [rec]); } catch { /* non-fatal */ } }
}

export async function pullDevices() {
  const st = useCloud.getState();
  const ad = getAdapter(st.cfg.provider);
  if (!ad) return 0;
  const res = await ad.pull(st.cfg, 'devices', 0);
  if (!res.ok) return 0;
  let n = 0;
  for (const d of res.rows) {
    if (!d?.id) continue;
    await db.devices.put({ ...d, current: d.id === st.cfg.deviceId });
    n++;
  }
  return n;
}

let timer: any = null;

export async function syncNow(): Promise<{ pushed: number; pulled: number; errors: number }> {
  const store = useCloud.getState();
  if (store.running) return { pushed: 0, pulled: 0, errors: 0 };
  const ad = getAdapter(store.cfg.provider);
  if (!ad || !store.enabled) return { pushed: 0, pulled: 0, errors: 0 };

  useCloud.setState({ running: true, phase: 'starting…' });
  const tick = (msg: string) => useCloud.setState({ phase: msg });
  let pushed = 0, pulled = 0, errors = 0;
  const list = store.tables && store.tables.length ? store.tables : [...SYNC_TABLES];

  try {
    await logSync('info', `Sync started (${list.length} tables, ${store.direction})`);
    for (const t of list) {
      try {
        if (store.direction !== 'pull') pushed += await pushTable(t, tick);
        if (store.direction !== 'push') pulled += await pullTable(t, tick);
      } catch (e: any) {
        errors++;
        const d = diagnose('', e?.message);
        await logSync('error', `${t}: ${e?.message || e}`, { table: t });
        if (store.autoFix) { await repairLocalDb(); await logSync('fix', `${t}: recovered — ${d.fix}`, { table: t, fixed: true }); }
      }
      useCloud.setState({ progress: await tableStats() });
    }
    await heartbeat(pushed, pulled);
    await pullDevices();
    useCloud.setState({ lastSync: Date.now(), connected: true });
    await logSync('info', `Sync finished · ${pushed} pushed · ${pulled} pulled · ${errors} errors`);
  } finally {
    useCloud.setState({ running: false, phase: 'idle', progress: await tableStats() });
  }
  return { pushed, pulled, errors };
}

export function startAutoSync() {
  stopAutoSync();
  const s = useCloud.getState();
  if (!s.enabled || !s.autoSync) return;
  timer = setInterval(() => { syncNow().catch(() => { /* handled inside */ }); }, Math.max(15, s.intervalSec) * 1000);
  window.addEventListener('online', onOnline);
}
export function stopAutoSync() {
  if (timer) clearInterval(timer);
  timer = null;
  window.removeEventListener('online', onOnline);
}
const onOnline = () => { logSync('fix', 'Internet wapas aa gaya — pending queue apne aap bhej rahe hain', { fixed: true }); syncNow(); };

/** Full re-upload: forget cursors so everything goes up again. */
export async function fullPush() {
  for (const t of SYNC_TABLES) await saveState(t, { lastPush: 0, failed: 0 });
  await logSync('info', 'Full re-upload requested — all cursors reset');
  return syncNow();
}
export async function fullPull() {
  for (const t of SYNC_TABLES) await saveState(t, { lastPull: 0 });
  await logSync('info', 'Full download requested — pulling every cloud row');
  return syncNow();
}
export async function resetSyncState() {
  await db.syncState.clear();
  await db.syncLog.clear();
  await logSync('info', 'Sync state cleared');
}
export const newSyncId = () => uid('sy_');
