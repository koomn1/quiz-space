/**
 * Elegant Web Audio API synthesis for premium, crisp notification sounds.
 * Designed dynamically to play delightful audio feedback without requiring external assets.
 * Refactored to be peaceful, minimalist, and extremely calm (no arcade/gaming sound style).
 */
export function playNotificationSound(type: 'success' | 'chime' | 'delete' | 'tap') {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    if (type === 'chime') {
      // Soft, minimalist dual-tone ambient chime (No fast game arpeggio)
      const now = audioCtx.currentTime;
      const freqs = [523.25, 783.99]; // Harmony of C5 and G5 (Perfect Fifth)
      freqs.forEach((freq, index) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.12);
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.05, now + index * 0.12 + 0.04);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.12 + 0.8);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start(now + index * 0.12);
        osc.stop(now + index * 0.12 + 1.0);
      });
    } else if (type === 'success') {
      // Warm, soft acoustic chord swell (Rhodes-like feel, no arcade cascade)
      const now = audioCtx.currentTime;
      const chord = [261.63, 329.63, 392.00, 493.88]; // C4, E4, G4, B4 (C Major 7th Warm Harmony)
      chord.forEach((freq, index) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();
        
        osc.type = 'sine'; // Pure gentle wave
        osc.frequency.setValueAtTime(freq, now);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, now); // Warm low-pass cut
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.04, now + 0.12 + index * 0.02); // Elegant soft stagger attack
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
        
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start(now);
        osc.stop(now + 1.5);
      });
    } else if (type === 'delete') {
      // Muffled, organic low-frequency release
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.15);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(120, now);
      
      gainNode.gain.setValueAtTime(0.04, now);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      
      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(now + 0.2);
    } else if (type === 'tap') {
      // Minimalist, extremely quiet tactile click (no high-frequency bleeps)
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.02);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      
      gainNode.gain.setValueAtTime(0.02, now); // Extremely subtle, completely organic feel
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
      
      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(now + 0.04);
    }
  } catch (e) {
    console.warn('Web Audio synthesis not played yet: needs client user interaction event first.', e);
  }
}
