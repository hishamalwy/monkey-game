import { useMemo } from 'react';

export function useConfetti() {
  return useMemo(() => {
    const colors = ['#FF006E', '#FF6B00', '#FFE300', '#1C1040', '#FFFFFF', '#39FF14'];
    return Array.from({ length: 28 }, (_, i) => ({
      id: i,
      left: `${(i * 3.6) % 100}%`,
      delay: `${(i * 0.07) % 1.4}s`,
      duration: `${1.4 + (i * 0.07) % 1.4}s`,
      color: colors[i % colors.length],
      width: `${8 + (i * 3) % 8}px`,
      height: `${6 + (i * 2) % 6}px`,
    }));
  }, []);
}

export function ConfettiLayer({ confetti }) {
  return (
    <>
      {confetti.map(p => (
        <div key={p.id} className="confetti-piece" style={{
          left: p.left,
          animationDelay: p.delay,
          animationDuration: p.duration,
          background: p.color,
          width: p.width,
          height: p.height,
        }} />
      ))}
    </>
  );
}
