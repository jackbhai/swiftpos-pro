import { describe, it, expect } from 'vitest';
import { scopeReceiptCss } from '../src/lib/billImage';

describe('scopeReceiptCss', () => {
  it('rewrites body/html selectors to the capture root and drops @page', () => {
    const css = `@page{size:80mm auto;margin:3mm}\nbody{width:80mm;margin:0 auto}\nhtml,body{background:#fff}\n.c{text-align:center}`;
    const out = scopeReceiptCss(css);
    expect(out).not.toContain('@page');
    expect(out).not.toMatch(/(^|[},\n])\s*body\b/);
    expect(out).not.toMatch(/(^|[},\n])\s*html\b/);
    expect(out).toContain('.bill-shot-root{width:80mm;margin:0 auto}');
    expect(out).toContain('.c{text-align:center}');
  });
  it('leaves class names that merely contain "body" alone', () => {
    expect(scopeReceiptCss('.tbody-x{color:red}')).toBe('.tbody-x{color:red}');
  });
});
