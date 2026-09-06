import { describe, it, expect } from 'vitest';
import { parseBillDetails, parsedToSettings } from '../src/lib/billOcr';

/* Real bill transcribed from the user's photo (Kali Ghata Misthan Bhandar). */
const REAL_BILL = `KALI GHATA MISTHAN BHANDAR PVT. LTD.
MITHAI SHOP/SHOWROOM
F-146,ARYA SAMAJ ROAD,UTTAM NAGAR,NEW DELHI 59
CIN: U15419DL2010PTC209840-
9205150220/8880570580
GSTIN: 07AAECK2795F1ZE
FSSAI:-13319006000144
INVOICE
Bill No : 203409 Bill Date: 06-09-2026
Bill Type: Take Away Cashier: deepak
No of Items : 1 Time : 05:55 PM
DESCRIPTION QTY RATE AMOUNT
*Samosa With Dah 1.000 25.00 25.00
HSN : 996331
Net Qty : 1.000 Bill Total : 25.00
Round Off: 0.00
Payable Amt: 25.00
Payment Mode- Cash:25.00
Tax Detail : 1.19
Tender Amount : 25.00
Balance Amount : 0.00
Token No. : 732
**Thanks for your visit**
***Have A Nice Day***
www.kalighata.com
Powered by SynowehTech(ver 11.2.1)`;

describe('parseBillDetails — real user bill', () => {
  const p = parseBillDetails(REAL_BILL);

  it('reads shop name + tagline', () => {
    expect(p.shopName).toBe('KALI GHATA MISTHAN BHANDAR PVT. LTD.');
    expect(p.tagline).toBe('MITHAI SHOP/SHOWROOM');
  });

  it('reads the address line', () => {
    expect(p.address).toBe('F-146,ARYA SAMAJ ROAD,UTTAM NAGAR,NEW DELHI 59');
  });

  it('reads GSTIN / FSSAI / CIN', () => {
    expect(p.gstin).toBe('07AAECK2795F1ZE');
    expect(p.fssai).toBe('13319006000144');
    expect(p.cin).toBe('U15419DL2010PTC209840');
  });

  it('reads both phone numbers', () => {
    expect(p.phones).toEqual(['9205150220', '8880570580']);
  });

  it('reads the website', () => {
    expect(p.website).toBe('www.kalighata.com');
  });
});

describe('parseBillDetails — noisy OCR', () => {
  it('handles lowercase + spaced-out digits + pincode break', () => {
    const p = parseBillDetails(`kali ghata misthan bhandar pvt ltd
F-146 Arya Samaj Road Uttam Nagar New Delhi 110059
gstin : 07aaeck2795f1ze
fssai : 13319 0060 00144
PH 9205150220 , 8880570580
INVOICE Bill No 1`);
    expect(p.shopName).toBe('kali ghata misthan bhandar pvt ltd');
    expect(p.address).toBe('F-146 Arya Samaj Road Uttam Nagar New Delhi 110059');
    expect(p.gstin).toBe('07AAECK2795F1ZE');
    expect(p.fssai).toBe('13319006000144');
    expect(p.phones).toEqual(['9205150220', '8880570580']);
  });

  it('finds landline + email, skips junk separators', () => {
    const p = parseBillDetails(`-------------------
SHARMA GENERAL STORE
Shop 12, Main Market, Karol Bagh
011-45678901
care@sharmastore.in
-------------------
BILL NO 12`);
    expect(p.shopName).toBe('SHARMA GENERAL STORE');
    expect(p.address).toBe('Shop 12, Main Market, Karol Bagh');
    expect(p.phones).toContain('01145678901');
    expect(p.email).toBe('care@sharmastore.in');
  });

  it('never mistakes GSTIN/FSSAI digits for phone numbers', () => {
    const p = parseBillDetails(`TEST SHOP
GSTIN: 07AAECK2795F1ZE
FSSAI: 13319006000144`);
    expect(p.phones).toEqual([]);
    expect(p.gstin).toBe('07AAECK2795F1ZE');
    expect(p.fssai).toBe('13319006000144');
  });

  it('fixes real tesseract noise: O→0 in GSTIN, spaced www, CGST@2.5 mail-trap', () => {
    const p = parseBillDetails(`KALI GHATA MISTHAN BHANDAR PVT. LTD.
F-146,ARYA SAMAJ ROAD,UTTAM NAGAR,NEW DELHI 59
GSTIN: O7AAECK2795F1ZE
OUT CGST@2.5 : 23.81 0.60
OUT SGST@2.5 : 23.81 0.60
www. kalighata.com`);
    expect(p.gstin).toBe('07AAECK2795F1ZE');
    expect(p.website).toBe('www.kalighata.com');
    expect(p.email).toBe('');
  });

  it('returns empty on garbage', () => {
    expect(parseBillDetails('')).toEqual({
      shopName: '', tagline: '', address: '', phones: [],
      gstin: '', fssai: '', cin: '', email: '', website: '',
    });
    expect(parseBillDetails('--- *** ---')!.shopName).toBe('');
  });
});

describe('parsedToSettings', () => {
  it('maps only the fields that were found', () => {
    const p = parseBillDetails(REAL_BILL);
    expect(parsedToSettings(p)).toEqual({
      shopName: 'KALI GHATA MISTHAN BHANDAR PVT. LTD.',
      tagline: 'MITHAI SHOP/SHOWROOM',
      address: 'F-146,ARYA SAMAJ ROAD,UTTAM NAGAR,NEW DELHI 59',
      phone: '9205150220',
      phone2: '8880570580',
      website: 'www.kalighata.com',
      gstin: '07AAECK2795F1ZE',
      fssai: '13319006000144',
      cinNo: 'U15419DL2010PTC209840',
    });
  });
});
