// Scattered emoji wallpaper pattern — matches the yellow arcade aesthetic
const ITEMS = [
  // top band
  { e: '🚗', l: 4,  t: 1,  r: -20, s: 52 },
  { e: '📯', l: 33, t: 2,  r: -28, s: 68 },
  { e: '🎵', l: 58, t: 0,  r:  12, s: 30 },
  { e: '📯', l: 76, t: 3,  r:  18, s: 56 },

  // upper-mid
  { e: '🍌', l: 1,  t: 19, r: -14, s: 46 },
  { e: '🎵', l: 26, t: 21, r: -6,  s: 26 },
  { e: '🐒', l: 62, t: 17, r:  10, s: 50 },
  { e: '📻', l: 82, t: 22, r: -4,  s: 42 },

  // mid-upper
  { e: '📯', l: 8,  t: 38, r: -22, s: 50 },
  { e: '🚗', l: 44, t: 40, r:  20, s: 46 },
  { e: '⚙️', l: 72, t: 36, r: -10, s: 36 },
  { e: '🍌', l: 88, t: 43, r:   8, s: 32 },

  // mid (prominent elements)
  { e: '🐒', l: 16, t: 56, r:   5, s: 44 },
  { e: '🎵', l: 42, t: 58, r: -16, s: 26 },
  { e: '📯', l: 58, t: 53, r:  -8, s: 42 },
  { e: '🐒', l: 71, t: 60, r:   6, s: 92 }, // big monkey — hero element

  // lower-mid
  { e: '🍌', l: 4,  t: 72, r: -10, s: 38 },
  { e: '📯', l: 27, t: 76, r: -18, s: 46 },
  { e: '⚙️', l: 54, t: 70, r:  14, s: 34 },
  { e: '🎵', l: 84, t: 68, r:  -6, s: 28 },

  // bottom band
  { e: '🐒', l: 7,  t: 88, r:  10, s: 44 },
  { e: '📯', l: 42, t: 90, r: -14, s: 46 },
  { e: '🚗', l: 68, t: 87, r:  22, s: 42 },
  { e: '⚙️', l: 87, t: 91, r:  -6, s: 30 },
];

export default function PatternBackground() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {ITEMS.map((item, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: `${item.l}%`,
            top: `${item.t}%`,
            fontSize: item.s,
            transform: `rotate(${item.r}deg)`,
            opacity: 0.2,
            lineHeight: 1,
            userSelect: 'none',
            display: 'block',
          }}
        >
          {item.e}
        </span>
      ))}
    </div>
  );
}
