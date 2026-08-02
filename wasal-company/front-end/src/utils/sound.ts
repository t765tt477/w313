// Lightweight notification sounds generated with the Web Audio API so we
// don't depend on any external mp3/wav asset files.
let audioCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtx = new AudioCtx();
    }
    // Browsers suspend the context until a user gesture; resume defensively.
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => { });
    }
    return audioCtx;
  } catch {
    return null;
  }
}

function beep(frequency: number, durationMs: number, startAt = 0, volume = 0.25) {
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

// Soft two-tone chime for general notifications (order accepted, delivered, etc.)
export function playNotificationSound() {
  beep(880, 140, 0);
  beep(1175, 180, 0.15);
}

// More attention-grabbing repeating alert for an incoming order offer a
// driver needs to act on quickly.
export function playIncomingOrderSound() {
  beep(700, 160, 0);
  beep(700, 160, 0.25);
  beep(900, 220, 0.5);
}
