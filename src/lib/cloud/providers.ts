/** Cloud database adapters. Everything goes over plain REST/fetch —
 *  no heavy SDK, works offline-first and inside the PWA. */

export type ProviderId = 'firebase' | 'supabase' | 'rest' | 'jsonbin' | 'none';

export interface CloudConfig {
  provider: ProviderId;
  /* firebase */
  projectId?: string; apiKey?: string; collectionPrefix?: string;
  /* supabase */
  url?: string; anonKey?: string; schema?: string;
  /* generic rest */
  endpoint?: string; token?: string;
  /* shared */
  deviceId?: string; deviceName?: string;
}

export interface PushResult { ok: boolean; count: number; error?: string; code?: string }
export interface PullResult { ok: boolean; rows: any[]; error?: string; code?: string }

export interface Adapter {
  id: ProviderId;
  label: string;
  test(cfg: CloudConfig): Promise<{ ok: boolean; message: string; code?: string }>;
  push(cfg: CloudConfig, table: string, rows: any[]): Promise<PushResult>;
  pull(cfg: CloudConfig, table: string, since: number): Promise<PullResult>;
  ensure?(cfg: CloudConfig, table: string): Promise<boolean>;
}

const clean = (o: any) => JSON.parse(JSON.stringify(o ?? {}));
const err = (e: any) => (e?.message || String(e)).slice(0, 240);

/* ---------------------------------------------------------------- Firebase */
const fsValue = (v: any): any => {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(fsValue) } };
  if (typeof v === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fsValue(x)])) } };
  return { stringValue: String(v) };
};
const fsParse = (f: any): any => {
  if (!f) return null;
  if ('stringValue' in f) return f.stringValue;
  if ('booleanValue' in f) return f.booleanValue;
  if ('integerValue' in f) return +f.integerValue;
  if ('doubleValue' in f) return f.doubleValue;
  if ('nullValue' in f) return null;
  if ('arrayValue' in f) return (f.arrayValue.values || []).map(fsParse);
  if ('mapValue' in f) return Object.fromEntries(Object.entries(f.mapValue.fields || {}).map(([k, v]) => [k, fsParse(v)]));
  return null;
};

const firebase: Adapter = {
  id: 'firebase', label: 'Firebase (Firestore)',
  async test(cfg) {
    if (!cfg.projectId || !cfg.apiKey) return { ok: false, message: 'Project ID aur Web API key dono chahiye', code: 'CONFIG' };
    try {
      const r = await fetch(`https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/${col(cfg, '_ping')}?pageSize=1&key=${cfg.apiKey}`);
      if (r.ok) return { ok: true, message: 'Firestore se connection ban gaya ✅' };
      const j = await r.json().catch(() => ({}));
      return { ok: false, message: j?.error?.message || `HTTP ${r.status}`, code: String(r.status) };
    } catch (e) { return { ok: false, message: err(e), code: 'NETWORK' }; }
  },
  async push(cfg, table, rows) {
    try {
      let n = 0;
      for (const row of rows) {
        const id = String(row.id);
        const url = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/${col(cfg, table)}/${encodeURIComponent(id)}?key=${cfg.apiKey}`;
        const body = { fields: { data: fsValue(clean(row)), _syncedAt: fsValue(Date.now()), _device: fsValue(cfg.deviceId || '') } };
        const r = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!r.ok) { const j = await r.json().catch(() => ({})); return { ok: false, count: n, error: j?.error?.message || `HTTP ${r.status}`, code: String(r.status) }; }
        n++;
      }
      return { ok: true, count: n };
    } catch (e) { return { ok: false, count: 0, error: err(e), code: 'NETWORK' }; }
  },
  async pull(cfg, table, since) {
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/${col(cfg, table)}?pageSize=300&key=${cfg.apiKey}`;
      const r = await fetch(url);
      if (!r.ok) { const j = await r.json().catch(() => ({})); return { ok: false, rows: [], error: j?.error?.message || `HTTP ${r.status}`, code: String(r.status) }; }
      const j = await r.json();
      const rows = (j.documents || [])
        .map((d: any) => ({ row: fsParse(d.fields?.data), at: fsParse(d.fields?._syncedAt) || 0 }))
        .filter((x: any) => x.row && x.at >= since)
        .map((x: any) => x.row);
      return { ok: true, rows };
    } catch (e) { return { ok: false, rows: [], error: err(e), code: 'NETWORK' }; }
  },
};
const col = (cfg: CloudConfig, table: string) => `${cfg.collectionPrefix || 'swiftpos'}_${table}`;

/* ---------------------------------------------------------------- Supabase */
const sbHeaders = (cfg: CloudConfig) => ({
  'Content-Type': 'application/json',
  apikey: cfg.anonKey || '',
  Authorization: `Bearer ${cfg.token || cfg.anonKey || ''}`,
  Prefer: 'resolution=merge-duplicates,return=minimal',
});

const supabase: Adapter = {
  id: 'supabase', label: 'Supabase (Postgres)',
  async test(cfg) {
    if (!cfg.url || !cfg.anonKey) return { ok: false, message: 'Project URL aur anon key chahiye', code: 'CONFIG' };
    try {
      const r = await fetch(`${cfg.url.replace(/\/$/, '')}/rest/v1/swiftpos_sync?select=id&limit=1`, { headers: sbHeaders(cfg) });
      if (r.ok) return { ok: true, message: 'Supabase table mil gaya ✅' };
      if (r.status === 404) return { ok: false, message: 'Table `swiftpos_sync` nahi mila — auto-fix se bana sakte hain', code: 'NO_TABLE' };
      const txt = await r.text();
      return { ok: false, message: txt.slice(0, 200) || `HTTP ${r.status}`, code: String(r.status) };
    } catch (e) { return { ok: false, message: err(e), code: 'NETWORK' }; }
  },
  async push(cfg, table, rows) {
    try {
      const payload = rows.map((row) => ({
        id: `${table}:${row.id}`, table_name: table, row_id: String(row.id),
        data: clean(row), updated_at: row.updatedAt || row.ts || Date.now(),
        device_id: cfg.deviceId || '', deleted: !!row._deleted,
      }));
      const r = await fetch(`${cfg.url!.replace(/\/$/, '')}/rest/v1/swiftpos_sync?on_conflict=id`, {
        method: 'POST', headers: sbHeaders(cfg), body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const txt = await r.text();
        return { ok: false, count: 0, error: txt.slice(0, 200) || `HTTP ${r.status}`, code: r.status === 404 ? 'NO_TABLE' : String(r.status) };
      }
      return { ok: true, count: rows.length };
    } catch (e) { return { ok: false, count: 0, error: err(e), code: 'NETWORK' }; }
  },
  async pull(cfg, table, since) {
    try {
      const u = `${cfg.url!.replace(/\/$/, '')}/rest/v1/swiftpos_sync?select=data,updated_at&table_name=eq.${table}&updated_at=gt.${since}&order=updated_at.asc&limit=500`;
      const r = await fetch(u, { headers: { ...sbHeaders(cfg), Prefer: '' } });
      if (!r.ok) return { ok: false, rows: [], error: `HTTP ${r.status}`, code: r.status === 404 ? 'NO_TABLE' : String(r.status) };
      const j = await r.json();
      return { ok: true, rows: (j || []).map((x: any) => x.data) };
    } catch (e) { return { ok: false, rows: [], error: err(e), code: 'NETWORK' }; }
  },
};

/** SQL the user runs once in Supabase (shown in the UI, copy-paste). */
export const SUPABASE_SQL = `create table if not exists swiftpos_sync (
  id text primary key,
  table_name text not null,
  row_id text not null,
  data jsonb not null,
  updated_at bigint not null default 0,
  device_id text,
  deleted boolean default false
);
create index if not exists swiftpos_sync_tbl on swiftpos_sync (table_name, updated_at);
alter table swiftpos_sync enable row level security;
create policy "swiftpos all" on swiftpos_sync for all using (true) with check (true);`;

/* ------------------------------------------------------------ Generic REST */
const rest: Adapter = {
  id: 'rest', label: 'Custom REST / self-hosted API',
  async test(cfg) {
    if (!cfg.endpoint) return { ok: false, message: 'Endpoint URL chahiye', code: 'CONFIG' };
    try {
      const r = await fetch(join(cfg.endpoint, 'ping'), { headers: authH(cfg) });
      return r.ok ? { ok: true, message: 'API ne jawab de diya ✅' } : { ok: false, message: `HTTP ${r.status}`, code: String(r.status) };
    } catch (e) { return { ok: false, message: err(e), code: 'NETWORK' }; }
  },
  async push(cfg, table, rows) {
    try {
      const r = await fetch(join(cfg.endpoint!, table), { method: 'POST', headers: { 'Content-Type': 'application/json', ...authH(cfg) }, body: JSON.stringify({ rows: rows.map(clean), device: cfg.deviceId }) });
      if (!r.ok) return { ok: false, count: 0, error: `HTTP ${r.status}`, code: String(r.status) };
      return { ok: true, count: rows.length };
    } catch (e) { return { ok: false, count: 0, error: err(e), code: 'NETWORK' }; }
  },
  async pull(cfg, table, since) {
    try {
      const r = await fetch(join(cfg.endpoint!, `${table}?since=${since}`), { headers: authH(cfg) });
      if (!r.ok) return { ok: false, rows: [], error: `HTTP ${r.status}`, code: String(r.status) };
      const j = await r.json();
      return { ok: true, rows: Array.isArray(j) ? j : j.rows || [] };
    } catch (e) { return { ok: false, rows: [], error: err(e), code: 'NETWORK' }; }
  },
};
const join = (base: string, path: string) => base.replace(/\/$/, '') + '/' + path;
const authH = (cfg: CloudConfig) => (cfg.token ? { Authorization: `Bearer ${cfg.token}` } : {});

/* ------------------------------------------------------------------ export */
export const ADAPTERS: Record<Exclude<ProviderId, 'none' | 'jsonbin'>, Adapter> = { firebase, supabase, rest };
export const getAdapter = (id: ProviderId): Adapter | null =>
  id === 'none' || id === 'jsonbin' ? null : ADAPTERS[id];

export const PROVIDER_INFO: { id: ProviderId; label: string; emoji: string; blurb: string; fields: { key: keyof CloudConfig; label: string; hint?: string; secret?: boolean }[] }[] = [
  {
    id: 'firebase', label: 'Firebase Firestore', emoji: '🔥',
    blurb: 'Google ka free-tier realtime DB. Sirf Project ID + Web API key chahiye.',
    fields: [
      { key: 'projectId', label: 'Project ID', hint: 'Firebase console → Project settings' },
      { key: 'apiKey', label: 'Web API key', secret: true },
      { key: 'collectionPrefix', label: 'Collection prefix', hint: 'default: swiftpos' },
    ],
  },
  {
    id: 'supabase', label: 'Supabase', emoji: '⚡',
    blurb: 'Postgres + REST. Ek table banaiye (SQL neeche diya hai) aur chalu.',
    fields: [
      { key: 'url', label: 'Project URL', hint: 'https://xxxx.supabase.co' },
      { key: 'anonKey', label: 'Anon / service key', secret: true },
    ],
  },
  {
    id: 'rest', label: 'Custom REST API', emoji: '🛠️',
    blurb: 'Apna server / MySQL / Mongo — POST /:table aur GET /:table?since=… bas.',
    fields: [
      { key: 'endpoint', label: 'Base endpoint', hint: 'https://api.mysite.com/sync' },
      { key: 'token', label: 'Bearer token', secret: true },
    ],
  },
];
