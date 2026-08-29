import { toast } from '@/store/ui';

let deferredPrompt: any = null;
let updateReady: ServiceWorkerRegistration | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const onPwaChange = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  const match = typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;
  return (
    Boolean(match) ||
    Boolean((window.navigator as any)?.standalone) ||
    Boolean(document.referrer?.includes('android-app://'))
  );
};

export const isIOS = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

export const canInstall = () => !!deferredPrompt && !isStandalone();
export const hasUpdate = () => !!updateReady;

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) {
    if (isIOS()) {
      return false; // Handled by UI modal with iOS instructions
    }
    return false;
  }
  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    emit();
    return outcome === 'accepted';
  } catch (e) {
    console.warn('Install prompt error:', e);
    return false;
  }
}

export function applyUpdate() {
  if (updateReady?.waiting) {
    updateReady.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
  setTimeout(() => {
    window.location.reload();
  }, 300);
}

export function initPWA() {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    emit();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    emit();
    toast('🎉 SwiftPOS Pro successfully installed!');
  });

  if ('serviceWorker' in navigator && (location.protocol.startsWith('http') || location.hostname === 'localhost')) {
    window.addEventListener('load', async () => {
      try {
        const swUrl = new URL('sw.js', document.baseURI).href;
        const reg = await navigator.serviceWorker.register(swUrl, { scope: './' });

        reg.addEventListener('updatefound', () => {
          const sw = reg.installing;
          sw?.addEventListener('statechange', () => {
            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
              updateReady = reg;
              emit();
              toast('⚡ New update ready! Tap top-bar to refresh.', 'info');
            }
          });
        });

        // Periodic update check every 20 minutes
        setInterval(() => {
          reg.update().catch(() => {});
        }, 20 * 60 * 1000);
      } catch (err) {
        console.warn('SW registration failed:', err);
      }
    });

    // Auto-reload when new service worker takes over if update was applied
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }
}
