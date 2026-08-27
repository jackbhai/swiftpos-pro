import { useSettings } from '@/store/settings';

let ctx: AudioContext | null = null;
function tone(freq: number, dur = 0.08, type: OscillatorType = 'sine', gain = 0.06) {
  if (!useSettings.getState().soundEnabled) return;
  try {
    ctx = ctx || new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = gain;
    o.connect(g); g.connect(ctx.destination);
    o.start(); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.stop(ctx.currentTime + dur);
  } catch { /* ignore */ }
}
export const beep = () => tone(1180, 0.06, 'square', 0.05);
export const clickSound = () => tone(720, 0.04, 'triangle', 0.035);
export const successSound = () => { tone(880, 0.09); setTimeout(() => tone(1320, 0.13), 90); };
export const errorSound = () => tone(180, 0.18, 'sawtooth', 0.05);
export const buzz = (ms: number | number[] = 12) => {
  if (!useSettings.getState().hapticEnabled) return;
  navigator.vibrate?.(ms as any);
};
