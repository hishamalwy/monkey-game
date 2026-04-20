import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../hooks/useNavigation';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import Toast from '../components/ui/Toast';
import UserAvatar from '../components/ui/UserAvatar';
import { cleanupOldRooms, quickPlay } from '../firebase/rooms';
import { findActiveRoom, getGameRoute } from '../firebase/reconnect';
import { getLevel, getLevelProgress } from '../utils/xp';
import { calcStreak } from '../utils/retention';
import { claimDailyBonus } from '../firebase/retention';
import DailyBonusModal from '../components/shared/DailyBonusModal';
import ReconnectModal from '../components/shared/ReconnectModal';
import ConnectionStatus from '../components/shared/ConnectionStatus';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import hero from '../assets/hero.webp';
import singleCoinIcon from '../assets/icons/single_coin.png';

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
  const [quickPlaying, setQuickPlaying] = useState(null);
  const [quickPlayMode, setQuickPlayMode] = useState(null);

  useEffect(() => {
    if (!userProfile?.uid || reconnectChecked) return;
    setReconnectChecked(true);
    findActiveRoom(userProfile.uid).then(room => {
      if (room) setActiveRoom(room);
    }).catch(() => { });
  }, [userProfile?.uid, reconnectChecked]);

  const checkDailyBonus = useCallback(() => {
    if (!userProfile || bonusChecked) return;
    setBonusChecked(true);
    const { isNewDay } = calcStreak(userProfile.lastLoginDate, userProfile.loginStreak);
    if (isNewDay) {
      claimDailyBonus(userProfile.uid, userProfile).then(result => {
        if (result.claimed) setBonusData(result);
      }).catch(() => { });
    }
  }, [userProfile, bonusChecked]);

  useEffect(() => { cleanupOldRooms(); }, []);
  useEffect(() => { checkDailyBonus(); }, [checkDailyBonus]);

  const handleBonusClaim = () => { setBonusData(null); };

  const handleQuickPlay = async (mode) => {
    if (quickPlaying) return;
    setQuickPlayMode(mode);
    setQuickPlaying(true);
    try {
      const code = await quickPlay(userProfile, mode);
      navigate(`/lobby/${code}`);
    } catch (e) {
      setToast(e.message || 'فشل البحث عن مباراة');
    } finally {
      setQuickPlaying(false);
      setQuickPlayMode(null);
    }
  };

  return (
    <div className="brutal-bg" style={{
      width: '100%', height: '100dvh',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden'
    }}>

      {/* Background Decor */}
      <div className="bg-stickers" style={{ opacity: 0.08 }}>
        <div style={{ position: 'absolute', top: '12%', left: '4%', fontSize: 28, transform: 'rotate(-15deg)' }}>🍌</div>
        <div style={{ position: 'absolute', top: '35%', right: '6%', fontSize: 32, transform: 'rotate(12deg)' }}>🎺</div>
        <div style={{ position: 'absolute', bottom: '30%', left: '8%', fontSize: 24, transform: 'rotate(8deg)' }}>🐵</div>
        <div style={{ position: 'absolute', bottom: '20%', right: '12%', fontSize: 36, transform: 'rotate(-12deg)' }}>🪙</div>
      </div>

      {/* Header */}
      <div className="top-nav-brutal" style={{ background: '#FFF', position: 'relative', zIndex: 10, padding: '14px 20px', borderBottom: '5px solid #000' }}>
        <div
          onClick={nav.toSettings}
          style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flex: 1 }}
        >
          <div style={{
            border: '3px solid #000', borderRadius: 0,
            padding: 2, background: '#FFF', boxShadow: '3px 3px 0 #000'
          }}>
            <UserAvatar avatarId={userProfile?.avatarId ?? 1} size={42} border="1.5px solid #000" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 900, color: '#000', lineHeight: 1.1 }}>
              {userProfile?.username || 'لاعب'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--neo-pink)', textTransform: 'uppercase' }}>مستوى {getLevel(userProfile?.xp ?? 0)}</span>
              <div style={{ width: 70, height: 10, background: '#DDD', borderRadius: 0, overflow: 'hidden', border: '2.5px solid #000' }}>
                <div style={{ width: `${getLevelProgress(userProfile?.xp ?? 0)}%`, height: '100%', background: 'var(--neo-green)' }} />
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setRulesOpen(true)} className="btn btn-dark" style={{ width: 44, height: 44, padding: 0, borderRadius: 0, border: '3.5px solid #000', boxShadow: '3px 3px 0 var(--neo-pink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 20 }}>📖</span>
          </button>
          <button onClick={() => setMenuOpen(true)} className="btn btn-yellow" style={{ width: 44, height: 44, fontSize: 24, fontWeight: 900, borderRadius: 0, border: '3.5px solid #000' }}>≡</button>
        </div>
      </div>

      <div className="content-with-nav" style={{
        flex: 1, overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
        padding: '20px 20px 100px', gap: '16px',
        alignItems: 'center', position: 'relative', zIndex: 5
      }}>

        {/* Hero Section */}
        <div style={{
          position: 'relative',
          width: 'min(160px, 40vw)',
          aspectRatio: '170/200',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          margin: '10px 0'
        }}>
          <div className="card pop" style={{
            position: 'absolute', top: -10, right: -30, zIndex: 10,
            background: 'var(--neo-pink)', padding: '2px 8px',
            transform: 'rotate(8deg)', fontSize: '0.7rem', fontWeight: 900,
            borderRadius: 0, color: '#000',
            boxShadow: '4px 4px 0 #000',
            border: '3px solid #000',
          }}>
            {userProfile?.username || 'زائر'}
          </div>

          <div className="card" style={{
            padding: '12px', transform: 'rotate(-4deg)',
            width: '100%', borderRadius: 0, background: '#FFF',
            border: '4px solid #000',
            boxShadow: '8px 8px 0px #000'
          }}>
            <img src={hero} alt="monkey" style={{ width: '100%', height: 'auto' }} />
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: '0 10px' }}>
          <h2 style={{ fontSize: 'clamp(28px, 8vw, 42px)', fontWeight: 900, color: '#000', margin: '0 0 6px', lineHeight: 1, letterSpacing: '-1px' }}>
            جاهز للعب؟ 🐒
          </h2>
          <p style={{ fontSize: '15px', fontWeight: 900, color: '#000', margin: 0, opacity: 0.8 }}>
            تحدى أصدقاءك في ألعاب ممتعة
          </p>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 400 }}>
          <button
            onClick={nav.toOnlineSetup}
            className="btn btn-pink"
            aria-label="إنشاء غرفة جديدة"
            style={{ width: '100%', padding: '20px', fontSize: '1.5rem', borderRadius: 0, boxShadow: '6px 6px 0px #000', border: '5px solid #000', fontWeight: 900 }}
          >
            ابدأ لعبة 🎮
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%' }}>
            <button
              onClick={nav.toBrowseRooms}
              className="btn btn-white"
              style={{ padding: '15px', fontSize: '1.2rem', borderRadius: 0, boxShadow: '4px 4px 0px #000', border: '4px solid #000', fontWeight: 900 }}
            >
              انضم للعب 🤝
            </button>
            <button
              onClick={() => navigate('/daily-rewards')}
              className="btn"
              style={{ padding: '15px', fontSize: '1.2rem', color: '#000', borderRadius: 0, background: 'var(--neo-cyan)', boxShadow: '4px 4px 0px #000', border: '4px solid #000', fontWeight: 900 }}
            >
              مهام 🎁
            </button>
          </div>


        </div>

        {/* Tip Box */}
        <div className="card pop" style={{
          marginTop: 4, padding: '10px 16px', background: '#FFF',
          borderRadius: 0, fontSize: 13, fontWeight: 900, color: '#000',
          width: '100%', maxWidth: 380, textAlign: 'center',
          border: '3px solid #000',
          boxShadow: '4px 4px 0px #000',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          💡 <span style={{ color: 'var(--neo-pink)' }}>نصيحة:</span> أكمل المهام يومياً للحصول على عملات! <img src={singleCoinIcon} style={{ width: 22, height: 22 }} />
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

      {/* Menu Drawer */}
      {menuOpen && (
        <div className="slide-up" style={{ position: 'absolute', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column' }} onClick={() => setMenuOpen(false)}>
          <div className="card" style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: '85%', maxWidth: 320,
            padding: 32, display: 'flex', flexDirection: 'column', gap: 16,
            borderRadius: 0, background: '#FFF', borderLeft: '6px solid #000',
            boxShadow: '-10px 0 0 rgba(0,0,0,0.2)'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: 28, textAlign: 'right', fontWeight: 900, fontSize: 28, color: '#000' }}>القائمة</h2>
            <button className="btn btn-white" style={{ padding: '18px', fontSize: 15, justifyContent: 'flex-end', borderRadius: 0, border: '4px solid #000', boxShadow: '5px 5px 0 #000', fontWeight: 900 }} onClick={() => { setMenuOpen(false); nav.toSettings(); }}>الإعدادات ⚙️</button>
            <button className="btn btn-white" style={{ padding: '18px', fontSize: 15, justifyContent: 'flex-end', borderRadius: 0, border: '4px solid #000', boxShadow: '5px 5px 0 #000', fontWeight: 900 }} onClick={() => { setMenuOpen(false); setRulesOpen(true); }}>كيف تلعب؟ 💡</button>
            <button className="btn btn-white" style={{ padding: '18px', fontSize: 15, justifyContent: 'flex-end', borderRadius: 0, border: '4px solid #000', boxShadow: '5px 5px 0 #000', fontWeight: 900 }} onClick={() => { setMenuOpen(false); nav.toLeaderboard(); }}>لوحة المتصدرين 🏆</button>
            <div style={{ flex: 1 }} />
            <button className="btn btn-pink" style={{ padding: '18px', fontSize: 15, borderRadius: 0, border: '4px solid #000', boxShadow: '6px 6px 0 #000', fontWeight: 900 }} onClick={() => { setMenuOpen(false); logout(); nav.toAuth(); }}>تسجيل الخروج 🚪</button>
          </div>
        </div>
      )}

      {/* Rules Modal */}
      {rulesOpen && (
        <div className="slide-up" style={{ position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="card" style={{ padding: '32px', width: '100%', maxWidth: 400, textAlign: 'center', borderRadius: 0, border: '6px solid #000', background: '#FFF', boxShadow: '12px 12px 0 var(--neo-pink)' }}>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: '#000', marginBottom: 16 }}>قواعد اللعبة 📖</h2>
            <p style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.7, marginBottom: 24, color: '#000', textAlign: 'right' }}>
              الهدف هو إكمال الكلمات حرفاً بحرف مع الفريق.
              من يغلط أو يتأخر يحصل على ربع قرد.
              اللي يوصل لقرد كامل يطلع من اللعبة!
            </p>
            <button onClick={() => setRulesOpen(false)} className="btn btn-yellow" style={{ width: '100%', padding: 20, fontSize: 18, borderRadius: 0, border: '5px solid #000', boxShadow: '8px 8px 0 #000', fontWeight: 900 }}>فهمت!</button>
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
