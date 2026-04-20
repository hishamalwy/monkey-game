import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';

const AudioCtx = createContext(null);

export function useAudio() {
  return useContext(AudioCtx);
}

let _sharedCtx = null;
const _prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

function getCtx() {
  if (!_sharedCtx) _sharedCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (_sharedCtx.state === 'suspended') _sharedCtx.resume();
  return _sharedCtx;
}

function resumeOnInteraction() {
  const resume = () => { if (_sharedCtx?.state === 'suspended') _sharedCtx.resume(); };
  ['mousedown', 'touchstart', 'keydown', 'pointerdown'].forEach(evt =>
    window.addEventListener(evt, resume, { passive: true })
  );
}

const ARPEGGIO = [
  329.63, 392.00, 440.00, 523.25,
  440.00, 392.00, 329.63, 293.66,
  261.63, 329.63, 392.00, 440.00,
  523.25, 440.00, 392.00, 329.63,
];
const BASS = [
  130.81, 130.81, 174.61, 174.61,
  146.83, 146.83, 164.81, 164.81,
  130.81, 130.81, 174.61, 174.61,
  196.00, 196.00, 164.81, 130.81,
];
const KICK_PATTERN = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0];
const SNARE_PATTERN = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0];

const TENSION_NOTES = [440, 494, 523, 587, 659, 587, 523, 494];
const TENSION_BASS = [110, 123, 131, 147, 165, 147, 131, 123];

export function AudioProvider({ children }) {
  const [musicVolume, setMusicVolume] = useState(() =>
    parseFloat(localStorage.getItem('musicVolume') ?? '0.5')
  );
  const [sfxVolume, setSfxVolume] = useState(() =>
    parseFloat(localStorage.getItem('sfxVolume') ?? '0.8')
  );

  const musicVolRef = useRef(musicVolume);
  const sfxVolRef = useRef(sfxVolume);
  useEffect(() => { musicVolRef.current = musicVolume; }, [musicVolume]);
  useEffect(() => { sfxVolRef.current = sfxVolume; }, [sfxVolume]);

  useEffect(() => { localStorage.setItem('musicVolume', musicVolume.toString()); }, [musicVolume]);
  useEffect(() => { localStorage.setItem('sfxVolume', sfxVolume.toString()); }, [sfxVolume]);

  const bgmTimerRef = useRef(null);
  const bgmStepRef = useRef(0);
  const tensionTimerRef = useRef(null);
  const tensionStepRef = useRef(0);
  const initializedRef = useRef(false);

  const initOnce = useCallback(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      getCtx();
      resumeOnInteraction();
    }
  }, []);

  const playSfx = useCallback((type) => {
    if (sfxVolRef.current === 0) return;
    initOnce();
    const ctx = getCtx();
    const vol = sfxVolRef.current;
    const now = ctx.currentTime;

    if (type === 'click') {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'square';
      o.frequency.setValueAtTime(800, now);
      o.frequency.exponentialRampToValueAtTime(200, now + 0.06);
      g.gain.setValueAtTime(vol * 0.18, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      o.start(now); o.stop(now + 0.06);
    } else if (type === 'win') {
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'triangle';
        const t = now + i * 0.12;
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0, now);
        g.gain.setValueAtTime(vol * 0.35, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        o.start(t); o.stop(t + 0.2);
      });
    } else if (type === 'lose') {
      [300, 250, 200, 120].forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'sawtooth';
        const t = now + i * 0.15;
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0, now);
        g.gain.setValueAtTime(vol * 0.3, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        o.start(t); o.stop(t + 0.2);
      });
    } else if (type === 'penalty') {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(200, now);
      o.frequency.exponentialRampToValueAtTime(80, now + 0.35);
      g.gain.setValueAtTime(vol * 0.35, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      o.start(now); o.stop(now + 0.35);
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.connect(g2); g2.connect(ctx.destination);
      o2.type = 'square';
      o2.frequency.setValueAtTime(150, now);
      o2.frequency.exponentialRampToValueAtTime(60, now + 0.4);
      g2.gain.setValueAtTime(vol * 0.15, now);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      o2.start(now); o2.stop(now + 0.4);
    } else if (type === 'timeup') {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(600, now);
      o.frequency.exponentialRampToValueAtTime(150, now + 0.5);
      g.gain.setValueAtTime(vol * 0.35, now);
      g.gain.linearRampToValueAtTime(0.001, now + 0.5);
      o.start(now); o.stop(now + 0.5);
    } else if (type === 'correct') {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(600, now);
      o.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
      g.gain.setValueAtTime(vol * 0.25, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      o.start(now); o.stop(now + 0.15);
    } else if (type === 'incorrect') {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'square';
      o.frequency.setValueAtTime(200, now);
      o.frequency.exponentialRampToValueAtTime(100, now + 0.2);
      g.gain.setValueAtTime(vol * 0.2, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      o.start(now); o.stop(now + 0.2);
    } else if (type === 'bonus') {
      [523, 659, 784, 1047].forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'sine';
        const t = now + i * 0.08;
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0, now);
        g.gain.setValueAtTime(vol * 0.3, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        o.start(t); o.stop(t + 0.25);
      });
    } else if (type === 'tick') {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'square';
      o.frequency.setValueAtTime(1000, now);
      g.gain.setValueAtTime(vol * 0.12, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      o.start(now); o.stop(now + 0.04);
    } else if (type === 'turnChange') {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(500, now);
      o.frequency.setValueAtTime(700, now + 0.08);
      g.gain.setValueAtTime(vol * 0.25, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      o.start(now); o.stop(now + 0.15);
    } else if (type === 'join') {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(400, now);
      o.frequency.exponentialRampToValueAtTime(800, now + 0.12);
      g.gain.setValueAtTime(vol * 0.2, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      o.start(now); o.stop(now + 0.15);
    }
  }, [initOnce]);

  const playBgm = useCallback(() => {
    if (bgmTimerRef.current) return;
    initOnce();
    bgmStepRef.current = 0;

    bgmTimerRef.current = setInterval(() => {
      const vol = musicVolRef.current;
      if (vol === 0) return;
      const ctx = getCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const step = bgmStepRef.current;
      const BPM = 200;
      const beatLen = 60 / BPM;

      const arpNote = ARPEGGIO[step % ARPEGGIO.length];
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'square';
      o.frequency.value = arpNote;
      g.gain.setValueAtTime(vol * 0.06, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + beatLen * 0.8);
      o.start(now); o.stop(now + beatLen * 0.8);

      if (step % 2 === 0) {
        const bassNote = BASS[Math.floor(step / 2) % BASS.length];
        const ob = ctx.createOscillator();
        const gb = ctx.createGain();
        ob.connect(gb); gb.connect(ctx.destination);
        ob.type = 'triangle';
        ob.frequency.value = bassNote;
        gb.gain.setValueAtTime(vol * 0.1, now);
        gb.gain.exponentialRampToValueAtTime(0.001, now + beatLen * 1.6);
        ob.start(now); ob.stop(now + beatLen * 1.6);
      }

      if (!_prefersReducedMotion()) {
        if (KICK_PATTERN[step % 16]) {
        const ok = ctx.createOscillator();
        const gk = ctx.createGain();
        ok.connect(gk); gk.connect(ctx.destination);
        ok.type = 'sine';
        ok.frequency.setValueAtTime(150, now);
        ok.frequency.exponentialRampToValueAtTime(30, now + 0.1);
        gk.gain.setValueAtTime(vol * 0.12, now);
        gk.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        ok.start(now); ok.stop(now + 0.12);
      }

      if (SNARE_PATTERN[step % 16]) {
        const bufferSize = ctx.sampleRate * 0.05;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const gn = ctx.createGain();
        noise.connect(gn); gn.connect(ctx.destination);
        gn.gain.setValueAtTime(vol * 0.08, now);
        gn.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        noise.start(now); noise.stop(now + 0.05);
      }
      }

      bgmStepRef.current = step + 1;
    }, 300);
  }, [initOnce]);

  const stopBgm = useCallback(() => {
    if (bgmTimerRef.current) {
      clearInterval(bgmTimerRef.current);
      bgmTimerRef.current = null;
    }
  }, []);

  const playTension = useCallback(() => {
    if (_prefersReducedMotion()) return;
    if (tensionTimerRef.current) return;
    initOnce();
    tensionStepRef.current = 0;

    tensionTimerRef.current = setInterval(() => {
      const vol = musicVolRef.current;
      if (vol === 0) return;
      const ctx = getCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const step = tensionStepRef.current;

      const noteFreq = TENSION_NOTES[step % TENSION_NOTES.length];
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sawtooth';
      o.frequency.value = noteFreq;
      g.gain.setValueAtTime(vol * 0.1, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      o.start(now); o.stop(now + 0.08);

      if (step % 2 === 0) {
        const bassFreq = TENSION_BASS[Math.floor(step / 2) % TENSION_BASS.length];
        const ob = ctx.createOscillator();
        const gb = ctx.createGain();
        ob.connect(gb); gb.connect(ctx.destination);
        ob.type = 'square';
        ob.frequency.value = bassFreq;
        gb.gain.setValueAtTime(vol * 0.08, now);
        gb.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        ob.start(now); ob.stop(now + 0.15);
      }

      if (step % 4 === 0) {
        const ok = ctx.createOscillator();
        const gk = ctx.createGain();
        ok.connect(gk); gk.connect(ctx.destination);
        ok.type = 'sine';
        ok.frequency.setValueAtTime(80, now);
        ok.frequency.exponentialRampToValueAtTime(20, now + 0.08);
        gk.gain.setValueAtTime(vol * 0.15, now);
        gk.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        ok.start(now); ok.stop(now + 0.1);
      }

      tensionStepRef.current = step + 1;
    }, 100);
  }, [initOnce]);

  const stopTension = useCallback(() => {
    if (tensionTimerRef.current) {
      clearInterval(tensionTimerRef.current);
      tensionTimerRef.current = null;
    }
  }, []);

  const playClick = useCallback(() => playSfx('click'), [playSfx]);
  const playWin = useCallback(() => playSfx('win'), [playSfx]);
  const playLose = useCallback(() => playSfx('lose'), [playSfx]);
  const playPenalty = useCallback(() => playSfx('penalty'), [playSfx]);
  const playTimeup = useCallback(() => playSfx('timeup'), [playSfx]);
  const playCorrect = useCallback(() => playSfx('correct'), [playSfx]);
  const playIncorrect = useCallback(() => playSfx('incorrect'), [playSfx]);
  const playBonus = useCallback(() => playSfx('bonus'), [playSfx]);
  const playTick = useCallback(() => playSfx('tick'), [playSfx]);
  const playTurnChange = useCallback(() => playSfx('turnChange'), [playSfx]);
  const playJoin = useCallback(() => playSfx('join'), [playSfx]);

  return (
    <AudioCtx.Provider value={{
      musicVolume, sfxVolume,
      setMusicVolume, setSfxVolume,
      playClick, playWin, playLose, playPenalty,
      playTimeup, playCorrect, playIncorrect, playBonus,
      playTick, playTurnChange, playJoin,
      playBgm, stopBgm, playTension, stopTension,
    }}>
      <div onClickCapture={initOnce} style={{ display: 'contents' }}>
        {children}
      </div>
    </AudioCtx.Provider>
  );
}
