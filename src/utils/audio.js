export const getHornType = () => localStorage.getItem('hornType') || 'car';
export const setHornType = (id) => localStorage.setItem('hornType', id);

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const resume = () => { if (audioCtx.state === 'suspended') audioCtx.resume(); };

// Keep AudioContext alive on every user interaction (re-suspended after inactivity on mobile)
['mousedown', 'touchstart', 'keydown', 'pointerdown'].forEach(evt =>
  window.addEventListener(evt, resume, { passive: true })
);

// Call this before a button action to warm up AudioContext with zero perceptible delay
export const warmAudio = () => resume();

export const playSound = (type) => {
  resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;

  if (type === 'click') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.04);
    gain.gain.setValueAtTime(0.04, now); // Much softer
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.start(now); osc.stop(now + 0.04);
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
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.start(now); osc.stop(now + 0.15);
  } else if (type === 'horn') {
    previewHorn(getHornType());
  }
};

// ── Horn sound type ─────────────────────────────────────────────────
export const HORN_TYPES = [
  { id: 'car',       label: 'كلاكس عربية 🚗', src: 'horn_car.png' },
  { id: 'ambulance', label: 'إسعاف 🚨',      src: 'horn_ambulance_v2.png' },
  { id: 'duck',      label: 'بطة حقيقية 🦆', src: 'horn_duck_v2.png' },
  { id: 'laser',     label: 'ليزر فضائي ⚡', src: 'horn_laser.png' },
  { id: 'boing',     label: 'زمبلك كوميدي 🌀', src: 'horn_boing.png' },
  { id: 'ghost',     label: 'رعب شبحي 👻', src: 'horn_ghost.png' },
  { id: 'ufo',       label: 'غزو فضائي 🛸', src: 'horn_ufo.png' },
  { id: 'sonar',     label: 'رادار غواصة 🛰️', src: 'horn_sonar.png' },
  { id: 'bike',      label: 'جرس عجلة 🔔', src: 'horn_bike.png' },
  { id: 'slide',     label: 'صفارة كوميدية 🎶', src: 'horn_slide.png' },
  { id: 'train',     label: 'قطار بخاري 🚂', src: 'horn_train.png' },
  { id: 'cuckoo',    label: 'ساعة كوكو 🐦', src: 'horn_cuckoo.png' },
  { id: 'drop',      label: 'نقطة مياه 💧', src: 'horn_drop.png' },
];



// ── Horn (hold to honk) ─────────────────────────────────────────────
let hornNodes = null;

export const startHorn = (overrideType) => {
  if (hornNodes) return;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().then(() => _doStartHorn(overrideType));
    return;
  }
  _doStartHorn(overrideType);
};

function _doStartHorn(overrideType) {
  if (hornNodes) return; // guard against double-call after async resume

  const type = overrideType || getHornType();
  const gain = audioCtx.createGain();
  gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;

  if (type === 'ambulance') {
    // Ambulance Siren: Alternating frequencies between 650Hz and 900Hz every 0.3s
    const osc = audioCtx.createOscillator();
    osc.connect(gain);
    osc.type = 'square';
    osc.frequency.setValueAtTime(650, now);
    
    // Create an alternating pattern for the frequency
    for (let i = 0.4; i < 10; i += 0.8) {
      osc.frequency.setValueAtTime(900, now + i);
      osc.frequency.setValueAtTime(650, now + i + 0.4);
    }

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
    osc.start();
    hornNodes = { oscs: [osc], gain };

  } else if (type === 'duck') {
    // Realistic Duck Quack: Multi-stage pitch with nasal tone
    const osc = audioCtx.createOscillator();
    osc.connect(gain);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(750, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(350, now + 0.25);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.start();
    hornNodes = { oscs: [osc], gain };

  } else if (type === 'laser') {
    // Laser: Fast downward exponential sweep
    const osc = audioCtx.createOscillator();
    osc.connect(gain);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1500, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc.start();
    hornNodes = { oscs: [osc], gain };

  } else if (type === 'boing') {
    // Boing: Upward resonant sweep
    const osc = audioCtx.createOscillator();
    osc.connect(gain);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.4);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc.start();
    hornNodes = { oscs: [osc], gain };

  } else if (type === 'ghost') {
    // Ghostly: Low eerie detuned sine wave with slow LFO
    const osc = audioCtx.createOscillator();
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    osc.connect(gain);
    lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
    osc.type = 'triangle'; osc.frequency.value = 110;
    lfo.type = 'sine'; lfo.frequency.value = 3;
    lfoGain.gain.value = 40;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.2);
    osc.start(); lfo.start();
    hornNodes = { oscs: [osc, lfo], gain };

  } else if (type === 'ufo') {
    // UFO: Rhythmic pitch wobbling
    const osc = audioCtx.createOscillator();
    osc.connect(gain);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    for (let i = 0.1; i < 5; i += 0.2) {
      osc.frequency.setValueAtTime(800, now + i);
      osc.frequency.setValueAtTime(300, now + i + 0.1);
    }
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
    osc.start();
    hornNodes = { oscs: [osc], gain };

  } else if (type === 'sonar') {
    // Sonar Ping: High pure tone with long reverb-like decay
    const osc = audioCtx.createOscillator();
    osc.connect(gain);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2500, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
    osc.start();
    hornNodes = { oscs: [osc], gain };

  } else if (type === 'bike') {
    // Bicycle Bell: Quick double high ring
    const osc = audioCtx.createOscillator();
    osc.connect(gain);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1800, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    // Double ding
    setTimeout(() => {
      const o2 = audioCtx.createOscillator();
      o2.connect(gain); o2.type = 'triangle'; o2.frequency.setValueAtTime(1800, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      o2.start(); o2.stop(audioCtx.currentTime + 0.12);
    }, 120);
    osc.start(); osc.stop(now + 0.12);
    hornNodes = { oscs: [osc], gain };

  } else if (type === 'slide') {
    // Slide Whistle: Smooth frequency slide
    const osc = audioCtx.createOscillator();
    osc.connect(gain);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.6);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
    osc.start();
    hornNodes = { oscs: [osc], gain };

  } else if (type === 'train') {
    // Steam Train: Low whistle with breathiness
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    osc1.connect(gain); osc2.connect(gain);
    osc1.type = 'sawtooth'; osc1.frequency.value = 220;
    osc2.type = 'sawtooth'; osc2.frequency.value = 277; // Musical minor third
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.1);
    osc1.start(); osc2.start();
    hornNodes = { oscs: [osc1, osc2], gain };

  } else if (type === 'cuckoo') {
    // Cuckoo: Two tone "Cuc-koo"
    const osc = audioCtx.createOscillator();
    osc.connect(gain);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    // Second note
    setTimeout(() => {
      const o2 = audioCtx.createOscillator();
      o2.connect(gain); o2.type = 'sine'; o2.frequency.setValueAtTime(550, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      o2.start(); o2.stop(audioCtx.currentTime + 0.3);
    }, 400);
    osc.start(); osc.stop(now + 0.3);
    hornNodes = { oscs: [osc], gain };

  } else if (type === 'drop') {
    // Water Drop: Fast rising sweep
    const osc = audioCtx.createOscillator();
    osc.connect(gain);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(1600, now + 0.1);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.start(now);
    hornNodes = { oscs: [osc], gain };
  } else if (type === 'car') {
    // Normal Car Horn: Two dissonant mid-range frequencies (e.g., 400Hz and 500Hz)
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    osc1.connect(gain);
    osc2.connect(gain);
    osc1.type = 'square';
    osc2.type = 'square';
    osc1.frequency.setValueAtTime(400, now);
    osc2.frequency.setValueAtTime(500, now);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
    
    osc1.start();
    osc2.start();
    hornNodes = { oscs: [osc1, osc2], gain };
  }
}

export const stopHorn = () => {
  if (!hornNodes) return;
  const { oscs, gain } = hornNodes;
  const now = audioCtx.currentTime;
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(0, now + 0.08);
  oscs.forEach(o => o.stop(now + 0.08));
  hornNodes = null;
};

export function previewHorn(typeId) {
  startHorn(typeId);
  setTimeout(() => { stopHorn(); }, 600);
}
