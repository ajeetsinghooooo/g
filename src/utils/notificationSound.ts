// Synthesized Web Audio API sound chime for Order Status Updates
// Avoids external audio asset dependencies and works seamlessly across modern browsers

export function playOrderStatusChime(statusType?: string) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    const isSuccess = statusType === 'Delivered' || statusType === 'Picked Up';
    const isCancelled = statusType === 'Cancelled';
    const isDelivery = statusType === 'Out for Delivery';

    // Tailored frequencies based on order milestone
    let freq1 = 587.33; // D5
    let freq2 = 880.0;  // A5

    if (isSuccess) {
      freq1 = 523.25; // C5
      freq2 = 1046.5; // C6 triumphant
    } else if (isCancelled) {
      freq1 = 440.0;  // A4
      freq2 = 349.23; // F4 descending
    } else if (isDelivery) {
      freq1 = 659.25; // E5
      freq2 = 783.99; // G5 upbeat
    }

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq1, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq2, now + 0.12);
    gain2.gain.setValueAtTime(0.15, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch {
    // Gracefully handle browsers blocking audio or autoplay restrictions
  }
}
