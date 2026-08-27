export const money = (n: number, cur = '₹') =>
  cur + (Number.isFinite(n) ? n : 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const moneyShort = (n: number, cur = '₹') => {
  const a = Math.abs(n);
  if (a >= 1e7) return cur + (n / 1e7).toFixed(2) + 'Cr';
  if (a >= 1e5) return cur + (n / 1e5).toFixed(2) + 'L';
  if (a >= 1e3) return cur + (n / 1e3).toFixed(1) + 'K';
  return cur + n.toFixed(0);
};

export const num = (n: number) => (Number.isFinite(n) ? n : 0).toLocaleString('en-IN');
export const pct = (n: number) => (Number.isFinite(n) ? n : 0).toFixed(1) + '%';

export const dt = (ts: number) => new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
export const dOnly = (ts: number) => new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
export const tOnly = (ts: number) => new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
export const dayKey = (ts: number) => new Date(ts).toISOString().slice(0, 10);

export const ago = (ts: number) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 2592000) return Math.floor(s / 86400) + 'd ago';
  return dOnly(ts);
};

export const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
export const endOfDay = (d = new Date()) => startOfDay(d) + 86399999;

export function rangeFor(period: 'today' | 'yesterday' | '7d' | '30d' | '90d' | 'month' | 'year' | 'all') {
  const now = new Date();
  switch (period) {
    case 'today': return [startOfDay(now), endOfDay(now)] as const;
    case 'yesterday': { const y = new Date(Date.now() - 864e5); return [startOfDay(y), endOfDay(y)] as const; }
    case '7d': return [startOfDay(new Date(Date.now() - 6 * 864e5)), endOfDay(now)] as const;
    case '30d': return [startOfDay(new Date(Date.now() - 29 * 864e5)), endOfDay(now)] as const;
    case '90d': return [startOfDay(new Date(Date.now() - 89 * 864e5)), endOfDay(now)] as const;
    case 'month': return [new Date(now.getFullYear(), now.getMonth(), 1).getTime(), endOfDay(now)] as const;
    case 'year': return [new Date(now.getFullYear(), 0, 1).getTime(), endOfDay(now)] as const;
    default: return [0, Date.now()] as const;
  }
}

export const initials = (s: string) => s.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();
export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');
