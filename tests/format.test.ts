import { describe, it, expect } from 'vitest';
import { money, moneyShort, num, pct, dayKey, rangeFor, initials, cx } from '../src/lib/format';
import { toCSV } from '../src/lib/csv';

describe('formatting', () => {
  it('formats Indian currency', () => {
    expect(money(1234.5)).toContain('1,234.5');
    expect(money(100, '$')).toContain('$');
  });
  it('shortens large amounts', () => {
    expect(moneyShort(1500)).toMatch(/1\.5K|1,500/);
    expect(moneyShort(2500000)).toMatch(/L|Cr|M/i);
  });
  it('handles non-finite numbers safely', () => {
    expect(num(NaN)).toBe('0');
    expect(pct(Infinity)).toBe('0.0%');
  });
  it('builds stable day keys', () => {
    expect(dayKey(Date.UTC(2026, 0, 15))).toBe('2026-01-15');
  });
  it('produces sane ranges', () => {
    const [from, to] = rangeFor('7d');
    expect(to).toBeGreaterThan(from);
    expect(rangeFor('all')[0]).toBe(0);
  });
  it('makes initials and class names', () => {
    expect(initials('Ram Kumar Sharma')).toBe('RK');
    expect(cx('a', false, undefined, 'b')).toBe('a b');
  });
});

describe('csv', () => {
  it('escapes quotes, commas and newlines', () => {
    const csv = toCSV([{ a: 'he said "hi"', b: 'x,y', c: 'line1\nline2' }]);
    expect(csv).toContain('""hi""');
    expect(csv).toContain('"x,y"');
    expect(csv.split('\n')[0]).toBe('a,b,c');
  });
  it('returns an empty string for no rows', () => {
    expect(toCSV([])).toBe('');
  });
});
