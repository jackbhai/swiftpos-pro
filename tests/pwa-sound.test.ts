import { describe, it, expect } from 'vitest';
import { isStandalone, isIOS, canInstall, hasUpdate } from '../src/lib/pwa';
import { beep, clickSound, successSound, errorSound, warningSound, cashChime, buzz } from '../src/lib/sound';
import { isImageUrl } from '../src/components/ui/ProductImage';

describe('PWA Helpers', () => {
  it('detects standalone mode without crashing in jsdom', () => {
    expect(typeof isStandalone()).toBe('boolean');
  });

  it('detects iOS environment gracefully', () => {
    expect(typeof isIOS()).toBe('boolean');
  });

  it('checks installability status', () => {
    expect(typeof canInstall()).toBe('boolean');
    expect(typeof hasUpdate()).toBe('boolean');
  });
});

describe('Product Image URL Helpers', () => {
  it('correctly identifies web and base64 data urls', () => {
    expect(isImageUrl('https://i.ibb.co/abc/image.png')).toBe(true);
    expect(isImageUrl('http://example.com/item.jpg')).toBe(true);
    expect(isImageUrl('data:image/jpeg;base64,...')).toBe(true);
    expect(isImageUrl('blob:http://localhost/123')).toBe(true);
    expect(isImageUrl('📦')).toBe(false);
    expect(isImageUrl('☕')).toBe(false);
    expect(isImageUrl('')).toBe(false);
    expect(isImageUrl(null)).toBe(false);
  });
});

describe('Sound & Haptics Engine', () => {
  it('executes sound triggers without throwing errors', () => {
    expect(() => beep()).not.toThrow();
    expect(() => clickSound()).not.toThrow();
    expect(() => successSound()).not.toThrow();
    expect(() => errorSound()).not.toThrow();
    expect(() => warningSound()).not.toThrow();
    expect(() => cashChime()).not.toThrow();
  });

  it('executes haptic patterns safely in any environment', () => {
    expect(() => buzz('light')).not.toThrow();
    expect(() => buzz('medium')).not.toThrow();
    expect(() => buzz('heavy')).not.toThrow();
    expect(() => buzz('success')).not.toThrow();
    expect(() => buzz('warning')).not.toThrow();
    expect(() => buzz(15)).not.toThrow();
    expect(() => buzz([10, 20, 10])).not.toThrow();
  });
});
