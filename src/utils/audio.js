const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const resume = () => { if (audioCtx.state === 'suspended') audioCtx.resume(); };

export const playSound = (type) => {
  resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;

  if (type === 'click') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now); osc.stop(now + 0.1);
  } else if (type === 'win') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(1000, now + 0.3);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.4);
    osc.start(now); osc.stop(now + 0.4);
  } else if (type === 'lose') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.4);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    osc.start(now); osc.stop(now + 0.4);
  } else if (type === 'tick') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, now);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    osc.start(now); osc.stop(now + 0.05);
  } else if (type === 'alert') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.4);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
    osc.start(now); osc.stop(now + 0.5);
  } else if (type === 'horn') {
    previewHorn(getHornType());
  }
};

// ── Horn sound type ─────────────────────────────────────────────────
export const HORN_TYPES = [
  { id: 'classic', label: 'كلاكس سيارة', emoji: '📯' },
  { id: 'retro',   label: 'بوق ريترو',  emoji: '🎺' },
  { id: 'duck',    label: 'بطة مطاطية', emoji: '🦆' },
];

export const getHornType = () => localStorage.getItem('hornType') || 'classic';
export const setHornType = (id) => localStorage.setItem('hornType', id);

// ── Horn (hold to honk) ─────────────────────────────────────────────
let hornNodes = null;

export const startHorn = () => {
  resume();
  if (hornNodes) return;

  const type = getHornType();
  const gain = audioCtx.createGain();
  gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;

  if (type === 'classic') {
    // Two-tone sawtooth car horn: A4 + C#5
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    osc1.connect(gain); osc2.connect(gain);
    osc1.type = 'sawtooth'; osc1.frequency.value = 440;
    osc2.type = 'sawtooth'; osc2.frequency.value = 554;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.04);
    osc1.start(); osc2.start();
    hornNodes = { oscs: [osc1, osc2], gain };

  } else if (type === 'retro') {
    // Old-fashioned bulb horn: warm single tone with tremolo
    const osc = audioCtx.createOscillator();
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    osc.connect(gain);
    lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
    osc.type = 'sine'; osc.frequency.value = 280;
    lfo.type = 'sine'; lfo.frequency.value = 8;
    lfoGain.gain.value = 18;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.06);
    osc.start(); lfo.start();
    hornNodes = { oscs: [osc, lfo], gain };

  } else if (type === 'duck') {
    // Rubber duck: fast pitch sweep, high and nasal
    const osc = audioCtx.createOscillator();
    osc.connect(gain);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.linearRampToValueAtTime(700, now + 0.12);
    osc.frequency.linearRampToValueAtTime(860, now + 0.22);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.45, now + 0.03);
    osc.start();
    hornNodes = { oscs: [osc], gain };
  }
};

export const stopHorn = () => {
  if (!hornNodes) return;
  const { oscs, gain } = hornNodes;
  const now = audioCtx.currentTime;
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(0, now + 0.08);
  oscs.forEach(o => o.stop(now + 0.08));
  hornNodes = null;
};

// Preview a horn sound for 0.6s without holding
export const previewHorn = (typeId) => {
  const prev = getHornType();
  setHornType(typeId);
  startHorn();
  setTimeout(() => { stopHorn(); setHornType(prev); }, 600);
};
