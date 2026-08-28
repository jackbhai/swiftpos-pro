const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function two(n: number): string {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
}
function three(n: number): string {
  const h = Math.floor(n / 100), r = n % 100;
  return (h ? ONES[h] + ' Hundred' + (r ? ' ' : '') : '') + (r ? two(r) : '');
}

/** Indian numbering: crore / lakh / thousand */
export function amountInWords(amount: number, currency = 'Rupees', sub = 'Paise'): string {
  const neg = amount < 0;
  const a = Math.abs(Math.round(amount * 100) / 100);
  const rupees = Math.floor(a);
  const paise = Math.round((a - rupees) * 100);
  if (rupees === 0 && paise === 0) return `Zero ${currency} Only`;
  const parts: string[] = [];
  const crore = Math.floor(rupees / 1e7);
  const lakh = Math.floor((rupees % 1e7) / 1e5);
  const thousand = Math.floor((rupees % 1e5) / 1000);
  const rest = rupees % 1000;
  if (crore) parts.push(three(crore) + ' Crore');
  if (lakh) parts.push(three(lakh) + ' Lakh');
  if (thousand) parts.push(three(thousand) + ' Thousand');
  if (rest) parts.push(three(rest));
  let out = (neg ? 'Minus ' : '') + parts.join(' ') + ' ' + currency;
  if (paise) out += ' and ' + two(paise) + ' ' + sub;
  return out.replace(/\s+/g, ' ').trim() + ' Only';
}
