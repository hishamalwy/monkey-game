import hero from '../assets/hero.png';

export default function SplashScreen() {
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div className="slide-up" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20
      }}>
        <img 
          src={hero} 
          alt="monkey" 
          style={{ width: 180, height: 180, objectFit: 'contain' }} 
        />
        <div style={{
          width: 60, height: 6, borderRadius: 3,
          background: 'var(--bg-pink)',
          animation: 'pulse 1s ease-in-out infinite',
        }} />
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }`}</style>
    </div>
  );
}

