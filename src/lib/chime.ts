export type ChimeType = 'click' | 'correct' | 'wrong' | 'completion';

export function playChimeSound(type: ChimeType) {
  try {
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.connect(gain);
    gain.connect(context.destination);
    if (localStorage.getItem('quiz_sound_effects_muted') === 'true') return;

    if (type === 'click') {
      oscillator.frequency.setValueAtTime(600, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, context.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.1);
    } else if (type === 'correct') {
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(523.25, context.currentTime);
      oscillator.frequency.setValueAtTime(659.25, context.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(783.99, context.currentTime + 0.2);
      gain.gain.setValueAtTime(0.15, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.35);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.4);
    } else if (type === 'wrong') {
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(220, context.currentTime);
      oscillator.frequency.linearRampToValueAtTime(110, context.currentTime + 0.25);
      gain.gain.setValueAtTime(0.15, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.3);
    } else {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(392, context.currentTime);
      oscillator.frequency.setValueAtTime(523.25, context.currentTime + 0.15);
      oscillator.frequency.setValueAtTime(659.25, context.currentTime + 0.3);
      oscillator.frequency.setValueAtTime(1046.5, context.currentTime + 0.45);
      gain.gain.setValueAtTime(0.2, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.65);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.7);
    }
  } catch (error) {
    console.warn('Audio Context is locked or unsupported', error);
  }
}
