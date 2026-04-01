import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/ui/UserAvatar';
import BottomNav from '../components/BottomNav';
import Toast from '../components/ui/Toast';
import { joinRoom } from '../firebase/rooms';
import hero from '../assets/hero.png';

export default function HomeScreen({ nav }) {
  const { userProfile, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [joining, setJoining] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 4) { setToast('أدخل كود الغرفة المكون من 4 أحرف'); return; }
    setLoading(true);
    try {
      await joinRoom(code, userProfile);
      nav.toLobby(code);
    } catch (e) {
      setToast(e.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 24px', borderBottom: '4px solid var(--bg-dark-purple)'
      }}>
        <button onClick={() => setRulesOpen(true)} className="btn btn-dark" style={{ width: 44, height: 44, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={`${import.meta.env.BASE_URL}icons/rules.png`} alt="القواعد" style={{ width: 28, height: 28, objectFit: 'contain' }} />
        </button>
        <div className="title-glitch" style={{ transform: 'none' }}>كلكس!</div>
        <button onClick={() => setMenuOpen(true)} className="btn btn-yellow" style={{ width: 44, height: 44, fontSize: 24, fontWeight: 900 }}>≡</button>
      </div>

      <div className="content-with-nav" style={{
        flex: 1, overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
        padding: '16px var(--space-lg)', gap: 'var(--space-lg)',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Top Group: Avatar & Text grouped tightly */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-md)' }}>
          {/* Avatar Card */}
          <div style={{ position: 'relative' }}>
            <div className="card" style={{
               position: 'absolute', top: -12, right: -12, zIndex: 10,
               background: 'var(--bg-green)', padding: '4px 12px',
               transform: 'rotate(8deg)', fontSize: '0.85rem', fontWeight: 900,
               whiteSpace: 'nowrap'
            }}>
              هلا {userProfile?.username || 'والله'}!
            </div>
            <div className="card" style={{ padding: 'var(--space-sm)', transform: 'rotate(-3deg)', width: 150, position: 'relative' }}>
              <div style={{ background: '#FFC89D', border: 'var(--brutal-border)', overflow: 'hidden' }}>
                <img src={hero} alt="monkey" style={{ width: '100%', height: 'auto', display: 'block', transform: 'scale(1.1) translateY(8px)' }} />
              </div>
            </div>
          </div>

          {/* Texts */}
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            <h2 style={{ fontSize: 'clamp(1.6rem, 5vw, 2rem)', fontWeight: 900, color: 'var(--bg-dark-purple)', margin: 0, lineHeight: 1.15 }}>
              هل أنت مستعد<br/>للبدء؟
            </h2>
            <p style={{ fontSize: '1.1rem', color: 'var(--bg-dark-purple)', margin: 0, fontWeight: 700, padding: '0 var(--space-md)' }}>
              تحدى أصدقاءك في أغرب لعبة تواصل!
            </p>
          </div>
        </div>

        {/* Main Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', width: '100%', maxWidth: 400 }}>
          <button
            onClick={nav.toOnlineSetup}
            className="btn btn-pink"
            style={{ width: '100%', padding: '16px', fontSize: '1.4rem' }}
          >
            ابدأ لعبة
          </button>

          {joining ? (
            <div style={{ display: 'flex', gap: 'var(--space-sm)', width: '100%' }}>
              <input
                className="input-field"
                placeholder="أدخل الكود"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={4}
                style={{ flex: 1, textAlign: 'center', fontSize: '1.2rem', letterSpacing: 4 }}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                autoFocus
              />
              <button onClick={handleJoin} disabled={loading} className="btn btn-yellow" style={{ padding: '0 var(--space-lg)', fontSize: '1.2rem' }}>
                انضم
              </button>
            </div>
          ) : (
            <button onClick={() => setJoining(true)} className="btn btn-white" style={{ width: '100%', padding: '16px', fontSize: '1.2rem' }}>
              انضم لغرفة
            </button>
          )}

          <button onClick={nav.toLocalGame} className="btn btn-pink" style={{ width: '100%', padding: '16px', fontSize: '1.3rem' }}>
            العب مع الكمبيوتر 🎮
          </button>
        </div>
      </div>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}

      {menuOpen && (
        <div className="slide-up" style={{
          position: 'absolute', inset: 0, zIndex: 200, background: 'rgba(28,16,63,0.9)',
          display: 'flex', flexDirection: 'column'
        }} onClick={() => setMenuOpen(false)}>
          <div className="card" style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: '75%', maxWidth: 320,
            padding: 32, display: 'flex', flexDirection: 'column', gap: 20
          }} onClick={e => e.stopPropagation()}>
            <h2 className="title-glitch" style={{ marginBottom: 30, textAlign: 'right' }}>القائمة</h2>
            <button className="btn btn-white" style={{ padding: '16px 20px', fontSize: 18, justifyContent: 'flex-start' }} onClick={() => { setMenuOpen(false); nav.toSettings(); }}>⚙️ الإعدادات</button>
            <button className="btn btn-white" style={{ padding: '16px 20px', fontSize: 18, justifyContent: 'flex-start' }} onClick={() => { setMenuOpen(false); setRulesOpen(true); }}>💡 طريقة اللعب</button>
            <button className="btn btn-white" style={{ padding: '16px 20px', fontSize: 18, justifyContent: 'flex-start' }} onClick={() => { setMenuOpen(false); nav.toLeaderboard(); }}>🏆 المتصدرين</button>
            <div style={{ flex: 1 }} />
            <button className="btn btn-pink" style={{ padding: '16px 20px', fontSize: 18 }} onClick={() => { setMenuOpen(false); logout(); nav.toAuth(); }}>🚪 تسجيل خروج</button>
          </div>
        </div>
      )}

      {rulesOpen && (
        <div className="slide-up" style={{
          position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(28,16,63,0.85)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div className="card" style={{ padding: '24px', width: '100%', maxWidth: 360, textAlign: 'center' }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--bg-pink)', marginBottom: 12 }}>طريقة اللعب</h2>
            <p style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.6, marginBottom: 20, color: 'var(--bg-dark-purple)' }}>
              اللعبة بتعتمد على إنك تكون كلمة صحيحة حرف بحرف مع أصحابك أو الكمبيوتر. 
              اللي ميعرفش يكمل أو يكتب حرف غلط بياخد "ربع قرد".
              لو جمعت قرد كامل بتخسر وتطلع برا اللعبة!
            </p>
            <button onClick={() => setRulesOpen(false)} className="btn btn-yellow" style={{ width: '100%', padding: 12, fontSize: 16 }}>فهمت!</button>
          </div>
        </div>
      )}

      <BottomNav active="home" onNavigate={(key) => {
        if (key === 'leaderboard') nav.toLeaderboard();
        else if (key === 'settings') nav.toSettings();
      }} />
    </div>
  );
}
