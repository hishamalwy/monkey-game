import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchPublicRooms, joinRoom } from '../firebase/rooms';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Toast from '../components/ui/Toast';
import { appCategories } from '../data/categories';
import { drawCategories } from '../data/drawCategories';
import { useNavigation } from '../hooks/useNavigation';

export default function BrowseRoomsScreen() {
  const nav = useNavigation();
  const { userProfile } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(null); // code of room being joined
  const [toast, setToast] = useState('');

  const [joinCode, setJoinCode] = useState('');

  const loadRooms = async () => {
    setLoading(true);
    try {
      const data = await fetchPublicRooms();
      setRooms(data);
    } catch {
      setToast('فشل تحميل الغرف');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const handleJoin = async (code) => {
    setJoining(code);
    try {
      await joinRoom(code, userProfile);
      nav.toLobby(code);
    } catch (e) {
      setToast(e.message || 'فشل الانضمام');
      setJoining(null);
    }
  };

  const getModeLabel = (mode) => {
    if (mode === 'draw') return '🎨 خمن و ارسم';
    if (mode === 'survival') return '⚔️ البقاء';
    if (mode === 'charades') return '🎭 بدون كلام';
    return '🔊 كلكس';
  };

  const getCatName = (room) => {
    if (room.mode === 'survival') return 'ثقافة عامة';
    if (room.mode === 'charades') return 'أفلام ومسلسلات';
    const cats = room.mode === 'draw' ? drawCategories : appCategories;
    return cats.find(c => c.id === room.category)?.name || room.category;
  };

  const handleManualJoin = async (codeStr) => {
    if (codeStr.length !== 4) return;
    setJoining(codeStr);
    try {
      await joinRoom(codeStr, userProfile);
      nav.toLobby(codeStr);
    } catch (e) {
      setToast(e.message || 'كود غير صحيح');
      setJoining(null);
    }
  };

  const handleCodeChange = (val) => {
    const code = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    setJoinCode(code);
    if (code.length === 4) handleManualJoin(code);
  };

  return (
    <div style={{ 
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column', 
      backgroundColor: '#FAFAFA',
      backgroundImage: 'radial-gradient(rgba(28, 16, 63, 0.15) 2px, transparent 2px)',
      backgroundSize: '24px 24px'
    }}>
      
      {/* Dynamic Refresher Style */}
      <style>{`
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .refreshing { animation: rotate 0.8s linear infinite; }
        .room-card {
           border: 4px solid var(--bg-dark-purple);
           box-shadow: 6px 6px 0 var(--bg-dark-purple);
           transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .room-card:hover { 
           transform: translate(-3px, -3px);
           box-shadow: 9px 9px 0 var(--bg-dark-purple);
        }
        .hero-section {
           background: var(--bg-yellow);
           border-bottom: 6px solid var(--bg-dark-purple);
           padding: 32px 20px;
           position: relative;
           overflow: hidden;
        }
        .hero-pattern {
           position: absolute;
           top: -10px; right: -10px;
           font-size: 80px;
           opacity: 0.1;
           transform: rotate(20deg);
           pointer-events: none;
        }
      `}</style>

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFF', borderBottom: '4px solid var(--bg-dark-purple)' }}>
        <button onClick={nav.toHome} className="pop" style={{ background: '#FAFAFA', border: '3px solid var(--bg-dark-purple)', padding: '6px 14px', fontSize: 14, fontWeight: 900, boxShadow: '3px 3px 0 var(--bg-dark-purple)', cursor: 'pointer' }}>
          ← رجوع
        </button>
        <div style={{ fontSize: 18, fontWeight: 950, color: 'var(--bg-dark-purple)' }}>الغرف العامة 🌍</div>
        <button onClick={loadRooms} className="pop" style={{ background: 'var(--bg-yellow)', border: '3px solid var(--bg-dark-purple)', padding: '4px 10px', fontSize: 18, fontWeight: 900, boxShadow: '3px 3px 0 var(--bg-dark-purple)', cursor: 'pointer' }}>
          <span className={loading ? 'refreshing' : ''} style={{ display: 'inline-block' }}>🔄</span>
        </button>
      </div>

      {/* Hero: Code Entry */}
      <div style={{ padding: '24px 20px 10px' }}>
         <div style={{ 
           background: 'var(--bg-yellow)', border: '5px solid var(--bg-dark-purple)', 
           boxShadow: '6px 6px 0 var(--bg-dark-purple)', padding: '24px', 
           borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', 
           position: 'relative', overflow: 'hidden' 
         }}>
           <div style={{ position: 'absolute', top: -10, right: -10, fontSize: 80, opacity: 0.1, transform: 'rotate(20deg)', pointerEvents: 'none' }}>🐒</div>
           
           <h1 style={{ fontSize: 20, fontWeight: 950, color: 'var(--bg-dark-purple)', marginBottom: 20, textAlign: 'center', marginTop: 0, zIndex: 2 }}>
              لديك رمز دعوة؟ ادخله هنا! 🎫
           </h1>
           
           <div style={{ position: 'relative', display: 'flex', flexDirection: 'row', direction: 'ltr', justifyContent: 'center', gap: 12, zIndex: 2 }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="pop" style={{
                  width: 56, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 32, fontWeight: 950, background: '#FFF', color: 'var(--bg-dark-purple)',
                  border: `4px solid ${joinCode.length === i ? 'var(--bg-pink)' : 'var(--bg-dark-purple)'}`,
                  boxShadow: joinCode.length === i ? '5px 5px 0 var(--bg-pink)' : '4px 4px 0 rgba(0,0,0,0.1)',
                  borderRadius: 12, transition: 'all 0.1s',
                  transform: joinCode.length === i ? 'scale(1.05) translateY(-4px)' : 'none'
                }}>
                  {joinCode[i] || ''}
                </div>
              ))}
              <input 
                type="text"
                autoFocus
                value={joinCode}
                onChange={e => handleCodeChange(e.target.value)}
                maxLength={4}
                style={{
                  position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%',
                  direction: 'ltr'
                }}
              />
           </div>
           {joining && joinCode.length === 4 && (
             <div style={{ marginTop: 15, display: 'flex', justifyContent: 'center', zIndex: 2 }}>
               <LoadingSpinner size={24} color="var(--bg-dark-purple)" />
             </div>
           )}
         </div>
      </div>

      {/* Body: Public Rooms */}
      <div style={{ flex: 1, padding: '16px 20px 24px', overflowY: 'auto', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
           <h2 style={{ fontSize: 16, fontWeight: 950, color: 'var(--bg-dark-purple)', margin: 0, opacity: 0.8 }}>
              استكشف الغرف المتاحة 👇
           </h2>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {loading ? (
            <div style={{ marginTop: 40 }}><LoadingSpinner /></div>
          ) : rooms.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', background: '#FAFAFA', border: '4px dashed #D1D5DB', borderRadius: 16 }}>
              <div style={{ fontSize: 60, marginBottom: 16 }}>🏜️</div>
              <p style={{ fontWeight: 900, color: '#6B7280', fontSize: 18, margin: '0 0 8px' }}>لا توجد غرف عامة حالياً</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#9CA3AF', margin: 0 }}>أسس إمبراطوريتك وكن أول من ينشئ غرفة!</p>
              <button 
                onClick={nav.toOnlineSetup} 
                className="btn-pink pop" 
                style={{ 
                  marginTop: 24, padding: '16px 24px', fontSize: 16, width: '100%', fontWeight: 950,
                  background: 'var(--bg-pink)', color: '#FFF', border: '4px solid var(--bg-dark-purple)',
                  boxShadow: '4px 4px 0 var(--bg-dark-purple)', borderRadius: 12, cursor: 'pointer'
                }}
              >
                انشئ غرفتك الآن 🚀
              </button>
            </div>
          ) : (
            rooms.map((room, idx) => {
              const playersCount = room.playerOrder?.length || 0;
              const maxPlayers = room.maxPlayers || 5;
              const isFull = playersCount >= maxPlayers;

              return (
                  <div 
                  key={room.code} 
                  className="pop" 
                  style={{ 
                    padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, background: '#FFF',
                    border: '4px solid var(--bg-dark-purple)', boxShadow: '5px 5px 0 var(--bg-dark-purple)',
                    borderRadius: 16, animationDelay: `${idx * 100}ms`
                  }}
                >
                  <div style={{ 
                    width: 54, height: 54, background: room.mode === 'survival' ? 'var(--bg-pink)' : 'var(--bg-yellow)', 
                    border: '3px solid var(--bg-dark-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28, flexShrink: 0, borderRadius: 12, boxShadow: '2px 2px 0 var(--bg-dark-purple)'
                  }}>
                    {room.mode === 'survival' ? '⚔️' : room.mode === 'draw' ? '🎨' : '🔊'}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, background: 'var(--bg-dark-purple)', color: '#FFF', padding: '2px 10px', borderRadius: 12, fontWeight: 950 }}>
                         {getModeLabel(room.mode)}
                      </span>
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 950, color: 'var(--bg-dark-purple)', margin: '4px 0' }}>
                      {getModeLabel(room.mode)} - {getCatName(room)}
                    </h3>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--bg-dark-purple)', opacity: 0.7 }}>
                      كود الغرفة: {room.code} | {room.hostName || 'لاعب مجهول'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--bg-dark-purple)', opacity: 0.6 }}>
                        👥 {playersCount}/{maxPlayers}
                      </span>
                    </div>
                  </div>

                  <button 
                    disabled={isFull || joining}
                    onClick={() => handleJoin(room.code)}
                    className="pop"
                    style={{ 
                      padding: '12px 20px', fontSize: 16, fontWeight: 950, minWidth: 80,
                      background: isFull ? '#FAFAFA' : 'var(--bg-yellow)',
                      color: isFull ? '#9CA3AF' : 'var(--bg-dark-purple)',
                      border: isFull ? '3px dashed #D1D5DB' : '3px solid var(--bg-dark-purple)',
                      boxShadow: isFull ? 'none' : '4px 4px 0 var(--bg-dark-purple)',
                      borderRadius: 12, cursor: isFull ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {joining === room.code ? <LoadingSpinner size={16} /> : isFull ? 'ممتلئة' : 'انضمام'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Decorative Background Elements */}
      <div style={{ position: 'absolute', top: '40%', left: -20, fontSize: 100, opacity: 0.03, transform: 'rotate(-15deg)', pointerEvents: 'none' }}>🌴</div>
      <div style={{ position: 'absolute', bottom: 40, right: -10, fontSize: 80, opacity: 0.03, transform: 'rotate(20deg)', pointerEvents: 'none' }}>🐒</div>
      <div style={{ position: 'absolute', top: '60%', right: 40, fontSize: 40, opacity: 0.03, transform: 'rotate(45deg)', pointerEvents: 'none' }}>🍌</div>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
