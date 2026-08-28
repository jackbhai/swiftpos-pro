import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CloudConfig, ProviderId } from '@/lib/cloud/providers';

export interface TableProgress { table: string; total: number; synced: number; pending: number; failed: number }

interface CloudStore {
  cfg: CloudConfig;
  enabled: boolean;
  autoSync: boolean;
  intervalSec: number;
  batchSize: number;
  tables: string[] | null;      // null = all
  direction: 'both' | 'push' | 'pull';
  conflict: 'newest' | 'cloud' | 'local';
  autoFix: boolean;
  lastSync: number;
  connected: boolean;
  /* runtime (not persisted) */
  running: boolean;
  phase: string;
  progress: TableProgress[];
  set: (p: Partial<CloudStore>) => void;
  setCfg: (p: Partial<CloudConfig>) => void;
}

const deviceId = () => {
  const k = 'swiftpos-device-id';
  let v = localStorage.getItem(k);
  if (!v) { v = 'dev_' + Math.random().toString(36).slice(2, 10); localStorage.setItem(k, v); }
  return v;
};

export const useCloud = create<CloudStore>()(
  persist(
    (set, get) => ({
      cfg: { provider: 'none' as ProviderId, deviceId: deviceId(), deviceName: guessDevice(), collectionPrefix: 'swiftpos' },
      enabled: false, autoSync: true, intervalSec: 60, batchSize: 50,
      tables: null, direction: 'both', conflict: 'newest', autoFix: true,
      lastSync: 0, connected: false,
      running: false, phase: 'idle', progress: [],
      set: (p) => set(p as any),
      setCfg: (p) => set({ cfg: { ...get().cfg, ...p } }),
    }),
    {
      name: 'swiftpos-cloud',
      partialize: (s) => ({
        cfg: s.cfg, enabled: s.enabled, autoSync: s.autoSync, intervalSec: s.intervalSec,
        batchSize: s.batchSize, tables: s.tables, direction: s.direction, conflict: s.conflict,
        autoFix: s.autoFix, lastSync: s.lastSync, connected: s.connected,
      }) as any,
    },
  ),
);

export function guessDevice() {
  const ua = navigator.userAgent;
  const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iOS' : /Windows/i.test(ua) ? 'Windows' : /Mac/i.test(ua) ? 'Mac' : 'Linux';
  const kind = /Mobi/i.test(ua) ? 'Phone' : /Tablet|iPad/i.test(ua) ? 'Tablet' : 'Desktop';
  return `${os} ${kind}`;
}
