import hero from '../assets/hero.png';

export default function SplashScreen() {
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20,
    }}>
      <img src={hero} alt="monkey" style={{ width: 120, height: 120, objectFit: 'contain' }} />
      <h1 style={{
        fontSize: 36, fontWeight: 900, color: 'var(--color-header)',
        margin: 0, textAlign: 'center',
        WebkitTextStroke: '2px rgba(28,16,64,0.15)',
      }}>
        القرد بيتكلم!
      </h1>
      <div style={{ marginTop: 8 }}>
        <div style={{
          width: 40, height: 4, borderRadius: 2,
          background: 'var(--color-primary)',
          animation: 'pulse 1s ease-in-out infinite',
        }} />
        <style>{`@keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }`}</style>
      </div>
    </div>
  );
}

