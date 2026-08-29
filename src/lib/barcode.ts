import QRCode from 'qrcode';

/* Code128-B Patterns */
const PATTERNS = [
  '11011001100', '11001101100', '11001100110', '10010011000', '10010001100', '10001001100',
  '10011001000', '10011000100', '10001100100', '11001001000', '11001000100', '11000100100',
  '10110011100', '10011011100', '10011001110', '10111001100', '10011101100', '10011100110',
  '11001110010', '11001011100', '11001001110', '11011100100', '11001110100', '11101101110',
  '11101001100', '11100101100', '11100100110', '11101100100', '11100110100', '11100110010',
  '11011011000', '11011000110', '11000110110', '10100011000', '10001011000', '10001000110',
  '10110001000', '10001101000', '10001100010', '11010001000', '11000101000', '11000100010',
  '10110111000', '10111011000', '10111000110', '10001110110', '10111011100', '10111001110',
  '10011101110', '10101110000', '10100111000', '10100011110', '10010111000', '10010001110',
  '10001011110', '10111101000', '10111100010', '11110101000', '11110100010', '10111011110',
  '10111101110', '11101011110', '11110101110', '11010000100', '11010010000', '11010011100',
  '11000111010', '11010111000', '11000011010', '10000110100', '10000110010', '11000010010',
  '11001010000', '11110111010', '11000010100', '10001111010', '10100111100', '10010111100',
  '10010011110', '10111100100', '10011110100', '10011110010', '11110100100', '11110010100',
  '11110010010', '11011011110', '11011110110', '11110110110', '10101111000', '10100011110',
  '10001011110', '10111101000', '10111100010', '11110101000', '11110100010', '10111011110',
  '10111101110', '11101011110', '11110101110', '11010000100', '11010010000', '11010011100',
  '1100011101011',
];

export interface BarcodeOpts {
  height?: number;
  scale?: number;
  showText?: boolean;
  color?: string;
  fontSize?: number;
}

export function code128SVG(value: string, opts: BarcodeOpts = {}): string {
  const { height = 36, scale = 1.3, showText = true, color = '#000000', fontSize = 10 } = opts;
  const text = (value || '').replace(/[^\x20-\x7E]/g, '') || '0';
  const codes: number[] = [104]; // Start B
  for (const ch of text) codes.push(ch.charCodeAt(0) - 32);
  const check = codes.reduce((sum, c, i) => sum + (i === 0 ? c : c * i), 0) % 103;
  codes.push(check, 106); // checksum + stop
  const bits = codes.map((c) => PATTERNS[c] ?? PATTERNS[0]).join('');
  const w = bits.length * scale;
  let x = 0;
  const bars: string[] = [];
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') {
      bars.push(`<rect x="${x.toFixed(2)}" y="0" width="${scale}" height="${height}" fill="${color}"/>`);
    }
    x += scale;
  }
  const th = showText ? fontSize + 3 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w.toFixed(0)}" height="${height + th}" viewBox="0 0 ${w.toFixed(0)} ${height + th}">${bars.join('')}${showText ? `<text x="${(w / 2).toFixed(0)}" y="${height + fontSize}" font-family="monospace, Courier, sans-serif" font-size="${fontSize}" font-weight="600" text-anchor="middle" fill="${color}">${text}</text>` : ''}</svg>`;
}

export const code128DataUri = (value: string, opts?: BarcodeOpts): string =>
  'data:image/svg+xml;utf8,' + encodeURIComponent(code128SVG(value, opts));

/** Generate real QR Code SVG string synchronously */
export async function qrCodeSvg(value: string, size = 80): Promise<string> {
  try {
    return await QRCode.toString(value, {
      type: 'svg',
      width: size,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    });
  } catch {
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="#eee"/><text x="50%" y="50%" text-anchor="middle" font-size="10">QR</text></svg>`;
  }
}

/** Generate QR Code Data URI */
export async function qrCodeDataUri(value: string, size = 120): Promise<string> {
  try {
    return await QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    });
  } catch {
    return '';
  }
}
