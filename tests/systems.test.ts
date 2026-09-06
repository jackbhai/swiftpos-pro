import { describe, it, expect } from 'vitest';
import { SYSTEMS, getSystem, screenAllowed, systemsForPicker } from '../src/lib/systems';
import { SHOP_PROFILES, getProfile } from '../src/lib/shopProfiles';

describe('business systems', () => {
  it('ships a complete set of business systems including sweets', () => {
    expect(SYSTEMS.length).toBeGreaterThanOrEqual(11);
    expect(SYSTEMS.map((s) => s.id)).toContain('sweets');
    expect(SYSTEMS.map((s) => s.id)).toContain('rms');
    expect(SHOP_PROFILES.map((p) => p.id)).toContain('sweets');
  });

  it('puts Sweets / Mithai near the top of the picker, separate from Bakery', () => {
    const picker = systemsForPicker();
    expect(picker.find((s) => s.id === 'sweets')?.short).toMatch(/Mithai/i);
    expect(picker.findIndex((s) => s.id === 'sweets')).toBeLessThan(3);
    expect(picker.find((s) => s.id === 'bakery')?.label).not.toMatch(/Sweet Shop/i);
  });

  it('has unique ids and labels', () => {
    expect(new Set(SYSTEMS.map((s) => s.id)).size).toBe(SYSTEMS.length);
    expect(new Set(SYSTEMS.map((s) => s.label)).size).toBe(SYSTEMS.length);
  });

  it('every system points at a real wording profile', () => {
    for (const s of SYSTEMS) expect(SHOP_PROFILES.some((p) => p.id === s.base)).toBe(true);
  });

  it('every system exposes core screens', () => {
    for (const s of SYSTEMS) {
      for (const must of ['/', '/pos', '/inventory', '/settings', '/cloud']) {
        expect(screenAllowed(s, must)).toBe(true);
      }
    }
  });

  it('each system documents workflow, highlights and capture fields', () => {
    for (const s of SYSTEMS) {
      expect(s.workflow.length).toBeGreaterThanOrEqual(4);
      expect(s.highlights.length).toBeGreaterThanOrEqual(5);
      expect(s.capture.length).toBeGreaterThanOrEqual(2);
      expect(Object.keys(s.defaults).length).toBeGreaterThan(2);
    }
  });

  it('capture fields are well formed', () => {
    for (const s of SYSTEMS) {
      for (const f of s.capture) {
        expect(f.key).toMatch(/^[a-zA-Z][\w]*$/);
        expect(['bill', 'line']).toContain(f.scope);
        expect(['text', 'number', 'date', 'select', 'phone']).toContain(f.type);
        if (f.type === 'select') expect((f.options || []).length).toBeGreaterThan(1);
      }
      expect(new Set(s.capture.map((f) => f.key)).size).toBe(s.capture.length);
    }
  });

  it('domain rules are wired: RMS tables, pharmacy Rx, electronics IMEI, garage vehicle', () => {
    expect(getSystem('rms').caps).toContain('tables');
    expect(getSystem('rms').capture.some((f) => f.key === 'tableNo')).toBe(true);
    expect(getSystem('pharmacy').capture.some((f) => f.key === 'rxNo')).toBe(true);
    expect(getSystem('pharmacy').caps).toContain('batchExpiry');
    expect(getSystem('electronics').capture.find((f) => f.key === 'imei')?.required).toBe(true);
    expect(getSystem('garage').capture.find((f) => f.key === 'vehicleNo')?.required).toBe(true);
    expect(getSystem('cafe').capture.some((f) => f.key === 'token')).toBe(true);
    expect(getSystem('sweets').caps).toContain('weighScale');
    expect(getSystem('sweets').base).toBe('sweets');
  });

  it('falls back to the first system for an unknown id', () => {
    expect(getSystem('does-not-exist').id).toBe(SYSTEMS[0].id);
    expect(getProfile('nope' as any).id).toBe(SHOP_PROFILES[0].id);
  });
});
