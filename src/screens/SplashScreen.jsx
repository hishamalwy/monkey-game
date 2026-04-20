import hero from '../assets/hero.webp';

export default function SplashScreen() {
  return (
    <div className="brutal-bg" style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div className="slide-up" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24
      }}>
        <div className="card" style={{ padding: 20, background: '#FFF', borderRadius: 0, border: '6px solid #000', boxShadow: '12px 12px 0 #000' }}>
          <img
            src={hero}
            alt="monkey"
            style={{ width: 140, height: 140, objectFit: 'contain' }}
          />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-block', background: 'var(--neo-cyan)', border: '2px solid #000',
            padding: '4px 14px', fontSize: '13px', fontWeight: 900, marginBottom: 12, boxShadow: '4px 4px 0 #000'
          }}>
            جاري التحميل...
          </div>
          <div style={{
            width: 120, height: 12, borderRadius: 0,
            background: '#FFF', border: '3px solid #000',
            overflow: 'hidden', position: 'relative'
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, bottom: 0,
              width: '40%', background: 'var(--neo-pink)',
              animation: 'loadProg 2s ease-in-out infinite'
            }} />
          </div>
        </div>
      </div>
      <style>{`
        @keyframes loadProg {
          0% { left: -40%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}
