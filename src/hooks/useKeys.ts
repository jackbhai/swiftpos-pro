import { useEffect } from 'react';

export function useHotkeys(map: Record<string, (e: KeyboardEvent) => void>) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable;
      const combo = [e.ctrlKey || e.metaKey ? 'mod' : '', e.shiftKey ? 'shift' : '', e.altKey ? 'alt' : '', e.key.toLowerCase()].filter(Boolean).join('+');
      const fn = map[combo] || map[e.key.toLowerCase()];
      if (!fn) return;
      if (typing && !combo.includes('mod') && !e.key.startsWith('F') && e.key !== 'Escape') return;
      fn(e);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [map]);
}
