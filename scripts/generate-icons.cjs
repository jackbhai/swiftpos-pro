const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const ICONS_DIR = path.join(__dirname, '../public/icons');
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

function drawIcon(size, isMaskable = false) {
  const png = new PNG({ width: size, height: size });
  const center = size / 2;
  const radius = size * (isMaskable ? 0.48 : 0.44);
  const cornerR = size * 0.22;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;

      // Base background: Deep AMOLED Black with slight radial glow
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const normDist = dist / center;

      // Background gradient
      let r = 5 + Math.floor(10 * (1 - normDist));
      let g = 7 + Math.floor(14 * (1 - normDist));
      let b = 14 + Math.floor(25 * (1 - normDist));
      let a = 255;

      if (!isMaskable) {
        // Squircle / rounded rect mask
        const qx = Math.abs(x - center) - (center - cornerR);
        const qy = Math.abs(y - center) - (center - cornerR);
        if (qx > 0 && qy > 0) {
          const cornerDist = Math.sqrt(qx * qx + qy * qy);
          if (cornerDist > cornerR) {
            a = 0; // transparent outside rounded rect
          }
        }
      }

      if (a > 0) {
        // Glowing outer border accent
        const borderDist = Math.abs(dist - radius * 0.92);
        if (borderDist < size * 0.035) {
          const glow = 1 - borderDist / (size * 0.035);
          r = Math.min(255, Math.floor(r + 0 * glow));
          g = Math.min(255, Math.floor(g + 229 * glow));
          b = Math.min(255, Math.floor(b + 255 * glow));
        }

        // Draw stylized "S" / Lightning POS glyph
        // Normalized coordinates in [-1, 1] relative to icon center
        const nx = (x - center) / (size * 0.38);
        const ny = (y - center) / (size * 0.38);

        // Check if inside stylized S letter or lightning bolt
        let inGlyph = false;
        
        // Top curve of S
        if (ny >= -0.85 && ny <= -0.5 && nx >= -0.65 && nx <= 0.65) inGlyph = true;
        if (ny >= -0.85 && ny <= -0.05 && nx >= -0.65 && nx <= -0.28) inGlyph = true;
        // Middle bar of S
        if (ny >= -0.2 && ny <= 0.2 && nx >= -0.65 && nx <= 0.65) inGlyph = true;
        // Bottom right curve of S
        if (ny >= 0.05 && ny <= 0.85 && nx >= 0.28 && nx <= 0.65) inGlyph = true;
        // Bottom bar of S
        if (ny >= 0.5 && ny <= 0.85 && nx >= -0.65 && nx <= 0.65) inGlyph = true;

        // Add POS lightning diagonal cut / bolt accent
        if (nx + ny * 0.8 >= -0.15 && nx + ny * 0.8 <= 0.25 && ny >= -0.8 && ny <= 0.8) {
          inGlyph = true;
        }

        if (inGlyph) {
          // Vibrant cyan to electric purple gradient
          const gradFactor = (ny + 1) / 2; // 0 (top) to 1 (bottom)
          // Top is neon cyan (0, 229, 255), bottom is electric indigo (124, 58, 237)
          r = Math.floor(0 * (1 - gradFactor) + 124 * gradFactor);
          g = Math.floor(229 * (1 - gradFactor) + 58 * gradFactor);
          b = Math.floor(255 * (1 - gradFactor) + 237 * gradFactor);
        } else {
          // Subtle glow aura around glyph
          const glyphDist = Math.min(
            Math.abs(ny - (-0.68)),
            Math.abs(ny - 0),
            Math.abs(ny - 0.68),
            Math.abs(nx + ny * 0.8)
          );
          if (glyphDist < 0.25 && Math.abs(nx) < 0.8 && Math.abs(ny) < 0.9) {
            const aura = (1 - glyphDist / 0.25) * 0.4;
            r = Math.min(255, Math.floor(r + 0 * aura));
            g = Math.min(255, Math.floor(g + 180 * aura));
            b = Math.min(255, Math.floor(b + 255 * aura));
          }
        }
      }

      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = a;
    }
  }

  return png;
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
sizes.forEach((s) => {
  const p = drawIcon(s, false);
  const out = path.join(ICONS_DIR, `icon-${s}.png`);
  p.pack().pipe(fs.createWriteStream(out));
  console.log(`Generated ${out}`);
});

// Maskable 512
const maskable = drawIcon(512, true);
const maskableOut = path.join(ICONS_DIR, 'icon-maskable-512.png');
maskable.pack().pipe(fs.createWriteStream(maskableOut));
console.log(`Generated ${maskableOut}`);

// Apple touch icon (180x180)
const appleIcon = drawIcon(180, false);
const appleOut = path.join(__dirname, '../public/apple-touch-icon.png');
appleIcon.pack().pipe(fs.createWriteStream(appleOut));
console.log(`Generated ${appleOut}`);

// Favicon 48x48 and favicon 192
const favIcon = drawIcon(48, false);
const favOut = path.join(__dirname, '../public/favicon.png');
favIcon.pack().pipe(fs.createWriteStream(favOut));
console.log(`Generated ${favOut}`);
