import { db } from '@/db/db';
import { download } from './csv';
import { useSettings } from '@/store/settings';

const TABLES = ['products','sales','customers','vendors','purchaseOrders','expenses','stockLogs','activity','holds','coupons','staff','shifts','restaurantTables','reservations','templates','quotes','ledger','orders','attendance','payroll','recipes','subscriptions','branches','transfers','serviceJobs','appointments','priceLists','giftCards','writeOffs','targets','tasks', 'feedback'] as const;

async function collect() {
  const data: any = { app: 'SwiftPOS Pro', version: 9, ts: Date.now(), settings: useSettings.getState() };
  for (const t of TABLES) data[t] = await (db as any)[t].toArray();
  return data;
}

export async function exportBackup() {
  const data = await collect();
  download(`swiftpos-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data), 'application/json');
  useSettings.getState().set({ lastBackup: Date.now() });
  return data;
}

/** Gzip-compressed backup — typically 8-12x smaller, ideal for 27k-product catalogues. */
export async function exportBackupCompressed() {
  const data = await collect();
  const json = JSON.stringify(data);
  if (!('CompressionStream' in window)) { await exportBackup(); return data; }
  const stream = new Blob([json]).stream().pipeThrough(new (window as any).CompressionStream('gzip'));
  const blob = await new Response(stream).blob();
  download(`swiftpos-backup-${new Date().toISOString().slice(0, 10)}.json.gz`, blob, 'application/gzip');
  useSettings.getState().set({ lastBackup: Date.now() });
  return data;
}

/** Accepts .json or gzip-compressed .json.gz backups. */
export async function readBackupFile(file: File): Promise<string> {
  if (file.name.endsWith('.gz') && 'DecompressionStream' in window) {
    const stream = file.stream().pipeThrough(new (window as any).DecompressionStream('gzip'));
    return await new Response(stream).text();
  }
  return await file.text();
}

/** Rolling local snapshot kept inside the browser (survives refresh, no download needed). */
export async function autoSnapshot() {
  try {
    const data = await collect();
    const slim = { ...data, stockLogs: [], activity: [] };
    localStorage.setItem('swiftpos-snapshot', JSON.stringify({ ts: Date.now(), size: 0, data: slim }).slice(0, 4_500_000));
    return true;
  } catch { return false; }
}

export async function importBackup(json: string, merge = false) {
  const data = JSON.parse(json);
  if (!data || data.app !== 'SwiftPOS Pro') throw new Error('Not a SwiftPOS backup file');
  for (const t of TABLES) {
    const table = (db as any)[t];
    if (!table || !Array.isArray(data[t])) continue;
    if (!merge) await table.clear();
    await table.bulkPut(data[t]);
  }
  if (data.settings) {
    const { set, reset, ...rest } = data.settings;
    useSettings.getState().set(rest);
  }
  return true;
}

export async function wipeAll() {
  for (const t of TABLES) await (db as any)[t].clear();
}
