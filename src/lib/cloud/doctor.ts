/** Auto error doctor — classifies every sync failure and repairs it by itself
 *  whenever a safe fix exists. Every attempt is written to the sync log. */
import { db, uid } from '@/db/db';

export type ErrKind =
  | 'network' | 'auth' | 'missing-table' | 'permission' | 'rate-limit'
  | 'payload' | 'conflict' | 'schema' | 'quota' | 'config' | 'unknown';

export interface Diagnosis {
  kind: ErrKind; title: string; hindi: string;
  autoFixable: boolean; fix: string;
  retry: boolean; backoffMs: number; shrinkBatch: boolean; stripBig: boolean;
  resetCursor: boolean; needsUser?: string;
}

export function diagnose(code?: string, message = ''): Diagnosis {
  const m = message.toLowerCase();
  const c = String(code || '');
  const D = (d: Partial<Diagnosis> & Pick<Diagnosis, 'kind' | 'title' | 'hindi' | 'fix'>): Diagnosis => ({
    autoFixable: true, retry: true, backoffMs: 2000, shrinkBatch: false, stripBig: false, resetCursor: false, ...d,
  });

  if (c === 'NETWORK' || m.includes('failed to fetch') || m.includes('networkerror') || !navigator.onLine)
    return D({ kind: 'network', title: 'Network / internet issue', hindi: 'Internet nahi mila — offline queue me daal diya, wapas aate hi khud bhej dega.', fix: 'Queued for retry with exponential backoff', backoffMs: 5000 });

  if (c === '401' || c === '403' || m.includes('unauthor') || m.includes('permission') || m.includes('jwt'))
    return D({ kind: 'auth', title: 'Auth / key problem', hindi: 'API key ya permission galat hai. Key dobara daaliye ya RLS policy allow kijiye.', fix: 'Retried once with alternate auth header', autoFixable: false, retry: false, needsUser: 'Check API key / RLS policy' });

  if (c === 'NO_TABLE' || c === '404' || m.includes('does not exist') || m.includes('not found') || m.includes('relation'))
    return D({ kind: 'missing-table', title: 'Cloud table missing', hindi: 'Cloud me table nahi tha — app ne khud banane ki koshish ki (Supabase me SQL ek baar chalana padta hai).', fix: 'Auto-create attempted; SQL shown in UI', backoffMs: 4000 });

  if (c === '429' || m.includes('rate') || m.includes('too many'))
    return D({ kind: 'rate-limit', title: 'Rate limited', hindi: 'Bahut tezi se bhej rahe the — speed apne aap kam kar di gayi.', fix: 'Batch size halved + 15s cooldown', backoffMs: 15000, shrinkBatch: true });

  if (c === '413' || m.includes('too large') || m.includes('payload'))
    return D({ kind: 'payload', title: 'Payload too big', hindi: 'Data ka packet bada tha — chhote tukdon me tod diya aur images hata di.', fix: 'Batch size halved + oversized fields stripped', shrinkBatch: true, stripBig: true });

  if (c === '409' || m.includes('conflict') || m.includes('duplicate'))
    return D({ kind: 'conflict', title: 'Record conflict', hindi: 'Do device ne ek hi record badla — naya (last-write-wins) rakh liya.', fix: 'Merged with last-write-wins', backoffMs: 1000 });

  if (c === '400' || m.includes('invalid') || m.includes('malformed') || m.includes('json'))
    return D({ kind: 'schema', title: 'Bad request / schema', hindi: 'Data ka format galat tha — saaf kar ke dobara bheja, cursor reset kiya.', fix: 'Row sanitised, cursor reset, resent', stripBig: true, resetCursor: true });

  if (m.includes('quota') || m.includes('storage full') || c === '507')
    return D({ kind: 'quota', title: 'Storage quota', hindi: 'Cloud storage bhar gaya — purane logs saaf kiye, plan check kijiye.', fix: 'Old sync logs pruned', autoFixable: false, retry: false, needsUser: 'Upgrade cloud plan / free space' });

  if (c === 'CONFIG')
    return D({ kind: 'config', title: 'Setup incomplete', hindi: 'Connection detail adhoori hai — Cloud screen par keys bhariye.', fix: 'Waiting for configuration', autoFixable: false, retry: false, needsUser: 'Fill connection fields' });

  return D({ kind: 'unknown', title: 'Unknown error', hindi: 'Anjaan error — teen baar dobara try kiya jaega.', fix: 'Generic retry with backoff', backoffMs: 3000 });
}

export async function logSync(level: 'info' | 'warn' | 'error' | 'fix', message: string, extra: Partial<{ table: string; code: string; fix: string; fixed: boolean; attempt: number }> = {}) {
  try {
    await db.syncLog.add({ id: uid('sl_'), ts: Date.now(), level, message, ...extra });
    const n = await db.syncLog.count();
    if (n > 400) {
      const old = await db.syncLog.orderBy('ts').limit(n - 300).primaryKeys();
      await db.syncLog.bulkDelete(old as string[]);
    }
  } catch { /* logging must never break sync */ }
}

/** Strip fields that are too heavy for a cloud row (base64 images etc.). */
export function stripHeavy(row: any, limit = 20000) {
  const out: any = {};
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === 'string' && v.length > limit) { out[k] = ''; continue; }
    out[k] = v;
  }
  return out;
}

/** Local IndexedDB self-repair: runs when Dexie itself misbehaves. */
export async function repairLocalDb(): Promise<string[]> {
  const done: string[] = [];
  try {
    if (!db.isOpen()) { await db.open(); done.push('Reopened local database'); }
  } catch { try { await db.close(); await db.open(); done.push('Force-reopened local database'); } catch { /* ignore */ } }
  try {
    const bad = await db.sales.filter((s: any) => !s.id || !Array.isArray(s.lines)).toArray();
    if (bad.length) { await db.sales.bulkDelete(bad.map((b: any) => b.id).filter(Boolean)); done.push(`Removed ${bad.length} corrupt sale rows`); }
  } catch { /* ignore */ }
  try {
    const prods = await db.products.filter((p: any) => typeof p.stock !== 'number' || Number.isNaN(p.stock)).toArray();
    if (prods.length) {
      await Promise.all(prods.map((p: any) => db.products.update(p.id, { stock: 0 })));
      done.push(`Fixed ${prods.length} products with invalid stock`);
    }
  } catch { /* ignore */ }
  try {
    const n = await db.syncLog.count();
    if (n > 400) { const old = await db.syncLog.orderBy('ts').limit(n - 200).primaryKeys(); await db.syncLog.bulkDelete(old as string[]); done.push('Pruned old sync logs'); }
  } catch { /* ignore */ }
  if (done.length) await logSync('fix', 'Local database self-repair: ' + done.join(' · '), { fixed: true });
  return done;
}
