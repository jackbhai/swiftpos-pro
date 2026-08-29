import { useSettings } from '@/store/settings';

let ctx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      ctx = new AudioCtx();
    }
  }
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

function tone(
  freq: number,
  dur = 0.08,
  type: OscillatorType = 'sine',
  gain = 0.08,
  delay = 0,
) {
  if (!useSettings.getState().soundEnabled) return;
  try {
    const actx = getAudioContext();
    if (!actx) return;

    const startTime = actx.currentTime + delay;
    const o = actx.createOscillator();
    const g = actx.createGain();

    o.type = type;
    o.frequency.setValueAtTime(freq, startTime);
    g.gain.setValueAtTime(gain, startTime);
    g.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

    o.connect(g);
    g.connect(actx.destination);

    o.start(startTime);
    o.stop(startTime + dur);
  } catch {
    /* audio playback ignored */
  }
}

/** Realistic dual-tone POS barcode beep */
export const beep = () => {
  tone(1480, 0.05, 'square', 0.04);
  tone(1860, 0.05, 'sine', 0.05, 0.03);
};

/** Crisp UI click */
export const clickSound = () => {
  tone(880, 0.03, 'triangle', 0.03);
};

/** Payment success / Cash register chime */
export const successSound = () => {
  // Joyful harmonic arpeggio: C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046Hz)
  tone(523, 0.08, 'sine', 0.06, 0);
  tone(659, 0.08, 'sine', 0.07, 0.07);
  tone(784, 0.1, 'sine', 0.08, 0.14);
  tone(1046, 0.22, 'triangle', 0.09, 0.21);
};

/** Error tone */
export const errorSound = () => {
  tone(220, 0.12, 'sawtooth', 0.08, 0);
  tone(160, 0.18, 'sawtooth', 0.08, 0.1);
};

/** Warning prompt tone */
export const warningSound = () => {
  tone(600, 0.08, 'triangle', 0.05, 0);
  tone(450, 0.12, 'sine', 0.05, 0.08);
};

/** Cash drawer / coin drop clink */
export const cashChime = () => {
  tone(1200, 0.04, 'triangle', 0.05, 0);
  tone(2400, 0.06, 'sine', 0.06, 0.04);
};

/**
 * Haptic feedback with pattern presets
 */
export const buzz = (pattern: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | number | number[] = 'light') => {
  if (typeof window === 'undefined') return;
  if (!useSettings.getState().hapticEnabled) return;
  if (!('vibrate' in navigator)) return;

  try {
    if (typeof pattern === 'number' || Array.isArray(pattern)) {
      navigator.vibrate(pattern);
      return;
    }

    switch (pattern) {
      case 'light':
        navigator.vibrate(10);
        break;
      case 'medium':
        navigator.vibrate(22);
        break;
      case 'heavy':
        navigator.vibrate(45);
        break;
      case 'success':
        navigator.vibrate([12, 40, 20]);
        break;
      case 'warning':
        navigator.vibrate([30, 50, 30]);
        break;
    }
  } catch {
    /* vibration not supported or blocked */
  }
};
