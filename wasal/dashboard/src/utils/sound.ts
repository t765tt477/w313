// Lightweight notification chime generated with the Web Audio API - no
// external mp3/wav asset needed.
let audioCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtx = new AudioCtx();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => { });
    }
    return audioCtx;
  } catch {
    return null;
  }
}

function beep(frequency: number, durationMs: number, startAt = 0, volume = 0.22) {
  const ctx = getContext();
  if (!ctx) return;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  gain.gain.value = volume;
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  const t = ctx.currentTime + startAt;
  oscillator.start(t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + durationMs / 1000);
  oscillator.stop(t + durationMs / 1000 + 0.02);
}

export function playNotificationSound() {
  beep(950, 130, 0);
  beep(1300, 160, 0.14);
}
