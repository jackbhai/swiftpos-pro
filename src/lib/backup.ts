import { db } from '@/db/db';
import { download } from './csv';
import { useSettings } from '@/store/settings';

const TABLES = ['products','sales','customers','vendors','purchaseOrders','expenses','stockLogs','activity','holds','coupons','staff','shifts','restaurantTables','reservations'] as const;

export async function exportBackup() {
  const data: any = { app: 'SwiftPOS Pro', version: 7, ts: Date.now(), settings: useSettings.getState() };
  for (const t of TABLES) data[t] = await (db as any)[t].toArray();
  download(`swiftpos-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), 'application/json');
  useSettings.getState().set({ lastBackup: Date.now() });
  return data;
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
