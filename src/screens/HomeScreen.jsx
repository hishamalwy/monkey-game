import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../hooks/useNavigation';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import Toast from '../components/ui/Toast';
import UserAvatar from '../components/ui/UserAvatar';
import { cleanupOldRooms } from '../firebase/rooms';
import { findActiveRoom, getGameRoute } from '../firebase/reconnect';
import { getLevel, getLevelEmoji, getLevelProgress } from '../utils/xp';
import { getTodayStr, calcStreak } from '../utils/retention';
import { claimDailyBonus } from '../firebase/retention';
import DailyBonusModal from '../components/shared/DailyBonusModal';
import ReconnectModal from '../components/shared/ReconnectModal';
import ConnectionStatus from '../components/shared/ConnectionStatus';
import hero from '../assets/hero.webp';

export default function HomeScreen() {
  const { userProfile, logout } = useAuth();
  const nav = useNavigation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [bonusData, setBonusData] = useState(null);
  const [bonusChecked, setBonusChecked] = useState(false);
  const [activeRoom, setActiveRoom] = useState(null);
  const [reconnectChecked, setReconnectChecked] = useState(false);

  useEffect(() => {
    if (!userProfile?.uid || reconnectChecked) return;
    setReconnectChecked(true);
    findActiveRoom(userProfile.uid).then(room => {
      if (room) setActiveRoom(room);
    }).catch(() => {});
  }, [userProfile?.uid, reconnectChecked]);

  const checkDailyBonus = useCallback(() => {
    if (!userProfile || bonusChecked) return;
    setBonusChecked(true);
    const { isNewDay } = calcStreak(userProfile.lastLoginDate, userProfile.loginStreak);
    if (isNewDay) {
      claimDailyBonus(userProfile.uid, userProfile).then(result => {
        if (result.claimed) setBonusData(result);
      }).catch(() => {});
    }
  }, [userProfile, bonusChecked]);

  useEffect(() => { cleanupOldRooms(); }, []);
  useEffect(() => { checkDailyBonus(); }, [checkDailyBonus]);

  const handleBonusClaim = () => { setBonusData(null); };

  return (
    <div className="brutal-bg" style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column'
    }}>
      
      {/* Background Decor */}
      <div className="bg-stickers">
        <div style={{ position: 'absolute', top: '12%', left: '4%', fontSize: 28, transform: 'rotate(-15deg)' }}>🍌</div>
        <div style={{ position: 'absolute', top: '35%', right: '6%', fontSize: 32, transform: 'rotate(12deg)' }}>🎺</div>
        <div style={{ position: 'absolute', bottom: '30%', left: '8%', fontSize: 24, transform: 'rotate(8deg)' }}>🐵</div>
        <div style={{ position: 'absolute', bottom: '20%', right: '12%', fontSize: 36, transform: 'rotate(-12deg)' }}>🪙</div>
      </div>

      {/* Header */}
      <div className="top-nav-brutal" style={{ background: '#FFF', position: 'relative', zIndex: 10 }}>
        <div 
          onClick={nav.toSettings}
          style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flex: 1 }}
        >
          <div style={{ 
            border: '3px solid var(--bg-dark-purple)', borderRadius: '12px', 
            padding: 2, background: '#FFF', boxShadow: '3px 3px 0 var(--bg-dark-purple)' 
          }}>
            <UserAvatar avatarId={userProfile?.avatarId ?? 0} size={42} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontSize: 16, fontWeight: 950, color: 'var(--bg-dark-purple)', lineHeight: 1 }}>
              {userProfile?.username || 'قردي'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
               <span style={{ fontSize: 11, fontWeight: 950 }}>لفل {getLevel(userProfile?.xp ?? 0)}</span>
               <div style={{ width: 70, height: 7, background: '#EEE', borderRadius: 4, overflow: 'hidden', border: '2px solid var(--bg-dark-purple)' }}>
                  <div style={{ width: `${getLevelProgress(userProfile?.xp ?? 0)}%`, height: '100%', background: 'var(--bg-green)' }} />
               </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setRulesOpen(true)} className="btn btn-dark" style={{ width: 44, height: 44, padding: 0, borderRadius: '12px' }}>
            <img src={`${import.meta.env.BASE_URL}icons/rules.png`} alt="" style={{ width: 22, height: 22 }} />
          </button>
          <button onClick={() => setMenuOpen(true)} className="btn btn-yellow" style={{ width: 44, height: 44, fontSize: 24, fontWeight: 900, borderRadius: '12px' }}>≡</button>
        </div>
      </div>

      <div className="content-with-nav" style={{
        flex: 1, overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
        padding: '24px 24px', gap: '20px',
        alignItems: 'center', position: 'relative', zIndex: 5
      }}>
        
        {/* Perfectly Centered Hero Section */}
        <div style={{ position: 'relative', width: 170, height: 200, display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '10px 0' }}>
           {/* Greeting Badge - Absolute with respect to logo container */}
           <div className="card" style={{
             position: 'absolute', top: -15, right: -45, zIndex: 10,
             background: 'var(--bg-pink)', padding: '6px 12px',
             transform: 'rotate(15deg)', fontSize: '0.9rem', fontWeight: 950,
             borderRadius: '10px', color: '#FFF',
             boxShadow: '4px 4px 0 var(--bg-dark-purple)',
             border: '3px solid var(--bg-dark-purple)'
           }}>
             هلا {userProfile?.username || 'والله'}! 👋
           </div>

           {/* Hero Logo Frame - More Tilt */}
           <div className="card" style={{ 
              padding: '14px', transform: 'rotate(-6deg)', 
              width: 170, borderRadius: '16px', background: '#FFF',
              border: '4px solid var(--bg-dark-purple)',
              boxShadow: '6px 6px 0px var(--bg-dark-purple)'
           }}>
             <img src={hero} alt="monkey" style={{ width: '100%', height: 'auto' }} />
           </div>
        </div>

        <div style={{ textAlign: 'center' }}>
           <h2 style={{ fontSize: 32, fontWeight: 950, color: 'var(--bg-dark-purple)', margin: '0 0 6px', lineHeight: 1.1 }}>
             هل أنت مستعد؟
           </h2>
           <p style={{ fontSize: 16, fontWeight: 900, color: 'var(--bg-dark-purple)', opacity: 0.8, margin: 0 }}>
             تحدى أصدقائك في أغرب لعبة تواصل!
           </p>
        </div>

        {/* Buttons Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 420 }}>
          <button
            onClick={nav.toOnlineSetup}
            className="btn btn-pink"
            style={{ width: '100%', padding: '22px', fontSize: '1.5rem', borderRadius: '20px', boxShadow: '6px 6px 0px var(--bg-dark-purple)' }}
          >
            ابدأ لعبة 🎮
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%' }}>
            <button
              onClick={nav.toBrowseRooms}
              className="btn btn-white"
              style={{ padding: '18px', fontSize: '1.2rem', borderRadius: '16px', boxShadow: '4px 4px 0px var(--bg-dark-purple)' }}
            >
              انضم 🤝
            </button>
            <button
              onClick={() => navigate('/daily-rewards')}
              className="btn btn-blue"
              style={{ padding: '18px', fontSize: '1.2rem', color: '#FFF', borderRadius: '16px', background: 'var(--bg-blue)', boxShadow: '4px 4px 0px var(--bg-dark-purple)' }}
            >
              مهام 🎁
            </button>
          </div>
        </div>

        {/* Shortened Tip Box */}
        <div className="card" style={{ 
           marginTop: 10, padding: '12px 20px', background: '#FFF', 
           borderRadius: '16px', fontSize: 13, fontWeight: 950, color: 'var(--bg-dark-purple)',
           width: '100%', maxWidth: 400, textAlign: 'center',
           border: '3px solid var(--bg-dark-purple)',
           boxShadow: '4px 4px 0px var(--bg-dark-purple)'
        }}>
           💡 <span style={{ color: 'var(--bg-pink)' }}>نصيحة:</span> خلص المهام واكسب كوينز أكتر! 🪙
        </div>

      </div>

      {bonusData && <DailyBonusModal streak={bonusData.streak} bonus={bonusData.bonus} onClaim={handleBonusClaim} />}

      {activeRoom && (
        <ReconnectModal
          room={activeRoom}
          userProfile={userProfile}
          onRejoin={() => {
            const route = getGameRoute(activeRoom);
            if (route) navigate(route, { replace: true });
            setActiveRoom(null);
          }}
          onDismiss={() => setActiveRoom(null)}
        />
      )}

      <ConnectionStatus />
      {toast && <Toast message={toast} onDone={() => setToast('')} />}

      {menuOpen && (
        <div className="slide-up" style={{ position: 'absolute', inset: 0, zIndex: 200, background: 'rgba(28,16,63,0.9)', display: 'flex', flexDirection: 'column' }} onClick={() => setMenuOpen(false)}>
          <div className="card" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '80%', maxWidth: 320, padding: 32, display: 'flex', flexDirection: 'column', gap: 20, borderRadius: 0 }} onClick={e => e.stopPropagation()}>
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
        <div className="slide-up" style={{ position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(28,16,63,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card" style={{ padding: '24px', width: '100%', maxWidth: 360, textAlign: 'center' }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--bg-pink)', marginBottom: 12 }}>طريقة اللعب</h2>
            <p style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.6, marginBottom: 20, color: 'var(--bg-dark-purple)' }}>اللعبة بتعتمد على إنك تكون كلمة صحيحة حرف بحرف مع أصحابك. اللي ميعرفش يكمل أو يكتب حرف غلط بياخد "ربع قرد". لو جمعت قرد كامل بتخسر وتطلع برا اللعبة!</p>
            <button onClick={() => setRulesOpen(false)} className="btn btn-yellow" style={{ width: '100%', padding: 12, fontSize: 16 }}>فهمت!</button>
          </div>
        </div>
      )}

      <BottomNav active="home" onNavigate={(key) => {
        if (key === 'leaderboard') nav.toLeaderboard();
        else if (key === 'settings') nav.toSettings();
        else if (key === 'store') nav.toStore();
      }} />
    </div>
  );
}
