import { toast } from '@/store/ui';

let deferredPrompt: any = null;
let updateReady: ServiceWorkerRegistration | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const onPwaChange = (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn); };
export const canInstall = () => !!deferredPrompt;
export const hasUpdate = () => !!updateReady;

export async function promptInstall() {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null; emit();
  return outcome === 'accepted';
}

export function applyUpdate() {
  updateReady?.waiting?.postMessage('skip-waiting');
  setTimeout(() => location.reload(), 400);
}

export function initPWA() {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; emit(); });
  window.addEventListener('appinstalled', () => { deferredPrompt = null; emit(); toast('SwiftPOS installed 🎉'); });

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', async () => {
      try {
        const reg = await navigator.serviceWorker.register(new URL('sw.js', document.baseURI).href, { scope: './' });
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing;
          sw?.addEventListener('statechange', () => {
            if (sw.state === 'installed' && navigator.serviceWorker.controller) { updateReady = reg; emit(); }
          });
        });
        setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
      } catch { /* offline-only mode still works */ }
    });
  }
}
