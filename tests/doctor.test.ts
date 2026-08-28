import { describe, it, expect } from 'vitest';
import { diagnose, stripHeavy } from '../src/lib/cloud/doctor';

describe('auto error doctor', () => {
  it('detects network problems and keeps retrying', () => {
    const d = diagnose('NETWORK', 'Failed to fetch');
    expect(d.kind).toBe('network');
    expect(d.retry).toBe(true);
    expect(d.autoFixable).toBe(true);
  });

  it('stops retrying on auth errors and asks the user', () => {
    const d = diagnose('401', 'Unauthorized');
    expect(d.kind).toBe('auth');
    expect(d.retry).toBe(false);
    expect(d.needsUser).toBeTruthy();
  });

  it('shrinks the batch on rate limits', () => {
    const d = diagnose('429', 'Too many requests');
    expect(d.kind).toBe('rate-limit');
    expect(d.shrinkBatch).toBe(true);
    expect(d.backoffMs).toBeGreaterThanOrEqual(10000);
  });

  it('strips heavy fields on payload errors', () => {
    const d = diagnose('413', 'payload too large');
    expect(d.stripBig).toBe(true);
    expect(d.shrinkBatch).toBe(true);
  });

  it('recognises a missing cloud table', () => {
    expect(diagnose('NO_TABLE', '').kind).toBe('missing-table');
    expect(diagnose('404', 'relation does not exist').kind).toBe('missing-table');
  });

  it('resets the cursor on schema/bad-request errors', () => {
    const d = diagnose('400', 'invalid json');
    expect(d.kind).toBe('schema');
    expect(d.resetCursor).toBe(true);
  });

  it('merges conflicts instead of failing', () => {
    expect(diagnose('409', 'duplicate key').kind).toBe('conflict');
  });

  it('always returns a usable diagnosis', () => {
    const d = diagnose(undefined, 'something odd happened');
    expect(d.kind).toBe('unknown');
    expect(d.title).toBeTruthy();
    expect(d.hindi).toBeTruthy();
    expect(d.fix).toBeTruthy();
  });

  it('stripHeavy removes oversized strings only', () => {
    const row = { id: '1', name: 'ok', image: 'x'.repeat(30000), n: 5 };
    const out = stripHeavy(row);
    expect(out.image).toBe('');
    expect(out.name).toBe('ok');
    expect(out.n).toBe(5);
  });
});
