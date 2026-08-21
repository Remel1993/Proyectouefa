// Sound utility for the dice football application
let globalAudioCtx: any = null;

export const playClick = () => {
  try {
    if (!globalAudioCtx) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) globalAudioCtx = new AudioContext();
    }
    if (!globalAudioCtx) return;
    if (globalAudioCtx.state === 'suspended') globalAudioCtx.resume();
    const osc = globalAudioCtx.createOscillator();
    const gain = globalAudioCtx.createGain();
    osc.connect(gain);
    gain.connect(globalAudioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, globalAudioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, globalAudioCtx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.1, globalAudioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, globalAudioCtx.currentTime + 0.05);
    osc.start();
    osc.stop(globalAudioCtx.currentTime + 0.05);
  } catch (e) {
    // Ignore audio context errors in restricted environments
  }
};
